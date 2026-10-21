import { describe, expect, it } from 'vitest';
import { makeProject } from './fixture';
import {
  descendantIds,
  documentsForMethod,
  entityRoute,
  entitySubtitle,
  entityTitle,
  entityTypeLabel,
  extractMethodRefs,
  getEntity,
  incomingLinks,
  manuscriptWords,
  methodCompletion,
  methodsForDomain,
  methodsForSection,
  outgoingLinks,
  orderedDocuments,
  projectStats,
  relationshipsFor,
  routeForId,
  sectionsForDomain,
  sourcesLinkedTo,
  statusCounts,
} from '../selectors';
import { wordCount } from '../utils';

describe('getEntity', () => {
  it('resolves every entity type from the project', () => {
    const project = makeProject();
    const expected: [string, string][] = [
      ['dom_a', 'domain'],
      ['sec_x', 'section'],
      ['m_alpha', 'method'],
      ['doc_ch1', 'document'],
      ['src_book', 'source'],
      ['note_one', 'note'],
      ['quote_one', 'quotation'],
      ['claim_needs', 'claim'],
      ['exp_one', 'experiment'],
      ['inbox_one', 'inbox'],
    ];
    for (const [id, type] of expected) {
      const entity = getEntity(project, id);
      expect(entity, id).not.toBeNull();
      expect(entity?.type, id).toBe(type);
      expect(entity?.record.id).toBe(id);
    }
  });

  it('returns null for unknown and empty ids', () => {
    const project = makeProject();
    expect(getEntity(project, 'ghost_record')).toBeNull();
    expect(getEntity(project, '')).toBeNull();
  });
});

describe('entity labels and routes', () => {
  it('builds a route for every entity type', () => {
    const project = makeProject();
    const routes: Record<string, string> = {
      m_alpha: '/method/m_alpha',
      sec_x: '/guide/section/sec_x',
      dom_a: '/guide/dom_a',
      doc_ch1: '/studio/doc_ch1',
      src_book: '/research/src_book',
      note_one: '/research/note/note_one',
      quote_one: '/research?quote=quote_one',
      claim_needs: '/research?claim=claim_needs',
      exp_one: '/experiments/exp_one',
      inbox_one: '/inbox',
    };
    for (const [id, route] of Object.entries(routes)) {
      const entity = getEntity(project, id);
      expect(entity).not.toBeNull();
      expect(entityRoute(entity!), id).toBe(route);
      expect(routeForId(project, id), id).toBe(route);
    }
  });

  it('falls back to the connections page for an id with no record', () => {
    const project = makeProject();
    expect(routeForId(project, 'ghost_record')).toBe('/connections');
    expect(routeForId(project, '')).toBe('/connections');
  });

  it('uses statement or text as the title when a record has no title field', () => {
    const project = makeProject();
    expect(entityTitle(getEntity(project, 'claim_needs'))).toBe('Cold exposure improves mood.');
    expect(entityTitle(getEntity(project, 'quote_one'))).toBe(
      'Time is the presence of God in the world of space.',
    );
    expect(entityTitle(getEntity(project, 'src_book'))).toBe('The Sabbath');
    expect(entityTitle(null)).toBe('Untitled');
  });

  it('gives every entity type a human label', () => {
    const types = [
      'method',
      'section',
      'domain',
      'document',
      'source',
      'note',
      'quotation',
      'claim',
      'experiment',
      'inbox',
    ] as const;
    for (const type of types) expect(entityTypeLabel(type).length, type).toBeGreaterThan(0);
    expect(entityTypeLabel('document')).toBe('Manuscript');
  });

  it('describes a document subtitle with its word count', () => {
    const project = makeProject();
    const subtitle = entitySubtitle(getEntity(project, 'doc_ch1'));
    expect(subtitle).toContain('chapter');
    expect(subtitle).toContain('words');
  });
});

describe('relationships', () => {
  it('resolves both directions and labels them correctly', () => {
    const project = makeProject();
    const links = relationshipsFor(project, 'm_alpha');
    expect(links.map((l) => l.relationship.id).sort()).toEqual([
      'rel_alpha_doc',
      'rel_alpha_note',
      'rel_src_alpha',
    ]);
    const incoming = links.find((l) => l.relationship.id === 'rel_src_alpha');
    expect(incoming?.direction).toBe('incoming');
    expect(incoming?.other.type).toBe('source');
    expect(entityTitle(incoming?.other ?? null)).toBe('The Sabbath');

    const outgoing = links.find((l) => l.relationship.id === 'rel_alpha_doc');
    expect(outgoing?.direction).toBe('outgoing');
    expect(outgoing?.other.type).toBe('document');
  });

  it('drops relationships whose far end no longer exists', () => {
    const project = makeProject();
    // rel_dangling points at a deleted record; it must not surface from either end.
    expect(relationshipsFor(project, 'm_beta')).toEqual([]);
    expect(relationshipsFor(project, 'ghost_record')).toEqual([]);

    // A record that only has a dangling link must contribute nothing to the graph.
    const links = relationshipsFor(project, 'm_alpha');
    expect(links.some((l) => l.other.record.id === 'ghost_record')).toBe(false);
  });

  it('filters outgoing and incoming links by type', () => {
    const project = makeProject();
    expect(outgoingLinks(project, 'm_alpha', 'references').map((l) => l.relationship.id)).toEqual([
      'rel_alpha_doc',
    ]);
    expect(outgoingLinks(project, 'm_alpha', 'supports')).toEqual([]);
    expect(incomingLinks(project, 'm_alpha', 'supports').map((l) => l.relationship.id)).toEqual([
      'rel_src_alpha',
    ]);
    expect(incomingLinks(project, 'm_alpha', 'related_to')).toEqual([]);
    expect(outgoingLinks(project, 'm_alpha')).toHaveLength(2);
  });

  it('finds sources linked to a record whichever direction they point', () => {
    const project = makeProject();
    expect(sourcesLinkedTo(project, 'm_alpha').map((e) => e.record.id)).toEqual(['src_book']);
    expect(sourcesLinkedTo(project, 'note_one')).toEqual([]);
  });
});

describe('domain and section lookups', () => {
  it('groups sections by their owning domain', () => {
    const project = makeProject();
    expect(sectionsForDomain(project, 'dom_a').map((s) => s.id)).toEqual(['sec_x']);
    expect(sectionsForDomain(project, 'dom_b').map((s) => s.id)).toEqual(['sec_y']);
    expect(sectionsForDomain(project, 'ghost_record')).toEqual([]);
  });

  it('includes methods that name a domain as secondary', () => {
    const project = makeProject();
    expect(methodsForDomain(project, 'dom_a').map((m) => m.id)).toEqual(['m_alpha']);
    // m_alpha lists dom_b as a secondary domain and m_beta belongs to it outright.
    expect(methodsForDomain(project, 'dom_b').map((m) => m.id)).toEqual(['m_alpha', 'm_beta']);
  });

  it('includes methods that name a section as related', () => {
    const project = makeProject();
    expect(methodsForSection(project, 'sec_x').map((m) => m.id)).toEqual(['m_alpha']);
    expect(methodsForSection(project, 'sec_y').map((m) => m.id)).toEqual(['m_alpha']);
    expect(methodsForSection(project, 'ghost_record')).toEqual([]);
  });
});

describe('method references', () => {
  it('finds documents that mention a method inline, without a relationship', () => {
    const project = makeProject();
    expect(documentsForMethod(project, 'm_beta').map((d) => d.id)).toEqual(['doc_solo']);
  });

  it('de-duplicates a document that is both linked and mentioned', () => {
    const project = makeProject();
    // doc_ch1 is reachable via rel_alpha_doc and via a [[method:m_alpha]] token.
    expect(documentsForMethod(project, 'm_alpha').map((d) => d.id)).toEqual(['doc_ch1']);
  });

  it('extracts every inline reference with its label', () => {
    const refs = extractMethodRefs(
      'See [[method:m_alpha|Alpha]] and [[method:m_beta|Beta]]. Ignore [[method:broken]].',
    );
    expect(refs).toEqual([
      { id: 'm_alpha', label: 'Alpha' },
      { id: 'm_beta', label: 'Beta' },
    ]);
    expect(extractMethodRefs('no references here')).toEqual([]);
  });
});

describe('manuscript tree', () => {
  it('orders documents depth-first by explicit order', () => {
    const project = makeProject();
    const ordered = orderedDocuments(project);
    expect(ordered.map((x) => x.doc.id)).toEqual([
      'doc_part',
      'doc_ch1',
      'doc_sub',
      'doc_ch2',
      'doc_solo',
    ]);
    expect(ordered.map((x) => x.depth)).toEqual([0, 1, 2, 1, 0]);
  });

  it('collects every descendant of a node, at any depth', () => {
    const project = makeProject();
    expect(descendantIds(project, 'doc_part').sort()).toEqual(['doc_ch1', 'doc_ch2', 'doc_sub']);
    expect(descendantIds(project, 'doc_sub')).toEqual([]);
    expect(descendantIds(project, 'ghost_record')).toEqual([]);
  });
});

describe('aggregates', () => {
  it('counts manuscript words across every document, ignoring markdown syntax', () => {
    const project = makeProject();
    const expected = project.documents.reduce((sum, doc) => sum + wordCount(doc.content), 0);
    expect(manuscriptWords(project)).toBe(expected);
    // Inline method tokens count as their visible label only.
    expect(wordCount('[[method:m_alpha|the alpha method]]')).toBe(3);
  });

  it('scores method completeness from filled required fields', () => {
    const project = makeProject();
    const alpha = project.methods.find((m) => m.id === 'm_alpha')!;
    const beta = project.methods.find((m) => m.id === 'm_beta')!;
    expect(methodCompletion(alpha)).toBe(100);
    expect(methodCompletion(beta)).toBe(0);

    const partial = structuredClone(alpha);
    partial.summary = '';
    partial.instructions.steps = [];
    expect(methodCompletion(partial)).toBeLessThan(100);
    expect(methodCompletion(partial)).toBeGreaterThan(0);
  });

  it('counts methods per status', () => {
    const project = makeProject();
    expect(statusCounts(project)).toEqual({ Published: 1, Idea: 1 });
  });

  it('reports project statistics and only counts sources that are actually linked', () => {
    const project = makeProject();
    expect(projectStats(project)).toMatchObject({
      domains: 2,
      sections: 2,
      methods: 2,
      publishedMethods: 1,
      documents: 5,
      sources: 2,
      linkedSources: 1,
      notes: 1,
      quotations: 1,
      claims: 2,
      experiments: 1,
      openInbox: 1,
    });
    expect(projectStats(project).words).toBe(manuscriptWords(project));
  });

  it('does not count a source whose only relationship is dangling', () => {
    const project = makeProject();
    project.relationships = project.relationships.filter((r) => r.id !== 'rel_src_alpha');
    expect(projectStats(project).linkedSources).toBe(0);
  });
});
