import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import * as log from "https://deno.land/std/log/mod.ts";

import { SubstrateBuilder } from "./substrate.ts";

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
        }).option("start", {
          type: "number",
          description: "start block",
          demandOption: true,
        }).option("end", {
          type: "number",
          description: "end block",
          demandOption: true,
        }),
      handler: async (argv: Arguments) => {
        const api = await (new SubstrateBuilder(argv.url)).build();
        await api.fetchTransfers(argv.start, argv.end, (block, transfer) => {
          log.debug(
            `${block}: ${transfer.from} -> ${transfer.to} (${transfer.amount})`,
          );
        });

        Deno.exit(0);
      },
    })
    .parse();
};

main().catch(log.error);
