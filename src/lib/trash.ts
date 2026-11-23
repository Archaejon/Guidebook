import type { ID, ManuscriptDoc, Project, TrashCollection, TrashEffects, TrashItem } from '../types';
import { now, uid } from './factory';

/**
 * Deleting a record is not a removal. It also drops the relationships that
 * pointed at the record, unassigns a method that sat in the deleted section,
 * and blanks the source on every note, quotation and claim that cited it.
 * "Recently deleted" only promised the record itself came back, so a restore
 * returned an isolated record and lost all of that for good.
 *
 * A deletion now records what it changed (`TrashEffects`) and a restore
 * replays it. The replay is deliberately conditional rather than a snapshot
 * restore: a list entry is re-added only if it is still missing, and a cleared
 * field is refilled only if it is still blank. An assignment the author made
 * *after* the deletion is newer information and wins, so restoring an old
 * record can never undo newer work.
 */
export const COLLECTIONS: { key: keyof Project; entityType: string }[] = [
  { key: 'sections', entityType: 'section' },
  { key: 'methods', entityType: 'method' },
  { key: 'documents', entityType: 'document' },
  { key: 'sources', entityType: 'source' },
  { key: 'notes', entityType: 'note' },
  { key: 'quotations', entityType: 'quotation' },
  { key: 'claims', entityType: 'claim' },
  { key: 'experiments', entityType: 'experiment' },
  { key: 'domains', entityType: 'domain' },
  { key: 'inbox', entityType: 'inbox' },
];

function fieldRecord(
  project: Project,
  change: { collection: TrashCollection; id: ID },
): Record<string, unknown> | null {
  const records = project[change.collection] as unknown as { id: ID }[];
  const found = records.find((record) => record.id === change.id);
  return found ? (found as unknown as Record<string, unknown>) : null;
}

/** Blanks a single-value reference that still points at the deleted record. */
function clearReference(
  project: Project,
  effects: TrashEffects,
  collection: TrashCollection,
  id: ID,
  field: string,
  deletedId: ID,
): void {
  const record = fieldRecord(project, { collection, id });
  if (!record || record[field] !== deletedId) return;
  effects.cleared.push({ collection, id, field, previous: deletedId });
  record[field] = '';
}

/** Removes an id from a list field, remembering that it was there. */
function dropFromList(
  project: Project,
  effects: TrashEffects,
  collection: TrashCollection,
  id: ID,
  field: string,
  deletedId: ID,
): void {
  const record = fieldRecord(project, { collection, id });
  if (!record) return;
  const list = record[field];
  if (!Array.isArray(list) || !list.includes(deletedId)) return;
  effects.detached.push({ collection, id, field, value: deletedId });
  record[field] = list.filter((value) => value !== deletedId);
}

/**
 * Removes one record's links and references, returning what it changed elsewhere.
 * The record itself is not removed here; the caller owns the collection it lives in.
 */
export function detachRecord(project: Project, entityType: string, id: ID): TrashEffects {
  const effects: TrashEffects = { relationships: [], cleared: [], detached: [] };

  const removed = project.relationships.filter((r) => r.fromId === id || r.toId === id);
  if (removed.length) {
    effects.relationships = removed;
    project.relationships = project.relationships.filter((r) => r.fromId !== id && r.toId !== id);
  }

  if (entityType === 'section') {
    for (const method of project.methods) {
      clearReference(project, effects, 'methods', method.id, 'primarySectionId', id);
      dropFromList(project, effects, 'methods', method.id, 'relatedSectionIds', id);
    }
    for (const section of project.sections) {
      dropFromList(project, effects, 'sections', section.id, 'relatedSectionIds', id);
    }
  }

  if (entityType === 'domain') {
    // Domains are structural: deleting one unassigns its sections rather than
    // orphaning them, and those assignments are recorded for the restore.
    for (const section of project.sections) {
      clearReference(project, effects, 'sections', section.id, 'domainId', id);
    }
    for (const method of project.methods) {
      clearReference(project, effects, 'methods', method.id, 'primaryDomainId', id);
      dropFromList(project, effects, 'methods', method.id, 'secondaryDomainIds', id);
    }
  }

  if (entityType === 'source') {
    for (const note of project.notes) clearReference(project, effects, 'notes', note.id, 'sourceId', id);
    for (const quotation of project.quotations) {
      clearReference(project, effects, 'quotations', quotation.id, 'sourceId', id);
    }
    for (const claim of project.claims) dropFromList(project, effects, 'claims', claim.id, 'sourceIds', id);
  }

  return effects;
}

/**
 * Every manuscript node below `id`, gathered with a work list rather than
 * recursion so a malformed parent link cannot recurse forever.
 */
export function descendantDocuments(project: Project, id: ID): ManuscriptDoc[] {
  const ids = new Set<ID>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const doc of project.documents) {
      if (doc.parentId && ids.has(doc.parentId) && !ids.has(doc.id)) {
        ids.add(doc.id);
        grew = true;
      }
    }
  }
  return project.documents.filter((doc) => doc.id !== id && ids.has(doc.id));
}

/**
 * Moves a record to the trash, recording what the deletion changed elsewhere.
 * Manuscript nodes take their subtree with them, and each node becomes its own
 * trash entry so any one of them can be brought back on its own.
 */
export function trashRecord(project: Project, entityType: string, id: ID, label: string): TrashItem | null {
  const collection = COLLECTIONS.find((candidate) => candidate.entityType === entityType);
  if (!collection) return null;
  const records = project[collection.key] as unknown as { id: ID }[];
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return null;

  const [record] = records.splice(index, 1);
  const item: TrashItem = {
    id: uid('trash'),
    entityType,
    label,
    deletedAt: now(),
    data: record,
    effects: detachRecord(project, entityType, id),
  };
  project.trash.unshift(item);

  if (entityType === 'document') {
    for (const child of descendantDocuments(project, id)) {
      const childIndex = project.documents.findIndex((doc) => doc.id === child.id);
      if (childIndex < 0) continue;
      const [childRecord] = project.documents.splice(childIndex, 1);
      project.trash.unshift({
        id: uid('trash'),
        entityType: 'document',
        label: childRecord.title,
        deletedAt: now(),
        data: childRecord,
        effects: detachRecord(project, 'document', childRecord.id),
      });
    }
  }

  return item;
}

/**
 * Puts a trash entry back and replays what its deletion changed.
 *
 * A re-added relationship is kept even when its other end is still deleted:
 * relationships with a missing end are already hidden from every surface, so
 * the link simply becomes visible again when that record is restored too.
 * That keeps the outcome independent of the order records are restored in.
 */
export function restoreEffects(project: Project, effects: TrashEffects | undefined): void {
  if (!effects) return;

  for (const relationship of effects.relationships ?? []) {
    if (project.relationships.some((existing) => existing.id === relationship.id)) continue;
    project.relationships.push({ ...relationship });
  }

  for (const change of effects.cleared ?? []) {
    const record = fieldRecord(project, change);
    if (!record) continue;
    if (record[change.field] === '') record[change.field] = change.previous;
  }

  for (const change of effects.detached ?? []) {
    const record = fieldRecord(project, change);
    if (!record) continue;
    const list = record[change.field];
    if (!Array.isArray(list) || list.includes(change.value)) continue;
    list.push(change.value);
  }
}

/** Restores one trash entry. Returns false when the entry cannot be restored. */
export function restoreRecord(project: Project, trashId: ID): boolean {
  const index = project.trash.findIndex((item) => item.id === trashId);
  if (index < 0) return false;
  const item = project.trash[index];
  const collection = COLLECTIONS.find((candidate) => candidate.entityType === item.entityType);
  if (!collection) return false;

  const records = project[collection.key] as unknown as { id: ID }[];
  const record = item.data as { id: ID };
  if (!records.some((existing) => existing.id === record.id)) records.push(record);

  project.trash.splice(index, 1);
  restoreEffects(project, item.effects);
  return true;
}
