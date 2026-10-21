import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { ReadingStatus, ResearchSource, SourceKind, Verification } from '../types';
import { READING_STATUSES, SOURCE_KINDS, VERIFICATIONS } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState, LinkDialog } from '../components/ui';
import { entityRoute, entityTitle, relationshipsFor } from '../lib/selectors';
import { now } from '../lib/factory';
import { formatDate, splitTags } from '../lib/utils';

export function ResearchEditorPage() {
  const { sourceId = '' } = useParams();
  const { project, update, unlink, toast } = useStore();
  const navigate = useNavigate();
  const source = project.sources.find((s) => s.id === sourceId);
  const [draft, setDraft] = useState<ResearchSource | null>(source ? structuredClone(source) : null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<ResearchSource | null>(draft);

  useEffect(() => {
    if (source) {
      setDraft(structuredClone(source));
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(null);
    }
    // Reset only when a different source is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = window.setTimeout(() => {
      update((projectDraft) => {
        const target = projectDraft.sources.find((s) => s.id === draft.id);
        if (target) Object.assign(target, { ...structuredClone(draft), updatedAt: now(), illustrative: false });
      });
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(now());
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, update]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current && draftRef.current) {
        const latest = draftRef.current;
        update((projectDraft) => {
          const target = projectDraft.sources.find((s) => s.id === latest.id);
          if (target) Object.assign(target, { ...structuredClone(latest), updatedAt: now(), illustrative: false });
        });
      }
    };
  }, [update]);

  if (!source || !draft) {
    return (
      <div className="page">
        <EmptyState icon="alert" title="Source not found" body="This source may have been deleted." action={<Link className="button primary" to="/research">Back to research</Link>} />
      </div>
    );
  }

  const change = (values: Partial<ResearchSource>) => {
    setDraft((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
    dirtyRef.current = true;
  };

  const saveNow = () => {
    if (!draft) return;
    update((projectDraft) => {
      const target = projectDraft.sources.find((s) => s.id === draft.id);
      if (target) Object.assign(target, { ...structuredClone(draft), updatedAt: now(), illustrative: false });
    });
    setDirty(false);
    dirtyRef.current = false;
    setSavedAt(now());
  };

  const links = relationshipsFor(project, draft.id);

  return (
    <div className="method-editor research-editor">
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <Link to={`/research/${source.id}`} className="back-link"><Icon name="arrow-left" size={15} /> Back to source</Link>
          <span className="topbar-sep" />
          <span className="editor-doc-title">{draft.title || 'Untitled source'}</span>
        </div>
        <div className="editor-topbar-right">
          <span className={`editor-save ${dirty ? 'dirty' : ''}`}>
            <span className="save-dot" /> {dirty ? 'Unsaved changes' : savedAt ? `Saved ${formatDate(savedAt)}` : 'All changes saved'}
          </span>
          <button className="button ghost small" onClick={saveNow} disabled={!dirty}>Save now</button>
          <button
            className="button primary small"
            onClick={() => {
              saveNow();
              navigate(`/research/${source.id}`);
            }}
          >
            Done
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          <section className="editor-section">
            <div className="editor-heading">
              <div className="editor-heading-title">
                <span className="method-letter">1</span>
                <div>
                  <p className="eyebrow">Citation</p>
                  <h1>Source details</h1>
                  <p>Record only what you can verify. Empty fields are better than invented ones.</p>
                </div>
              </div>
            </div>
            <div className="form-stack">
              <label className="field">
                <span>Title</span>
                <input className="title-input" value={draft.title} onChange={(e) => change({ title: e.target.value })} />
              </label>
              <div className="form-grid three">
                <label className="field">
                  <span>Source type</span>
                  <select value={draft.kind} onChange={(e) => change({ kind: e.target.value as SourceKind })}>
                    {SOURCE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Author or creator</span>
                  <input value={draft.creator} onChange={(e) => change({ creator: e.target.value })} />
                </label>
                <label className="field">
                  <span>Year</span>
                  <input value={draft.year} onChange={(e) => change({ year: e.target.value })} />
                </label>
              </div>
              <div className="form-grid two">
                <label className="field">
                  <span>Publication details</span>
                  <input value={draft.publication} onChange={(e) => change({ publication: e.target.value })} placeholder="Publisher, journal, edition…" />
                </label>
                <label className="field">
                  <span>URL, DOI or identifier</span>
                  <input value={draft.identifier} onChange={(e) => change({ identifier: e.target.value })} placeholder="DOI, ISBN, archive reference…" />
                </label>
              </div>
              <div className="form-grid two">
                <label className="field">
                  <span>URL</span>
                  <input value={draft.url} onChange={(e) => change({ url: e.target.value })} placeholder="https://…" />
                </label>
                <label className="field">
                  <span>Pages or passages consulted</span>
                  <input value={draft.pages} onChange={(e) => change({ pages: e.target.value })} placeholder="e.g. pp. 12–38" />
                </label>
              </div>
              <label className="field">
                <span>Tags <em>comma separated</em></span>
                <input value={draft.tags.join(', ')} onChange={(e) => change({ tags: splitTags(e.target.value) })} />
              </label>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-heading">
              <div className="editor-heading-title">
                <span className="method-letter">2</span>
                <div>
                  <p className="eyebrow">What the source says</p>
                  <h1>Summary and claims</h1>
                  <p>Keep this as close to the source's own position as you can. Your interpretation belongs in the next block.</p>
                </div>
              </div>
            </div>
            <div className="form-stack">
              <label className="field">
                <span>Summary</span>
                <textarea rows={4} value={draft.summary} onChange={(e) => change({ summary: e.target.value })} placeholder="What is the work about, and what does it argue?" />
              </label>
              <label className="field">
                <span>Key claims</span>
                <textarea rows={4} value={draft.keyClaims} onChange={(e) => change({ keyClaims: e.target.value })} placeholder="State the claims precisely, without adding your own conclusion." />
              </label>
              <label className="field">
                <span>Evidence or reasoning presented</span>
                <textarea rows={4} value={draft.evidence} onChange={(e) => change({ evidence: e.target.value })} placeholder="What kind of evidence or argument does the source provide?" />
              </label>
              <label className="field">
                <span>Limitations and criticisms</span>
                <textarea rows={3} value={draft.limitations} onChange={(e) => change({ limitations: e.target.value })} placeholder="Sample size, method, scope, counterarguments, conflicts of interest…" />
              </label>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-heading">
              <div className="editor-heading-title">
                <span className="method-letter">3</span>
                <div>
                  <p className="eyebrow">Your reading</p>
                  <h1>Interpretation and application</h1>
                  <p>Separate what you think the source means from what might be done with it.</p>
                </div>
              </div>
            </div>
            <div className="form-stack">
              <label className="field">
                <span>Your interpretation</span>
                <textarea rows={4} value={draft.interpretation} onChange={(e) => change({ interpretation: e.target.value })} />
              </label>
              <label className="field">
                <span>Practical implications</span>
                <textarea rows={3} value={draft.implications} onChange={(e) => change({ implications: e.target.value })} />
              </label>
            </div>
          </section>

          <section className="editor-section">
            <div className="editor-heading">
              <div className="editor-heading-title">
                <span className="method-letter">4</span>
                <div>
                  <p className="eyebrow">Epistemic status</p>
                  <h1>Review and verification</h1>
                  <p>The distinction between a stated claim, an interpretation and a proposed application is part of the record.</p>
                </div>
              </div>
            </div>
            <div className="form-stack">
              <div className="form-grid two">
                <label className="field">
                  <span>Reading status</span>
                  <select value={draft.readingStatus} onChange={(e) => change({ readingStatus: e.target.value as ReadingStatus })}>
                    {READING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Claim status</span>
                  <select value={draft.verification} onChange={(e) => change({ verification: e.target.value as Verification })}>
                    {VERIFICATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <small className="field-hint">Choosing “Author interpretation” or “Proposed application” prevents this record from being mistaken for direct support.</small>
                </label>
              </div>
            </div>
          </section>

          <section className="editor-section">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Connections</p>
                <h2>Linked records</h2>
              </div>
              <button className="button ghost small" onClick={() => setLinking(true)}>
                <Icon name="link" size={14} /> Link record
              </button>
            </div>
            {links.length ? (
              <div className="linked-list">
                {links.map((link) => (
                  <div key={link.relationship.id} className="linked-row">
                    <span className="linked-kind">{link.other.type}</span>
                    <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                    <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                    <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Unlink"><Icon name="unlink" size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No records linked yet. Attach methods, chapters or experiments this source informs.</p>
            )}
          </section>

          <p className="editor-end">Changes save automatically. <Link to={`/research/${source.id}`}>Return to the source page</Link>.</p>
        </div>

        <aside className="editor-aside">
          <div className="editor-aside-card">
            <p className="eyebrow">Reference discipline</p>
            <p className="small">
              This project deliberately does not generate citations. If a source detail is uncertain, leave it blank or mark it for verification
              rather than completing it from memory.
            </p>
            <Link to="/research" className="text-button small">Open the library <Icon name="arrow-right" size={13} /></Link>
          </div>
          <div className="editor-aside-card">
            <p className="eyebrow">Quick actions</p>
            <button className="text-button small full" onClick={() => { saveNow(); toast('Source saved.', 'success'); }}>
              <Icon name="check" size={13} /> Save now
            </button>
            <Link to={`/research/${source.id}`} className="text-button small">Add a note from the source page</Link>
          </div>
        </aside>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={source.id} defaultType="supports" />
    </div>
  );
}
