import { describe, expect, it } from 'vitest';
import type { Project, TrashItem } from '../../types';
import { restoreRecord, trashRecord } from '../trash';
import { relationshipsFor } from '../selectors';
import { makeProject } from './fixture';

/**
 * Deleting a record changes other records: relationships are dropped, section
 * and domain assignments cleared, sources detached. These tests hold the
 * restore to putting all of that back, and to not overwriting anything the
 * author changed after the deletion.
 */

function remove(project: Project, entityType: string, id: string, label: string): TrashItem {
  const item = trashRecord(project, entityType, id, label);
  if (!item) throw new Error(`could not trash ${entityType} ${id}`);
  return item;
}

function trashed(project: Project, label: string): TrashItem {
  const item = project.trash.find((entry) => entry.label === label);
  if (!item) throw new Error(`no trash entry labelled ${label}`);
  return item;
}

const method = (project: Project, id: string) => project.methods.find((entry) => entry.id === id)!;
const relationshipIds = (project: Project, id: string) =>
  relationshipsFor(project, id)
    .map((entry) => entry.relationship.id)
    .sort();

describe('deleting and restoring a method', () => {
  it('stores and restores every relationship that pointed at it', () => {
    const project = makeProject();
    const item = remove(project, 'method', 'm_alpha', 'Sleep as infrastructure');

    expect(item.effects?.relationships.map((r) => r.id).sort()).toEqual([
      'rel_alpha_doc',
      'rel_alpha_note',
      'rel_src_alpha',
    ]);
    expect(project.relationships.map((r) => r.id)).toEqual(['rel_dangling']);
    expect(project.methods.some((entry) => entry.id === 'm_alpha')).toBe(false);

    expect(restoreRecord(project, item.id)).toBe(true);
    expect(project.methods.some((entry) => entry.id === 'm_alpha')).toBe(true);
    expect(relationshipIds(project, 'm_alpha')).toEqual(['rel_alpha_doc', 'rel_alpha_note', 'rel_src_alpha']);
    expect(project.trash).toHaveLength(0);
  });

  it('brings the record back with its own fields intact', () => {
    const project = makeProject();
    const item = remove(project, 'method', 'm_alpha', 'Sleep as infrastructure');

    restoreRecord(project, item.id);

    expect(method(project, 'm_alpha').purpose.problem).toBe('Sleep is treated as optional.');
    expect(method(project, 'm_alpha').tags).toEqual(['sleep', 'recovery']);
    expect(method(project, 'm_alpha').primarySectionId).toBe('sec_x');
  });
});

describe('deleting and restoring a section', () => {
  it('reapplies the assignment it cleared', () => {
    const project = makeProject();
    const item = remove(project, 'section', 'sec_x', 'Strength');

    expect(method(project, 'm_alpha').primarySectionId).toBe('');
    expect(method(project, 'm_alpha').relatedSectionIds).toEqual(['sec_y']);

    restoreRecord(project, item.id);

    expect(project.sections.some((entry) => entry.id === 'sec_x')).toBe(true);
    expect(method(project, 'm_alpha').primarySectionId).toBe('sec_x');
  });

  it('re-adds the section to the related lists that dropped it', () => {
    const project = makeProject();
    const item = remove(project, 'section', 'sec_y', 'Friendship');

    expect(method(project, 'm_alpha').relatedSectionIds).toEqual([]);

    restoreRecord(project, item.id);

    expect(method(project, 'm_alpha').relatedSectionIds).toEqual(['sec_y']);
  });

  it('does not overwrite an assignment made after the deletion', () => {
    const project = makeProject();
    const item = remove(project, 'section', 'sec_x', 'Strength');

    method(project, 'm_alpha').primarySectionId = 'sec_y';
    restoreRecord(project, item.id);

    expect(method(project, 'm_alpha').primarySectionId).toBe('sec_y');
  });
});

describe('deleting and restoring a domain', () => {
  it('reapplies a primary domain and the sections that belonged to it', () => {
    const project = makeProject();
    const item = remove(project, 'domain', 'dom_a', 'Physical Health');

    expect(method(project, 'm_alpha').primaryDomainId).toBe('');
    expect(project.sections.find((entry) => entry.id === 'sec_x')!.domainId).toBe('');

    restoreRecord(project, item.id);

    expect(method(project, 'm_alpha').primaryDomainId).toBe('dom_a');
    expect(project.sections.find((entry) => entry.id === 'sec_x')!.domainId).toBe('dom_a');
  });

  it('reapplies secondary domains', () => {
    const project = makeProject();
    const item = remove(project, 'domain', 'dom_b', 'Social Health');

    expect(method(project, 'm_alpha').secondaryDomainIds).toEqual([]);

    restoreRecord(project, item.id);

    expect(method(project, 'm_alpha').secondaryDomainIds).toEqual(['dom_b']);
  });
});

describe('deleting and restoring a source', () => {
  it('reconnects the notes, quotations and claims that cited it', () => {
    const project = makeProject();
    const item = remove(project, 'source', 'src_book', 'The Sabbath');

    expect(project.notes.find((entry) => entry.id === 'note_one')!.sourceId).toBe('');
    expect(project.quotations.find((entry) => entry.id === 'quote_one')!.sourceId).toBe('');
    expect(project.claims.find((entry) => entry.id === 'claim_supported')!.sourceIds).toEqual([]);

    restoreRecord(project, item.id);

    expect(project.notes.find((entry) => entry.id === 'note_one')!.sourceId).toBe('src_book');
    expect(project.quotations.find((entry) => entry.id === 'quote_one')!.sourceId).toBe('src_book');
    expect(project.claims.find((entry) => entry.id === 'claim_supported')!.sourceIds).toEqual(['src_book']);
  });
});

describe('deleting and restoring a manuscript branch', () => {
  it('trashes the subtree and restores a node with its own links', () => {
    const project = makeProject();
    const parent = remove(project, 'document', 'doc_part', 'Part one');

    expect(project.documents.map((doc) => doc.id)).toEqual(['doc_solo']);
    expect(project.trash.map((entry) => entry.label)).toEqual([
      'Unfinished chapter',
      'Recovery windows',
      'Sleep and attention',
      'Part one',
    ]);
    expect(parent.effects?.relationships).toEqual([]);
    expect(trashed(project, 'Sleep and attention').effects?.relationships.map((r) => r.id)).toEqual([
      'rel_alpha_doc',
    ]);

    expect(restoreRecord(project, trashed(project, 'Sleep and attention').id)).toBe(true);

    expect(project.documents.some((doc) => doc.id === 'doc_ch1')).toBe(true);
    expect(project.relationships.some((r) => r.id === 'rel_alpha_doc')).toBe(true);
  });
});

describe('trash entries written before effects were recorded', () => {
  it('restores the record instead of failing', () => {
    const project = makeProject();
    const item = remove(project, 'method', 'm_beta', 'First light');
    delete item.effects;

    expect(restoreRecord(project, item.id)).toBe(true);
    expect(project.methods.some((entry) => entry.id === 'm_beta')).toBe(true);
  });
});
