import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { writeCSV } from "https://deno.land/x/csv/mod.ts";

import { SubstrateBuilder, TransferEvent } from "./substrate.ts";

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
        }).option("start", {
          type: "number",
          description: "start block",
          demandOption: true,
        }).option("end", {
          type: "number",
          description: "end block",
          demandOption: true,
        }).option("output", {
          alias: "o",
          type: "string",
          description: "output file",
          default: "./output.csv",
        }),
      handler: async (argv: Arguments) => {
        const buffer: Array<TransferEvent> = [];
        const api = await (new SubstrateBuilder(argv.url)).build();
        await api.fetchTransfers(argv.start, argv.end, (_block, transfer) => {
          buffer.push(transfer);
        });

        const f = await Deno.open(argv.output, {
          write: true,
          create: true,
          truncate: true,
        });
        const dump = [
          ["block", "from", "to", "amount"],
          ...buffer.map((
            t,
          ) => [t.block.toString(), t.from, t.to, t.amount.toString()]),
        ];
        console.log(dump);
        await writeCSV(f, dump);
        f.close();

        Deno.exit(0);
      },
    })
    .parse();
};

main();
