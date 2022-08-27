import {
  ApiPromise,
  WsProvider,
} from "https://deno.land/x/polkadot@0.0.6/api/index.ts";
import ProgressBar from "https://deno.land/x/progress@v1.2.7/mod.ts";

interface FetchTransfersCallback {
  (block: number, event: TransferEvent): void;
}

export type TransferEvent = {
  from: string;
  to: string;
  amount: number;
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
          };
          cb(i, transfer);
        }
      });

      progress.render(completed++, {
        title: emoji(Math.round(completed / 10)),
      });
    }
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
