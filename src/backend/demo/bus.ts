export interface BusMessage {
  topic: string;
  event: string;
  payload: unknown;
}

export interface Bus {
  post(msg: BusMessage): void;
  subscribe(cb: (msg: BusMessage) => void): () => void;
  close(): void;
}

/** BroadcastChannel never delivers to the sender's own channel object; MemoryBus mimics that. */
export class BroadcastBus implements Bus {
  private ch: BroadcastChannel;
  private subs = new Set<(m: BusMessage) => void>();
  constructor(name = 'pxv:demo') {
    this.ch = new BroadcastChannel(name);
    this.ch.onmessage = (e: MessageEvent<BusMessage>) => {
      for (const s of this.subs) s(e.data);
    };
  }
  post(msg: BusMessage) {
    this.ch.postMessage(msg);
  }
  subscribe(cb: (m: BusMessage) => void) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  close() {
    this.ch.close();
    this.subs.clear();
  }
}

export class MemoryHub {
  readonly buses = new Set<MemoryBus>();
}

export class MemoryBus implements Bus {
  private subs = new Set<(m: BusMessage) => void>();
  constructor(private hub: MemoryHub = new MemoryHub()) {
    hub.buses.add(this);
  }
  /** a second bus on the same hub = another tab */
  peer(): MemoryBus {
    return new MemoryBus(this.hub);
  }
  post(msg: BusMessage) {
    const copy = structuredClone(msg);
    for (const b of this.hub.buses) {
      if (b === this) continue;
      for (const s of b.subs) s(copy);
    }
  }
  subscribe(cb: (m: BusMessage) => void) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  close() {
    this.hub.buses.delete(this);
    this.subs.clear();
  }
}
