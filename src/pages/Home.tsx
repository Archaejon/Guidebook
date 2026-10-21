import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import type { Domain } from '../types';
import type { EntityType } from '../lib/selectors';
import { Icon, type IconName } from '../components/Icon';
import { EmptyState, PageHeader, SampleBadge, StatusPill } from '../components/ui';
import { entityRoute, getEntity, methodCompletion, projectStats } from '../lib/selectors';
import { formatDate, pluralize, relativeTime, wordCount } from '../lib/utils';
import { now, uid } from '../lib/factory';

const WIDGETS: { key: string; label: string; description: string }[] = [
  { key: 'domains', label: 'Five domains', description: 'The domain map and domain cards.' },
  { key: 'quick', label: 'Quick capture', description: 'A place to put an idea before filing it.' },
  { key: 'recent', label: 'Recently edited', description: 'The most recently changed records.' },
  { key: 'attention', label: 'Needs attention', description: 'Drafts, gaps and items awaiting revision.' },
  { key: 'research', label: 'Research queue', description: 'Sources and claims awaiting synthesis.' },
  { key: 'completion', label: 'Project progress', description: 'Content counts and method-stage breakdown.' },
  { key: 'pinned', label: 'Pinned sections', description: 'A short list chosen in this panel.' },
];

function DomainMap({ domains }: { domains: Domain[] }) {
  const positions = domains.map((domain, index) => ({
    domain,
    x: 100 + index * 200,
    y: 118,
  }));
  const positionById = new Map(positions.map((p) => [p.domain.id, p]));
  return (
    <div className="domain-map" aria-label="Domain connections map">
      <svg viewBox="0 0 1000 250" role="img" aria-label="Five domains and their connections">
        <defs>
          <linearGradient id="map-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b9ad96" />
            <stop offset="100%" stopColor="#8d846f" />
          </linearGradient>
        </defs>
        {domains.flatMap((domain) =>
          domain.connections.map((connection, ci) => {
            const from = positionById.get(domain.id);
            const to = positionById.get(connection.domainId);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const lift = 46 + ci * 14 + Math.abs(to.x - from.x) * 0.035;
            return (
              <path
                key={`${domain.id}-${connection.domainId}`}
                d={`M ${from.x} ${from.y - 28} Q ${midX} ${from.y - lift} ${to.x} ${to.y - 28}`}
                fill="none"
                stroke="url(#map-line)"
                strokeWidth="1.2"
                strokeDasharray="3 5"
                opacity="0.75"
              />
            );
          }),
        )}
        {positions.map(({ domain, x, y }) => (
          <g key={domain.id}>
            <circle cx={x} cy={y} r="42" fill="none" stroke={`var(--${domain.accent})`} strokeOpacity="0.22" strokeWidth="10" />
            <circle cx={x} cy={y} r="29" fill="var(--paper-raised)" stroke={`var(--${domain.accent})`} strokeWidth="1.3" />
            <text x={x} y={y + 5} textAnchor="middle" className="map-roman" fill={`var(--${domain.accent})`}>
              {domain.roman}
            </text>
            <text x={x} y={y + 68} textAnchor="middle" className="map-label">
              {domain.title}
            </text>
            <text x={x} y={y + 86} textAnchor="middle" className="map-sub">
              {domain.id === 'dom_physical'
                ? 'body'
                : domain.id === 'dom_emotional'
                  ? 'inner life'
                  : domain.id === 'dom_spiritual'
                    ? 'meaning'
                    : domain.id === 'dom_social'
                      ? 'together'
                      : 'living world'}
            </text>
          </g>
        ))}
        <line x1="40" y1="182" x2="960" y2="182" stroke="var(--line)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function RecentItem({ id }: { id: string }) {
  const { project } = useStore();
  const entity = getEntity(project, id);
  if (!entity) return null;
  const type = entity.type as EntityType;
  const record = entity.record as unknown as { title?: string; content?: string; updatedAt?: string; createdAt?: string };
  const iconMap: Record<string, IconName> = {
    method: 'book',
    document: 'pen',
    source: 'library',
    note: 'file',
    experiment: 'flask',
    section: 'folder',
    quotation: 'quote',
    claim: 'alert',
  };
  return (
    <Link to={entityRoute(entity)} className="recent-item">
      <span className="recent-icon">
        <Icon name={iconMap[type] ?? 'file'} size={16} />
      </span>
      <span className="recent-copy">
        <span className="recent-title">{entityTitleSafe(record.title)}</span>
        <span className="recent-meta">
          {type === 'document'
            ? `Manuscript · ${wordCount(record.content ?? '')} words`
            : type === 'method'
              ? 'Method'
              : type === 'source'
                ? 'Research source'
                : type === 'note'
                  ? 'Reading note'
                  : type === 'experiment'
                    ? 'Experiment'
                    : type === 'section'
                      ? 'Section'
                      : 'Record'}
        </span>
      </span>
      <span className="recent-time">{relativeTime(record.updatedAt ?? record.createdAt)}</span>
    </Link>
  );
}

function entityTitleSafe(title?: string): string {
  return title || 'Untitled';
}

export function HomePage() {
  const { project, update, toast } = useStore();
  const [capture, setCapture] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const widgets = project.settings.dashboard.widgets;
  const limit = project.settings.dashboard.recentLimit;
  const stats = projectStats(project);

  const recent = useMemo(() => {
    const items = [
      ...project.methods.map((m) => ({ id: m.id, at: m.updatedAt })),
      ...project.documents.map((d) => ({ id: d.id, at: d.updatedAt })),
      ...project.sources.map((s) => ({ id: s.id, at: s.updatedAt })),
      ...project.notes.map((n) => ({ id: n.id, at: n.updatedAt })),
      ...project.experiments.map((e) => ({ id: e.id, at: e.updatedAt })),
      ...project.sections.map((s) => ({ id: s.id, at: s.updatedAt })),
    ];
    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
  }, [project, limit]);

  const attention = useMemo(() => {
    const methodItems = project.methods
      .filter((m) => ['Idea', 'To research', 'In development', 'Needs revision'].includes(m.status))
      .map((m) => ({
        id: m.id,
        kind: 'method',
        title: m.title,
        reason:
          m.status === 'Idea'
            ? 'Still an idea — define the problem and first steps.'
            : m.status === 'To research'
              ? 'Research has not yet been attached.'
              : m.status === 'Needs revision'
                ? 'Marked as needing revision.'
                : `Method ${methodCompletion(m)}% complete.`,
        status: m.status,
        at: m.updatedAt,
      }));
    const docItems = project.documents
      .filter((d) => (d.status === 'Draft' || d.status === 'Revising') && wordCount(d.content) > 0)
      .map((d) => ({
        id: d.id,
        kind: 'document',
        title: d.title,
        reason: `${d.status} chapter with ${wordCount(d.content)} words — review or continue.`,
        status: d.status,
        at: d.updatedAt,
      }));
    return [...methodItems, ...docItems].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
  }, [project]);

  const researchQueue = useMemo(() => {
    const linkedIds = new Set<string>();
    for (const rel of project.relationships) {
      const from = getEntity(project, rel.fromId);
      const to = getEntity(project, rel.toId);
      if (from?.type === 'source') linkedIds.add(from.record.id as string);
      if (to?.type === 'source') linkedIds.add(to.record.id as string);
    }
    const sources = project.sources
      .filter((s) => (s.readingStatus === 'Read' || s.readingStatus === 'Reviewed') && !linkedIds.has(s.id))
      .map((s) => ({ type: 'source' as const, id: s.id, title: s.title, reason: 'Read but not yet linked to a method or chapter.', at: s.updatedAt }));
    const claims = project.claims
      .filter((c) => c.status === 'Needs source' || c.status === 'Needs verification')
      .map((c) => ({ type: 'claim' as const, id: c.id, title: c.statement, reason: `${c.status} — verify before publication.`, at: c.updatedAt }));
    const notes = project.notes
      .filter((n) => !project.relationships.some((r) => r.fromId === n.id || r.toId === n.id))
      .map((n) => ({ type: 'note' as const, id: n.id, title: n.title, reason: 'Reading note not yet connected to anything.', at: n.updatedAt }));
    return [...sources, ...claims, ...notes].slice(0, 5);
  }, [project]);

  const pinned = project.sections.filter((s) => project.settings.dashboard.pinnedSectionIds.includes(s.id));

  const addCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capture.trim()) return;
    update((draft) => {
      draft.inbox.unshift({ id: uid('inbox'), text: capture.trim(), createdAt: now() });
    });
    setCapture('');
    toast('Captured to the inbox. File it when you know where it belongs.', 'success');
  };

  const toggleWidget = (key: string) => {
    update((draft) => {
      const list = draft.settings.dashboard.widgets;
      draft.settings.dashboard.widgets = list.includes(key) ? list.filter((w) => w !== key) : [...list, key];
    });
  };

  const togglePinned = (sectionId: string) => {
    update((draft) => {
      const list = draft.settings.dashboard.pinnedSectionIds;
      draft.settings.dashboard.pinnedSectionIds = list.includes(sectionId)
        ? list.filter((id) => id !== sectionId)
        : [...list, sectionId];
    });
  };

  const show = (key: string) => widgets.includes(key);

  return (
    <div className="page home-page">
      <div className="home-intro">
        <PageHeader
          eyebrow={`Working library · ${formatDate(new Date().toISOString())}`}
          title={project.settings.projectTitle}
          subtitle="A developing system of methods, sources and manuscript. Understand, practise, evaluate, teach."
          actions={
            <>
              <Link className="button ghost" to="/search">
                <Icon name="search" size={15} /> Search
              </Link>
              <Link className="button primary" to="/studio">
                <Icon name="pen" size={15} /> Open studio
              </Link>
            </>
          }
        />
        <div className="home-meta-row">
          <span className="home-meta"><Icon name="book" size={14} /> {stats.methods} methods</span>
          <span className="home-meta"><Icon name="library" size={14} /> {stats.sources} sources</span>
          <span className="home-meta"><Icon name="pen" size={14} /> {stats.words.toLocaleString()} manuscript words</span>
          <button className={`text-button ${customizing ? 'active' : ''}`} onClick={() => setCustomizing((v) => !v)}>
            <Icon name="settings" size={14} /> Customise dashboard
          </button>
        </div>
      </div>

      {customizing ? (
        <section className="customizer panel">
          <div className="customizer-head">
            <div>
              <p className="eyebrow">Dashboard layout</p>
              <h2>Choose what the working page shows</h2>
            </div>
            <button className="icon-button" onClick={() => setCustomizing(false)} aria-label="Close customiser">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="customizer-grid">
            {WIDGETS.map((widget) => (
              <label key={widget.key} className="check-row">
                <input type="checkbox" checked={show(widget.key)} onChange={() => toggleWidget(widget.key)} />
                <span>
                  <strong>{widget.label}</strong>
                  <small>{widget.description}</small>
                </span>
              </label>
            ))}
            <label className="field customizer-limit">
              <span>Recent items shown</span>
              <input
                type="number"
                min={3}
                max={15}
                value={limit}
                onChange={(e) =>
                  update((draft) => {
                    draft.settings.dashboard.recentLimit = Math.max(3, Math.min(15, Number(e.target.value) || 5));
                  })
                }
              />
            </label>
          </div>
          <div className="customizer-pins">
            <p className="field-label">Pinned sections</p>
            <div className="pin-options">
              {project.sections.slice(0, 24).map((section) => (
                <label key={section.id} className="pin-option">
                  <input
                    type="checkbox"
                    checked={project.settings.dashboard.pinnedSectionIds.includes(section.id)}
                    onChange={() => togglePinned(section.id)}
                  />
                  <span>{section.title}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {show('domains') ? (
        <section className="home-section domains-widget">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">The guide</p>
              <h2>Five domains of flourishing</h2>
            </div>
            <Link to="/guide" className="text-button">
              Browse the guide <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          <DomainMap domains={project.domains} />
          <div className="domain-cards">
            {project.domains.map((domain) => {
              const sectionCount = project.sections.filter((s) => s.domainId === domain.id).length;
              const methodCount = project.methods.filter(
                (m) => m.primaryDomainId === domain.id || m.secondaryDomainIds.includes(domain.id),
              ).length;
              return (
                <Link key={domain.id} to={`/guide/${domain.id}`} className={`domain-card accent-${domain.accent}`}>
                  <span className="domain-card-roman">{domain.roman}</span>
                  <div>
                    <h3>{domain.title}</h3>
                    <p>{domain.subtitle}</p>
                    <span className="domain-card-meta">
                      {pluralize(sectionCount, 'section')} · {pluralize(methodCount, 'method')}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className={`home-columns ${show('quick') ? '' : 'single'}`}>
        {show('recent') ? (
          <section className="panel home-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Activity</p>
                <h2>Recently edited</h2>
              </div>
              <Link to="/search" className="text-button small">
                All records
              </Link>
            </div>
            {recent.length ? (
              <div className="recent-list">
                {recent.map((item) => (
                  <RecentItem key={item.id} id={item.id} />
                ))}
              </div>
            ) : (
              <EmptyState compact icon="pen" title="Nothing here yet" body="Create a method or start a manuscript chapter, and recent work will appear here." />
            )}
          </section>
        ) : null}

        {show('quick') ? (
          <section className="panel capture-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Inbox</p>
                <h2>Quick capture</h2>
              </div>
              <Link to="/inbox" className="text-button small">
                Open inbox{project.inbox.length ? ` · ${project.inbox.length}` : ''}
              </Link>
            </div>
            <form onSubmit={addCapture} className="capture-form">
              <textarea
                value={capture}
                onChange={(e) => setCapture(e.target.value)}
                placeholder="An observation, a question, a reference, a possible method…"
                rows={4}
                aria-label="Quick capture"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addCapture(e);
                }}
              />
              <div className="capture-actions">
                <span className="muted small">Save now, decide later. ⌘↵</span>
                <button className="button primary small" disabled={!capture.trim()}>
                  <Icon name="inbox" size={14} /> Capture
                </button>
              </div>
            </form>
            {project.inbox.length ? (
              <div className="inbox-preview">
                <p className="field-label">Waiting in the inbox</p>
                {project.inbox.slice(0, 3).map((item) => (
                  <Link key={item.id} to="/inbox" className="inbox-preview-item">
                    {item.text}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted small">The inbox is clear.</p>
            )}
          </section>
        ) : null}
      </div>

      <div className="home-columns">
        {show('attention') ? (
          <section className="panel home-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Editorial</p>
                <h2>Needs attention</h2>
              </div>
            </div>
            {attention.length ? (
              <div className="attention-list">
                {attention.map((item) => (
                  <Link key={`${item.kind}-${item.id}`} to={item.kind === 'method' ? `/method/${item.id}` : `/studio/${item.id}`} className="attention-item">
                    <span className={`attention-marker ${item.kind}`}>
                      <Icon name={item.kind === 'method' ? 'book' : 'pen'} size={14} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.reason}</small>
                    </span>
                    <StatusPill status={item.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState compact icon="check" title="Nothing demanding attention" body="Drafts and revisions will surface here as the project develops." />
            )}
          </section>
        ) : null}

        {show('research') ? (
          <section className="panel home-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2>Research queue</h2>
              </div>
              <Link to="/research" className="text-button small">
                Library
              </Link>
            </div>
            {researchQueue.length ? (
              <div className="attention-list">
                {researchQueue.map((item) => (
                  <Link
                    key={item.id}
                    to={item.type === 'source' ? `/research/${item.id}` : item.type === 'note' ? `/research/note/${item.id}` : `/research?claim=${item.id}`}
                    className="attention-item"
                  >
                    <span className="attention-marker research">
                      <Icon name={item.type === 'claim' ? 'alert' : item.type === 'note' ? 'file' : 'library'} size={14} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.reason}</small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState compact icon="library" title="Research is connected" body="Sources and notes that still need synthesis will appear here." />
            )}
            <div className="research-queue-footer">
              <Link to="/research?new=source" className="text-button small">
                <Icon name="plus" size={13} /> Add a source
              </Link>
              <Link to="/inbox" className="text-button small">
                <Icon name="inbox" size={13} /> Process inbox
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      {show('completion') ? (
        <section className="panel progress-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">State of the work</p>
              <h2>Project progress</h2>
            </div>
            <span className="muted small">Reflects saved content only</span>
          </div>
          <div className="progress-grid">
            <div className="progress-tile">
              <span className="progress-number">{stats.methods}</span>
              <span className="progress-label">methods in the guide</span>
              <div className="progress-bar">
                <span style={{ width: `${Math.min(100, (stats.methods / 30) * 100)}%` }} />
              </div>
              <small>{stats.methods ? `${stats.methods} recorded; 30 is a working target for a first edition.` : 'No methods yet.'}</small>
            </div>
            <div className="progress-tile">
              <span className="progress-number">{stats.words.toLocaleString()}</span>
              <span className="progress-label">manuscript words</span>
              <div className="progress-bar">
                <span style={{ width: `${Math.min(100, (stats.words / 40000) * 100)}%` }} />
              </div>
              <small>{stats.documents} documents · 40,000 words is the first-draft target.</small>
            </div>
            <div className="progress-tile">
              <span className="progress-number">
                {stats.linkedSources}/{stats.sources}
              </span>
              <span className="progress-label">sources linked</span>
              <div className="progress-bar">
                <span style={{ width: `${stats.sources ? (stats.linkedSources / stats.sources) * 100 : 0}%` }} />
              </div>
              <small>{stats.notes} reading notes · {stats.quotations} quotations · {stats.claims} claims</small>
            </div>
            <div className="progress-tile">
              <span className="progress-number">{stats.experiments}</span>
              <span className="progress-label">experiments recorded</span>
              <div className="progress-bar">
                <span style={{ width: `${Math.min(100, (stats.experiments / 5) * 100)}%` }} />
              </div>
              <small>{project.methods.filter((m) => m.status === 'Being tested').length} methods currently being tested.</small>
            </div>
          </div>
          <div className="status-breakdown">
            <p className="field-label">Methods by editorial stage</p>
            <div className="status-bars">
              {['Idea', 'To research', 'In development', 'Ready for testing', 'Being tested', 'Needs revision', 'Evidence reviewed', 'Ready for manuscript', 'Published'].map((status) => {
                const count = project.methods.filter((m) => m.status === status).length;
                return (
                  <div key={status} className="status-bar-row">
                    <span>{status}</span>
                    <div className="mini-bar">
                      <span style={{ width: `${stats.methods ? (count / stats.methods) * 100 : 0}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {show('pinned') ? (
        <section className="home-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Shortcuts</p>
              <h2>Pinned sections</h2>
            </div>
            <button className="text-button small" onClick={() => setCustomizing(true)}>
              <Icon name="pin" size={13} /> Edit pins
            </button>
          </div>
          {pinned.length ? (
            <div className="pinned-grid">
              {pinned.map((section) => {
                const domain = project.domains.find((d) => d.id === section.domainId);
                const count = project.methods.filter(
                  (m) => m.primarySectionId === section.id || m.relatedSectionIds.includes(section.id),
                ).length;
                return (
                  <Link key={section.id} to={`/guide/section/${section.id}`} className={`pinned-card accent-${domain?.accent ?? 'physical'}`}>
                    <span className="pinned-domain">{domain?.title}</span>
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                    <span className="pinned-meta">{count} {count === 1 ? 'method' : 'methods'}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState compact icon="pin" title="No pinned sections" body="Choose the sections you are actively working on to keep them within reach." />
          )}
        </section>
      ) : null}

      <footer className="home-footer">
        <p>
          <SampleBadge show={project.settings.showIllustrativeBadges && project.methods.some((m) => m.illustrative)} /> Illustrative material is
          clearly marked and can be edited or deleted.
        </p>
        <p>Private by default · stored locally in this browser · export from Settings</p>
      </footer>
    </div>
  );
}
