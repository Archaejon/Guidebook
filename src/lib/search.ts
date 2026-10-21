import type { Project, SearchResult } from '../types';
import { entityRoute, getEntity, routeForId } from './selectors';
import { excerpt } from './utils';

export interface SearchFilters {
  types: string[];
  domainId: string;
  status: string;
  sourceKind: string;
  tag: string;
  dateRange: string;
}

export const EMPTY_FILTERS: SearchFilters = {
  types: [],
  domainId: '',
  status: '',
  sourceKind: '',
  tag: '',
  dateRange: '',
};

interface IndexedRecord {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  body: string;
  route: string;
  domainId?: string;
  status?: string;
  sourceKind?: string;
  tags: string[];
  updatedAt: string;
}

function indexProject(project: Project): IndexedRecord[] {
  const records: IndexedRecord[] = [];
  const sectionTitle = (id: string) => project.sections.find((s) => s.id === id)?.title ?? '';
  const domainTitle = (id: string) => project.domains.find((d) => d.id === id)?.title ?? '';
  const sourceTitle = (id: string) => project.sources.find((s) => s.id === id)?.title ?? '';
  const docTitle = (id: string) => project.documents.find((d) => d.id === id)?.title ?? '';

  for (const d of project.domains) {
    records.push({
      id: d.id,
      type: 'domain',
      title: d.title,
      subtitle: `Domain ${d.roman} · ${d.subtitle}`,
      body: [d.intro, d.purpose, ...d.outcomes, ...d.principles, ...d.questions].join(' '),
      route: `/guide/${d.id}`,
      domainId: d.id,
      tags: [],
      updatedAt: d.updatedAt,
    });
  }
  for (const s of project.sections) {
    records.push({
      id: s.id,
      type: 'section',
      title: s.title,
      subtitle: `${domainTitle(s.domainId)} · Section`,
      body: [s.description, ...s.outcomes, ...s.frameworks, ...s.questions, s.draft].join(' '),
      route: `/guide/section/${s.id}`,
      domainId: s.domainId,
      tags: [],
      updatedAt: s.updatedAt,
    });
  }
  for (const m of project.methods) {
    const secondary = m.secondaryDomainIds.map(domainTitle).join(', ');
    records.push({
      id: m.id,
      type: 'method',
      title: m.title,
      subtitle: `${domainTitle(m.primaryDomainId)}${m.primarySectionId ? ` · ${sectionTitle(m.primarySectionId)}` : ''}${secondary ? ` · also ${secondary}` : ''}`,
      body: [
        m.summary,
        m.tags.join(' '),
        Object.values(m.purpose).join(' '),
        m.instructions.preparation,
        m.instructions.steps.join(' '),
        m.instructions.frequency,
        m.instructions.beginner,
        m.instructions.intermediate,
        m.instructions.advanced,
        m.instructions.adaptations,
        m.instructions.mistakes,
        m.rationale.mechanisms,
        m.rationale.evidence,
        m.rationale.counterEvidence,
        m.rationale.assumptions,
        m.rationale.uncertainties,
        Object.values(m.knowledge).join(' '),
        Object.values(m.evaluation).join(' '),
        Object.values(m.application).join(' '),
        m.notes.questions.join(' '),
        m.notes.reflections,
        m.notes.improvements,
        Object.values(m.scales)
          .map((s) => Object.values(s).join(' '))
          .join(' '),
        m.secondaryDomainIds.map(domainTitle).join(' '),
        m.relatedSectionIds.map(sectionTitle).join(' '),
      ].join(' '),
      route: `/method/${m.id}`,
      domainId: m.primaryDomainId,
      status: m.status,
      tags: m.tags,
      updatedAt: m.updatedAt,
    });
  }
  for (const doc of project.documents) {
    records.push({
      id: doc.id,
      type: 'document',
      title: doc.title,
      subtitle: `${doc.kind}${doc.parentId ? ` in ${docTitle(doc.parentId)}` : ''} · ${doc.status}`,
      body: doc.content,
      route: `/studio/${doc.id}`,
      status: doc.status,
      tags: [],
      updatedAt: doc.updatedAt,
    });
  }
  for (const s of project.sources) {
    records.push({
      id: s.id,
      type: 'source',
      title: s.title,
      subtitle: `${s.creator}${s.year ? `, ${s.year}` : ''} · ${s.readingStatus}`,
      body: [
        s.summary,
        s.keyClaims,
        s.evidence,
        s.limitations,
        s.interpretation,
        s.implications,
        s.publication,
        s.pages,
        s.tags.join(' '),
        s.identifier,
      ].join(' '),
      route: `/research/${s.id}`,
      status: s.readingStatus,
      sourceKind: s.kind,
      tags: s.tags,
      updatedAt: s.updatedAt,
    });
  }
  for (const n of project.notes) {
    records.push({
      id: n.id,
      type: 'note',
      title: n.title,
      subtitle: n.sourceId ? `Reading note on ${sourceTitle(n.sourceId)}` : 'Reading note',
      body: [n.body, n.tags.join(' ')].join(' '),
      route: `/research/note/${n.id}`,
      tags: n.tags,
      updatedAt: n.updatedAt,
    });
  }
  for (const q of project.quotations) {
    records.push({
      id: q.id,
      type: 'quotation',
      title: sourceTitle(q.sourceId) || 'Quotation',
      subtitle: `Quotation${q.page ? ` · p. ${q.page}` : ''}`,
      body: [q.text, q.note].join(' '),
      route: `/research?quote=${q.id}`,
      tags: [],
      updatedAt: q.createdAt,
    });
  }
  for (const c of project.claims) {
    records.push({
      id: c.id,
      type: 'claim',
      title: c.statement,
      subtitle: `${c.status} claim`,
      body: [c.notes, c.sourceIds.map(sourceTitle).join(' ')].join(' '),
      route: `/research?claim=${c.id}`,
      status: c.status,
      tags: [],
      updatedAt: c.updatedAt,
    });
  }
  for (const e of project.experiments) {
    records.push({
      id: e.id,
      type: 'experiment',
      title: e.title,
      subtitle: `${e.scale} · ${e.status}`,
      body: [
        e.hypothesis,
        e.context,
        e.participants,
        e.procedure,
        e.expected,
        e.observations,
        e.worked,
        e.failed,
        e.confounders,
        e.lessons,
        e.revisions,
      ].join(' '),
      route: `/experiments/${e.id}`,
      status: e.status,
      tags: [],
      updatedAt: e.updatedAt,
    });
  }
  for (const i of project.inbox) {
    records.push({
      id: i.id,
      type: 'inbox',
      title: 'Inbox capture',
      subtitle: i.text.slice(0, 90),
      body: i.text,
      route: '/inbox',
      tags: [],
      updatedAt: i.createdAt,
    });
  }
  return records;
}

function dateCutoff(range: string): number | null {
  const now = Date.now();
  if (range === '7d') return now - 7 * 86400000;
  if (range === '30d') return now - 30 * 86400000;
  if (range === 'year') return now - 365 * 86400000;
  return null;
}

export function searchProject(project: Project, query: string, filters: SearchFilters): SearchResult[] {
  const q = query.trim().toLowerCase();
  const cutoff = dateCutoff(filters.dateRange);
  const indexed = indexProject(project);

  const filtered = indexed.filter((record) => {
    if (filters.types.length && !filters.types.includes(record.type)) return false;
    if (filters.domainId && record.domainId !== filters.domainId) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.sourceKind && record.sourceKind !== filters.sourceKind) return false;
    if (filters.tag) {
      const tag = filters.tag.toLowerCase();
      if (!record.tags.some((t) => t.toLowerCase() === tag)) return false;
    }
    if (cutoff && new Date(record.updatedAt).getTime() < cutoff) return false;
    return true;
  });

  const scored = filtered.map((record) => {
    let score = 0;
    if (!q) {
      score = 1;
    } else if (record.title.toLowerCase() === q) {
      score = 120;
    } else if (record.title.toLowerCase().includes(q)) {
      score = 90;
    } else if (record.tags.some((tag) => tag.toLowerCase().includes(q))) {
      score = 60;
    } else if (record.subtitle.toLowerCase().includes(q)) {
      score = 40;
    } else if (record.body.toLowerCase().includes(q)) {
      score = 20;
    }
    if (q && score > 0) {
      const occurrences = record.body.toLowerCase().split(q).length - 1;
      score += Math.min(occurrences, 6);
    }
    return { record, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (q && b.score !== a.score) return b.score - a.score;
      return a.record.updatedAt < b.record.updatedAt ? 1 : -1;
    })
    .slice(0, 150)
    .map(({ record }) => ({
      id: record.id,
      title: record.title,
      subtitle: record.subtitle,
      excerpt: q ? excerpt(record.body, q) : excerpt(record.body, '', 150),
      type: record.type,
      route: record.route,
      domainId: record.domainId,
      status: record.status,
      tags: record.tags,
      updatedAt: record.updatedAt,
    }));
}

export function allTags(project: Project): string[] {
  const tags = new Set<string>();
  for (const m of project.methods) m.tags.forEach((t) => tags.add(t));
  for (const s of project.sources) s.tags.forEach((t) => tags.add(t));
  for (const n of project.notes) n.tags.forEach((t) => tags.add(t));
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function resolveSearchTarget(project: Project, id: string): string {
  const entity = getEntity(project, id);
  return entity ? entityRoute(entity) : routeForId(project, id);
}
