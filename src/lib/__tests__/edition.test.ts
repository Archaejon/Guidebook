import { describe, expect, it } from 'vitest';
import type { EditionFile } from '../edition';
import {
  assignSlugs,
  buildEdition,
  editionProblems,
  findEditionChapter,
  findEditionDomain,
  findEditionMethod,
  makeEditionFile,
  readingOrder,
} from '../edition';
import { makeProject } from './fixture';

const meta = { generatedAt: '2026-10-30T09:00:00.000Z', commit: 'abc1234' };

function editionFile(): EditionFile {
  const file = makeEditionFile(makeProject(), {}, meta);
  expect(editionProblems(file)).toEqual([]);
  return file;
}

describe('makeEditionFile', () => {
  it('carries only published records', () => {
    const file = editionFile();
    expect(file.edition.methods.map((method) => method.id)).toEqual(['m_alpha']);
    // sec_y carries no published method, so it and its domain stay out.
    expect(file.edition.sections.map((section) => section.id)).toEqual(['sec_x']);
    expect(file.edition.domains.map((domain) => domain.id)).toEqual(['dom_a']);
    // The rest of the workspace — notes, claims, manuscript — is not projected.
    expect(file).not.toHaveProperty('documents');
    expect(file).not.toHaveProperty('notes');
    expect(file.format).toBe('guidebook-edition');
    expect(file.source.commit).toBe('abc1234');
  });

  it('leaves section drafts and author notes out of the public file', () => {
    const file = editionFile();
    // The fixture's sec_x has a draft and m_alpha has author reflections.
    expect(file.edition.sections[0].draft).toBe('');
    expect(file.edition.methods[0].notes).toEqual({
      questions: [],
      disagreements: '',
      reflections: '',
      improvements: '',
      futureExperiments: '',
    });
  });

  it('records a slug for every included record and nothing else', () => {
    const file = editionFile();
    expect(file.edition.slugs).toEqual({
      dom_a: 'physical-health',
      sec_x: 'strength',
      m_alpha: 'sleep-as-infrastructure',
      doc_part: 'part-one',
      doc_ch1: 'sleep-and-attention',
      doc_sub: 'recovery-windows',
    });
  });

  it('drops slugs belonging to records that are no longer published', () => {
    const file = makeEditionFile(makeProject(), { m_beta: 'first-light', dom_b: 'social-health' }, meta);
    expect(file.edition.slugs).not.toHaveProperty('m_beta');
    expect(file.edition.slugs).not.toHaveProperty('dom_b');
  });
});

describe('manuscript chapters', () => {
  it('includes published text and its published ancestors, and nothing else', () => {
    const file = editionFile();
    expect(file.edition.documents.map((doc) => doc.id)).toEqual(['doc_part', 'doc_ch1', 'doc_sub']);
    // doc_part has no text of its own; it is kept as the chapter's part.
    expect(file.edition.documents[0].content).toBe('');
  });

  it('builds the tree from parentId and orders it by the authored order', () => {
    const edition = buildEdition(editionFile());
    expect(edition.chapters).toHaveLength(1);
    const [part] = edition.chapters;
    expect(part.doc.id).toBe('doc_part');
    expect(part.url).toBe('/read/chapter/part-one');
    expect(part.children.map((node) => node.doc.id)).toEqual(['doc_ch1']);
    expect(part.children[0].url).toBe('/read/chapter/sleep-and-attention');
    expect(part.children[0].children.map((node) => node.doc.id)).toEqual(['doc_sub']);
    expect(readingOrder(edition.chapters).map((node) => node.doc.id)).toEqual(['doc_part', 'doc_ch1', 'doc_sub']);
  });

  it('breaks the chain when a parent is a draft, rather than publishing under it', () => {
    const project = makeProject();
    project.documents[0].status = 'Draft';
    const file = makeEditionFile(project, {}, meta);
    expect(editionProblems(file)).toEqual([]);
    expect(file.edition.slugs).not.toHaveProperty('doc_part');
    const edition = buildEdition(file);
    expect(edition.chapters.map((node) => node.doc.id)).toEqual(['doc_ch1']);
    expect(edition.chapters[0].doc.parentId).toBeNull();
  });

  it('never copies review comments', () => {
    const project = makeProject();
    project.documents[1].comments = [
      { id: 'c1', excerpt: 'x', body: 'private remark', resolved: false, createdAt: meta.generatedAt },
    ];
    expect(makeEditionFile(project, {}, meta).edition.documents[1].comments).toEqual([]);
  });

  it('finds a chapter with its trail', () => {
    const edition = buildEdition(editionFile());
    const found = findEditionChapter(edition, 'recovery-windows');
    expect(found?.chapter.doc.id).toBe('doc_sub');
    expect(found?.trail.map((node) => node.doc.id)).toEqual(['doc_part', 'doc_ch1', 'doc_sub']);
    expect(findEditionChapter(edition, 'unfinished-chapter')).toBeUndefined();
  });

  it('rejects a draft chapter, a missing slug and a missing parent', () => {
    const file = editionFile();
    file.edition.documents.push({ ...file.edition.documents[1], id: 'doc_draft', status: 'Draft' });
    file.edition.slugs.doc_draft = 'draft-chapter';
    delete file.edition.slugs.doc_sub;
    file.edition.documents[2].parentId = 'doc_missing';
    const problems = editionProblems(file).join('\n');
    expect(problems).toMatch(/manuscript node doc_draft is Draft/);
    expect(problems).toMatch(/manuscript node doc_sub has no slug/);
    expect(problems).toMatch(/manuscript node doc_sub names parent doc_missing/);
  });

  it('rejects two chapters sharing a URL', () => {
    const file = editionFile();
    file.edition.documents.push({ ...file.edition.documents[1], id: 'doc_twin' });
    file.edition.slugs.doc_twin = 'sleep-and-attention';
    expect(editionProblems(file).join('\n')).toMatch(/manuscript nodes doc_ch1 and doc_twin share the slug/);
  });
});

describe('assignSlugs', () => {
  it('keeps a recorded slug when the title changes', () => {
    const project = makeProject();
    const published = project.methods.filter((method) => method.status === 'Published');
    const first = assignSlugs({ domains: project.domains, sections: project.sections, methods: published }).slugs;
    project.methods[0].title = 'Sleep, rewritten';
    const second = assignSlugs({ domains: project.domains, sections: project.sections, methods: published }, first);
    expect(second.slugs.m_alpha).toBe('sleep-as-infrastructure');
    expect(second.added).toEqual([]);
  });

  it('scopes section slugs per domain and method slugs globally', () => {
    const project = makeProject();
    const twin = { ...project.sections[0], id: 'sec_x_twin' };
    const otherDomain = { ...project.sections[0], id: 'sec_y_twin', domainId: 'dom_b' };
    const published = project.methods.filter((method) => method.status === 'Published');
    const twinMethod = { ...published[0], id: 'm_alpha_twin', title: 'Sleep as infrastructure' };
    const { slugs } = assignSlugs({
      domains: project.domains,
      sections: [project.sections[0], twin, otherDomain],
      methods: [published[0], twinMethod],
    });
    expect(slugs.sec_x).toBe('strength');
    expect(slugs.sec_x_twin).toBe('strength-2');
    // A different domain may reuse the section slug; the URL already differs.
    expect(slugs.sec_y_twin).toBe('strength');
    expect(slugs.m_alpha).toBe('sleep-as-infrastructure');
    expect(slugs.m_alpha_twin).toBe('sleep-as-infrastructure-2');
  });

  it('never emits a reserved or malformed slug', () => {
    const project = makeProject();
    const domain = { ...project.domains[0], title: 'Method' };
    const odd = { ...project.sections[0], title: '  ???  ' };
    const { slugs } = assignSlugs({ domains: [domain], sections: [odd], methods: [] });
    expect(slugs[domain.id]).toBe('method-2');
    expect(slugs[odd.id]).toBe('untitled');
  });
});

describe('buildEdition', () => {
  it('builds stable URLs from the recorded slugs', () => {
    const edition = buildEdition(editionFile());
    const [domain] = edition.domains;
    expect(domain.url).toBe('/read/physical-health');
    expect(domain.sections[0].url).toBe('/read/physical-health/strength');
    expect(domain.sections[0].methods[0].url).toBe('/read/method/sleep-as-infrastructure');
    expect(edition.methods[0].url).toBe('/read/method/sleep-as-infrastructure');
    expect(edition.title).toBe(makeProject().settings.readerTitle);
  });

  it('looks records up by slug', () => {
    const edition = buildEdition(editionFile());
    expect(findEditionDomain(edition, 'physical-health')?.domain.id).toBe('dom_a');
    expect(findEditionDomain(edition, 'social-health')).toBeUndefined();
    expect(findEditionMethod(edition, 'sleep-as-infrastructure')?.method.id).toBe('m_alpha');
    expect(findEditionMethod(edition, 'first-light')).toBeUndefined();
  });

  it('keeps a published method whose section was dropped reachable from its domain', () => {
    const file = editionFile();
    file.edition.sections = [];
    const edition = buildEdition(file);
    expect(edition.domains[0].sections).toEqual([]);
    expect(edition.domains[0].methods.map((entry) => entry.method.id)).toEqual(['m_alpha']);
  });
});

describe('editionProblems', () => {
  it('accepts the generated file', () => {
    expect(editionProblems(editionFile())).toEqual([]);
  });

  it('rejects a draft in the published surface', () => {
    const file = editionFile();
    const draft = { ...makeProject().methods[1] };
    file.edition.methods.push(draft);
    expect(editionProblems(file).join('\n')).toMatch(/is Idea; the edition may only contain Published records/);
  });

  it('rejects a method whose domain or section is missing', () => {
    const file = editionFile();
    file.edition.sections = [];
    expect(editionProblems(file)).toContain(
      'method m_alpha names section sec_x, which is not in the edition',
    );
  });

  it('rejects duplicate slugs, missing slugs, stale slugs and reserved slugs', () => {
    const file = editionFile();
    file.edition.slugs.m_alpha = 'sleep-as-infrastructure';
    file.edition.methods.push({ ...file.edition.methods[0], id: 'm_alpha_2' });
    file.edition.slugs.m_alpha_2 = 'sleep-as-infrastructure';
    delete file.edition.slugs.dom_a;
    file.edition.slugs.ghost = 'ghost';
    const problems = editionProblems(file).join('\n');
    expect(problems).toMatch(/methods m_alpha and m_alpha_2 share the slug/);
    expect(problems).toMatch(/domain dom_a has no slug/);
    expect(problems).toMatch(/slug recorded for ghost/);
  });

  it('rejects a domain slug that the router reserves', () => {
    const file = editionFile();
    file.edition.slugs.dom_a = 'method';
    expect(editionProblems(file).join('\n')).toMatch(/reserved slug "method"/);
  });

  it('rejects an unsupported format version', () => {
    const file = editionFile();
    file.formatVersion = 99;
    expect(editionProblems(file).join('\n')).toMatch(/this build understands 2/);
  });
});
