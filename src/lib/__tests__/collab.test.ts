import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { isEmptyDoc, readProject, writeProject } from '../collab/bridge';
import { changedFields, rebaseRecord } from '../collab/rebase';
import { saveDraft } from '../collab/useRecordBase';
import { applySplice, mergeText, shiftPosition, spliceDiff } from '../collab/textDiff';
import type { Project } from '../../types';
import { makeProject } from './fixture';

/** Two people's copies of one shared project, synced the way the room does it. */
function pair(seed: Project) {
  const a = new Y.Doc();
  const b = new Y.Doc();
  writeProject(a, null, seed);
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a), 'remote');
  return { a, b };
}

function sync(x: Y.Doc, y: Y.Doc) {
  const toY = Y.encodeStateAsUpdate(x, Y.encodeStateVector(y));
  const toX = Y.encodeStateAsUpdate(y, Y.encodeStateVector(x));
  Y.applyUpdate(y, toY, 'remote');
  Y.applyUpdate(x, toX, 'remote');
}

/** One local edit: clone, mutate, write the difference, return the new project. */
function edit(doc: Y.Doc, before: Project, mutate: (draft: Project) => void): Project {
  const after = structuredClone(before);
  mutate(after);
  writeProject(doc, before, after);
  return after;
}

describe('spliceDiff and mergeText', () => {
  it('finds the single splice between two strings', () => {
    expect(spliceDiff('hello world', 'hello brave world')).toEqual({ index: 6, remove: 0, insert: 'brave ' });
    expect(spliceDiff('abc', 'abc')).toEqual({ index: 0, remove: 0, insert: '' });
    expect(spliceDiff('aXc', 'aYc')).toEqual({ index: 1, remove: 1, insert: 'Y' });
    for (const [a, b] of [['', 'new'], ['gone', ''], ['aaa', 'aa'], ['x🌱y', 'x🌿y']]) {
      expect(applySplice(a, spliceDiff(a, b))).toBe(b);
    }
  });

  it('never splits an emoji surrogate pair', () => {
    const splice = spliceDiff('a🌱', 'a🌿');
    expect(splice.insert).toBe('🌿');
  });

  it('keeps both changes when they touch different stretches of text', () => {
    const base = 'The first line.\nThe last line.';
    const mine = 'The first line, revised.\nThe last line.';
    const theirs = 'The first line.\nThe last line, also revised.';
    expect(mergeText(base, mine, theirs)).toBe('The first line, revised.\nThe last line, also revised.');
    expect(mergeText(base, theirs, mine)).toBe('The first line, revised.\nThe last line, also revised.');
  });

  it('prefers mine when the two changes overlap', () => {
    expect(mergeText('one two three', 'one TWO three', 'one 2 three')).toBe('one TWO three');
  });

  it('keeps both insertions made at the same spot', () => {
    expect(mergeText('ab', 'aXb', 'aYb')).toMatch(/^a(XY|YX)b$/);
  });

  it('moves a caret past text inserted before it, and leaves it alone otherwise', () => {
    const splice = spliceDiff('hello world', 'hello brave world');
    expect(shiftPosition(9, splice)).toBe(15);
    expect(shiftPosition(3, splice)).toBe(3);
  });
});

describe('rebaseRecord and changedFields', () => {
  const base = { id: 'm1', title: 'Breath', summary: 'Slow breathing.', tags: ['calm'], order: 1 };

  it('takes their value for a field I have not touched', () => {
    const mine = { ...base, title: 'Breathwork' };
    const theirs = { ...base, tags: ['calm', 'sleep'] };
    expect(rebaseRecord(base, mine, theirs)).toEqual({ ...base, title: 'Breathwork', tags: ['calm', 'sleep'] });
  });

  it('merges a text field we both changed, and keeps mine for any other field', () => {
    const mine = { ...base, summary: 'Slow, deep breathing.', order: 2 };
    const theirs = { ...base, summary: 'Slow breathing. Twice a day.', order: 3 };
    expect(rebaseRecord(base, mine, theirs)).toEqual({ ...base, summary: 'Slow, deep breathing. Twice a day.', order: 2 });
  });

  it('returns the same draft object when nothing needs to change', () => {
    const mine = { ...base, title: 'Breathwork' };
    expect(rebaseRecord(base, mine, base)).toBe(mine);
    expect(rebaseRecord(base, mine, { ...mine })).toBe(mine);
  });

  it('writes back only the fields this editor changed', () => {
    expect(changedFields(base, { ...base, title: 'Breathwork', updatedAt: 'later' } as typeof base)).toEqual({ title: 'Breathwork' });
  });

  it('a stale editor no longer undoes a collaborator', () => {
    // The editor loaded `base`; meanwhile the collaborator changed the tags.
    const stored = { ...base, tags: ['calm', 'sleep'] };
    const draft = { ...base, title: 'Breathwork' };
    Object.assign(stored, changedFields(base, draft));
    expect(stored).toEqual({ ...base, title: 'Breathwork', tags: ['calm', 'sleep'] });
  });
});

describe('saveDraft: an editor saving while a collaborator edits the same record', () => {
  it('neither reverts the collaborator nor duplicates text typed after the save', () => {
    const loaded = { id: 'n1', title: 'Note', body: 'abc', tags: ['a'] };
    const baseRef = { current: structuredClone(loaded) as typeof loaded | null };
    // The collaborator changed the tags; the store has it, this editor has not seen it.
    const stored = { ...loaded, tags: ['a', 'b'] };
    // This person typed "d" and the editor saves.
    saveDraft(baseRef, stored, { ...loaded, body: 'abcd' }, {});
    expect(stored).toEqual({ id: 'n1', title: 'Note', body: 'abcd', tags: ['a', 'b'] });
    // They keep typing ("e") before the save echoes back; then the echo is rebased.
    const draft = { ...loaded, body: 'abcde' };
    const rebased = rebaseRecord(baseRef.current!, draft, stored);
    expect(rebased).toEqual({ id: 'n1', title: 'Note', body: 'abcde', tags: ['a', 'b'] });
    // And the next save writes the new letter without touching the tags.
    baseRef.current = structuredClone(stored);
    const later = { ...stored };
    saveDraft(baseRef, later, rebased, {});
    expect(later).toEqual({ id: 'n1', title: 'Note', body: 'abcde', tags: ['a', 'b'] });
  });
});

describe('the shared document bridge', () => {
  it('round-trips a project unchanged', () => {
    const project = makeProject();
    const doc = new Y.Doc();
    writeProject(doc, null, project);
    const read = readProject(doc, project);
    expect(read.methods).toEqual(project.methods);
    expect(read.documents).toEqual(project.documents);
    expect(read.relationships).toEqual(project.relationships);
  });

  it('keeps settings and meta per person', () => {
    const project = makeProject();
    const doc = new Y.Doc();
    writeProject(doc, null, project);
    const other = { ...project, settings: { ...project.settings, authorName: 'Someone else' } } as Project;
    expect(readProject(doc, other).settings).toBe(other.settings);
  });

  it('gives a guest the host’s project on first sync, and nothing before', () => {
    const project = makeProject();
    const host = new Y.Doc();
    const guest = new Y.Doc();
    expect(isEmptyDoc(guest)).toBe(true);
    writeProject(host, null, project);
    sync(host, guest);
    expect(isEmptyDoc(guest)).toBe(false);
    const empty: Project = { ...project, methods: [], documents: [], sections: [], domains: [] };
    const read = readProject(guest, empty);
    expect(read.methods.map((m) => m.id).sort()).toEqual(project.methods.map((m) => m.id).sort());
  });

  it('merges two people editing different fields of one record at once', () => {
    const seed = makeProject();
    const { a, b } = pair(seed);
    const id = seed.methods[0].id;
    edit(a, seed, (d) => {
      d.methods[0].title = 'Retitled by A';
    });
    edit(b, seed, (d) => {
      d.methods[0].summary = 'Summary by B';
    });
    sync(a, b);
    for (const doc of [a, b]) {
      const method = readProject(doc, seed).methods.find((m) => m.id === id)!;
      expect(method.title).toBe('Retitled by A');
      expect(method.summary).toBe('Summary by B');
    }
  });

  it('keeps both people’s words when they type in different parts of one chapter', () => {
    const seed = makeProject();
    const doc = seed.documents.find((d) => d.content.length > 20)!;
    const { a, b } = pair(seed);
    edit(a, seed, (d) => {
      const target = d.documents.find((x) => x.id === doc.id)!;
      target.content = 'OPENING BY A. ' + target.content;
    });
    edit(b, seed, (d) => {
      const target = d.documents.find((x) => x.id === doc.id)!;
      target.content = target.content + ' CLOSING BY B.';
    });
    sync(a, b);
    const merged = readProject(a, seed).documents.find((x) => x.id === doc.id)!.content;
    expect(merged).toBe('OPENING BY A. ' + doc.content + ' CLOSING BY B.');
    expect(readProject(b, seed).documents.find((x) => x.id === doc.id)!.content).toBe(merged);
  });

  it('propagates additions and deletions, placing new records where the app lists them', () => {
    const seed = makeProject();
    const { a, b } = pair(seed);
    const removed = seed.methods[0].id;
    const after = edit(a, seed, (d) => {
      d.methods = d.methods.filter((m) => m.id !== removed);
      d.notes.unshift({ ...structuredClone(d.notes[0]), id: 'note_new', createdAt: '2099-01-01T00:00:00.000Z' });
      d.relationships.push({ ...structuredClone(d.relationships[0]), id: 'rel_new' });
    });
    sync(a, b);
    const read = readProject(b, seed);
    expect(read.methods.some((m) => m.id === removed)).toBe(false);
    expect(read.notes[0].id).toBe('note_new');
    expect(read.relationships.at(-1)!.id).toBe('rel_new');
    expect(readProject(a, after).notes.map((n) => n.id)).toEqual(after.notes.map((n) => n.id));
  });

  it('writes nothing when nothing changed, and leaves unchanged lists as the same arrays', () => {
    const seed = makeProject();
    const doc = new Y.Doc();
    writeProject(doc, null, seed);
    let updates = 0;
    doc.on('update', () => updates++);
    writeProject(doc, seed, structuredClone(seed));
    expect(updates).toBe(0);
    const read = readProject(doc, seed);
    expect(read.methods).toBe(seed.methods);
  });
});
