/**
 * Lightweight persistence for mock services: seeds an in-memory table from static data adapted
 * from the approved design, then mirrors mutations to localStorage so create/edit/approve/etc.
 * survive a reload during a demo session. Swapping a domain service for a real backend later only
 * means deleting the `.mock.ts` file and pointing `index.ts` at a `fetch`-backed implementation —
 * nothing that imports the service interface needs to change.
 */
export function createMockTable<T>(storageKey: string, seed: T[], version = 1) {
  const versionKey = `${storageKey}.__v`;

  function read(): T[] {
    if (typeof localStorage === "undefined") return seed;
    try {
      if (localStorage.getItem(versionKey) !== String(version)) return seed;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return seed;
      return JSON.parse(raw) as T[];
    } catch {
      return seed;
    }
  }

  let table = read();

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(table));
      localStorage.setItem(versionKey, String(version));
    } catch {
      // storage unavailable (private mode, quota) — mutations stay in-memory for the session
    }
  }

  return {
    all(): T[] {
      return table;
    },
    set(next: T[]) {
      table = next;
      persist();
    },
    update(mutator: (rows: T[]) => T[]) {
      table = mutator(table);
      persist();
      return table;
    },
    reset() {
      table = seed;
      persist();
    },
  };
}

/** Simulated network latency so loading states are real, not instant. */
export function mockDelay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MockApiError";
  }
}
