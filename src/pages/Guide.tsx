import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Method, Section } from '../types';
import { METHOD_STATUSES } from '../types';
import { Icon } from '../components/Icon';
import {
  DomainChip,
  EmptyState,
  LinkDialog,
  PageHeader,
  SampleBadge,
  StatusPill,
  RelationshipRow,
} from '../components/ui';
import { Markdown } from '../components/Markdown';
import { DomainEditDialog, NewMethodDialog, SectionDialog } from '../components/create';
import {
  entityTitle,
  methodsForDomain,
  methodsForSection,
  relationshipsFor,
  sectionsForDomain,
} from '../lib/selectors';
import { formatDate } from '../lib/utils';

export function GuidePage() {
  const { project } = useStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return project.domains.map((domain) => ({ domain, sections: sectionsForDomain(project, domain.id) }));
    return project.domains
      .map((domain) => ({
        domain,
        sections: sectionsForDomain(project, domain.id).filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.frameworks.some((f) => f.toLowerCase().includes(q)),
        ),
      }))
      .filter(
        (group) =>
          group.sections.length > 0 ||
          group.domain.title.toLowerCase().includes(q) ||
          group.domain.intro.toLowerCase().includes(q) ||
          group.domain.subtitle.toLowerCase().includes(q),
      );
  }, [project, query]);

  const methodCount = project.methods.length;

  return (
    <div className="page guide-page">
      <PageHeader
        eyebrow="The reader-facing guide"
        title="The Guide"
        subtitle="A structured library of domains, sections, methods and exercises. Each method links back to the research, traditions and observations that justify it."
        actions={
          <>
            <Link to="/guide/methods" className="button ghost">
              <Icon name="library" size={15} /> All methods
            </Link>
            <Link to="/search?types=method" className="button primary">
              <Icon name="search" size={15} /> Find a method
            </Link>
          </>
        }
      />
      <div className="guide-toolbar">
        <label className="search-field inline">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter domains, sections or frameworks…"
            aria-label="Filter the guide"
          />
        </label>
        <div className="guide-counts">
          <span>{project.domains.length} domains</span>
          <span>{project.sections.length} sections</span>
          <span>{methodCount} methods</span>
        </div>
      </div>

      <div className="guide-domain-list">
        {filtered.map(({ domain, sections }) => {
          const methods = methodsForDomain(project, domain.id);
          return (
            <section key={domain.id} className={`guide-domain accent-${domain.accent}`}>
              <div className="guide-domain-head">
                <Link to={`/guide/${domain.id}`} className="guide-domain-title">
                  <span className="guide-roman">{domain.roman}</span>
                  <div>
                    <h2>{domain.title}</h2>
                    <p>{domain.subtitle}</p>
                  </div>
                </Link>
                <div className="guide-domain-side">
                  <span className="domain-count">{sections.length} sections</span>
                  <span className="domain-count">{methods.length} methods</span>
                  <Link to={`/guide/${domain.id}`} className="text-button small">
                    Open domain <Icon name="arrow-right" size={13} />
                  </Link>
                </div>
              </div>
              {domain.intro ? <p className="guide-domain-intro">{domain.intro}</p> : null}
              {sections.length ? (
                <div className="section-chip-grid">
                  {sections.map((section) => {
                    const count = methodsForSection(project, section.id).length;
                    return (
                      <Link key={section.id} to={`/guide/section/${section.id}`} className="section-chip">
                        <span>{section.title}</span>
                        <small>{count} {count === 1 ? 'method' : 'methods'}</small>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="muted small">No sections match this filter.</p>
              )}
            </section>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="search" title="No matching sections" body="Try a broader term, or browse each domain directly." />
      ) : null}

      <div className="guide-note panel">
        <Icon name="network" size={18} />
        <div>
          <h3>Interconnected by design</h3>
          <p>
            Methods may belong to more than one domain. A community garden can be social infrastructure, physical activity, ecological restoration
            and a setting for contemplative attention. The <Link to="/connections">Connections</Link> view shows those relationships and their
            tensions.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DomainPage() {
  const { domainId = '' } = useParams();
  const { project } = useStore();
  const [sectionDialog, setSectionDialog] = useState(false);
  const [methodDialog, setMethodDialog] = useState(false);
  const [editingDomain, setEditingDomain] = useState(false);
  const domain = project.domains.find((d) => d.id === domainId);

  if (!domain) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="Domain not found"
          body="This domain may have been removed or renumbered."
          action={<Link className="button primary" to="/guide">Back to the guide</Link>}
        />
      </div>
    );
  }

  const sections = sectionsForDomain(project, domain.id);
  const methods = methodsForDomain(project, domain.id).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const featured = methods.slice(0, 3);
  const connections = domain.connections
    .map((connection) => ({ ...connection, domain: project.domains.find((d) => d.id === connection.domainId) }))
    .filter((c) => c.domain);

  return (
    <div className={`page domain-page accent-${domain.accent}`}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/guide">The Guide</Link>
        <Icon name="chevron-right" size={12} />
        <span>Domain {domain.roman}</span>
      </nav>

      <header className="domain-hero">
        <div className="domain-hero-roman">{domain.roman}</div>
        <div className="domain-hero-main">
          <div className="domain-hero-eyebrow">
            <span className="accent-line" />
            <span>Domain {domain.roman}</span>
            <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(domain.illustrative)} />
          </div>
          <h1>{domain.title}</h1>
          <p className="domain-hero-subtitle">{domain.subtitle}</p>
          <p className="domain-hero-intro">{domain.intro}</p>
          <div className="domain-hero-actions">
            <button className="button primary" onClick={() => setMethodDialog(true)}>
              <Icon name="plus" size={15} /> Add method
            </button>
            <button className="button ghost" onClick={() => setEditingDomain(true)}>
              <Icon name="edit" size={14} /> Edit framing
            </button>
          </div>
        </div>
      </header>

      <div className="domain-meta-grid">
        <div className="panel domain-purpose">
          <p className="eyebrow">Purpose</p>
          <p>{domain.purpose || <span className="muted">No purpose statement yet. Use “Edit framing” to articulate what this domain is for.</span>}</p>
          {domain.outcomes.length ? (
            <>
              <p className="field-label">Intended outcomes</p>
              <ul className="outcome-list">
                {domain.outcomes.map((outcome, i) => (
                  <li key={i}>{outcome}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <aside className="panel domain-side">
          <p className="eyebrow">At a glance</p>
          <dl className="meta-list">
            <div><dt>Sections</dt><dd>{sections.length}</dd></div>
            <div><dt>Methods</dt><dd>{methods.length}</dd></div>
            <div><dt>Primary</dt><dd>{project.methods.filter((m) => m.primaryDomainId === domain.id).length}</dd></div>
            <div><dt>Secondary</dt><dd>{project.methods.filter((m) => m.secondaryDomainIds.includes(domain.id)).length}</dd></div>
          </dl>
          <p className="eyebrow">Connected domains</p>
          <div className="domain-connections">
            {connections.length ? (
              connections.map((c) => (
                <Link key={c.domainId} to={`/guide/${c.domainId}`} className={`domain-connection accent-${c.domain!.accent}`}>
                  <span className="connection-dot" />
                  <span>
                    <strong>{c.domain!.title}</strong>
                    <small>{c.note}</small>
                  </span>
                </Link>
              ))
            ) : (
              <p className="muted small">No cross-domain connections recorded.</p>
            )}
          </div>
        </aside>
      </div>

      <section className="domain-block">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Constituent parts</p>
            <h2>Sections</h2>
          </div>
          <button className="button ghost small" onClick={() => setSectionDialog(true)}>
            <Icon name="plus" size={14} /> Add section
          </button>
        </div>
        {sections.length ? (
          <div className="section-list">
            {sections.map((section, index) => {
              const sectionMethods = methodsForSection(project, section.id);
              return (
                <Link key={section.id} to={`/guide/section/${section.id}`} className="section-card">
                  <span className="section-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.description || 'No description yet.'}</p>
                    <div className="section-card-meta">
                      <span>{sectionMethods.length} {sectionMethods.length === 1 ? 'method' : 'methods'}</span>
                      {section.frameworks.slice(0, 2).map((f) => (
                        <span key={f} className="mini-tag">{f}</span>
                      ))}
                    </div>
                  </div>
                  <Icon name="arrow-right" size={16} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="folder"
            title="No sections yet"
            body="Sections organise the domain into specific problems and opportunities. Add the first one to begin."
            action={<button className="button primary" onClick={() => setSectionDialog(true)}>Add a section</button>}
          />
        )}
      </section>

      <div className="domain-columns">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Practice</p>
              <h2>Featured methods</h2>
            </div>
            <Link to={`/guide/methods?domain=${domain.id}`} className="text-button small">
              All methods
            </Link>
          </div>
          {featured.length ? (
            <div className="method-mini-list">
              {featured.map((method) => (
                <MethodMini key={method.id} method={method} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="book"
              title="No methods yet"
              body="Methods are the practical unit of the guide. Add one to make this domain actionable."
              action={<button className="button primary small" onClick={() => setMethodDialog(true)}>Add a method</button>}
            />
          )}
        </section>

        <section className="panel">
          <p className="eyebrow">Shared foundations</p>
          <h2>Underlying principles</h2>
          {domain.principles.length ? (
            <ol className="principle-list">
              {domain.principles.map((principle, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <p>{principle}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No principles recorded yet.</p>
          )}
        </section>
      </div>

      <section className="panel questions-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Unresolved</p>
            <h2>Questions to investigate</h2>
          </div>
          <span className="muted small">Treat these as open research prompts</span>
        </div>
        {domain.questions.length ? (
          <ul className="question-list">
            {domain.questions.map((question, i) => (
              <li key={i}>
                <span className="question-mark">?</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No open questions yet.</p>
        )}
      </section>

      <div className="domain-foot-nav">
        {project.domains.map((d) => (
          <Link key={d.id} to={`/guide/${d.id}`} className={`domain-foot-link accent-${d.accent} ${d.id === domain.id ? 'active' : ''}`}>
            <span>{d.roman}</span>
            {d.title}
          </Link>
        ))}
      </div>

      <NewMethodDialog open={methodDialog} onClose={() => setMethodDialog(false)} defaultDomainId={domain.id} />
      <SectionDialog open={sectionDialog} onClose={() => setSectionDialog(false)} domainId={domain.id} />
      <DomainEditDialog open={editingDomain} onClose={() => setEditingDomain(false)} domain={domain} />
    </div>
  );
}

function MethodMini({ method }: { method: Method }) {
  return (
    <Link to={`/method/${method.id}`} className="method-mini">
      <div>
        <h3>{method.title}</h3>
        <p>{method.summary || 'No summary yet.'}</p>
        <div className="method-mini-meta">
          <StatusPill status={method.status} />
          <span>{method.tags.slice(0, 2).join(' · ')}</span>
        </div>
      </div>
      <Icon name="arrow-right" size={15} />
    </Link>
  );
}

export function SectionPage() {
  const { sectionId = '' } = useParams();
  const { project, trashEntity, toast } = useStore();
  const navigate = useNavigate();
  const [methodDialog, setMethodDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const section = project.sections.find((s) => s.id === sectionId);
  const domain = section ? project.domains.find((d) => d.id === section.domainId) : undefined;

  if (!section) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="Section not found"
          body="This section may have been deleted. Check the deleted items list in Settings if you need to recover it."
          action={<Link className="button primary" to="/guide">Back to the guide</Link>}
        />
      </div>
    );
  }

  const methods = methodsForSection(project, section.id);
  const related = relationshipsFor(project, section.id);
  const research = related.filter((r) => ['source', 'note', 'quotation', 'claim'].includes(r.other.type));
  const experiments = related.filter((r) => r.other.type === 'experiment');
  const relatedSections = section.relatedSectionIds
    .map((id) => project.sections.find((s) => s.id === id))
    .filter(Boolean) as Section[];

  return (
    <div className={`page section-page accent-${domain?.accent ?? 'physical'}`}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/guide">The Guide</Link>
        <Icon name="chevron-right" size={12} />
        {domain ? <Link to={`/guide/${domain.id}`}>{domain.title}</Link> : <span>Unassigned</span>}
        <Icon name="chevron-right" size={12} />
        <span>{section.title}</span>
      </nav>

      <PageHeader
        eyebrow={domain ? `${domain.roman} · ${domain.title}` : 'Section'}
        title={<>{section.title} <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(section.illustrative)} /></>}
        subtitle={section.description}
        actions={
          <>
            <button className="button ghost" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} /> Edit section
            </button>
            <button className="button primary" onClick={() => setMethodDialog(true)}>
              <Icon name="plus" size={15} /> Add method
            </button>
          </>
        }
      />

      <div className="section-layout">
        <div className="section-main">
          {section.draft ? (
            <article className="panel prose-panel">
              <p className="eyebrow">Section introduction</p>
              <Markdown content={section.draft} />
            </article>
          ) : (
            <div className="panel draft-placeholder">
              <p className="eyebrow">Section introduction</p>
              <p className="muted">No section-level draft yet. This is where the book’s framing of the section can begin before the individual methods are written.</p>
              <button className="button ghost small" onClick={() => setEditing(true)}>
                <Icon name="pen" size={14} /> Write an introduction
              </button>
            </div>
          )}

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Practice</p>
                <h2>Methods &amp; exercises</h2>
              </div>
              <span className="muted small">{methods.length} in this section</span>
            </div>
            {methods.length ? (
              <div className="method-list">
                {methods.map((method) => (
                  <Link key={method.id} to={`/method/${method.id}`} className="method-row">
                    <div className="method-row-main">
                      <div className="method-row-top">
                        <h3>{method.title}</h3>
                        <StatusPill status={method.status} />
                      </div>
                      <p>{method.summary || 'No summary yet.'}</p>
                      <div className="method-row-meta">
                        {method.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="mini-tag">{tag}</span>
                        ))}
                        <span className="muted small">Updated {formatDate(method.updatedAt)}</span>
                      </div>
                    </div>
                    <Icon name="chevron-right" size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="book"
                title="No methods in this section yet"
                body="Add a method to turn this section from a description into a practice."
                action={<button className="button primary" onClick={() => setMethodDialog(true)}>Add the first method</button>}
              />
            )}
          </section>

          {section.questions.length ? (
            <section className="panel">
              <p className="eyebrow">Open questions</p>
              <ul className="question-list">
                {section.questions.map((q, i) => (
                  <li key={i}><span className="question-mark">?</span><span>{q}</span></li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Evidence and frameworks</p>
                <h2>Relevant research</h2>
              </div>
              <button className="button ghost small" onClick={() => setLinking(true)}>
                <Icon name="link" size={14} /> Link a record
              </button>
            </div>
            {research.length || experiments.length ? (
              <div className="relationship-list">
                {[...research, ...experiments].map((link) => (
                  <RelationshipRow
                    key={link.relationship.id}
                    title={entityTitle(link.other)}
                    type={link.relationship.type}
                    note={link.relationship.note}
                    route={link.other.type === 'source' ? `/research/${link.other.record.id}` : link.other.type === 'note' ? `/research/note/${link.other.record.id}` : link.other.type === 'experiment' ? `/experiments/${link.other.record.id}` : `/research`}
                  />
                ))}
              </div>
            ) : (
              <p className="muted small">No research linked to this section yet. Individual methods may still have their own sources.</p>
            )}
            {section.frameworks.length ? (
              <>
                <p className="field-label">Frameworks and traditions</p>
                <div className="tag-row">
                  {section.frameworks.map((f) => (
                    <span key={f} className="chip">{f}</span>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>

        <aside className="section-side">
          <div className="panel">
            <p className="eyebrow">Outcomes</p>
            {section.outcomes.length ? (
              <ul className="outcome-list compact">
                {section.outcomes.map((outcome, i) => (
                  <li key={i}>{outcome}</li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Not recorded yet.</p>
            )}
          </div>

          <div className="panel">
            <p className="eyebrow">Related sections</p>
            {relatedSections.length ? (
              <ul className="related-list">
                {relatedSections.map((rel) => {
                  const relDomain = project.domains.find((d) => d.id === rel.domainId);
                  return (
                    <li key={rel.id}>
                      <Link to={`/guide/section/${rel.id}`}>{rel.title}</Link>
                      <small>{relDomain?.title}</small>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted small">No related sections recorded.</p>
            )}
          </div>

          <div className="panel">
            <p className="eyebrow">Domain</p>
            {domain ? (
              <DomainChip domain={domain} />
            ) : (
              <p className="muted small">This section is not assigned to a domain.</p>
            )}
            <p className="eyebrow spaced">Section details</p>
            <dl className="meta-list compact">
              <div><dt>Created</dt><dd>{formatDate(section.createdAt)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(section.updatedAt)}</dd></div>
              <div><dt>Methods</dt><dd>{methods.length}</dd></div>
            </dl>
          </div>

          <button className="button ghost danger-text full" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={14} /> Delete section
          </button>
        </aside>
      </div>

      <NewMethodDialog
        open={methodDialog}
        onClose={() => setMethodDialog(false)}
        defaultDomainId={section.domainId}
        defaultSectionId={section.id}
      />
      <SectionDialog open={editing} onClose={() => setEditing(false)} domainId={section.domainId} section={section} />
      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={section.id} defaultType="depends_on" />

      {confirmDelete ? (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Delete section">
            <header className="modal-head">
              <div>
                <p className="eyebrow">Delete section</p>
                <h2>{section.title}</h2>
              </div>
            </header>
            <div className="modal-body">
              <p className="modal-copy">
                Methods in this section will remain, but their section assignment will be cleared. The section can be restored from deleted items in
                Settings.
              </p>
            </div>
            <footer className="modal-foot">
              <button className="button ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button
                className="button danger"
                onClick={() => {
                  trashEntity('section', section.id, section.title);
                  setConfirmDelete(false);
                  toast('Section moved to deleted items.');
                  navigate(domain ? `/guide/${domain.id}` : '/guide');
                }}
              >
                Delete section
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AllMethodsPage() {
  const { project } = useStore();
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState(new URLSearchParams(window.location.search).get('domain') ?? '');
  const [status, setStatus] = useState('');
  const [newMethod, setNewMethod] = useState(false);
  const [sort, setSort] = useState('updated');

  const methods = useMemo(() => {
    const q = query.trim().toLowerCase();
    return project.methods
      .filter((m) => {
        if (domainFilter && m.primaryDomainId !== domainFilter && !m.secondaryDomainIds.includes(domainFilter)) return false;
        if (status && m.status !== status) return false;
        if (!q) return true;
        return [m.title, m.summary, m.tags.join(' '), ...Object.values(m.purpose)].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title);
        if (sort === 'status') return METHOD_STATUSES.indexOf(a.status) - METHOD_STATUSES.indexOf(b.status);
        return a.updatedAt < b.updatedAt ? 1 : -1;
      });
  }, [project, query, domainFilter, status, sort]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="The method library"
        title="All methods"
        subtitle="Every practical method in the guide, searchable and filterable by domain and editorial stage."
        actions={
          <button className="button primary" onClick={() => setNewMethod(true)}>
            <Icon name="plus" size={15} /> New method
          </button>
        }
      />
      <div className="toolbar-row wrap">
        <label className="search-field">
          <Icon name="search" size={16} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search methods and summaries…" />
        </label>
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} aria-label="Filter by domain">
          <option value="">All domains</option>
          {project.domains.map((d) => (
            <option key={d.id} value={d.id}>{d.roman}. {d.title}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All stages</option>
          {METHOD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort methods">
          <option value="updated">Recently updated</option>
          <option value="title">Title A–Z</option>
          <option value="status">Editorial stage</option>
        </select>
      </div>

      <p className="result-count">{methods.length} {methods.length === 1 ? 'method' : 'methods'}</p>
      {methods.length ? (
        <div className="method-library-grid">
          {methods.map((method) => {
            const domain = project.domains.find((d) => d.id === method.primaryDomainId);
            const section = project.sections.find((s) => s.id === method.primarySectionId);
            return (
              <Link key={method.id} to={`/method/${method.id}`} className={`method-library-card accent-${domain?.accent ?? 'physical'}`}>
                <div className="method-library-top">
                  <DomainChip domain={domain} small />
                  <StatusPill status={method.status} />
                </div>
                <h3>{method.title}</h3>
                <p>{method.summary || 'No summary yet.'}</p>
                <div className="method-library-meta">
                  {section ? <span>{section.title}</span> : null}
                  {method.secondaryDomainIds.length ? <span>+{method.secondaryDomainIds.length} other domain{method.secondaryDomainIds.length > 1 ? 's' : ''}</span> : null}
                  <span>Updated {formatDate(method.updatedAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="book"
          title={query || domainFilter || status ? 'No methods match those filters' : 'No methods yet'}
          body={query || domainFilter || status ? 'Clear a filter or try a different search.' : 'Create the first method and give the guide something practical to offer.'}
          action={<button className="button primary" onClick={() => setNewMethod(true)}>Create a method</button>}
        />
      )}
      <NewMethodDialog open={newMethod} onClose={() => setNewMethod(false)} defaultDomainId={domainFilter} />
    </div>
  );
}

