import yargs from "https://deno.land/x/yargs/deno.ts";
import { Arguments } from "https://deno.land/x/yargs/deno-types.ts";
import { readCSVRows, writeCSV } from "https://deno.land/x/csv/mod.ts";

import {
  NftTransferEvent,
  SubstrateBuilder,
  TransferEvent,
} from "./substrate.ts";
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
        await api.fetchTransfers(argv.start, argv.end, (transfer) => {
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
      command: "fetch-nfts",
      describe:
        "connect to a substrate chain and fetch NFTs received and transferred for the given keys",
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
        }).option("targets", {
          alias: "t",
          type: "array",
          description: "addresses to look for",
          demandOption: true,
        }).option("collection", {
          alias: "c",
          type: "number",
          description: "collection ID to filter for",
          demandOption: true,
        }),
      handler: async (argv: Arguments) => {
        const buffer: Array<NftTransferEvent> = [];
        const counters: { [key: string]: number } = {};
        const api = await (new SubstrateBuilder(argv.url)).build();
        await api.fetchNftTransfers(argv.start, argv.end, (transfer) => {
          if (
            argv.targets.includes(transfer.to) &&
            transfer.collection === argv.collection
          ) {
            buffer.push(transfer);

            if (counters[transfer.to] === undefined) {
              counters[transfer.to] = 0;
            }

            counters[transfer.to]++;
          }
        });

        const f = await Deno.open(argv.data, {
          write: true,
          create: true,
          truncate: true,
        });
        const dump = [
          ["block", "from", "to", "collection", "item"],
          ...buffer.map((
            t,
          ) => [
            t.block.toString(),
            t.from,
            t.to,
            t.collection.toString(),
            t.item.toString(),
          ]),
        ];
        await writeCSV(f, dump);
        f.close();

        console.log(`Report from ${argv.start} until ${argv.end}`);
        for (const key of Object.keys(counters)) {
          console.log(`${key} received a total of ${counters[key]} items`);
        }
      },
    })
    .command({
      command: "diff-nfts",
      describe:
        "connect to a substrate chain and fetch NFTs received for the given keys and given timestamp",
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
        }).option("targets", {
          alias: "t",
          type: "array",
          description: "addresses to look for",
          demandOption: true,
        }).option("collection", {
          alias: "c",
          type: "number",
          description: "collection ID to filter for",
          demandOption: true,
        }),
      handler: async (argv: Arguments) => {
        console.log(`Report from ${argv.start} until ${argv.end}`);
        let total = 0;
        const api = await (new SubstrateBuilder(argv.url)).build();
        for (const target of argv.targets) {
          const previously = await api.nbNftsAt(
            argv.start,
            argv.collection,
            target,
          );
          const now = await api.nbNftsAt(argv.end, argv.collection, target);
          const newItems = now - previously;
          total += newItems;
          console.log(`${target} received a total of ${newItems} new items`);
        }
        console.log(`Total: ${total}`);
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
        let blockStart = 0;
        let blockEnd = 0;
        let nbTransfers = 0;
        const f = await Deno.open(argv.data, { read: true });
        for await (const row of readCSVRows(f)) {
          if (!foundFirstRow) {
            foundFirstRow = true;
            continue;
          }

          const [block, from, to, amount] = row;
          runtime.registerTransfer(from, to, parseFloat(amount));

          if (blockStart === 0) {
            blockStart = parseInt(block);
          }
          blockEnd = parseInt(block);
          nbTransfers++;
        }
        f.close();

        console.log(
          `Report on ${nbTransfers} transactions from blocks ${blockStart} to ${blockEnd}`,
        );

        const highestReceivers = runtime.exportSorted(
          argv.number,
          (a, b) => b.received - a.received,
        );
        console.log(`\nTop ${argv.number} Highest Receivers:`);
        for (const [key, amount] of highestReceivers) {
          console.log(`\t${key}: ${amount}`);
        }

        const highestSenders = runtime.exportSorted(
          argv.number,
          (a, b) => b.sent - a.sent,
        );
        console.log(`\nTop ${argv.number} Highest Senders:`);
        for (const [key, amount] of highestSenders) {
          console.log(`\t${key}: ${amount}`);
        }
      },
    })
    .demandCommand()
    .parse();
};

main().then(() => Deno.exit(0)).catch(console.error);
