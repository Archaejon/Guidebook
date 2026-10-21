import { describe, expect, it } from 'vitest';
import { makeProject } from './fixture';
import { blankDocument, blankSource } from '../factory';
import { EMPTY_FILTERS, allTags, resolveSearchTarget, searchProject } from '../search';
import { entityRoute, getEntity } from '../selectors';

const ids = (results: { id: string }[]) => results.map((r) => r.id);

describe('searchProject', () => {
  it('returns every record for an empty query, newest first', () => {
    const project = makeProject();
    const results = searchProject(project, '', EMPTY_FILTERS);
    expect(results).toHaveLength(19);
    const timestamps = results.map((r) => r.updatedAt);
    const sorted = [...timestamps].sort().reverse();
    expect(timestamps).toEqual(sorted);
    expect(new Set(ids(results)).size).toBe(results.length);
  });

  it('ranks exact title, partial title, tag and body matches in that order', () => {
    const project = makeProject();
    project.sources = [
      blankSource({ id: 's_exact', title: 'Kelp', creator: '', year: '', tags: [], summary: '' }),
      blankSource({ id: 's_partial', title: 'Kelp forests', creator: '', year: '', tags: [], summary: '' }),
      blankSource({ id: 's_tag', title: 'Neither', creator: '', year: '', tags: ['kelp'], summary: '' }),
      blankSource({ id: 's_body', title: 'Something else', creator: '', year: '', tags: [], summary: 'kelp' }),
    ];
    const results = searchProject(project, 'kelp', EMPTY_FILTERS);
    expect(ids(results)).toEqual(['s_exact', 's_partial', 's_tag', 's_body']);
    expect(results[0].type).toBe('source');
  });

  it('ignores case and surrounding whitespace', () => {
    const project = makeProject();
    const lower = ids(searchProject(project, 'sleep', EMPTY_FILTERS));
    const upper = ids(searchProject(project, '  SLEEP  ', EMPTY_FILTERS));
    expect(upper).toEqual(lower);
    expect(lower).toContain('m_alpha');
  });

  it('returns nothing when no record matches, and survives regex characters', () => {
    const project = makeProject();
    expect(searchProject(project, 'zzzzzz', EMPTY_FILTERS)).toEqual([]);
    expect(() => searchProject(project, '([*+?', EMPTY_FILTERS)).not.toThrow();
    expect(searchProject(project, '([*+?', EMPTY_FILTERS)).toEqual([]);
  });

  it('returns no ids that are not resolvable records', () => {
    const project = makeProject();
    // rel_dangling points at a deleted id; search indexes records, not relationships.
    const results = searchProject(project, '', EMPTY_FILTERS);
    for (const result of results) expect(getEntity(project, result.id), result.id).not.toBeNull();
  });

  it('reports the route of the record it references', () => {
    const project = makeProject();
    for (const result of searchProject(project, 'sleep', EMPTY_FILTERS)) {
      const entity = getEntity(project, result.id);
      expect(result.route).toBe(entityRoute(entity!));
    }
  });

  it('caps the result list at 150 records', () => {
    const project = makeProject();
    for (let i = 0; i < 200; i += 1) {
      project.inbox.push({ id: `inbox_${i}`, text: `capture ${i}`, createdAt: new Date().toISOString() });
    }
    expect(searchProject(project, '', EMPTY_FILTERS)).toHaveLength(150);
  });
});

describe('search excerpts', () => {
  it('centres the excerpt on the match and marks the truncation', () => {
    const project = makeProject();
    const filler = 'word '.repeat(80).trim();
    project.documents.push(
      blankDocument({
        id: 'doc_long',
        title: 'Long chapter',
        content: `${filler} needle appears here ${filler}`,
        status: 'Draft',
      }),
    );
    const [result] = searchProject(project, 'needle', EMPTY_FILTERS);
    expect(result.id).toBe('doc_long');
    expect(result.excerpt).toContain('needle');
    expect(result.excerpt.startsWith('…')).toBe(true);
    expect(result.excerpt.endsWith('…')).toBe(true);
    expect(result.excerpt.length).toBeLessThan(300);
    // The excerpt keeps roughly 60 characters of lead-in before the match.
    const matchAt = result.excerpt.indexOf('needle');
    expect(matchAt).toBeGreaterThanOrEqual(55);
    expect(matchAt).toBeLessThanOrEqual(70);
  });

  it('shows the opening of the record when the query is not in the body', () => {
    const project = makeProject();
    const [result] = searchProject(project, 'Sleep', EMPTY_FILTERS);
    // The exact title match on the one-word source has no body text to excerpt.
    expect(result.id).toBe('src_unlinked');
    expect(result.excerpt).toBeTruthy();
  });
});

describe('search filters', () => {
  it('restricts by record type', () => {
    const project = makeProject();
    const results = searchProject(project, '', { ...EMPTY_FILTERS, types: ['method'] });
    expect(ids(results).sort()).toEqual(['m_alpha', 'm_beta']);
  });

  it('restricts by domain and excludes records with no domain', () => {
    const project = makeProject();
    const results = searchProject(project, '', { ...EMPTY_FILTERS, domainId: 'dom_a' });
    expect(ids(results).sort()).toEqual(['dom_a', 'm_alpha', 'sec_x']);
    expect(results.every((r) => r.domainId === 'dom_a')).toBe(true);
  });

  it('restricts by status using the record status field', () => {
    const project = makeProject();
    const results = searchProject(project, '', { ...EMPTY_FILTERS, status: 'Published' });
    expect(ids(results).sort()).toEqual(['doc_ch1', 'doc_part', 'doc_sub', 'm_alpha']);
  });

  it('restricts by source kind', () => {
    const project = makeProject();
    expect(ids(searchProject(project, '', { ...EMPTY_FILTERS, sourceKind: 'book' }))).toEqual([
      'src_book',
    ]);
    expect(ids(searchProject(project, '', { ...EMPTY_FILTERS, sourceKind: 'paper' }))).toEqual([
      'src_unlinked',
    ]);
  });

  it('matches tags case-insensitively and only on exact tag names', () => {
    const project = makeProject();
    expect(ids(searchProject(project, '', { ...EMPTY_FILTERS, tag: 'REST' }))).toEqual(['src_book']);
    expect(ids(searchProject(project, '', { ...EMPTY_FILTERS, tag: 'res' }))).toEqual([]);
  });

  it('combines a tag filter with a type filter', () => {
    const project = makeProject();
    expect(
      ids(searchProject(project, '', { ...EMPTY_FILTERS, types: ['source'], tag: 'rest' })),
    ).toEqual(['src_book']);
    expect(
      ids(searchProject(project, '', { ...EMPTY_FILTERS, types: ['note'], tag: 'rest' })),
    ).toEqual([]);
  });

  it('drops records older than the selected date range', () => {
    const project = makeProject();
    const results = searchProject(project, '', { ...EMPTY_FILTERS, dateRange: '7d' });
    const resultIds = ids(results);
    expect(resultIds).toContain('m_alpha');
    expect(resultIds).not.toContain('exp_one');
    expect(resultIds).not.toContain('dom_a');
    expect(resultIds).not.toContain('sec_y');
  });

  it('treats an unknown date range as no restriction', () => {
    const project = makeProject();
    expect(searchProject(project, '', { ...EMPTY_FILTERS, dateRange: 'whenever' })).toHaveLength(19);
  });
});

describe('allTags', () => {
  it('unions tags from methods, sources and notes, sorted and unique', () => {
    const project = makeProject();
    expect(allTags(project)).toEqual([
      'attention',
      'obscure',
      'recovery',
      'rest',
      'ritual',
      'sleep',
      'time',
    ]);
    expect(new Set(allTags(project)).size).toBe(allTags(project).length);
  });
});

describe('resolveSearchTarget', () => {
  it('resolves a record id to its page and falls back for unknown ids', () => {
    const project = makeProject();
    expect(resolveSearchTarget(project, 'm_alpha')).toBe('/method/m_alpha');
    expect(resolveSearchTarget(project, 'doc_ch1')).toBe('/studio/doc_ch1');
    expect(resolveSearchTarget(project, 'ghost_record')).toBe('/connections');
  });
});
