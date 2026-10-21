import { describe, expect, it } from 'vitest';
import { pageTitle } from '../pageTitle';

describe('pageTitle', () => {
  it('falls back to the site name when a page has no heading yet', () => {
    expect(pageTitle(null)).toBe('Guidebook for the Future');
    expect(pageTitle(undefined)).toBe('Guidebook for the Future');
    expect(pageTitle('   ')).toBe('Guidebook for the Future');
  });

  it('puts the page heading first, because a truncated tab shows the start', () => {
    expect(pageTitle('Writing Studio')).toBe('Writing Studio — Guidebook for the Future');
  });

  it('does not repeat the site name when the heading already contains it', () => {
    expect(pageTitle('Guidebook for the Future — Reader Edition')).toBe(
      'Guidebook for the Future — Reader Edition',
    );
  });

  it('collapses whitespace from multi-line headings', () => {
    expect(pageTitle('\n  The  Physical\n Domain \t')).toBe(
      'The Physical Domain — Guidebook for the Future',
    );
  });

  it('truncates long headings so the site name stays visible', () => {
    const title = pageTitle('A'.repeat(120));
    expect(title).toBe(`${'A'.repeat(69)}… — Guidebook for the Future`);
    expect(pageTitle('B'.repeat(70))).toBe(`${'B'.repeat(70)} — Guidebook for the Future`);
  });
});
