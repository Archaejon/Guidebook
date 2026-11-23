import type { Project, Snapshot } from '../types';

const DB_NAME = 'guidebook-future';
const DB_VERSION = 1;
const STATE_KEY = 'project';
const LS_KEY = 'guidebook-future:project';
const SNAPSHOT_LIMIT = 20;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open local database'));
  });
  return dbPromise;
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

/**
 * Resolves only when the transaction has committed.
 *
 * A request's `onsuccess` fires before the write is durable: the transaction
 * can still abort afterwards (quota, a closed database), and resolving there
 * would report a save that never landed. The request is only used for its
 * error, which is the useful fallback when the transaction has none.
 */
function idbWrite(tx: IDBTransaction, req: IDBRequest): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? req.error ?? new Error('Local database write failed'));
    tx.onabort = () => reject(tx.error ?? new Error('Local database write was aborted'));
  });
}

function idbPut(store: string, value: unknown, key?: string): Promise<void> {
  return openDb().then((db) => {
    const tx = db.transaction(store, 'readwrite');
    const req = key ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
    return idbWrite(tx, req);
  });
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve((req.result ?? []) as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDb().then((db) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    return idbWrite(tx, req);
  });
}

/** One durable copy of the project, and where it was found. */
export interface StoredCopy {
  project: Project;
  /** `meta.lastSavedAt` as epoch ms, or -1 when the copy carries no stamp. */
  savedAt: number;
  source: 'indexeddb' | 'localstorage';
}

function copySavedAt(project: Project): number {
  const raw = (project as { meta?: { lastSavedAt?: string } }).meta?.lastSavedAt;
  const parsed = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(parsed) ? -1 : parsed;
}

/**
 * Prefers IndexedDB on a tie, but a *newer* fallback copy wins.
 *
 * A save can succeed in localStorage after IndexedDB refused it (quota, private
 * mode). That fallback copy is the user's latest work, so returning the older
 * IndexedDB record — the old behaviour — silently rolled the project back on
 * the next load.
 */
export function newestCopy(primary: StoredCopy | null, fallback: StoredCopy | null): StoredCopy | null {
  if (!primary) return fallback;
  if (!fallback) return primary;
  return fallback.savedAt > primary.savedAt ? fallback : primary;
}

async function readStoredCopy(): Promise<StoredCopy | null> {
  try {
    const project = await idbGet<Project>('state', STATE_KEY);
    if (project) return { project, savedAt: copySavedAt(project), source: 'indexeddb' };
  } catch {
    // IndexedDB is unavailable; the fallback below may still hold a copy.
  }
  return null;
}

function readFallbackCopy(): StoredCopy | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const project = JSON.parse(raw) as Project | null;
    if (!project || typeof project !== 'object') return null;
    return { project, savedAt: copySavedAt(project), source: 'localstorage' };
  } catch {
    // Unreadable or corrupted fallback: treat it as absent.
    return null;
  }
}

export async function loadProject(): Promise<Project | null> {
  const copy = newestCopy(await readStoredCopy(), readFallbackCopy());
  return copy ? copy.project : null;
}

let lastWriteStamp = 0;

/**
 * A strictly increasing timestamp, so two saves in the same millisecond cannot
 * tie and leave "which copy is newer?" ambiguous.
 */
function nextSavedAt(): string {
  lastWriteStamp = Math.max(Date.now(), lastWriteStamp + 1);
  return new Date(lastWriteStamp).toISOString();
}

/**
 * Persists the project and returns the `lastSavedAt` it actually wrote.
 *
 * The stamp is applied here rather than by the caller so both stores record
 * when their own copy was written; `loadProject` compares them, and a fallback
 * write must not be mistaken for an older record.
 *
 * A refused IndexedDB write is retried through localStorage. If the fallback
 * also fails the error propagates, because a save that reached neither store
 * must not be reported as saved.
 */
export async function saveProject(project: Project): Promise<string> {
  const savedAt = nextSavedAt();
  const stamped: Project = { ...project, meta: { ...project.meta, lastSavedAt: savedAt } };
  try {
    await idbPut('state', stamped, STATE_KEY);
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(stamped));
  }
  return savedAt;
}

export async function clearProject(): Promise<void> {
  try {
    await idbDelete('state', STATE_KEY);
  } catch {
    // ignore
  }
  localStorage.removeItem(LS_KEY);
}

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const all = await idbGetAll<Snapshot>('snapshots');
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

/**
 * Writes a backup point. A failed write propagates: callers use a snapshot as
 * the safety net before a destructive action, so reporting success for a write
 * that did not happen would let that action run unprotected.
 */
export async function createSnapshot(project: Project, label: string): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    label,
    project,
  };
  await idbPut('snapshots', snapshot);
  try {
    const all = await listSnapshots();
    for (const old of all.slice(SNAPSHOT_LIMIT)) await idbDelete('snapshots', old.id);
  } catch {
    // Pruning old points is housekeeping; the new snapshot is already stored.
  }
  return snapshot;
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    await idbDelete('snapshots', id);
  } catch {
    // ignore
  }
}
