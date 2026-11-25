import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { changedFields, rebaseRecord, sameValue } from './rebase';

/**
 * Keeps an editor's working copy (`draft`) in step with the stored `record`,
 * which a collaborator may change while the editor is open.
 *
 * Returns the base: the stored record as this editor last saw it. Save with
 * `savedFields(base, draft)` so only this person's changes are written. When
 * the stored record changes, the draft takes every field the person has not
 * touched, and a text field both people changed is merged (see
 * `rebaseRecord`). In the personal workspace nobody else writes, so the only
 * changes seen are the editor's own saves, which leave the draft as it is.
 */
export function useRecordBase<T extends { id: string }>(
  record: T | undefined,
  setDraft: Dispatch<SetStateAction<T | null>>,
): MutableRefObject<T | null> {
  const baseRef = useRef<T | null>(record ? structuredClone(record) : null);
  useEffect(() => {
    if (!record) return;
    const base = baseRef.current;
    if (base && base.id === record.id && sameValue(base, record)) return;
    if (base && base.id === record.id) {
      setDraft((draft) => (draft && draft.id === record.id ? rebaseRecord(base, draft, record) : draft));
    }
    baseRef.current = structuredClone(record);
  }, [record, setDraft]);
  return baseRef;
}

/**
 * Writes the draft's changes into `target` (the stored record, inside an
 * `update()` mutator) and records the result as the new base.
 *
 * Moving the base forward at save time matters: when this save comes back as
 * a store change, the base already matches it, so it is recognised as this
 * editor's own echo and never merged into text typed since.
 */
export function saveDraft<T extends object>(
  baseRef: MutableRefObject<T | null>,
  target: T,
  draft: T,
  stamp: Partial<T>,
): void {
  const base = baseRef.current ?? target;
  const changes = changedFields(base, draft);
  Object.assign(target, changes, stamp);
  // Only this editor's own changes move the base. `target` may already hold a
  // collaborator's edit the draft has not seen; folding that into the base
  // would hide it from the next rebase, and the save after would revert it.
  baseRef.current = structuredClone({ ...base, ...changes, ...stamp });
}
