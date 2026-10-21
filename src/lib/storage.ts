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

function idbPut(store: string, value: unknown, key?: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = key ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
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
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function loadProject(): Promise<Project | null> {
  try {
    const stored = await idbGet<Project>('state', STATE_KEY);
    if (stored) return stored;
  } catch {
    // fall through to localStorage
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Project;
  } catch {
    // corrupted local fallback
  }
  return null;
}

export async function saveProject(project: Project): Promise<void> {
  try {
    await idbPut('state', project, STATE_KEY);
  } catch {
    // Still try localStorage as a fallback; it may fail for very large projects.
    localStorage.setItem(LS_KEY, JSON.stringify(project));
  }
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

export async function createSnapshot(project: Project, label: string): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    label,
    project,
  };
  try {
    await idbPut('snapshots', snapshot);
    const all = await listSnapshots();
    for (const old of all.slice(SNAPSHOT_LIMIT)) await idbDelete('snapshots', old.id);
  } catch {
    // Snapshots are best-effort; saving still works without them.
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
