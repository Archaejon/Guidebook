import { describe, expect, it } from 'vitest';
import { editionProblems, findEditionChapter, readingOrder } from '../edition';
import { EDITION, EDITION_FILE, EDITION_METHOD_HREF } from '../editionData';

/**
 * The committed content file is part of the release: it is what the deployed
 * site serves. These tests fail when a hand edit leaves the file unpublishable,
 * and they run without the build script so a broken edition is caught by
 * `npm test` as well as by `npm run build`.
 */
describe('the committed edition', () => {
  it('is valid', () => {
    expect(editionProblems(EDITION_FILE)).toEqual([]);
  });

  it('has at least one published method and one domain', () => {
    expect(EDITION.methods.length).toBeGreaterThan(0);
    expect(EDITION.domains.length).toBeGreaterThan(0);
    expect(EDITION.title).toBeTruthy();
  });

  it('gives every method a distinct URL under /read/method/', () => {
    const urls = EDITION.methods.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const entry of EDITION.methods) {
      expect(entry.url).toBe(`/read/method/${entry.slug}`);
    }
  });

  it('gives every section a URL built from its domain and section slugs', () => {
    for (const domain of EDITION.domains) {
      expect(domain.url).toBe(`/read/${domain.slug}`);
      for (const section of domain.sections) {
        expect(section.url).toBe(`/read/${domain.slug}/${section.slug}`);
      }
    }
  });

  it('resolves cross-references only for methods that are published', () => {
    const first = EDITION.methods[0];
    expect(EDITION_METHOD_HREF(first.method.id)).toBe(first.url);
    expect(EDITION_METHOD_HREF('m_a_method_that_is_not_published')).toBeNull();
  });

  it('serves the published manuscript at chapter URLs', () => {
    expect(EDITION.chapters.length).toBeGreaterThan(0);
    const order = readingOrder(EDITION.chapters);
    expect(new Set(order.map((node) => node.url)).size).toBe(order.length);
    for (const node of order) {
      expect(node.url).toBe(`/read/chapter/${node.slug}`);
      expect(node.doc.status).toBe('Published');
      expect(findEditionChapter(EDITION, node.slug)?.chapter.doc.id).toBe(node.doc.id);
    }
    // The sample nests its one written section under a part and a chapter, so
    // the text is not at the root; the reading order is what a reader sees.
    expect(order.some((node) => node.doc.content.trim().length > 0)).toBe(true);
  });
});
