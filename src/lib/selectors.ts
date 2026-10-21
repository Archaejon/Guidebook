import type { Domain, ID, ManuscriptDoc, Method, Project, Relationship, Section } from '../types';
import { wordCount } from './utils';

export type EntityType =
  | 'method'
  | 'section'
  | 'domain'
  | 'document'
  | 'source'
  | 'note'
  | 'quotation'
  | 'claim'
  | 'experiment'
  | 'inbox';

export type AnyRecord = { id: ID };

export interface ResolvedEntity {
  type: EntityType;
  record: AnyRecord;
}

export function getEntity(project: Project, id: ID): ResolvedEntity | null {
  if (!id) return null;
  const m = project.methods.find((x) => x.id === id);
  if (m) return { type: 'method', record: m };
  const s = project.sections.find((x) => x.id === id);
  if (s) return { type: 'section', record: s };
  const d = project.domains.find((x) => x.id === id);
  if (d) return { type: 'domain', record: d };
  const doc = project.documents.find((x) => x.id === id);
  if (doc) return { type: 'document', record: doc };
  const src = project.sources.find((x) => x.id === id);
  if (src) return { type: 'source', record: src };
  const note = project.notes.find((x) => x.id === id);
  if (note) return { type: 'note', record: note };
  const quote = project.quotations.find((x) => x.id === id);
  if (quote) return { type: 'quotation', record: quote };
  const claim = project.claims.find((x) => x.id === id);
  if (claim) return { type: 'claim', record: claim };
  const exp = project.experiments.find((x) => x.id === id);
  if (exp) return { type: 'experiment', record: exp };
  const inbox = project.inbox.find((x) => x.id === id);
  if (inbox) return { type: 'inbox', record: inbox };
  return null;
}

export function entityTitle(entity: ResolvedEntity | null): string {
  if (!entity) return 'Untitled';
  const r = entity.record as unknown as Record<string, unknown>;
  if (typeof r.title === 'string' && r.title) return r.title;
  if (typeof r.statement === 'string' && r.statement) return r.statement;
  if (typeof r.text === 'string' && r.text) return r.text;
  return 'Untitled';
}

export function entitySubtitle(entity: ResolvedEntity | null): string {
  if (!entity) return '';
  const r = entity.record as unknown as Record<string, unknown>;
  switch (entity.type) {
    case 'method':
      return (r.summary as string) || 'Method';
    case 'section':
      return (r.description as string) || 'Section';
    case 'domain':
      return (r.subtitle as string) || 'Domain';
    case 'document':
      return `${(r.kind as string) || 'document'} · ${wordCount((r.content as string) || '')} words`;
    case 'source':
      return `${(r.creator as string) || 'Unknown creator'}${r.year ? ` · ${r.year}` : ''}`;
    case 'note':
      return (r.body as string)?.slice(0, 140) || 'Reading note';
    case 'quotation':
      return (r.text as string)?.slice(0, 140) || 'Quotation';
    case 'claim':
      return `${(r.status as string) || ''} claim`;
    case 'experiment':
      return `${(r.scale as string) || ''} · ${(r.status as string) || ''}`;
    case 'inbox':
      return 'Inbox capture';
    default:
      return '';
  }
}

export function entityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    method: 'Method',
    section: 'Section',
    domain: 'Domain',
    document: 'Manuscript',
    source: 'Research',
    note: 'Reading note',
    quotation: 'Quotation',
    claim: 'Claim',
    experiment: 'Experiment',
    inbox: 'Inbox',
  };
  return labels[type];
}

export function entityRoute(entity: ResolvedEntity): string {
  switch (entity.type) {
    case 'method':
      return `/method/${entity.record.id}`;
    case 'section':
      return `/guide/section/${entity.record.id}`;
    case 'domain':
      return `/guide/${entity.record.id}`;
    case 'document':
      return `/studio/${entity.record.id}`;
    case 'source':
      return `/research/${entity.record.id}`;
    case 'note':
      return `/research/note/${entity.record.id}`;
    case 'quotation':
      return `/research?quote=${entity.record.id}`;
    case 'claim':
      return `/research?claim=${entity.record.id}`;
    case 'experiment':
      return `/experiments/${entity.record.id}`;
    case 'inbox':
      return `/inbox`;
    default:
      return '/';
  }
}

export function routeForId(project: Project, id: ID): string {
  const entity = getEntity(project, id);
  return entity ? entityRoute(entity) : '/connections';
}

export interface ResolvedRelationship {
  relationship: Relationship;
  direction: 'outgoing' | 'incoming';
  other: ResolvedEntity;
}

export function relationshipsFor(project: Project, id: ID): ResolvedRelationship[] {
  // A relationship left behind by a deletion must not surface from the deleted
  // end either: with no record to anchor it, there is nothing to show.
  if (!getEntity(project, id)) return [];
  return project.relationships
    .filter((r) => r.fromId === id || r.toId === id)
    .map((relationship) => {
      const other = getEntity(project, relationship.fromId === id ? relationship.toId : relationship.fromId);
      if (!other) return null;
      return {
        relationship,
        direction: (relationship.fromId === id ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
        other,
      };
    })
    .filter((r): r is ResolvedRelationship => r !== null);
}

export function outgoingLinks(project: Project, fromId: ID, type?: string): ResolvedRelationship[] {
  return relationshipsFor(project, fromId).filter(
    (r) => r.direction === 'outgoing' && (!type || r.relationship.type === type),
  );
}

export function incomingLinks(project: Project, toId: ID, type?: string): ResolvedRelationship[] {
  return relationshipsFor(project, toId).filter(
    (r) => r.direction === 'incoming' && (!type || r.relationship.type === type),
  );
}

export function getDomain(project: Project, id: ID): Domain | undefined {
  return project.domains.find((d) => d.id === id);
}

export function getSection(project: Project, id: ID): Section | undefined {
  return project.sections.find((s) => s.id === id);
}

export function getMethod(project: Project, id: ID): Method | undefined {
  return project.methods.find((m) => m.id === id);
}

export function sectionsForDomain(project: Project, domainId: ID): Section[] {
  return project.sections.filter((s) => s.domainId === domainId);
}

export function methodsForDomain(project: Project, domainId: ID): Method[] {
  return project.methods.filter(
    (m) => m.primaryDomainId === domainId || m.secondaryDomainIds.includes(domainId),
  );
}

export function methodsForSection(project: Project, sectionId: ID): Method[] {
  return project.methods.filter(
    (m) => m.primarySectionId === sectionId || m.relatedSectionIds.includes(sectionId),
  );
}

export function documentsForMethod(project: Project, methodId: ID): ManuscriptDoc[] {
  const ids = new Set<string>();
  for (const rel of project.relationships) {
    if (rel.fromId === methodId) ids.add(rel.toId);
    if (rel.toId === methodId) ids.add(rel.fromId);
  }
  const explicit = project.documents.filter((d) => ids.has(d.id));
  const token = `[[method:${methodId}|`;
  const mentions = project.documents.filter((d) => d.content.includes(token));
  const map = new Map<string, ManuscriptDoc>();
  for (const doc of [...explicit, ...mentions]) map.set(doc.id, doc);
  return Array.from(map.values());
}

export function extractMethodRefs(content: string): { id: string; label: string }[] {
  const refs: { id: string; label: string }[] = [];
  const regex = /\[\[method:([^\]|]+)\|([^\]]+)\]\]/g;
  let match = regex.exec(content);
  while (match) {
    refs.push({ id: match[1], label: match[2] });
    match = regex.exec(content);
  }
  return refs;
}

export function childDocuments(project: Project, parentId: ID | null): ManuscriptDoc[] {
  return project.documents
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function orderedDocuments(project: Project, parentId: ID | null = null, depth = 0): { doc: ManuscriptDoc; depth: number }[] {
  const result: { doc: ManuscriptDoc; depth: number }[] = [];
  for (const doc of childDocuments(project, parentId)) {
    result.push({ doc, depth });
    result.push(...orderedDocuments(project, doc.id, depth + 1));
  }
  return result;
}

export function descendantIds(project: Project, id: ID): string[] {
  const result: string[] = [];
  const collect = (parentId: string) => {
    for (const doc of project.documents.filter((d) => d.parentId === parentId)) {
      result.push(doc.id);
      collect(doc.id);
    }
  };
  collect(id);
  return result;
}

export function manuscriptWords(project: Project): number {
  return project.documents.reduce((sum, doc) => sum + wordCount(doc.content), 0);
}

export function sourcesLinkedTo(project: Project, id: ID): ResolvedEntity[] {
  return relationshipsFor(project, id)
    .filter((r) => r.other.type === 'source')
    .map((r) => r.other);
}

export function methodCompletion(method: Method): number {
  const checks = [
    Boolean(method.summary),
    Boolean(method.purpose.problem),
    Boolean(method.purpose.outcomes),
    Boolean(method.instructions.preparation),
    method.instructions.steps.filter(Boolean).length > 0,
    Boolean(method.rationale.mechanisms),
    Boolean(method.rationale.evidence),
    Boolean(method.evaluation.success),
    Boolean(method.application.self),
    Object.values(method.scales).some((s) => Boolean(s.direct)),
    Boolean(method.knowledge.observations || method.knowledge.science),
    Boolean(method.notes.reflections || method.notes.questions.length),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function statusCounts(project: Project): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of project.methods) counts[m.status] = (counts[m.status] ?? 0) + 1;
  return counts;
}

export function projectStats(project: Project) {
  const linkedSourceIds = new Set<string>();
  for (const r of project.relationships) {
    const from = getEntity(project, r.fromId);
    const to = getEntity(project, r.toId);
    if (from?.type === 'source') linkedSourceIds.add(from.record.id as string);
    if (to?.type === 'source') linkedSourceIds.add(to.record.id as string);
  }
  return {
    domains: project.domains.length,
    sections: project.sections.length,
    methods: project.methods.length,
    publishedMethods: project.methods.filter((m) => m.status === 'Published').length,
    words: manuscriptWords(project),
    documents: project.documents.length,
    sources: project.sources.length,
    linkedSources: linkedSourceIds.size,
    notes: project.notes.length,
    quotations: project.quotations.length,
    claims: project.claims.length,
    experiments: project.experiments.length,
    openInbox: project.inbox.length,
  };
}
