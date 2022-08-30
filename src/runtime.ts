class InOutBoundStats {
  public received = 0;
  public nbReceived = 0;
  public sent = 0;
  public nbSent = 0;

  public receive(amount: number) {
    this.received += amount;
    this.nbReceived++;
  }

  public send(amount: number) {
    this.sent += amount;
    this.nbSent++;
  }

  public toString(): string {
    return `(received: ${this.received}, sent: ${this.sent}, counters: ${this.nbReceived}/${this.nbSent})`;
  }
}

interface StatsSorter {
  (a: InOutBoundStats, b: InOutBoundStats): number;
}

type RuntimeExport = [string, InOutBoundStats];

export class Runtime {
  private moversStats: { [key: string]: InOutBoundStats } = {};

  public registerTransfer(from: string, to: string, amount: number) {
    const fromStats = this.moversStats[from] || new InOutBoundStats();
    const toStats = this.moversStats[to] || new InOutBoundStats();

    fromStats.send(amount);
    toStats.receive(amount);

    this.moversStats[from] = fromStats;
    this.moversStats[to] = toStats;
  }

  public exportSorted(
    topN: number,
    sort: StatsSorter,
  ): RuntimeExport[] {
    return Object.keys(this.moversStats)
      .map((key): RuntimeExport => [key, this.moversStats[key]])
      .sort(([_keyA, statsA], [_keyB, statsB]): number => sort(statsA, statsB))
      .slice(0, topN);
  }
}
