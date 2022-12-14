import {
  ApiPromise,
  WsProvider,
} from "https://deno.land/x/polkadot@0.0.6/api/index.ts";
import ProgressBar from "https://deno.land/x/progress@v1.2.7/mod.ts";

interface FetchNftTransfersCallback {
  (event: NftTransferEvent): void;
}

interface FetchTransfersCallback {
  (event: TransferEvent): void;
}

export type NftTransferEvent = {
  from: string;
  to: string;
  collection: number;
  item: number;
  block: number;
};

export type TransferEvent = {
  from: string;
  to: string;
  amount: number;
  block: number;
};

// deno-lint-ignore no-explicit-any
const asNumber = (nb: any) => {
  return parseInt(nb.toString());
};

const emoji = (ticker: number) => {
  const emojis = [
    "🐱",
    "🐈",
    "🐯",
    "🦁",
    "🐅",
    "🐆",
    "🐴",
    "🦄",
    "😈",
    "🐶",
    "🔮",
  ];
  return emojis[ticker % emojis.length];
};

export class Substrate {
  private api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  public async decimals(): Promise<number> {
    const properties = await this.api.rpc.system.properties();
    const decimals = properties.tokenDecimals.unwrapOr([12])[0];
    return asNumber(decimals);
  }

  public async currentBlock(): Promise<number> {
    return asNumber(await this.api.query.system.number());
  }

  public async fetchTransfers(
    startBlock: number,
    endBlock: number,
    cb: FetchTransfersCallback,
  ): Promise<void> {
    const total = endBlock - startBlock;
    const progress = new ProgressBar({
      title: emoji(0),
      total,
      display: ":title :completed/:total :bar eta :eta",
    });
    let completed = 0;

    const decimals = await this.decimals();

    for (let i = startBlock; i <= endBlock; i++) {
      const blockHash = await this.api.rpc.chain.getBlockHash(i);
      const record = await this.api.derive.tx.events(blockHash);

      record.events.forEach((evt) => {
        const { event } = evt;

        const eventName = `${event.section}.${event.method}`;
        if (eventName === "balances.Transfer") {
          const [from, to, amount] = event.data;
          const transfer = {
            from: from.toString(),
            to: to.toString(),
            amount: asNumber(amount) / Math.pow(10, decimals),
            block: i,
          };
          cb(transfer);
        }
      });

      progress.render(completed++, {
        title: emoji(Math.round(completed / 10)),
      });
    }
  }

  public async fetchNftTransfers(
    startBlock: number,
    endBlock: number,
    cb: FetchNftTransfersCallback,
  ): Promise<void> {
    const total = endBlock - startBlock;
    const progress = new ProgressBar({
      title: emoji(0),
      total,
      display: ":title :completed/:total :bar eta :eta",
    });
    let completed = 0;

    for (let i = startBlock; i <= endBlock; i++) {
      const blockHash = await this.api.rpc.chain.getBlockHash(i);
      const record = await this.api.derive.tx.events(blockHash);

      record.events.forEach((evt) => {
        const { event } = evt;

        const eventName = `${event.section}.${event.method}`;
        if (eventName === "uniques.Transferred") {
          const [collection, item, from, to] = event.data;
          const transfer = {
            from: from.toString(),
            to: to.toString(),
            collection: asNumber(collection),
            item: asNumber(item),
            block: i,
          };
          cb(transfer);
        }
      });

      progress.render(completed++, {
        title: emoji(Math.round(completed / 10)),
      });
    }
  }

  public async nbNftsAt(
    at: number,
    collection: number,
    target: string,
  ): Promise<number> {
    const blockHash = await this.api.rpc.chain.getBlockHash(at);
    const api = await this.api.at(blockHash);
    const storageKeys = await api.query.uniques.account.keys(
      target,
      collection,
    );
    return storageKeys.length;
  }
}

export class SubstrateBuilder {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public async build(): Promise<Substrate> {
    const wsProvider = new WsProvider(this.url);
    const api = await ApiPromise.create({ provider: wsProvider });

    return new Substrate(api);
  }
}
