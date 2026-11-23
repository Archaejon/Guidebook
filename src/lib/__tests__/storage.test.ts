import { describe, expect, it } from 'vitest';
import { newestCopy, type StoredCopy } from '../storage';
import { makeProject } from './fixture';

function copy(source: StoredCopy['source'], savedAt: number): StoredCopy {
  return { project: makeProject(), savedAt, source };
}

/**
 * A save can land in localStorage after IndexedDB refused it. Loading used to
 * prefer IndexedDB unconditionally, which rolled the project back to the older
 * record; `newestCopy` is the rule that decides which copy is the user's work.
 */
describe('newestCopy', () => {
  it('returns whichever copy exists when only one does', () => {
    const primary = copy('indexeddb', 10);
    const fallback = copy('localstorage', 10);
    expect(newestCopy(primary, null)).toBe(primary);
    expect(newestCopy(null, fallback)).toBe(fallback);
    expect(newestCopy(null, null)).toBeNull();
  });

  it('prefers a newer fallback copy over an older IndexedDB record', () => {
    const primary = copy('indexeddb', 1_000);
    const fallback = copy('localstorage', 2_000);
    expect(newestCopy(primary, fallback)).toBe(fallback);
  });

  it('keeps IndexedDB when it is newer, or on a tie', () => {
    const fallback = copy('localstorage', 1_000);
    expect(newestCopy(copy('indexeddb', 2_000), fallback)?.source).toBe('indexeddb');
    expect(newestCopy(copy('indexeddb', 1_000), fallback)?.source).toBe('indexeddb');
  });

  it('treats an unstamped copy as the oldest', () => {
    const unstamped = copy('indexeddb', -1);
    const fallback = copy('localstorage', 0);
    expect(newestCopy(unstamped, fallback)).toBe(fallback);
    expect(newestCopy(copy('indexeddb', 0), copy('localstorage', -1))?.source).toBe('indexeddb');
  });
});
