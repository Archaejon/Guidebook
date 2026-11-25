import { mergeText } from './textDiff';

/**
 * Editors keep a working copy of the record they opened (the "draft") and
 * write it back after a pause in typing. In a shared project the stored record
 * can change underneath them, because a collaborator edited it. Two rules keep
 * that safe:
 *
 * - **Save only what you changed** (`changedFields`): writing the whole draft
 *   back would put the collaborator's fields back to the values this editor
 *   loaded, silently undoing their work.
 * - **Fold incoming changes into the draft** (`rebaseRecord`): a field this
 *   person has not touched takes the new value; a text field both people
 *   changed is merged; any other field both changed keeps what is on screen.
 */
type AnyRecord = Record<string, unknown>;

/** Fields that are never the editor's business to write back. */
const BOOKKEEPING = new Set(['updatedAt']);

export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The fields of `draft` that differ from `base`, ready to `Object.assign`. */
export function changedFields<T extends object>(base: T, draft: T): Partial<T> {
  const out: AnyRecord = {};
  const b = base as AnyRecord;
  const d = draft as AnyRecord;
  for (const key of Object.keys(d)) {
    if (BOOKKEEPING.has(key)) continue;
    if (!sameValue(b[key], d[key])) out[key] = structuredClone(d[key]);
  }
  return out as Partial<T>;
}

/**
 * Three-way merge of a whole record. Returns `draft` itself when nothing about
 * it needs to change, so a caller can skip a re-render.
 */
export function rebaseRecord<T extends object>(base: T, draft: T, incoming: T): T {
  const b = base as AnyRecord;
  const d = draft as AnyRecord;
  const i = incoming as AnyRecord;
  let out: AnyRecord | null = null;
  const keys = new Set([...Object.keys(d), ...Object.keys(i)]);
  for (const key of keys) {
    if (sameValue(d[key], i[key])) continue;
    let next: unknown;
    if (sameValue(d[key], b[key])) next = i[key]; // untouched here: take theirs
    else if (sameValue(i[key], b[key])) continue; // untouched there: keep mine
    else if (typeof b[key] === 'string' && typeof d[key] === 'string' && typeof i[key] === 'string') {
      next = mergeText(b[key] as string, d[key] as string, i[key] as string);
    } else continue; // both changed a non-text field: what is on screen wins
    if (sameValue(next, d[key])) continue;
    out ??= { ...d };
    if (next === undefined) delete out[key];
    else out[key] = structuredClone(next);
  }
  return (out ?? draft) as T;
}
