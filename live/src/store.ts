// Tiny IndexedDB wrapper (no dependencies). Two stores:
//   details: catch id -> catch details (immutable, so cached forever, pruned to the newest N)
//   kv:      key -> any JSON value (session snapshot)
// Every call degrades to a no-op if IndexedDB isn't available (private mode etc.).
const NAME = "gone-fishing-live", VERSION = 1;
let dbp: Promise<IDBDatabase | null> | null = null;

function db(): Promise<IDBDatabase | null> {
  return (dbp ??= new Promise((resolve) => {
    try {
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("details")) d.createObjectStore("details");
        if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  }));
}
const done = (t: IDBTransaction) => new Promise<void>((res) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => res(); });
const req = <T>(r: IDBRequest<T>) => new Promise<T | undefined>((res) => { r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); });

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const d = await db(); if (!d) return undefined;
  return req(d.transaction("kv").objectStore("kv").get(key)) as Promise<T | undefined>;
}
export async function kvSet(key: string, value: unknown) {
  const d = await db(); if (!d) return;
  const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(value, key); await done(t);
}

export async function loadAll<T>(store: "details"): Promise<[number, T][]> {
  const d = await db(); if (!d) return [];
  const s = d.transaction(store).objectStore(store);
  const [keys, vals] = await Promise.all([req(s.getAllKeys()), req(s.getAll())]);
  return (keys ?? []).map((k, i) => [k as number, (vals ?? [])[i] as T]);
}
export async function putMany(store: "details", entries: [number, unknown][]) {
  const d = await db(); if (!d || !entries.length) return;
  const t = d.transaction(store, "readwrite"); const s = t.objectStore(store);
  for (const [k, v] of entries) s.put(v, k);
  await done(t);
}
/** keep only the newest `keep` keys (catch ids are increasing) */
export async function prune(store: "details", keep: number) {
  const d = await db(); if (!d) return;
  const keys = ((await req(d.transaction(store).objectStore(store).getAllKeys())) ?? []) as number[];
  if (keys.length <= keep) return;
  keys.sort((a, b) => a - b);
  const t = d.transaction(store, "readwrite");
  t.objectStore(store).delete(IDBKeyRange.upperBound(keys[keys.length - keep - 1]));
  await done(t);
}
