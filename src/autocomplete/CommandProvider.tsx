/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Command } from "matrix-react-sdk/src//slash-commands/command";
import { _t, _td } from "matrix-react-sdk/src/languageHandler";
import { Room } from "matrix-js-sdk/src/matrix";
import React from "react";
import { MatrixClientPeg } from "matrix-react-sdk/src/MatrixClientPeg";
import { TimelineRenderingType } from "matrix-react-sdk/src/contexts/RoomContext";
import AutocompleteProvider from "matrix-react-sdk/src/autocomplete/AutocompleteProvider";
import { ICompletion, ISelectionRange } from "matrix-react-sdk/src/autocomplete/Autocompleter";
import { TextualCompletion } from "matrix-react-sdk/src/autocomplete/Components";
import QueryMatcher from "matrix-react-sdk/src/autocomplete/QueryMatcher";
import {  CommandMap, Commands, DefaultCommands, setCommands } from "../SlashCommands";
import RemoteCommands from "../RemoteCommands";

const COMMAND_RE = /(^\/\w*)(?: .*)?/g;

setCommands([...DefaultCommands, ...RemoteCommands])

export default class CommandProvider extends AutocompleteProvider {
    public matcher: QueryMatcher<Command>;

    public constructor(room: Room, renderingType?: TimelineRenderingType) {
        super({ commandRegex: COMMAND_RE, renderingType });
        this.matcher = new QueryMatcher(Commands, {
            keys: ["command", "args", "description"],
            funcs: [({ aliases }) => aliases.join(" ")], // aliases
            context: renderingType,
        });
    }

    public async getCompletions(
        query: string,
        selection: ISelectionRange,
        force?: boolean,
        limit = -1,
    ): Promise<ICompletion[]> {
        const { command, range } = this.getCurrentCommand(query, selection);
        if (!command) return [];

        const cli = MatrixClientPeg.get();

        let matches: Command[] = [];
        // check if the full match differs from the first word (i.e. returns false if the command has args)
        if (command[0] !== command[1]) {
            // The input looks like a command with arguments, perform exact match
            const name = command[1].slice(1); // strip leading `/`
            if (CommandMap.has(name) && CommandMap.get(name)!.isEnabled(cli)) {
                // some commands, namely `me` don't suit having the usage shown whilst typing their arguments
                if (CommandMap.get(name)!.hideCompletionAfterSpace) return [];
                matches = [CommandMap.get(name)!];
            }
        } else {
            if (query === "/") {
                // If they have just entered `/` show everything
                // We exclude the limit on purpose to have a comprehensive list
                matches = Commands;
            } else {
                // otherwise fuzzy match against all of the fields
                matches = this.matcher.match(command[1], limit);
            }
        }

        let filteredMatches = matches.filter((cmd) => {
            const display = !cmd.renderingTypes || cmd.renderingTypes.includes(this.renderingType);
            return cmd.isEnabled(cli) && display;
        })

        if(filteredMatches.length === 1 && filteredMatches[0].suggest){
            // let's try and get more completions based on the command
            const command = filteredMatches[0];
            console.log({command, query})
            
            const newMatches = command.suggest?.( "room1", null, query.replace("/" + command.command, ""))
            if(newMatches && newMatches?.length > 0){
                filteredMatches = newMatches;
            }
        }

        return filteredMatches
            .map((result) => {
                let completion = result.getCommand() + " ";
                const usedAlias = result.aliases.find((alias) => `/${alias}` === command[1]);
                // If the command (or an alias) is the same as the one they entered, we don't want to discard their arguments
                if (usedAlias || result.getCommand() === command[1]) {
                    completion = command[0];
                }

                return {
                    completion,
                    type: "command",
                    component: (
                        <TextualCompletion
                            title={`/${usedAlias || result.command}`}
                            subtitle={result.args}
                            description={_t(result.description)}
                        />
                    ),
                    range: range!,
                };
            });
    }

    public getName(): string {
        return "*️⃣ Commands";
    }

    public renderCompletions(completions: React.ReactNode[]): React.ReactNode {
        return (
            <div
                className="mx_Autocomplete_Completion_container_pill"
                role="presentation"
                aria-label={_t("composer|autocomplete|command_a11y")}
            >
                {completions}
            </div>
        );
    }
}
