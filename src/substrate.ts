import {
  ApiPromise,
  WsProvider,
} from "https://deno.land/x/polkadot@0.0.6/api/index.ts";

// deno-lint-ignore no-explicit-any
const asNumber = (nb: any) => {
  return parseInt(nb.toString());
};

export class Substrate {
  private api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  public async currentBlock(): Promise<number> {
    const block = await this.api.query.system.number();
    return asNumber(block);
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
