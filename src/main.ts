import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import * as log from "https://deno.land/std/log/mod.ts";

const main = async () => {
  await log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG"),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console"],
      },
    },
  });

  yargs(Deno.args)
    .command({
      command: "fetch",
      describe:
        "connect to a substrate chain and fetch all the data necessary for neko to run her analysis",
      // deno-lint-ignore no-explicit-any
      builder: (y: any) =>
        y.option("url", {
          alias: "u",
          type: "string",
          description: "node url to connect to",
          demandOption: true,
        }),
      handler: async (_argv: Arguments) => {
        // todo
      },
    });
};

main().catch(console.error).then(() => Deno.exit(0));
