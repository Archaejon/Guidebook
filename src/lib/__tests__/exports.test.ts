import { describe, expect, it } from 'vitest';
import { makeProject } from './fixture';
import {
  bibliographyMarkdown,
  manuscriptMarkdown,
  markdownInlineToHtml,
  markdownToHtml,
  methodLibraryMarkdown,
  methodToMarkdown,
  plainTextManuscript,
  readerHtml,
  routeLabel,
} from '../exports';

const methodTitles = new Map([['m_alpha', 'Sleep as infrastructure']]);

describe('markdownToHtml', () => {
  it('renders headings, lists, quotes, paragraphs and inline formatting', () => {
    const html = markdownToHtml(
      [
        '# Heading one',
        '',
        'A paragraph with **bold**, *italic*, `code` and a [link](https://example.com).',
        '',
        '- first',
        '- second',
        '',
        '1. one',
        '2. two',
        '',
        '> a quoted line',
      ].join('\n'),
      methodTitles,
    );
    expect(html).toContain('<h1>Heading one</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://example.com" rel="noreferrer noopener">link</a>');
    expect(html).toContain('<ul><li>first</li><li>second</li></ul>');
    expect(html).toContain('<ol><li>one</li><li>two</li></ol>');
    expect(html).toContain('<blockquote><p>a quoted line</p></blockquote>');
  });

  it('escapes HTML in the source instead of executing it', () => {
    const html = markdownToHtml(
      'An <img src=x onerror="alert(1)"> tag and <script>alert(2)</script>.',
      methodTitles,
    );
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;alert(1)&quot;');
  });

  it('keeps fenced code literal', () => {
    const html = markdownToHtml(['```', 'const x = 1 < 2;', '```'].join('\n'), methodTitles);
    expect(html).toBe('<pre><code>const x = 1 &lt; 2;</code></pre>');
  });

  it('resolves method references to the canonical title and anchor', () => {
    const html = markdownToHtml('See [[method:m_alpha|the practice]].', methodTitles);
    expect(html).toContain('<a class="method-ref" href="#method-m_alpha">Sleep as infrastructure</a>');
    expect(html).not.toContain('the practice');
  });

  it('falls back to the written label when the method no longer exists', () => {
    const html = markdownToHtml('See [[method:m_gone|the old practice]].', methodTitles);
    expect(html).toContain('>the old practice</a>');
  });

  it('does not linkify non-http URLs', () => {
    const html = markdownInlineToHtml('[click](javascript:alert(1))', methodTitles);
    expect(html).not.toContain('<a');
    expect(html).toContain('click');
  });

  it('leaves other schemes and protocol-relative targets as written', () => {
    for (const target of ['data:text/html,hi', 'mailto:someone@example.com', '//evil.example']) {
      const html = markdownInlineToHtml(`[click](${target})`, methodTitles);
      expect(html, target).not.toContain('<a');
      expect(html, target).toContain(target);
    }
  });

  it('does not create a dead site-relative link in the standalone export', () => {
    const html = markdownInlineToHtml('[read](/method/m_alpha)', methodTitles);
    expect(html).not.toContain('<a');
    expect(html).toContain('/method/m_alpha');
  });

  it('escapes quotes and ampersands in inline text', () => {
    expect(markdownInlineToHtml('Tom & "Jerry"\'s', methodTitles)).toBe(
      'Tom &amp; &quot;Jerry&quot;&#39;s',
    );
  });
});

describe('manuscriptMarkdown', () => {
  it('exports the manuscript in tree order with a heading per document kind', () => {
    const project = makeProject();
    const md = manuscriptMarkdown(project);
    expect(md.startsWith('# Test Guidebook')).toBe(true);
    expect(md).toContain('Author: Test Author');

    const part = md.indexOf('# Part one');
    const chapter = md.indexOf('## Sleep and attention');
    const subsection = md.indexOf('#### Recovery windows');
    const draftChapter = md.indexOf('## Unfinished chapter');
    expect(part).toBeGreaterThan(-1);
    expect(chapter).toBeGreaterThan(part);
    expect(subsection).toBeGreaterThan(chapter);
    expect(draftChapter).toBeGreaterThan(subsection);
    expect(md).toContain('## Standalone chapter');
  });

  it('turns inline method tokens into absolute links', () => {
    const project = makeProject();
    const md = manuscriptMarkdown(project);
    expect(md).toContain('[Sleep as infrastructure](/method/m_alpha)');
    expect(md).not.toContain('[[method:');
  });

  it('lists every method in the reference index', () => {
    const project = makeProject();
    const md = manuscriptMarkdown(project);
    expect(md).toContain('## Method references');
    expect(md).toContain('- [Sleep as infrastructure](/method/m_alpha) — Protect sleep before optimising anything else.');
    expect(md).toContain('- [First light](/method/m_beta) — No summary yet.');
  });

  it('omits unpublished documents when drafts are excluded', () => {
    const project = makeProject();
    const md = manuscriptMarkdown(project, false);
    expect(md).not.toContain('Draft-only opening paragraph');
    expect(md).not.toContain('## Unfinished chapter');
    expect(md).not.toContain('## Standalone chapter');
    expect(md).toContain('## Sleep and attention');
    // The published part survives even though it has no content.
    expect(md).toContain('*(No content yet — depth 0.)*');
  });
});

describe('plainTextManuscript', () => {
  it('strips markdown syntax and method tokens', () => {
    const project = makeProject();
    const text = plainTextManuscript(project);
    expect(text).not.toContain('##');
    expect(text).not.toContain('**');
    expect(text).not.toContain('[[method:');
    expect(text).not.toContain('](/method/');
    expect(text).toContain('Sleep and attention');
    expect(text).toContain('Sleep as infrastructure');
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe('methodToMarkdown', () => {
  it('writes the full method record with numbered steps and connections', () => {
    const project = makeProject();
    const method = project.methods.find((m) => m.id === 'm_alpha')!;
    const md = methodToMarkdown(project, method);
    expect(md.startsWith('# Sleep as infrastructure')).toBe(true);
    expect(md).toContain('*Published · illustrative sample*');
    expect(md).toContain('**Domain:** Physical Health → Strength');
    expect(md).toContain('**Secondary domains:** Social Health');
    expect(md).toContain('**Tags:** sleep, recovery');
    expect(md).toContain('## Practical instructions');
    expect(md).toContain('### Steps');
    expect(md).toContain('1. Set a fixed wake time.');
    expect(md).toContain('2. Avoid screens for an hour.');
    expect(md).toContain('## Multi-scale impacts');
    expect(md).toContain('### Self');
    expect(md).toContain('**Direct:** More energy.');
    expect(md).toContain('## Connections');
    expect(md).toContain('Supports: The Sabbath');
    expect(md).toContain('References: Sleep and attention');
    expect(md).toContain('Related to: Attention as reverence');
    expect(md).not.toContain('ghost_record');
  });

  it('omits headings for sections with no content', () => {
    const project = makeProject();
    const beta = project.methods.find((m) => m.id === 'm_beta')!;
    const md = methodToMarkdown(project, beta);
    expect(md).toContain('# First light');
    expect(md).not.toContain('## Evidence');
    expect(md).not.toContain('## Practical instructions');
    expect(md).not.toContain('## Connections');
  });

  it('respects hidden sections', () => {
    const project = makeProject();
    const method = structuredClone(project.methods.find((m) => m.id === 'm_alpha')!);
    method.hiddenSections = ['scales'];
    expect(methodToMarkdown(project, method)).not.toContain('## Multi-scale impacts');
  });
});

describe('methodLibraryMarkdown', () => {
  it('groups methods under their primary domain only', () => {
    const project = makeProject();
    const md = methodLibraryMarkdown(project);
    expect(md.startsWith('# Test Guidebook — Method library')).toBe(true);
    expect(md).toContain('## I. Physical Health');
    expect(md).toContain('## II. Social Health');
    expect(md.indexOf('## I. Physical Health')).toBeLessThan(md.indexOf('### Sleep as infrastructure'));
    expect(md.indexOf('## II. Social Health')).toBeLessThan(md.indexOf('### First light'));
    expect(md).toContain('Tags: sleep, recovery');
  });

  it('skips domains with no methods', () => {
    const project = makeProject();
    project.domains.push({
      ...project.domains[0],
      id: 'dom_empty',
      roman: 'III',
      title: 'Empty Domain',
    });
    expect(methodLibraryMarkdown(project)).not.toContain('Empty Domain');
  });
});

describe('bibliographyMarkdown', () => {
  it('lists sources, quotations and unverified claims', () => {
    const project = makeProject();
    const md = bibliographyMarkdown(project);
    expect(md).toContain('Abraham Heschel (1951) *The Sabbath*');
    expect(md).toContain('Identifier: ISBN 9780374529512.');
    expect(md).toContain('Type: book; reading status: Read; claim status: Stated in source.');
    expect(md).toContain('> Time is the presence of God in the world of space.');
    expect(md).toContain('— Abraham Heschel, *The Sabbath*, p. 12');
    expect(md).toContain('Note: Verify wording against the edition.');
    expect(md).toContain('- [Needs source] Cold exposure improves mood. — no source attached');
  });

  it('excludes supported claims and flags unsourced work', () => {
    const project = makeProject();
    const md = bibliographyMarkdown(project);
    expect(md).not.toContain('Strength training improves physical function.');
    expect(md).toContain('Do not present unsourced claims as established findings.');
  });

  it('says so when there are no quotations', () => {
    const project = makeProject();
    project.quotations = [];
    expect(bibliographyMarkdown(project)).toContain('_No quotations recorded._');
  });
});

describe('readerHtml', () => {
  it('includes published material only', () => {
    const project = makeProject();
    const html = readerHtml(project);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Sleep as infrastructure');
    expect(html).toContain('Sleep and attention');
    expect(html).toContain('Recovery windows');
    expect(html).not.toContain('First light');
    expect(html).not.toContain('Unfinished chapter');
    expect(html).not.toContain('Draft-only opening paragraph');
    expect(html).toContain('Only material marked Published is included in this export.');
  });

  it('links the navigation only to published methods', () => {
    const project = makeProject();
    const html = readerHtml(project);
    expect(html).toContain('href="#method-m_alpha"');
    expect(html).not.toContain('href="#method-m_beta"');
    expect(html).toContain('I. Physical Health');
    expect(html).not.toContain('II. Social Health');
  });

  it('resolves method tokens inside published manuscript content', () => {
    const project = makeProject();
    const html = readerHtml(project);
    expect(html).toContain('<a class="method-ref" href="#method-m_alpha">Sleep as infrastructure</a>');
  });

  it('reports an empty reader edition when nothing is published', () => {
    const project = makeProject();
    for (const method of project.methods) method.status = 'Idea';
    for (const doc of project.documents) doc.status = 'Draft';
    const html = readerHtml(project);
    expect(html).toContain('No material has been published yet.');
    expect(html).not.toContain('<article class="method"');
    expect(html).not.toContain('<nav class="nav">');
  });

  it('escapes titles and author names', () => {
    const project = makeProject();
    project.settings.readerTitle = '<script>alert("reader")</script>';
    project.settings.authorName = 'A & B';
    project.methods[0].title = '<b>Unsafe</b> & title';
    const html = readerHtml(project);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(&quot;reader&quot;)&lt;/script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('&lt;b&gt;Unsafe&lt;/b&gt; &amp; title');
  });
});

describe('routeLabel', () => {
  it('combines the record title with its route', () => {
    const project = makeProject();
    expect(routeLabel(project, 'm_alpha')).toBe('Sleep as infrastructure — /method/m_alpha');
    expect(routeLabel(project, 'ghost_record')).toBe('ghost_record');
  });
});
