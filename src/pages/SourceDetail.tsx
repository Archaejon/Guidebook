import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { READING_STATUSES, SOURCE_KINDS } from '../types';
import { Icon } from '../components/Icon';
import {
  ConfirmDialog,
  EmptyState,
  LinkDialog,
  RelationshipRow,
  SampleBadge,
  StatusPill,
} from '../components/ui';
import { ClaimDialog, QuotationDialog } from '../components/researchDialogs';
import {
  entityRoute,
  entityTitle,
  relationshipsFor,
} from '../lib/selectors';
import { blankNote } from '../lib/factory';
import { formatDate, relativeTime } from '../lib/utils';
import type { Claim, Quotation } from '../types';

const kindLabel = (kind: string) => SOURCE_KINDS.find((k) => k.key === kind)?.label ?? kind;

export function SourceDetailPage() {
  const { sourceId = '' } = useParams();
  const { project, update, trashEntity, unlink, toast } = useStore();
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [quoteDialog, setQuoteDialog] = useState<{ open: boolean; quote?: Quotation }>({ open: false });
  const [claimDialog, setClaimDialog] = useState<{ open: boolean; claim?: Claim }>({ open: false });
  const source = project.sources.find((s) => s.id === sourceId);

  if (!source) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="Source not found"
          body="It may have been deleted. Check deleted items in Settings if you need to restore it."
          action={<Link className="button primary" to="/research">Back to the library</Link>}
        />
      </div>
    );
  }

  const links = relationshipsFor(project, source.id);
  const linkedMethods = links.filter((l) => l.other.type === 'method');
  const otherLinks = links.filter((l) => l.other.type !== 'method');
  const notes = project.notes.filter((n) => n.sourceId === source.id);
  const quotations = project.quotations.filter((q) => q.sourceId === source.id);
  const claims = project.claims.filter((c) => c.sourceIds.includes(source.id));

  const addNote = () => {
    const note = blankNote({ sourceId: source.id, title: `Note on ${source.title}` });
    update((draft) => {
      draft.notes.unshift(note);
    });
    navigate(`/research/note/${note.id}`);
  };

  return (
    <div className="page source-detail">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/research">Research Library</Link>
        <Icon name="chevron-right" size={12} />
        <span>{source.title}</span>
      </nav>

      <header className="source-hero">
        <div className="source-hero-meta">
          <span className="source-kind-badge">{kindLabel(source.kind)}</span>
          <StatusPill status={source.readingStatus} />
          <span className={`verification ${source.verification.toLowerCase().replace(/ /g, '-')}`}>{source.verification}</span>
          <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(source.illustrative)} />
        </div>
        <h1>{source.title}</h1>
        <p className="source-hero-byline">
          {source.creator || 'Creator not recorded'}{source.year ? ` · ${source.year}` : ''}{source.publication ? ` · ${source.publication}` : ''}
        </p>
        <div className="source-hero-actions">
          <Link className="button primary small" to={`/research/${source.id}/edit`}>
            <Icon name="edit" size={14} /> Edit source
          </Link>
          <button className="button ghost small" onClick={() => setLinking(true)}>
            <Icon name="link" size={14} /> Connect
          </button>
          <button className="button ghost small" onClick={addNote}>
            <Icon name="file" size={14} /> Add reading note
          </button>
          <button className="button ghost small" onClick={() => setQuoteDialog({ open: true })}>
            <Icon name="quote" size={14} /> Add quotation
          </button>
        </div>
      </header>

      {source.verification === 'Needs verification' ? (
        <div className="verification-callout">
          <Icon name="alert" size={18} />
          <div>
            <strong>This record still needs verification.</strong>
            <p>Treat claims drawn from it as provisional until you have checked the source and recorded what it actually says.</p>
          </div>
        </div>
      ) : null}

      <div className="source-layout">
        <div className="source-main">
          <div className="quadrant-grid">
            <section className="panel quadrant">
              <p className="eyebrow">1 · What the source says</p>
              <h2>Summary</h2>
              <p>{source.summary || <span className="muted">No summary recorded.</span>}</p>
              {source.keyClaims ? (
                <>
                  <p className="field-label">Key claims</p>
                  <p className="pre-wrap">{source.keyClaims}</p>
                </>
              ) : null}
              {source.evidence ? (
                <>
                  <p className="field-label">Evidence or reasoning presented</p>
                  <p className="pre-wrap">{source.evidence}</p>
                </>
              ) : null}
              {source.limitations ? (
                <>
                  <p className="field-label">Limitations and criticisms</p>
                  <p className="pre-wrap">{source.limitations}</p>
                </>
              ) : null}
            </section>

            <section className="panel quadrant interpretation">
              <p className="eyebrow">2 · Author’s interpretation</p>
              <h2>What you make of it</h2>
              <p>{source.interpretation || <span className="muted">No interpretation recorded. Keep interpretation visibly separate from the source's own claims.</span>}</p>
              <div className="quadrant-note">
                <Icon name="eye" size={14} />
                <span>This is your reading, not a statement by the source.</span>
              </div>
            </section>

            <section className="panel quadrant application">
              <p className="eyebrow">3 · Proposed practical application</p>
              <h2>What it might mean for practice</h2>
              <p>{source.implications || <span className="muted">No practical implications recorded yet.</span>}</p>
            </section>

            <section className="panel quadrant verify">
              <p className="eyebrow">4 · Still to verify</p>
              <h2>Open questions and claim status</h2>
              <p className="verification-state">
                <span className={`verification ${source.verification.toLowerCase().replace(/ /g, '-')}`}>{source.verification}</span>
              </p>
              <p className="muted small">
                A source being read does not make every claim drawn from it supported. Record specific claims and attach evidence below.
              </p>
              {claims.length ? (
                <div className="claim-list compact">
                  {claims.map((claim) => (
                    <button key={claim.id} className="claim-mini" onClick={() => setClaimDialog({ open: true, claim })}>
                      <span className={`claim-status ${claim.status.toLowerCase().replace(/ /g, '-')}`} />
                      <span>{claim.statement}</span>
                      <small>{claim.status}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted small">No claims recorded from this source yet.</p>
              )}
              <button className="text-button small" onClick={() => setClaimDialog({ open: true })}>
                <Icon name="plus" size={13} /> Record a claim
              </button>
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Verbatim</p>
                <h2>Quotations</h2>
              </div>
              <button className="button ghost small" onClick={() => setQuoteDialog({ open: true })}>
                <Icon name="plus" size={13} /> Add quotation
              </button>
            </div>
            {quotations.length ? (
              <div className="quotation-list compact">
                {quotations.map((quote) => (
                  <div key={quote.id} className="quotation-card">
                    <blockquote>{quote.text}</blockquote>
                    <div className="quotation-meta">
                      <span>{quote.page ? `p. ${quote.page}` : 'Page not recorded'}</span>
                      <div>
                        <button className="text-button tiny" onClick={() => setQuoteDialog({ open: true, quote })}>Edit</button>
                        <button
                          className="text-button tiny danger-text"
                          onClick={() => {
                            update((draft) => { draft.quotations = draft.quotations.filter((q) => q.id !== quote.id); });
                            toast('Quotation deleted.');
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {quote.note ? <p className="quotation-note">{quote.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No quotations recorded from this source.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Your reading</p>
                <h2>Reading notes</h2>
              </div>
              <button className="button ghost small" onClick={addNote}>
                <Icon name="plus" size={13} /> Add note
              </button>
            </div>
            {notes.length ? (
              <div className="note-list">
                {notes.map((note) => (
                  <Link key={note.id} to={`/research/note/${note.id}`} className="note-row">
                    <Icon name="file" size={15} />
                    <div>
                      <strong>{note.title}</strong>
                      <p>{note.body.slice(0, 160) || 'No writing yet.'}</p>
                    </div>
                    <span>{relativeTime(note.updatedAt)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted small">No notes attached. A record can carry as many notes and quotations as it needs.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Connections</p>
                <h2>Where this source is used</h2>
              </div>
              <button className="text-button small" onClick={() => setLinking(true)}>
                <Icon name="link" size={13} /> Link a record
              </button>
            </div>
            {linkedMethods.length ? (
              <>
                <p className="field-label">Methods supported or challenged</p>
                <div className="relationship-list">
                  {linkedMethods.map((link) => (
                    <RelationshipRow
                      key={link.relationship.id}
                      title={entityTitle(link.other)}
                      route={entityRoute(link.other)}
                      type={link.relationship.type}
                      note={link.relationship.note}
                      onRemove={() => unlink(link.relationship.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="muted small">Not linked to any methods yet.</p>
            )}
            {otherLinks.length ? (
              <>
                <p className="field-label">Other records</p>
                <div className="relationship-list">
                  {otherLinks.map((link) => (
                    <RelationshipRow
                      key={link.relationship.id}
                      title={entityTitle(link.other)}
                      route={entityRoute(link.other)}
                      type={link.relationship.type}
                      note={link.relationship.note}
                      onRemove={() => unlink(link.relationship.id)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>

        <aside className="source-sidebar">
          <div className="panel">
            <p className="eyebrow">Publication details</p>
            <dl className="meta-list">
              <div><dt>Type</dt><dd>{kindLabel(source.kind)}</dd></div>
              <div><dt>Creator</dt><dd>{source.creator || '—'}</dd></div>
              <div><dt>Year</dt><dd>{source.year || '—'}</dd></div>
              <div><dt>Publication</dt><dd>{source.publication || '—'}</dd></div>
              <div><dt>Identifier</dt><dd>{source.identifier || '—'}</dd></div>
              <div><dt>Pages</dt><dd>{source.pages || '—'}</dd></div>
            </dl>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-button small break-all">
                <Icon name="external" size={13} /> {source.url}
              </a>
            ) : (
              <p className="muted small">No URL recorded.</p>
            )}
            {!source.identifier && !source.url && !source.publication ? (
              <p className="source-incomplete"><Icon name="alert" size={13} /> Citation details are incomplete. Do not cite publicly until verified.</p>
            ) : null}
          </div>

          <div className="panel">
            <p className="eyebrow">Reading</p>
            <label className="field">
              <span>Reading status</span>
              <select
                value={source.readingStatus}
                onChange={(e) =>
                  update((draft) => {
                    const target = draft.sources.find((s) => s.id === source.id);
                    if (target) {
                      target.readingStatus = e.target.value as typeof source.readingStatus;
                      target.updatedAt = new Date().toISOString();
                    }
                  })
                }
              >
                {READING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <p className="field-label">Tags</p>
            <div className="chip-row">{source.tags.length ? source.tags.map((t) => <span key={t} className="chip">{t}</span>) : <span className="muted small">No tags.</span>}</div>
            <p className="eyebrow spaced">Record</p>
            <dl className="meta-list compact">
              <div><dt>Created</dt><dd>{formatDate(source.createdAt)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(source.updatedAt)}</dd></div>
              <div><dt>Notes</dt><dd>{notes.length}</dd></div>
              <div><dt>Quotations</dt><dd>{quotations.length}</dd></div>
            </dl>
            <button className="text-button danger-text" onClick={() => setDeleting(true)}>
              <Icon name="trash" size={13} /> Delete source
            </button>
          </div>
        </aside>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={source.id} defaultType="supports" />
      <QuotationDialog open={quoteDialog.open} onClose={() => setQuoteDialog({ open: false })} quotation={quoteDialog.quote} defaultSourceId={source.id} />
      <ClaimDialog open={claimDialog.open} onClose={() => setClaimDialog({ open: false })} claim={claimDialog.claim} defaultSourceId={source.id} />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          trashEntity('source', source.id, source.title);
          navigate('/research');
        }}
        title="Delete this source?"
        body={`“${source.title}” will move to deleted items. Attached notes and quotations will remain but will lose their source.`}
      />
    </div>
  );
}
