import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import * as log from "https://deno.land/std/log/mod.ts";

import { SubstrateBuilder } from "./substrate.ts";

const main = () => {
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
      handler: async (argv: Arguments) => {
        const api = await (new SubstrateBuilder(argv.url)).build();
        const now = await api.currentBlock();
        log.info(`Current last block: ${now}`);

        Deno.exit(0);
      },
    })
    .parse();
};

main();