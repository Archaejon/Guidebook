import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { ReaderMethod } from '../components/ReaderMethod';
import { EmptyState } from '../components/ui';
import type { EditionDomain } from '../lib/edition';
import { findEditionDomain, findEditionMethod, findEditionSection } from '../lib/edition';
import { EDITION, EDITION_METHOD_HREF } from '../lib/editionData';
import { formatDate, pluralize } from '../lib/utils';

/**
 * The public reader edition.
 *
 * These pages render `content/guidebook.json` — the file committed to the
 * repository — rather than the visitor's own workspace, so the deployed site
 * shows the guide to everyone and a link like /read/physical-health/strength
 * means the same thing whoever opens it. The author's live workspace is a
 * separate surface at /preview.
 */

const SAMPLE_EDITION = EDITION.methods.some((entry) => entry.method.illustrative);

function EditionFrame({
  kicker,
  title,
  subtitle,
  toc,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  toc: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="reader-page edition-page">
      <header className="reader-header">
        <div className="reader-header-inner">
          <div>
            <p className="reader-kicker">{kicker}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="edition-subtitle">{subtitle}</p> : null}
          </div>
          <div className="reader-header-actions">
            <Link to="/read" className="button ghost small">
              <Icon name="book" size={14} /> Contents
            </Link>
            <Link to="/preview" className="button ghost small">
              <Icon name="eye" size={14} /> Local preview
            </Link>
            <Link to="/" className="button primary small">
              <Icon name="home" size={14} /> Workspace
            </Link>
          </div>
        </div>
        <p className="reader-privacy">
          Public edition, built from content committed to this repository. Only records marked{' '}
          <strong>Published</strong> appear here, so nothing that is still being drafted can reach this page.
        </p>
      </header>

      <div className="reader-body">
        <nav className="reader-toc" aria-label="Edition contents">
          {toc}
        </nav>
        <main className="reader-content">
          {children}
          <footer className="reader-footer">
            <p>
              {EDITION.title} · {EDITION.author} · content generated {formatDate(EDITION.generatedAt)} from commit{' '}
              <code>{EDITION.commit.slice(0, 7)}</code>
            </p>
            <p>
              Reading a copy of the guide as it stands. <Link to="/preview">Preview this browser's workspace</Link> ·{' '}
              <Link to="/">Open the writing studio</Link>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function EditionToc({
  domainSlug = '',
  sectionSlug = '',
  methodSlug = '',
}: {
  domainSlug?: string;
  sectionSlug?: string;
  methodSlug?: string;
}) {
  return (
    <>
      <p className="eyebrow">Contents</p>
      {EDITION.domains.map((domain) => (
        <div key={domain.domain.id} className="reader-toc-group">
          <Link to={domain.url} className={`edition-toc-domain ${domainSlug === domain.slug ? 'active' : ''}`}>
            {domain.domain.roman} · {domain.domain.title}
          </Link>
          {domain.sections.map((section) => (
            <Link
              key={section.section.id}
              to={section.url}
              className={sectionSlug === section.slug ? 'active' : undefined}
              aria-current={sectionSlug === section.slug ? 'page' : undefined}
            >
              {section.section.title}
            </Link>
          ))}
          {domain.sections.flatMap((section) =>
            section.methods.map((entry) => (
              <Link
                key={entry.method.id}
                to={entry.url}
                className={methodSlug === entry.slug ? 'active' : undefined}
                aria-current={methodSlug === entry.slug ? 'page' : undefined}
              >
                · {entry.method.title}
              </Link>
            )),
          )}
        </div>
      ))}
    </>
  );
}

function FieldList({ label, items }: { label: string; items: string[] }) {
  const values = items.filter(Boolean);
  if (!values.length) return null;
  return (
    <div className="reader-field">
      <h4>{label}</h4>
      <ul className="edition-bullets">
        {values.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MethodLinks({ methods }: { methods: { method: { id: string; title: string; summary: string }; url: string }[] }) {
  return (
    <ul className="edition-list">
      {methods.map((entry) => (
        <li key={entry.method.id}>
          <Link to={entry.url}>{entry.method.title}</Link>
          {entry.method.summary ? <span>{entry.method.summary}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function MethodCards({ methods }: { methods: { method: { id: string; title: string; summary: string }; url: string }[] }) {
  return (
    <div className="edition-method-cards">
      {methods.map((entry) => (
        <Link key={entry.method.id} to={entry.url} className="edition-method-card">
          <span className="reader-kicker">Method</span>
          <h3>{entry.method.title}</h3>
          <p>{entry.method.summary}</p>
          <span className="edition-card-more">
            Read the method <Icon name="arrow-right" size={13} />
          </span>
        </Link>
      ))}
    </div>
  );
}

function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="edition-crumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="edition-crumb-sep">/</span> : null}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

function EditionMissing({ title, body }: { title: string; body: string }) {
  return (
    <div className="reader-page">
      <div className="reader-empty">
        <EmptyState
          icon="alert"
          title={title}
          body={body}
          action={
            <Link to="/read" className="button primary">
              Back to the edition contents
            </Link>
          }
        />
      </div>
    </div>
  );
}

export function EditionLandingPage() {
  const sectionCount = EDITION.domains.reduce((total, domain) => total + domain.sections.length, 0);

  if (!EDITION.methods.length) {
    return (
      <div className="reader-page">
        <div className="reader-empty">
          <EmptyState
            icon="book"
            title="The published edition is still empty"
            body="This site renders content/guidebook.json, which is built from a project's Published records. Nothing is marked Published yet, so there is nothing to read here. Mark a method Published in the app, export a JSON backup, and regenerate the edition with npm run content:sync."
            action={
              <Link to="/" className="button primary">
                Open the writing studio
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <EditionFrame
      kicker="Public reader edition"
      title={EDITION.title}
      subtitle={`By ${EDITION.author}`}
      toc={<EditionToc />}
    >
      <p className="reader-summary">
        {pluralize(EDITION.methods.length, 'published method')} across {pluralize(sectionCount, 'section')} in{' '}
        {pluralize(EDITION.domains.length, 'domain')}.
      </p>

      {SAMPLE_EDITION ? (
        <p className="edition-note">
          <strong>Sample edition.</strong> What follows is the illustrative sample project that ships with the app, so
          the deployed site has a real published surface. It is deliberately free of invented citations and efficacy
          claims, and every record here is marked as sample material.
        </p>
      ) : null}

      {EDITION.domains.map((domain) => (
        <section key={domain.domain.id} className="edition-domain">
          <p className="reader-kicker">Domain {domain.domain.roman}</p>
          <h2>
            <Link to={domain.url}>{domain.domain.title}</Link>
          </h2>
          <p className="edition-domain-sub">{domain.domain.subtitle}</p>
          <p>{domain.domain.purpose}</p>
          <MethodLinks methods={domain.sections.flatMap((section) => section.methods).concat(domain.methods)} />
        </section>
      ))}

      <section className="edition-index">
        <h2>Method index</h2>
        <ul className="edition-list">
          {EDITION.methods.map((entry) => (
            <li key={entry.method.id}>
              <Link to={entry.url}>{entry.method.title}</Link>
              {entry.method.summary ? <span>{entry.method.summary}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </EditionFrame>
  );
}

export function EditionDomainPage() {
  const { domainSlug = '' } = useParams();
  const domain: EditionDomain | undefined = findEditionDomain(EDITION, domainSlug);
  if (!domain) {
    return (
      <EditionMissing
        title="No such domain"
        body={`Nothing published in this edition has the address "${domainSlug}".`}
      />
    );
  }

  return (
    <EditionFrame
      kicker={`Domain ${domain.domain.roman}`}
      title={domain.domain.title}
      subtitle={domain.domain.subtitle}
      toc={<EditionToc domainSlug={domain.slug} />}
    >
      <Crumbs items={[{ label: 'Edition', to: '/read' }, { label: domain.domain.title }]} />
      <Markdown content={domain.domain.intro} />
      <div className="reader-field">
        <h4>Purpose</h4>
        <Markdown content={domain.domain.purpose} />
      </div>
      <FieldList label="Outcomes" items={domain.domain.outcomes} />
      <FieldList label="Principles" items={domain.domain.principles} />

      {domain.sections.map((section) => (
        <section key={section.section.id} className="edition-section-block">
          <h2>
            <Link to={section.url}>{section.section.title}</Link>
          </h2>
          <p>{section.section.description}</p>
          <MethodLinks methods={section.methods} />
        </section>
      ))}

      {domain.methods.length ? (
        <section className="edition-section-block">
          <h2>Methods without a section</h2>
          <MethodLinks methods={domain.methods} />
        </section>
      ) : null}

      <FieldList label="Questions this domain leaves open" items={domain.domain.questions} />
    </EditionFrame>
  );
}

export function EditionSectionPage() {
  const { domainSlug = '', sectionSlug = '' } = useParams();
  const found = findEditionSection(EDITION, domainSlug, sectionSlug);
  if (!found) {
    return (
      <EditionMissing
        title="No such section"
        body={`Nothing published in this edition has the address "${domainSlug}/${sectionSlug}".`}
      />
    );
  }
  const { domain, section } = found;

  return (
    <EditionFrame
      kicker={`${domain.domain.title} · Domain ${domain.domain.roman}`}
      title={section.section.title}
      subtitle={section.section.description}
      toc={<EditionToc domainSlug={domain.slug} sectionSlug={section.slug} />}
    >
      <Crumbs
        items={[
          { label: 'Edition', to: '/read' },
          { label: domain.domain.title, to: domain.url },
          { label: section.section.title },
        ]}
      />

      <FieldList label="Outcomes" items={section.section.outcomes} />
      <FieldList label="Frameworks" items={section.section.frameworks} />

      <h2 className="edition-h2">Methods</h2>
      <MethodCards methods={section.methods} />

      <FieldList label="Questions this section leaves open" items={section.section.questions} />
    </EditionFrame>
  );
}

export function EditionMethodPage() {
  const { methodSlug = '' } = useParams();
  const entry = findEditionMethod(EDITION, methodSlug);
  if (!entry) {
    return (
      <EditionMissing
        title="No such method"
        body={`Nothing published in this edition has the address "${methodSlug}". A method that is still being drafted has no page here.`}
      />
    );
  }
  const method = entry.method;
  const domain = EDITION.domains.find((candidate) => candidate.domain.id === method.primaryDomainId);
  const section = domain?.sections.find((candidate) => candidate.section.id === method.primarySectionId);

  return (
    <EditionFrame
      kicker={[domain?.domain.title, section?.section.title].filter(Boolean).join(' · ') || 'Method'}
      title={method.title}
      subtitle={method.summary}
      toc={<EditionToc domainSlug={domain?.slug} sectionSlug={section?.slug} methodSlug={entry.slug} />}
    >
      <Crumbs
        items={[
          { label: 'Edition', to: '/read' },
          ...(domain ? [{ label: domain.domain.title, to: domain.url }] : []),
          ...(section ? [{ label: section.section.title, to: section.url }] : []),
          { label: method.title },
        ]}
      />

      {method.illustrative ? <p className="edition-badge">Sample method</p> : null}

      <ReaderMethod
        method={method}
        domainTitle={domain?.domain.title ?? ''}
        sectionTitle={section?.section.title ?? ''}
        showTitle={false}
        methodHref={EDITION_METHOD_HREF}
      />

      {method.tags.length ? (
        <p className="edition-tags">
          {method.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </p>
      ) : null}

      <p className="edition-meta">Last revised {formatDate(method.updatedAt)}.</p>
    </EditionFrame>
  );
}
