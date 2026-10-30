import type { Domain, ID, Method, MethodNotes, Project, Section } from '../types';
import { slugify as baseSlugify } from './utils';

/**
 * The public reader edition is built at deploy time from a file committed to
 * the repository, so the deployed site shows the same content for every
 * visitor instead of whatever is in their own browser.
 *
 * The committed file is a *projection* of a project, not the project: only
 * records whose status is Published are written into it. Notes, drafts,
 * quotations, claims, experiments and the manuscript never enter the file, so
 * a committed edition cannot leak unpublished work even if a status changes
 * later. `editionProblems` re-checks that invariant at build time rather than
 * trusting the generator, because a hand-edited file is just as possible.
 */
export const EDITION_FORMAT = 'guidebook-edition';
export const EDITION_FORMAT_VERSION = 1;

/**
 * A domain slug of `method` would be shadowed by `/read/method/:slug`, so the
 * router could never reach it. Reserved here so the generator cannot produce
 * one and the checker rejects a hand-written one.
 */
export const RESERVED_DOMAIN_SLUGS = ['method'];

/** The slice of a project the edition is built from. */
export interface EditionPick {
  domains: Domain[];
  sections: Section[];
  methods: Method[];
}

export interface EditionFile {
  format: typeof EDITION_FORMAT;
  formatVersion: number;
  generatedAt: string;
  source: {
    /** The public title: `settings.readerTitle`, not the workspace name. */
    title: string;
    authorName: string;
    commit: string;
  };
  edition: EditionPick & {
    /** Record id -> URL segment. Persisted so a title edit cannot move a URL. */
    slugs: Record<ID, string>;
  };
}

export interface EditionMethod {
  method: Method;
  slug: string;
  url: string;
}

export interface EditionSection {
  section: Section;
  slug: string;
  url: string;
  methods: EditionMethod[];
}

export interface EditionDomain {
  domain: Domain;
  slug: string;
  url: string;
  /** Sections that carry at least one published method, in authored order. */
  sections: EditionSection[];
  /** Published methods with no section of their own. */
  methods: EditionMethod[];
}

export interface PublishedEdition {
  title: string;
  author: string;
  generatedAt: string;
  commit: string;
  domains: EditionDomain[];
  methods: EditionMethod[];
}

export function methodUrl(slug: string): string {
  return `/read/method/${slug}`;
}

export function domainUrl(slug: string): string {
  return `/read/${slug}`;
}

export function sectionUrl(domainSlug: string, sectionSlug: string): string {
  return `/read/${domainSlug}/${sectionSlug}`;
}

/** A slug is lowercase words joined by single hyphens. */
export function isSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function slugifyTitle(title: string): string {
  const slug = baseSlugify(title).slice(0, 80).replace(/-$/, '');
  return slug || 'untitled';
}

function usableSlug(value: string | undefined): string {
  return value && isSlug(value) ? value : '';
}

function uniqueSlug(base: string, used: Set<string>): string {
  const stem = base || 'untitled';
  let candidate = stem;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${stem}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

export interface SlugAssignment {
  slugs: Record<ID, string>;
  /** Slugs that differ from the title, so a sync can say what it decided. */
  added: { id: ID; title: string; slug: string }[];
}

/**
 * Assigns URL segments, keeping any slug already recorded for a record id.
 * The id is the stable part: renaming a method that was already published must
 * not break the link someone shared, which is why the previous map wins over
 * the current title.
 *
 * Uniqueness is scoped the way the URLs are: domains share one space, sections
 * are unique within their domain (`/read/:domain/:section`), methods share one
 * space (`/read/method/:slug`). A collision gets `-2`, `-3` in authored order.
 */
export function assignSlugs(pick: EditionPick, previous: Record<ID, string> = {}): SlugAssignment {
  const slugs: Record<ID, string> = {};
  const added: SlugAssignment['added'] = [];
  const usedDomains = new Set<string>(RESERVED_DOMAIN_SLUGS);
  const usedSections = new Map<ID, Set<string>>();
  const usedMethods = new Set<string>();

  for (const domain of pick.domains) {
    const slug = uniqueSlug(usableSlug(previous[domain.id]) || slugifyTitle(domain.title), usedDomains);
    slugs[domain.id] = slug;
    if (previous[domain.id] !== slug) added.push({ id: domain.id, title: domain.title, slug });
  }

  for (const section of pick.sections) {
    if (!usedSections.has(section.domainId)) usedSections.set(section.domainId, new Set());
    const used = usedSections.get(section.domainId)!;
    const slug = uniqueSlug(usableSlug(previous[section.id]) || slugifyTitle(section.title), used);
    slugs[section.id] = slug;
    if (previous[section.id] !== slug) added.push({ id: section.id, title: section.title, slug });
  }

  for (const method of pick.methods) {
    const slug = uniqueSlug(usableSlug(previous[method.id]) || slugifyTitle(method.title), usedMethods);
    slugs[method.id] = slug;
    if (previous[method.id] !== slug) added.push({ id: method.id, title: method.title, slug });
  }

  return { slugs, added };
}

const EMPTY_NOTES: MethodNotes = {
  questions: [],
  disagreements: '',
  reflections: '',
  improvements: '',
  futureExperiments: '',
};

/**
 * Projects a project down to the published edition. Sections are included only
 * when a published method points at them, and domains only when one of their
 * sections (or a sectionless method) made it in, so the public structure grows
 * one finished method at a time rather than exposing every planned heading.
 *
 * Two fields are deliberately emptied rather than copied. `section.draft` is
 * the section's unwritten text and `method.notes` is the author's private
 * notebook — neither is rendered by a reader, and the file is public, so
 * leaving them in would ship prose that no reader is meant to have. The
 * structure and the published method fields are everything the pages use.
 */
export function makeEditionFile(
  project: Project,
  previousSlugs: Record<ID, string> = {},
  meta: { generatedAt: string; commit: string },
): EditionFile {
  const methods = project.methods
    .filter((method) => method.status === 'Published')
    .map((method) => ({ ...method, notes: { ...EMPTY_NOTES } }));
  const sectionIds = new Set(methods.map((method) => method.primarySectionId).filter(Boolean));
  const sections = project.sections
    .filter((section) => sectionIds.has(section.id))
    .map((section) => ({ ...section, draft: '' }));
  const domainIds = new Set([
    ...methods.map((method) => method.primaryDomainId),
    ...sections.map((section) => section.domainId),
  ]);
  const domains = project.domains.filter((domain) => domainIds.has(domain.id));
  const pick: EditionPick = { domains, sections, methods };
  const { slugs } = assignSlugs(pick, previousSlugs);

  return {
    format: EDITION_FORMAT,
    formatVersion: EDITION_FORMAT_VERSION,
    generatedAt: meta.generatedAt,
    source: {
      title: project.settings.readerTitle || project.settings.projectTitle,
      authorName: project.settings.authorName,
      commit: meta.commit,
    },
    edition: { ...pick, slugs },
  };
}

/**
 * Everything that must hold before an edition is allowed to be served. These
 * are errors, not warnings: each one makes a published URL wrong, unreachable,
 * or a draft visible.
 */
export function editionProblems(file: EditionFile): string[] {
  const problems: string[] = [];
  if (file.format !== EDITION_FORMAT) {
    problems.push(`format is ${JSON.stringify(file.format)}, expected ${JSON.stringify(EDITION_FORMAT)}`);
  }
  if (file.formatVersion !== EDITION_FORMAT_VERSION) {
    problems.push(`formatVersion is ${file.formatVersion}, this build understands ${EDITION_FORMAT_VERSION}`);
  }
  const { domains, sections, methods, slugs } = file.edition;
  if (!Array.isArray(domains) || !Array.isArray(sections) || !Array.isArray(methods) || !slugs) {
    problems.push('edition is missing domains, sections, methods or slugs');
    return problems;
  }

  const seen = new Set<ID>();
  for (const record of [...domains, ...sections, ...methods]) {
    if (seen.has(record.id)) problems.push(`duplicate record id ${record.id}`);
    seen.add(record.id);
  }

  const domainIds = new Set(domains.map((domain) => domain.id));
  const sectionById = new Map(sections.map((section) => [section.id, section]));

  for (const method of methods) {
    if (method.status !== 'Published') {
      problems.push(`method ${method.id} is ${method.status}; the edition may only contain Published records`);
    }
    if (!domainIds.has(method.primaryDomainId)) {
      problems.push(`method ${method.id} names domain ${method.primaryDomainId}, which is not in the edition`);
    }
    if (method.primarySectionId) {
      const section = sectionById.get(method.primarySectionId);
      if (!section) {
        problems.push(`method ${method.id} names section ${method.primarySectionId}, which is not in the edition`);
      } else if (section.domainId !== method.primaryDomainId) {
        problems.push(
          `method ${method.id} is in domain ${method.primaryDomainId} but its section belongs to ${section.domainId}`,
        );
      }
    }
  }

  const usedDomains = new Map<string, ID>();
  for (const domain of domains) {
    const slug = slugs[domain.id];
    if (!slug) {
      problems.push(`domain ${domain.id} has no slug`);
      continue;
    }
    if (!isSlug(slug)) problems.push(`domain ${domain.id} has the invalid slug ${JSON.stringify(slug)}`);
    if (RESERVED_DOMAIN_SLUGS.includes(slug)) {
      problems.push(`domain ${domain.id} uses the reserved slug ${JSON.stringify(slug)}`);
    }
    const clash = usedDomains.get(slug);
    if (clash) problems.push(`domains ${clash} and ${domain.id} share the slug ${JSON.stringify(slug)}`);
    usedDomains.set(slug, domain.id);
  }

  const usedSections = new Map<string, ID>();
  for (const section of sections) {
    const slug = slugs[section.id];
    if (!slug) {
      problems.push(`section ${section.id} has no slug`);
      continue;
    }
    if (!isSlug(slug)) problems.push(`section ${section.id} has the invalid slug ${JSON.stringify(slug)}`);
    const key = `${section.domainId}/${slug}`;
    const clash = usedSections.get(key);
    if (clash) problems.push(`sections ${clash} and ${section.id} share the slug ${JSON.stringify(key)}`);
    usedSections.set(key, section.id);
  }

  const usedMethods = new Map<string, ID>();
  for (const method of methods) {
    const slug = slugs[method.id];
    if (!slug) {
      problems.push(`method ${method.id} has no slug`);
      continue;
    }
    if (!isSlug(slug)) problems.push(`method ${method.id} has the invalid slug ${JSON.stringify(slug)}`);
    const clash = usedMethods.get(slug);
    if (clash) problems.push(`methods ${clash} and ${method.id} share the slug ${JSON.stringify(slug)}`);
    usedMethods.set(slug, method.id);
  }

  for (const id of Object.keys(slugs)) {
    if (!seen.has(id)) problems.push(`slug recorded for ${id}, which is not part of the edition`);
  }

  return problems;
}

/**
 * Turns the committed file into the structure the pages render. Records are
 * kept in authored order so the edition follows the project's own sequence
 * rather than an alphabetical accident.
 */
export function buildEdition(file: EditionFile): PublishedEdition {
  const { domains, sections, methods, slugs } = file.edition;
  const published = methods.filter((method) => method.status === 'Published');
  const includedSections = new Set(sections.map((section) => section.id));

  const editionDomains: EditionDomain[] = domains.map((domain) => {
    const slug = slugs[domain.id] ?? slugifyTitle(domain.title);
    const ownMethods = published.filter((method) => method.primaryDomainId === domain.id);
    const loose = ownMethods.filter(
      (method) => !method.primarySectionId || !includedSections.has(method.primarySectionId),
    );
    const editionSections: EditionSection[] = sections
      .filter((section) => section.domainId === domain.id)
      .map((section) => {
        const sectionSlug = slugs[section.id] ?? slugifyTitle(section.title);
        return {
          section,
          slug: sectionSlug,
          url: sectionUrl(slug, sectionSlug),
          methods: ownMethods
            .filter((method) => method.primarySectionId === section.id)
            .map((method) => ({
              method,
              slug: slugs[method.id] ?? slugifyTitle(method.title),
              url: methodUrl(slugs[method.id] ?? slugifyTitle(method.title)),
            })),
        };
      })
      .filter((section) => section.methods.length > 0);

    return {
      domain,
      slug,
      url: domainUrl(slug),
      sections: editionSections,
      methods: loose.map((method) => ({
        method,
        slug: slugs[method.id] ?? slugifyTitle(method.title),
        url: methodUrl(slugs[method.id] ?? slugifyTitle(method.title)),
      })),
    };
  });

  return {
    title: file.source.title,
    author: file.source.authorName,
    generatedAt: file.generatedAt,
    commit: file.source.commit,
    domains: editionDomains.filter((domain) => domain.sections.length > 0 || domain.methods.length > 0),
    methods: published
      .map((method) => ({
        method,
        slug: slugs[method.id] ?? slugifyTitle(method.title),
        url: methodUrl(slugs[method.id] ?? slugifyTitle(method.title)),
      }))
      .sort((a, b) => a.method.title.localeCompare(b.method.title)),
  };
}

export function findEditionDomain(edition: PublishedEdition, slug: string): EditionDomain | undefined {
  return edition.domains.find((domain) => domain.slug === slug);
}

export function findEditionSection(
  edition: PublishedEdition,
  domainSlug: string,
  sectionSlug: string,
): { domain: EditionDomain; section: EditionSection } | undefined {
  const domain = findEditionDomain(edition, domainSlug);
  const section = domain?.sections.find((candidate) => candidate.slug === sectionSlug);
  return domain && section ? { domain, section } : undefined;
}

export function findEditionMethod(edition: PublishedEdition, slug: string): EditionMethod | undefined {
  return edition.methods.find((method) => method.slug === slug);
}
