import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Claim, Quotation, SourceKind } from '../types';
import { CLAIM_STATUSES, READING_STATUSES, SOURCE_KINDS } from '../types';
import { Icon } from '../components/Icon';
import {
  EmptyState,
  PageHeader,
  SampleBadge,
  StatusPill,
  Tabs,
} from '../components/ui';
import { ClaimDialog, QuotationDialog, SourceCreateDialog } from '../components/researchDialogs';
import { allTags } from '../lib/search';
import { relationshipsFor } from '../lib/selectors';
import { excerpt, formatDate, relativeTime } from '../lib/utils';
import { blankNote } from '../lib/factory';

const kindLabel = (kind: SourceKind) => SOURCE_KINDS.find((k) => k.key === kind)?.label ?? kind;
const kindIcon: Record<SourceKind, 'book' | 'library' | 'file' | 'graph' | 'alert' | 'quote' | 'network' | 'eye'> = {
  book: 'book',
  paper: 'library',
  report: 'file',
  website: 'network',
  text: 'book',
  framework: 'graph',
  observation: 'eye',
  'case-study': 'network',
  question: 'alert',
};

type TabKey = 'sources' | 'notes' | 'quotations' | 'claims';

export function ResearchPage() {
  const { project, update, toast } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('sources');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [reading, setReading] = useState('');
  const [tag, setTag] = useState('');
  const [sourceDialog, setSourceDialog] = useState(false);
  const [quoteDialog, setQuoteDialog] = useState<{ open: boolean; quote?: Quotation; sourceId?: string }>({ open: false });
  const [claimDialog, setClaimDialog] = useState<{ open: boolean; claim?: Claim }>({ open: false });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'source') setSourceDialog(true);
    if (params.get('quote')) {
      setTab('quotations');
      const quote = project.quotations.find((q) => q.id === params.get('quote'));
      if (quote) setQuoteDialog({ open: true, quote });
    }
    if (params.get('claim')) {
      setTab('claims');
      const claim = project.claims.find((c) => c.id === params.get('claim'));
      if (claim) setClaimDialog({ open: true, claim });
    }
    if (params.toString()) navigate('/research', { replace: true });
    // Only react to navigation query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const tags = allTags(project);

  const q = query.trim().toLowerCase();
  const sources = useMemo(
    () =>
      project.sources
        .filter((source) => {
          if (kind && source.kind !== kind) return false;
          if (reading && source.readingStatus !== reading) return false;
          if (tag && !source.tags.includes(tag)) return false;
          if (!q) return true;
          return [source.title, source.creator, source.summary, source.keyClaims, source.interpretation, source.implications, source.tags.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(q);
        })
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [project.sources, kind, reading, tag, q],
  );

  const notes = useMemo(
    () =>
      project.notes
        .filter((note) => {
          if (!q) return true;
          return [note.title, note.body, note.tags.join(' ')].join(' ').toLowerCase().includes(q);
        })
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [project.notes, q],
  );

  const quotes = useMemo(
    () =>
      project.quotations.filter((quote) => {
        if (!q) return true;
        return [quote.text, quote.note].join(' ').toLowerCase().includes(q);
      }),
    [project.quotations, q],
  );

  const claims = useMemo(
    () =>
      project.claims.filter((claim) => {
        if (!q) return true;
        return [claim.statement, claim.notes].join(' ').toLowerCase().includes(q);
      }),
    [project.claims, q],
  );

  const createNote = () => {
    const note = blankNote({ title: 'Untitled reading note' });
    update((draft) => {
      draft.notes.unshift(note);
    });
    navigate(`/research/note/${note.id}`);
  };

  const verifiedSources = project.sources.filter((s) => s.readingStatus === 'Read' || s.readingStatus === 'Reviewed').length;
  const openClaims = project.claims.filter((c) => c.status === 'Needs source' || c.status === 'Needs verification').length;

  return (
    <div className="page research-page">
      <PageHeader
        eyebrow="Evidence and interpretation"
        title="Research Library"
        subtitle="Sources, reading notes, quotations and claims — with a clear distinction between what a source says, what you make of it, and what still needs verification."
        actions={
          <>
            <button className="button ghost" onClick={createNote}>
              <Icon name="file" size={15} /> New note
            </button>
            <button className="button primary" onClick={() => setSourceDialog(true)}>
              <Icon name="plus" size={15} /> Add source
            </button>
          </>
        }
      />

      <div className="research-stat-row">
        <div><strong>{project.sources.length}</strong><span>sources</span></div>
        <div><strong>{verifiedSources}</strong><span>read or reviewed</span></div>
        <div><strong>{project.notes.length}</strong><span>reading notes</span></div>
        <div><strong>{project.quotations.length}</strong><span>quotations</span></div>
        <div className={openClaims ? 'attention' : ''}><strong>{openClaims}</strong><span>claims to verify</span></div>
      </div>

      <div className="research-toolbar">
        <Tabs
          tabs={[
            { key: 'sources', label: 'Sources', count: project.sources.length },
            { key: 'notes', label: 'Reading notes', count: project.notes.length },
            { key: 'quotations', label: 'Quotations', count: project.quotations.length },
            { key: 'claims', label: 'Claims', count: project.claims.length },
          ]}
          active={tab}
          onChange={(key) => setTab(key as TabKey)}
        />
        <div className="research-actions">
          <button className="text-button small" onClick={createNote}><Icon name="plus" size={13} /> Note</button>
          <button className="text-button small" onClick={() => setQuoteDialog({ open: true })}><Icon name="plus" size={13} /> Quotation</button>
          <button className="text-button small" onClick={() => setClaimDialog({ open: true })}><Icon name="plus" size={13} /> Claim</button>
        </div>
      </div>

      <div className="toolbar-row wrap research-filters">
        <label className="search-field">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this library…" aria-label="Search research" />
        </label>
        {tab === 'sources' ? (
          <>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by source type">
              <option value="">All source types</option>
              {SOURCE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <select value={reading} onChange={(e) => setReading(e.target.value)} aria-label="Filter by reading status">
              <option value="">Any reading status</option>
              {READING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        ) : null}
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {tab === 'sources' ? (
        sources.length ? (
          <div className="source-list">
            {sources.map((source) => {
              const links = relationshipsFor(project, source.id);
              const methods = links.filter((l) => l.other.type === 'method').length;
              return (
                <Link key={source.id} to={`/research/${source.id}`} className="source-row">
                  <span className={`source-icon kind-${source.kind}`}><Icon name={kindIcon[source.kind]} size={18} /></span>
                  <div className="source-main">
                    <div className="source-title-row">
                      <h3>{source.title}</h3>
                      <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(source.illustrative)} />
                    </div>
                    <p className="source-byline">
                      {source.creator || 'Creator not recorded'}{source.year ? ` · ${source.year}` : ''} · {kindLabel(source.kind)}
                    </p>
                    <p className="source-summary">{excerpt(source.summary, q, 180) || 'No summary yet.'}</p>
                    <div className="source-meta">
                      <StatusPill status={source.readingStatus} />
                      <span className={`verification ${source.verification.toLowerCase().replace(/ /g, '-')}`}>{source.verification}</span>
                      {source.tags.slice(0, 3).map((t) => <span key={t} className="mini-tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="source-side">
                    <span>{methods} method{methods === 1 ? '' : 's'}</span>
                    <span>{links.length} link{links.length === 1 ? '' : 's'}</span>
                    <span className="muted small">Updated {relativeTime(source.updatedAt)}</span>
                  </div>
                  <Icon name="chevron-right" size={16} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="library"
            title={q || kind || reading || tag ? 'No sources match' : 'No sources yet'}
            body={q || kind || reading || tag ? 'Try a broader search or clear a filter.' : 'Add the first source. Keep citation details honest and leave fields blank when you do not know them.'}
            action={<button className="button primary" onClick={() => setSourceDialog(true)}>Add a source</button>}
          />
        )
      ) : null}

      {tab === 'notes' ? (
        notes.length ? (
          <div className="note-grid">
            {notes.map((note) => {
              const source = project.sources.find((s) => s.id === note.sourceId);
              const links = relationshipsFor(project, note.id);
              return (
                <Link key={note.id} to={`/research/note/${note.id}`} className="note-card">
                  <div className="note-card-head">
                    <Icon name="file" size={15} />
                    <span>{source ? source.title : 'Unattached note'}</span>
                    <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(note.illustrative)} />
                  </div>
                  <h3>{note.title}</h3>
                  <p>{excerpt(note.body, q, 200) || 'No writing yet.'}</p>
                  <div className="note-card-foot">
                    <div>{note.tags.slice(0, 3).map((t) => <span key={t} className="mini-tag">{t}</span>)}</div>
                    <span>{links.length} connection{links.length === 1 ? '' : 's'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="file"
            title="No reading notes yet"
            body="Notes are where a source becomes useful to your own argument. Write one and connect it to a chapter or method."
            action={<button className="button primary" onClick={createNote}>Write a reading note</button>}
          />
        )
      ) : null}

      {tab === 'quotations' ? (
        quotes.length ? (
          <div className="quotation-list">
            {quotes.map((quote) => {
              const source = project.sources.find((s) => s.id === quote.sourceId);
              return (
                <div key={quote.id} className="quotation-card">
                  <blockquote>{quote.text}</blockquote>
                  <div className="quotation-meta">
                    <span>{source?.creator || 'Unattributed'}{source ? `, ${source.title}` : ''}{quote.page ? `, p. ${quote.page}` : ''}</span>
                    <div>
                      <button className="text-button tiny" onClick={() => setQuoteDialog({ open: true, quote })}>Edit</button>
                      <button
                        className="text-button tiny danger-text"
                        onClick={() => {
                          update((draft) => { draft.quotations = draft.quotations.filter((x) => x.id !== quote.id); });
                          toast('Quotation deleted.');
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {quote.note ? <p className="quotation-note">{quote.note}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="quote"
            title="No quotations yet"
            body="Quotations should be exact, attributed and checked against your edition. Use them for material you want to preserve verbatim."
            action={<button className="button primary" onClick={() => setQuoteDialog({ open: true })}>Add a quotation</button>}
          />
        )
      ) : null}

      {tab === 'claims' ? (
        <div>
          <div className="claim-legend">
            {CLAIM_STATUSES.map((status) => (
              <span key={status} className="verification" data-status={status.toLowerCase().replace(/ /g, '-')}>{status}</span>
            ))}
          </div>
          {claims.length ? (
            <div className="claim-list">
              {claims.map((claim) => (
                <div key={claim.id} className="claim-row">
                  <span className={`claim-status ${claim.status.toLowerCase().replace(/ /g, '-')}`} />
                  <div>
                    <p>{claim.statement}</p>
                    <div className="claim-meta">
                      <span className="verification">{claim.status}</span>
                      {claim.sourceIds.length ? (
                        claim.sourceIds.map((id) => {
                          const source = project.sources.find((s) => s.id === id);
                          return source ? <Link key={id} to={`/research/${source.id}`} className="mini-tag">{source.title}</Link> : null;
                        })
                      ) : (
                        <span className="mini-warning">No source attached</span>
                      )}
                      <span>Updated {formatDate(claim.updatedAt)}</span>
                    </div>
                    {claim.notes ? <p className="claim-notes">{claim.notes}</p> : null}
                  </div>
                  <button className="button ghost small" onClick={() => setClaimDialog({ open: true, claim })}>Edit</button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="alert"
              title="No claims recorded"
              body="Record the propositions your manuscript depends on, then attach sources or mark them for verification. This prevents unsupported claims from slipping into the book."
              action={<button className="button primary" onClick={() => setClaimDialog({ open: true })}>Record a claim</button>}
            />
          )}
        </div>
      ) : null}

      <SourceCreateDialog open={sourceDialog} onClose={() => setSourceDialog(false)} />
      <QuotationDialog open={quoteDialog.open} onClose={() => setQuoteDialog({ open: false })} quotation={quoteDialog.quote} defaultSourceId={quoteDialog.sourceId} />
      <ClaimDialog open={claimDialog.open} onClose={() => setClaimDialog({ open: false })} claim={claimDialog.claim} />
    </div>
  );
}
