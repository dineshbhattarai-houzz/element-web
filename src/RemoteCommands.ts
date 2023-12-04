import { CommandCategories } from "matrix-react-sdk/src/slash-commands/interface";

//@ts-ignore
import templator from "templater.js"
import QueryMatcher from "matrix-react-sdk/src/autocomplete/QueryMatcher";
import { Command } from "./SlashCommands";
import { _td } from "./languageHandler";
import { ContentHelpers } from "matrix-js-sdk";
import { successSync } from "matrix-react-sdk/src/slash-commands/utils";


const dynamicCommands =  [
    {
        command: "mboard",
        items: [
            {
                id: "1",
          
                title: "DArch Living Room",
                url: "https://github.com/matrix-org/matrix-js-sdk",
                thumbnail:
                  "https://dbhattarai.info.np/_astro/home-illustration.5a54143b_1ce4ca.webp",
              },
              {
                id: "2",
                title: "DArch Dining Room",
                url: "https://github.com/matrix-org/matrix-react-sdk",
                thumbnail:
                  "https://dbhattarai.info.np/_astro/home-illustration.5a54143b_1ce4ca.webp",
              },
              {
                id: "3",
                title: "Gym Hall",
                url: "https://github.com/matrix-org/matrix-react-sdk",
                thumbnail:
                  "https://dbhattarai.info.np/_astro/home-illustration.5a54143b_1ce4ca.webp",
              },
        ],
        args: "Moodboard title",
        description: "Remote /commands",
        category: CommandCategories.messages,
        renderTemplate: "<a href='{{match.url}}'>{{match.title}}</a>",
    }
];


export default dynamicCommands.map(({command, args, description, category, renderTemplate, items}) => {
  const template = templator(renderTemplate);
  const matcher = new QueryMatcher(items, {
      keys: ["title"],
  });
  
  return new Command({
      command,
      args,
      description,
      category,
      runFn: (cli, roomId, threadId, args= "") => {
          const matches = matcher.match(args);
          const match = matches[0];
          const body = template({match, args});
          return successSync(ContentHelpers.makeHtmlMessage(match.title, body))
      },
      suggest: function (roomId, threadId, args) {
          console.log({args});
          if(!items || items.length === 0 || !args){
              return undefined;
          }
          if(args === ' '){
              return items.map(m =>{
                  return new Command({
                      command: "mboard " + m.title,
                      args: "",
                      description: _td("slash_command|me"),
                      category: CommandCategories.messages,
                  })
              });;
          }

          let result = matcher.match(args, 4);
          return result.map(m =>{
              return new Command({
                  command: "mboard " + m.title,
                  args: "",
                  description: _td("slash_command|me"),
                  category: CommandCategories.messages,
              })
          });
      },
  });
});