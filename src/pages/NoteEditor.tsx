import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { saveDraft, useRecordBase } from '../lib/collab/useRecordBase';
import type { ReadingNote } from '../types';
import { Icon } from '../components/Icon';
import { ConfirmDialog, EmptyState, LinkDialog } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { entityRoute, entityTitle, relationshipsFor } from '../lib/selectors';
import { now } from '../lib/factory';
import { formatDate, splitTags, wordCount } from '../lib/utils';

export function NoteEditorPage() {
  const { noteId = '' } = useParams();
  const { project, update, trashEntity, unlink, toast } = useStore();
  const navigate = useNavigate();
  const note = project.notes.find((n) => n.id === noteId);
  const [draft, setDraft] = useState<ReadingNote | null>(note ? structuredClone(note) : null);
  const baseRef = useRecordBase(note, setDraft);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<ReadingNote | null>(draft);

  useEffect(() => {
    if (note) {
      setDraft(structuredClone(note));
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = window.setTimeout(() => {
      update((projectDraft) => {
        const target = projectDraft.notes.find((n) => n.id === draft.id);
        if (target) saveDraft(baseRef, target, draft, { updatedAt: now(), illustrative: false });
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
          const target = projectDraft.notes.find((n) => n.id === latest.id);
          if (target) saveDraft(baseRef, target, latest, { updatedAt: now(), illustrative: false });
        });
      }
    };
  }, [update]);

  if (!note || !draft) {
    return (
      <div className="page">
        <EmptyState icon="file" title="Reading note not found" body="It may have been deleted." action={<Link className="button primary" to="/research">Back to the library</Link>} />
      </div>
    );
  }

  const change = (values: Partial<ReadingNote>) => {
    setDraft((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
    dirtyRef.current = true;
  };

  const saveNow = () => {
    if (!draft) return;
    update((projectDraft) => {
      const target = projectDraft.notes.find((n) => n.id === draft.id);
      if (target) saveDraft(baseRef, target, draft, { updatedAt: now(), illustrative: false });
    });
    setDirty(false);
    dirtyRef.current = false;
    setSavedAt(now());
  };

  const links = relationshipsFor(project, draft.id);
  const source = project.sources.find((s) => s.id === draft.sourceId);

  return (
    <div className="method-editor note-editor">
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <Link to="/research" className="back-link"><Icon name="arrow-left" size={15} /> Research library</Link>
          <span className="topbar-sep" />
          <span className="editor-doc-title">{draft.title || 'Untitled note'}</span>
        </div>
        <div className="editor-topbar-right">
          <span className={`editor-save ${dirty ? 'dirty' : ''}`}>
            <span className="save-dot" /> {dirty ? 'Unsaved changes' : savedAt ? `Saved ${formatDate(savedAt)}` : 'All changes saved'}
          </span>
          <button className="button ghost small" onClick={() => setPreview((v) => !v)}>
            <Icon name={preview ? 'pen' : 'eye'} size={14} /> {preview ? 'Write' : 'Preview'}
          </button>
          <button className="button ghost small" onClick={saveNow} disabled={!dirty}>Save now</button>
          <button className="button primary small" onClick={() => { saveNow(); toast('Reading note saved.', 'success'); }}>Save</button>
        </div>
      </div>

      <div className="note-editor-layout">
        <div className="note-editor-main">
          <input
            className="doc-title-input note-title-input"
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Note title"
            aria-label="Note title"
          />
          <div className="note-attach-row">
            <label className="field inline-field">
              <span>Attached source</span>
              <select value={draft.sourceId} onChange={(e) => change({ sourceId: e.target.value })}>
                <option value="">No source — reading note</option>
                {project.sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>
            {source ? (
              <Link to={`/research/${source.id}`} className="text-button small">
                <Icon name="library" size={13} /> Open source
              </Link>
            ) : null}
            <label className="field inline-field tags-field">
              <span>Tags</span>
              <input value={draft.tags.join(', ')} onChange={(e) => change({ tags: splitTags(e.target.value) })} placeholder="tags, separated" />
            </label>
          </div>

          {preview ? (
            <article className="preview-panel note-preview">
              <h1>{draft.title}</h1>
              <Markdown content={draft.body} />
            </article>
          ) : (
            <textarea
              className="note-body-editor"
              value={draft.body}
              onChange={(e) => change({ body: e.target.value })}
              placeholder="What does this source say? What do you make of it? What still needs checking?&#10;&#10;Markdown is supported."
              spellCheck
            />
          )}

          <div className="editor-statusbar">
            <span>{wordCount(draft.body).toLocaleString()} words</span>
            <span>{draft.body.length.toLocaleString()} characters</span>
            <span className="statusbar-saved">{dirty ? 'Saving shortly…' : savedAt ? `Saved ${formatDate(savedAt)}` : 'Saved'}</span>
          </div>
        </div>

        <aside className="note-editor-side">
          <div className="panel">
            <p className="eyebrow">Distinctions</p>
            <h3>Keep these apart</h3>
            <ul className="distinction-list">
              <li><strong>What the source says</strong><span>Paraphrase faithfully. Use the source record for claims.</span></li>
              <li><strong>Your interpretation</strong><span>Say so explicitly. It is not the source's voice.</span></li>
              <li><strong>Proposed application</strong><span>What might follow for practice.</span></li>
              <li><strong>Still to verify</strong><span>Questions, uncertain citations, unread passages.</span></li>
            </ul>
          </div>
          <div className="panel">
            <div className="panel-head tight">
              <p className="eyebrow">Connections</p>
              <button className="text-button small" onClick={() => setLinking(true)}><Icon name="link" size={13} /> Link</button>
            </div>
            {links.length ? (
              <div className="side-relation-list">
                {links.map((link) => (
                  <div key={link.relationship.id} className="side-relation">
                    <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                    <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                    <button className="icon-button tiny" onClick={() => unlink(link.relationship.id)} aria-label="Remove link"><Icon name="unlink" size={12} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Connect this note to the manuscript chapter or method it informs.</p>
            )}
            <p className="field-label">Link to a chapter</p>
            <p className="muted small">Use “Link” and choose Manuscript as the target, then the relationship type.</p>
          </div>
          <div className="panel">
            <p className="eyebrow">Record</p>
            <dl className="meta-list compact">
              <div><dt>Created</dt><dd>{formatDate(note.createdAt)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(note.updatedAt)}</dd></div>
              <div><dt>Words</dt><dd>{wordCount(draft.body)}</dd></div>
              <div><dt>Links</dt><dd>{links.length}</dd></div>
            </dl>
            <button className="text-button danger-text" onClick={() => setDeleting(true)}><Icon name="trash" size={13} /> Delete note</button>
          </div>
        </aside>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={draft.id} defaultType="supports" />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          trashEntity('note', draft.id, draft.title);
          navigate('/research');
        }}
        title="Delete this reading note?"
        body="The note will move to deleted items and can be restored from Settings."
      />
    </div>
  );
}
