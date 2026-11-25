import * as Y from 'yjs';
import type { Project } from '../../types';
import { sameValue } from './rebase';
import { spliceDiff } from './textDiff';

/**
 * The bridge between the app's plain `Project` object and the shared Yjs
 * document that collaborators sync.
 *
 * The app keeps working on plain objects (`update()` clones and mutates), so
 * nothing outside this file needs to know Yjs exists. After each local change
 * the store calls `writeProject(doc, before, after)`, which records only what
 * differs; after a change from a collaborator it calls `readProject(doc, local)`
 * to get a plain project back.
 *
 * Layout: one top-level map per collection (`c:methods`, …), keyed by record id.
 * Each record is a map of fields. A string field is a `Y.Text` edited by
 * splice, so two people typing in different parts of a chapter both keep their
 * words. Any other value (numbers, lists, nested objects) is stored as plain
 * JSON and the later write wins.
 *
 * `settings` (the dashboard, pinned sections) and `meta` stay per person and
 * are never synced.
 */
export const SYNCED_COLLECTIONS = [
  'domains',
  'sections',
  'methods',
  'documents',
  'sources',
  'notes',
  'quotations',
  'claims',
  'experiments',
  'inbox',
  'relationships',
  'trash',
] as const satisfies readonly (keyof Project)[];

export type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

/**
 * Collections the app lists newest first (it `unshift`s new records). A record
 * arriving from a collaborator goes to the front of these, and to the end of
 * the others, matching where it would have appeared had it been created here.
 */
const NEWEST_FIRST = new Set<SyncedCollection>([
  'sources',
  'notes',
  'quotations',
  'claims',
  'experiments',
  'inbox',
  'trash',
]);

type Rec = { id: string } & Record<string, unknown>;
type RecordMap = Y.Map<unknown>;

export function collectionMap(doc: Y.Doc, key: SyncedCollection): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(`c:${key}`);
}

function toYValue(value: unknown): unknown {
  if (typeof value === 'string') return new Y.Text(value);
  return value === undefined ? undefined : structuredClone(value);
}

function fromYValue(value: unknown): unknown {
  return value instanceof Y.Text ? value.toString() : value;
}

function newRecordMap(record: Rec): RecordMap {
  const map = new Y.Map<unknown>();
  for (const [field, value] of Object.entries(record)) {
    if (value !== undefined) map.set(field, toYValue(value));
  }
  return map;
}

function writeField(map: RecordMap, field: string, value: unknown): void {
  if (value === undefined) {
    if (map.has(field)) map.delete(field);
    return;
  }
  const current = map.get(field);
  if (typeof value === 'string' && current instanceof Y.Text) {
    const before = current.toString();
    if (before === value) return;
    const { index, remove, insert } = spliceDiff(before, value);
    if (remove) current.delete(index, remove);
    if (insert) current.insert(index, insert);
    return;
  }
  if (sameValue(fromYValue(current), value)) return;
  map.set(field, toYValue(value));
}

function writeRecord(map: RecordMap, before: Rec | undefined, after: Rec): void {
  for (const [field, value] of Object.entries(after)) {
    if (before && sameValue(before[field], value)) continue;
    writeField(map, field, value);
  }
  if (before) {
    for (const field of Object.keys(before)) {
      if (!(field in after) && map.has(field)) map.delete(field);
    }
  }
}

/**
 * Records what changed between `before` and `after` in the shared document, in
 * one transaction tagged with `origin`. With `before` null the whole project is
 * written, which is how a new shared project is seeded.
 */
export function writeProject(doc: Y.Doc, before: Project | null, after: Project, origin: unknown = 'local'): void {
  doc.transact(() => {
    for (const key of SYNCED_COLLECTIONS) {
      const shared = collectionMap(doc, key);
      const prev = before ? (before[key] as unknown as Rec[]) : null;
      const next = after[key] as unknown as Rec[];
      if (prev === next) continue;
      const prevById = new Map((prev ?? []).map((r) => [r.id, r]));
      const nextIds = new Set<string>();
      for (const record of next) {
        if (!record || typeof record.id !== 'string') continue;
        nextIds.add(record.id);
        const old = prevById.get(record.id);
        if (old === record) continue;
        const map = shared.get(record.id);
        if (!map) shared.set(record.id, newRecordMap(record));
        else writeRecord(map, old, record);
      }
      if (prev) {
        for (const id of prevById.keys()) {
          if (!nextIds.has(id) && shared.has(id)) shared.delete(id);
        }
      }
    }
  }, origin);
}

function readRecord(map: RecordMap): Rec {
  const out: Record<string, unknown> = {};
  map.forEach((value, field) => {
    out[field] = fromYValue(value);
  });
  return out as Rec;
}

/**
 * The shared document as a plain project. Per-person parts (`settings`,
 * `meta`, `version`) come from `local`, and so does the order of records it
 * already holds; see `NEWEST_FIRST` for where new ones go.
 */
export function readProject(doc: Y.Doc, local: Project): Project {
  const out: Project = { ...local };
  for (const key of SYNCED_COLLECTIONS) {
    const shared = collectionMap(doc, key);
    const records = new Map<string, Rec>();
    shared.forEach((map, id) => {
      if (map instanceof Y.Map) records.set(id, readRecord(map));
    });
    const localList = local[key] as unknown as Rec[];
    const known = localList.filter((r) => records.has(r.id)).map((r) => {
      const fresh = records.get(r.id)!;
      records.delete(r.id);
      return sameValue(r, fresh) ? r : fresh;
    });
    const arrived = [...records.values()].sort((a, b) =>
      String(a.createdAt ?? a.deletedAt ?? a.id).localeCompare(String(b.createdAt ?? b.deletedAt ?? b.id)),
    );
    const list = NEWEST_FIRST.has(key) ? [...arrived.reverse(), ...known] : [...known, ...arrived];
    const unchanged = list.length === localList.length && list.every((r, i) => r === localList[i]);
    (out as unknown as Record<string, Rec[]>)[key] = unchanged ? localList : list;
  }
  return out;
}

/** True when the shared document holds no records yet (a guest before first sync). */
export function isEmptyDoc(doc: Y.Doc): boolean {
  return SYNCED_COLLECTIONS.every((key) => collectionMap(doc, key).size === 0);
}
