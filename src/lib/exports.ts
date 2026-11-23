import type { Method, Project } from '../types';
import { RELATIONSHIP_TYPES, SCALES } from '../types';
import {
  childDocuments,
  entityRoute,
  entityTitle,
  getEntity,
  getSection,
  orderedDocuments,
  relationshipsFor,
} from './selectors';
import { downloadFile, formatDate, linkTarget, slugify, stripMarkdown, wordCount } from './utils';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function markdownInlineToHtml(text: string, methodTitles: Map<string, string>): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\[\[method:([^\]|]+)\|([^\]]+)\]\]/g, (_m, id: string, label: string) => {
    const title = methodTitles.get(id) ?? label;
    return `<a class="method-ref" href="#method-${escapeHtml(id)}">${escapeHtml(title)}</a>`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, raw: string) => {
    const target = linkTarget(raw);
    // The export is a standalone file, so a site-relative link would point at a
    // route that does not exist there; only absolute web links are clickable.
    // `raw` is already HTML-escaped above, so it is inserted without escaping
    // again. A rejected target keeps the text exactly as the author wrote it.
    if (!target || target.kind !== 'external') return match;
    return `<a href="${target.href}" rel="noreferrer noopener">${label}</a>`;
  });
  return out;
}

export function markdownToHtml(content: string, methodTitles: Map<string, string>): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${markdownInlineToHtml(heading[2], methodTitles)}</h${level}>`);
      i += 1;
      continue;
    }
    if (line.trim().startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      output.push(`<blockquote>${quote.map((q) => `<p>${markdownInlineToHtml(q, methodTitles)}</p>`).join('')}</blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(markdownInlineToHtml(lines[i].replace(/^\s*[-*+]\s+/, ''), methodTitles));
        i += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(markdownInlineToHtml(lines[i].replace(/^\s*\d+[.)]\s+/, ''), methodTitles));
        i += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>`);
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    output.push(`<p>${paragraph.map((p) => markdownInlineToHtml(p, methodTitles)).join('<br />')}</p>`);
  }
  return output.join('\n');
}

const headingFor: Record<string, string> = {
  part: '#',
  chapter: '##',
  section: '###',
  subsection: '####',
  passage: '#####',
};

export function manuscriptMarkdown(project: Project, includeDrafts = true): string {
  const methodTitles = new Map(project.methods.map((m) => [m.id, m.title]));
  const lines: string[] = [
    `# ${project.settings.projectTitle}`,
    '',
    `*Manuscript export — ${formatDate(new Date().toISOString())}*`,
    '',
    `Author: ${project.settings.authorName || 'Unnamed author'}`,
    '',
    '---',
    '',
  ];
  const traversal = orderedDocuments(project);
  const roots = childDocuments(project, null);
  for (const root of roots) {
    const ordered = [root, ...traversal.filter((item) => item.doc.parentId && isDescendant(project, item.doc.id, root.id)).map((x) => x.doc)];
    for (const doc of ordered) {
      if (!includeDrafts && doc.status !== 'Published') continue;
      const depth = depthOf(project, doc.id);
      const hashes = headingFor[doc.kind] ?? '###';
      const headingLine = `${hashes} ${doc.title}`;
      lines.push('', headingLine, '');
      lines.push(`*${doc.kind} · ${doc.status}${wordCount(doc.content) ? ` · ${wordCount(doc.content)} words` : ''}*`, '');
      const content = doc.content
        .replace(/\[\[method:([^\]|]+)\|([^\]]+)\]\]/g, (_m, id: string, label: string) => {
          return `[${methodTitles.get(id) ?? label}](/method/${id})`;
        })
        .trim();
      if (content) {
        const contentWithoutDuplicateTitle = content.replace(new RegExp(`^#\\s+${escapeRegExp(doc.title)}\\s*\\n+`, 'i'), '');
        lines.push(contentWithoutDuplicateTitle, '');
      } else {
        lines.push(`*(No content yet — depth ${depth}.)*`, '');
      }
    }
  }
  lines.push('', '---', '', '## Method references', '');
  for (const method of project.methods) {
    lines.push(`- [${method.title}](/method/${method.id}) — ${method.summary || 'No summary yet.'}`);
  }
  return lines.join('\n');
}

function isDescendant(project: Project, id: string, ancestorId: string): boolean {
  let current = project.documents.find((d) => d.id === id);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = project.documents.find((d) => d.id === current?.parentId);
  }
  return false;
}

function depthOf(project: Project, id: string): number {
  let depth = 0;
  let current = project.documents.find((d) => d.id === id);
  while (current?.parentId) {
    depth += 1;
    current = project.documents.find((d) => d.id === current?.parentId);
  }
  return depth;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function plainTextManuscript(project: Project): string {
  const md = manuscriptMarkdown(project);
  return stripMarkdown(md).replace(/\n{3,}/g, '\n\n');
}

export function methodToMarkdown(project: Project, method: Method): string {
  const domain = project.domains.find((d) => d.id === method.primaryDomainId);
  const section = getSection(project, method.primarySectionId);
  const secondary = method.secondaryDomainIds
    .map((id) => project.domains.find((d) => d.id === id)?.title)
    .filter(Boolean)
    .join(', ');
  const links = relationshipsFor(project, method.id)
    .map((link) => `- ${RELATIONSHIP_TYPES.find((t) => t.key === link.relationship.type)?.label ?? link.relationship.type}: ${entityTitle(link.other)}`)
    .join('\n');
  const lines: string[] = [
    `# ${method.title}`,
    '',
    `*${method.status}${method.illustrative ? ' · illustrative sample' : ''}*`,
    '',
    method.summary,
    '',
    `**Domain:** ${domain?.title ?? 'Unassigned'}${section ? ` → ${section.title}` : ''}`,
    secondary ? `**Secondary domains:** ${secondary}` : '',
    method.tags.length ? `**Tags:** ${method.tags.join(', ')}` : '',
    '',
  ];
  const push = (heading: string, content: string) => {
    if (content && content.trim()) lines.push(`## ${heading}`, '', content.trim(), '');
  };
  push('Purpose — the problem', method.purpose.problem);
  push('Why it matters', method.purpose.importance);
  push('Intended outcomes', method.purpose.outcomes);
  push('Who it is for', method.purpose.suitableFor);
  push('When it may be unsuitable', method.purpose.unsuitableWhen);
  if (method.instructions.steps.some(Boolean) || method.instructions.preparation) {
    lines.push('## Practical instructions', '');
    push('Preparation', method.instructions.preparation);
    const steps = method.instructions.steps.filter(Boolean);
    if (steps.length) lines.push('### Steps', '', steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), '');
    push('Frequency and duration', method.instructions.frequency);
    push('Beginner variation', method.instructions.beginner);
    push('Intermediate variation', method.instructions.intermediate);
    push('Advanced variation', method.instructions.advanced);
    push('Adaptations', method.instructions.adaptations);
    push('Common mistakes', method.instructions.mistakes);
    push('Safety', method.instructions.safety);
  }
  push('Rationale — mechanisms', method.rationale.mechanisms);
  push('Evidence', method.rationale.evidence);
  push('Counter-evidence and limits', method.rationale.counterEvidence);
  push('Assumptions', method.rationale.assumptions);
  push('Uncertainties', method.rationale.uncertainties);
  push('Supporting science', method.knowledge.science);
  push('Books and publications', method.knowledge.books);
  push('Religious and philosophical sources', method.knowledge.philosophy);
  push('Historical examples', method.knowledge.history);
  push('Observations', method.knowledge.observations);
  push('Evaluation — success', method.evaluation.success);
  push('Measures', method.evaluation.measures);
  push('Timeframe', method.evaluation.timeframe);
  push('Costs and risks', method.evaluation.costs);
  push('Confidence', method.evaluation.confidence);
  push('Application — individual', method.application.self);
  push('Family and close relationships', method.application.family);
  push('Community', method.application.community);
  push('Society', method.application.society);
  push('Ecological effects', method.application.ecological);
  if (!method.hiddenSections.includes('scales')) {
    lines.push('## Multi-scale impacts', '');
    for (const scale of SCALES) {
      const value = method.scales[scale.key];
      const parts = [
        value.direct && `**Direct:** ${value.direct}`,
        value.indirect && `**Indirect:** ${value.indirect}`,
        value.beneficiaries && `**Who benefits:** ${value.beneficiaries}`,
        value.costs && `**Who bears the costs:** ${value.costs}`,
        value.dependencies && `**Dependencies:** ${value.dependencies}`,
        value.unintended && `**Unintended consequences:** ${value.unintended}`,
      ].filter(Boolean);
      if (parts.length) lines.push(`### ${scale.label}`, '', parts.join('  \n'), '');
    }
  }
  push('Author’s questions', method.notes.questions.filter(Boolean).map((q) => `- ${q}`).join('\n'));
  push('Unresolved disagreements', method.notes.disagreements);
  push('Reflections', method.notes.reflections);
  push('Possible improvements', method.notes.improvements);
  push('Future experiments', method.notes.futureExperiments);
  if (links) lines.push('## Connections', '', links, '');
  lines.push('---', '', `*Exported from ${project.settings.projectTitle} on ${formatDate(new Date().toISOString())}.*`);
  return lines.filter((line) => line !== null).join('\n');
}

export function methodLibraryMarkdown(project: Project): string {
  const lines = [`# ${project.settings.projectTitle} — Method library`, '', `Exported ${formatDate(new Date().toISOString())}`, ''];
  for (const domain of project.domains) {
    const methods = project.methods.filter((m) => m.primaryDomainId === domain.id);
    if (!methods.length) continue;
    lines.push(`## ${domain.roman}. ${domain.title}`, '');
    for (const method of methods) {
      lines.push(`### ${method.title}`, '', `*${method.status}*`, '', method.summary, '');
      if (method.tags.length) lines.push(`Tags: ${method.tags.join(', ')}`, '');
      lines.push(methodToMarkdown(project, method).replace(/^# .*\n\n/, ''), '---', '');
    }
  }
  return lines.join('\n');
}

export function bibliographyMarkdown(project: Project): string {
  const lines = [
    `# ${project.settings.projectTitle} — Sources and references`,
    '',
    `Exported ${formatDate(new Date().toISOString())}. This list reflects only records entered by the author; it is not a claim that every manuscript statement is sourced.`,
    '',
  ];
  for (const source of project.sources) {
    const bits = [
      source.creator || 'Unknown creator',
      source.year ? `(${source.year})` : '',
      `*${source.title}*`,
      source.publication ? `${source.publication}.` : '',
      source.identifier ? `Identifier: ${source.identifier}.` : '',
      source.url ? `URL: ${source.url}` : '',
      source.pages ? `Pages consulted: ${source.pages}.` : '',
    ].filter(Boolean);
    lines.push(`- ${bits.join(' ')}`);
    lines.push(`  - Type: ${source.kind}; reading status: ${source.readingStatus}; claim status: ${source.verification}.`);
    if (source.summary) lines.push(`  - Summary: ${stripMarkdown(source.summary)}`);
    if (source.limitations) lines.push(`  - Limitations: ${stripMarkdown(source.limitations)}`);
  }
  lines.push('', '## Quotations', '');
  if (!project.quotations.length) lines.push('_No quotations recorded._');
  for (const quote of project.quotations) {
    const source = project.sources.find((s) => s.id === quote.sourceId);
    lines.push(`> ${quote.text}`, '', `— ${source?.creator ?? 'Unattributed'}${source ? `, *${source.title}*` : ''}${quote.page ? `, p. ${quote.page}` : ''}`, '');
    if (quote.note) lines.push(`Note: ${quote.note}`, '');
  }
  lines.push('', '## Claims awaiting verification', '');
  for (const claim of project.claims.filter((c) => c.status !== 'Supported')) {
    lines.push(`- [${claim.status}] ${claim.statement}${claim.sourceIds.length ? '' : ' — no source attached'}`);
  }
  lines.push('', '*Do not present unsourced claims as established findings. Verify quotations against the original edition.*');
  return lines.join('\n');
}

export function downloadJsonBackup(project: Project): void {
  const payload = {
    format: 'guidebook-for-the-future/backup',
    version: project.version,
    exportedAt: new Date().toISOString(),
    project,
  };
  downloadFile(`guidebook-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export function downloadManuscriptMarkdown(project: Project): void {
  downloadFile(`${slugify(project.settings.projectTitle) || 'manuscript'}.md`, manuscriptMarkdown(project), 'text/markdown;charset=utf-8');
}

export function downloadManuscriptText(project: Project): void {
  downloadFile(`${slugify(project.settings.projectTitle) || 'manuscript'}.txt`, plainTextManuscript(project), 'text/plain;charset=utf-8');
}

export function downloadMethodLibrary(project: Project): void {
  downloadFile('method-library.md', methodLibraryMarkdown(project), 'text/markdown;charset=utf-8');
}

export function downloadBibliography(project: Project): void {
  downloadFile('sources-and-references.md', bibliographyMarkdown(project), 'text/markdown;charset=utf-8');
}

function methodArticleHtml(project: Project, method: Method, methodTitles: Map<string, string>): string {
  const domain = project.domains.find((d) => d.id === method.primaryDomainId);
  const section = getSection(project, method.primarySectionId);
  const blocks: string[] = [
    `<article class="method" id="method-${escapeHtml(method.id)}">`,
    `<p class="kicker">${escapeHtml(domain?.title ?? 'Method')}${section ? ` · ${escapeHtml(section.title)}` : ''}</p>`,
    `<h2>${escapeHtml(method.title)}</h2>`,
    method.summary ? `<p class="summary">${escapeHtml(method.summary)}</p>` : '',
    `<p class="method-status">${escapeHtml(method.status)}</p>`,
  ];
  const block = (heading: string, body: string) => {
    if (!body.trim()) return;
    blocks.push(`<section><h3>${escapeHtml(heading)}</h3>${markdownToHtml(body, methodTitles)}</section>`);
  };
  block('Why this matters', method.purpose.problem);
  block('Intended outcomes', method.purpose.outcomes);
  if (method.instructions.steps.filter(Boolean).length || method.instructions.preparation) {
    blocks.push('<section><h3>Practical instructions</h3>');
    if (method.instructions.preparation) blocks.push(markdownToHtml(method.instructions.preparation, methodTitles));
    const steps = method.instructions.steps.filter(Boolean);
    if (steps.length) blocks.push(`<ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`);
    if (method.instructions.frequency) blocks.push(`<p><em>${escapeHtml(method.instructions.frequency)}</em></p>`);
    if (method.instructions.safety) blocks.push(`<p class="safety"><strong>Safety:</strong> ${escapeHtml(method.instructions.safety)}</p>`);
    blocks.push('</section>');
  }
  block('Rationale', method.rationale.mechanisms);
  block('Evidence and limits', method.rationale.evidence);
  block('Counter-evidence', method.rationale.counterEvidence);
  block('Evaluation', method.evaluation.success);
  block('Author’s reflections', method.notes.reflections);
  blocks.push('</article>');
  return blocks.join('\n');
}

export function readerHtml(project: Project): string {
  const methodTitles = new Map(project.methods.map((m) => [m.id, m.title]));
  const publishedMethods = project.methods.filter((m) => m.status === 'Published');
  const publishedDocs = project.documents.filter((d) => d.status === 'Published');
  const nav = project.domains
    .map((domain) => {
      const methods = publishedMethods.filter((m) => m.primaryDomainId === domain.id);
      if (!methods.length) return '';
      return `<section class="domain-block"><h2>${escapeHtml(domain.roman)}. ${escapeHtml(domain.title)}</h2>${methods
        .map((m) => `<a href="#method-${escapeHtml(m.id)}">${escapeHtml(m.title)}</a>`)
        .join('')}</section>`;
    })
    .join('');
  const manuscript = publishedDocs.length
    ? `<section class="manuscript"><h1>Manuscript</h1>${publishedDocs
        .map(
          (doc) =>
            `<article><p class="kicker">${escapeHtml(doc.kind)}</p><h2>${escapeHtml(doc.title)}</h2>${markdownToHtml(
              doc.content,
              methodTitles,
            )}</article>`,
        )
        .join('')}</section>`
    : '';
  const methods = publishedMethods.map((m) => methodArticleHtml(project, m, methodTitles)).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(project.settings.readerTitle)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f7f2e8; color: #25272b; font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif; line-height: 1.7; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 64px 28px 96px; }
  .cover { border-bottom: 1px solid #d8cfbd; padding-bottom: 40px; margin-bottom: 48px; }
  .cover p.kicker, .kicker { font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; color: #6b6457; }
  h1 { font-size: clamp(34px, 6vw, 52px); line-height: 1.1; font-weight: 500; margin: 12px 0; }
  h2 { font-size: 30px; font-weight: 500; margin: 56px 0 12px; line-height: 1.2; }
  h3 { font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #4c4a5e; margin: 32px 0 8px; }
  a { color: #343864; }
  blockquote { margin: 24px 0; padding-left: 22px; border-left: 2px solid #b08d57; color: #4d4a43; font-style: italic; }
  .nav { margin: 40px 0 64px; display: grid; gap: 28px; }
  .domain-block a { display: block; margin: 6px 0; }
  .method { margin: 72px 0; padding-top: 32px; border-top: 1px solid #d8cfbd; }
  .summary { font-size: 20px; color: #4b4740; }
  .method-status { font-family: system-ui, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #6b6457; }
  .safety { padding: 12px 16px; background: #efe8da; border-left: 2px solid #a4573c; }
  footer { margin-top: 80px; padding-top: 24px; border-top: 1px solid #d8cfbd; font-family: system-ui, sans-serif; font-size: 12px; color: #6b6457; }
  @media (max-width: 600px) { .wrap { padding: 32px 18px 64px; } }
  @media print { body { background: white; } .wrap { max-width: none; padding: 0; } .method { break-inside: avoid; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="cover">
    <p class="kicker">Reader edition</p>
    <h1>${escapeHtml(project.settings.readerTitle)}</h1>
    <p>${escapeHtml(project.settings.projectTitle)} · ${escapeHtml(project.settings.authorName || 'Author')}</p>
    <p><em>Only material marked Published is included in this export.</em></p>
  </header>
  ${publishedMethods.length || publishedDocs.length ? `<nav class="nav">${nav}</nav>${methods}${manuscript}` : '<p>No material has been published yet. Mark a method or manuscript section as Published to include it.</p>'}
  <footer>Generated ${escapeHtml(formatDate(new Date().toISOString()))} · ${escapeHtml(project.settings.projectTitle)}</footer>
</div>
</body>
</html>`;
}

export function downloadReaderHtml(project: Project): void {
  downloadFile('guidebook-reader.html', readerHtml(project), 'text/html;charset=utf-8');
}

export function routeLabel(project: Project, id: string): string {
  const entity = getEntity(project, id);
  return entity ? `${entityTitle(entity)} — ${entityRoute(entity)}` : id;
}
