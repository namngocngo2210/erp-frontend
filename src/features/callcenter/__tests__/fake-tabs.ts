/** BroadcastChannel + Web Locks giả cho test đa tab (đồng bộ, cùng process). */

export class FakeBroadcastChannel {
  static buses = new Map<string, Set<FakeBroadcastChannel>>();
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor(public readonly name: string) {
    let bus = FakeBroadcastChannel.buses.get(name);
    if (!bus) {
      bus = new Set();
      FakeBroadcastChannel.buses.set(name, bus);
    }
    bus.add(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeBroadcastChannel.buses.get(this.name) ?? []) {
      if (other !== this) other.onmessage?.({ data });
    }
  }
  close() {
    FakeBroadcastChannel.buses.get(this.name)?.delete(this);
  }
  static reset() {
    FakeBroadcastChannel.buses.clear();
  }
}

type LockCallback = () => Promise<unknown> | unknown;

/** Khoá exclusive tối giản: 1 người giữ, hàng đợi FIFO, abort khi đang chờ. */
export class FakeLockManager {
  private held = false;
  private queue: Array<() => void> = [];
  request(_name: string, options: { signal?: AbortSignal }, callback: LockCallback) {
    return new Promise<void>((resolve, reject) => {
      const run = () => {
        this.held = true;
        Promise.resolve(callback()).then(() => {
          this.held = false;
          resolve();
          this.queue.shift()?.();
        });
      };
      if (options.signal?.aborted) {
        reject(new Error("aborted"));
        return;
      }
      if (!this.held) {
        run();
        return;
      }
      this.queue.push(run);
      options.signal?.addEventListener("abort", () => {
        this.queue = this.queue.filter((r) => r !== run);
        reject(new Error("aborted"));
      });
    });
  }
}
