import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { writeCSV } from "https://deno.land/x/csv/mod.ts";

import { SubstrateBuilder, TransferEvent } from "./substrate.ts";

const main = async () => {
  await yargs(Deno.args)
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
        }).option("ignore", {
          alias: "i",
          type: "array",
          description: "ignore addresses specified during the export",
        }),
      handler: async (argv: Arguments) => {
        const buffer: Array<TransferEvent> = [];
        const api = await (new SubstrateBuilder(argv.url)).build();
        await api.fetchTransfers(argv.start, argv.end, (_block, transfer) => {
          if (argv.ignore && argv.ignore.includes(transfer.from)) {
            return;
          }

          if (argv.ignore && argv.ignore.includes(transfer.to)) {
            return;
          }

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
        await writeCSV(f, dump);
        f.close();
      },
    })
    .command({
      command: "now",
      describe:
        "connect to a substrate chain and fetch the last known block number",
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
        console.log(await api.currentBlock());
      },
    })
    .demandCommand()
    .parse();
};

main().then(() => Deno.exit(0)).catch(console.error);
