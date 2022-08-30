import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { readCSVRows, writeCSV } from "https://deno.land/x/csv/mod.ts";

import { SubstrateBuilder, TransferEvent } from "./substrate.ts";
import { Runtime } from "./runtime.ts";

const main = async () => {
  await yargs(Deno.args)
    .option("data", {
      type: "string",
      description: "data file",
      default: "./data.csv",
    })
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

        const f = await Deno.open(argv.data, {
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
    .command({
      command: "report",
      describe:
        "analyze the specified data file and output a report on the transfers",
      // deno-lint-ignore no-explicit-any
      builder: (y: any) =>
        y.option("number", {
          alias: "n",
          type: "number",
          description: "number of receiving and sending accounts to look for",
          default: 5,
        }),
      handler: async (argv: Arguments) => {
        const runtime = new Runtime();

        let foundFirstRow = false;
        const f = await Deno.open(argv.data, { read: true });
        for await (const row of readCSVRows(f)) {
          if (!foundFirstRow) {
            foundFirstRow = true;
            continue;
          }

          const [_block, from, to, amount] = row;
          runtime.registerTransfer(from, to, parseFloat(amount));
        }
        f.close();

        const highestReceivers = runtime.exportSorted(
          argv.number,
          (a, b) => b.received - a.received,
        );
        console.log("Highest Receivers:");
        for (const [key, amount] of highestReceivers) {
          console.log(`\t${key}: ${amount}`);
        }
      },
    })
    .demandCommand()
    .parse();
};

main().then(() => Deno.exit(0)).catch(console.error);
