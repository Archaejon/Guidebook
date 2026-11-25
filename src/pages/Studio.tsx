import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { DocKind, DocStatus, ManuscriptDoc } from '../types';
import { DOC_KINDS, DOC_STATUSES } from '../types';
import { Icon } from '../components/Icon';
import {
  ConfirmDialog,
  EmptyState,
  LinkDialog,
  Modal,
  PageHeader,
  StatusPill,
  Tabs,
} from '../components/ui';
import { Markdown } from '../components/Markdown';
import { mergeText, shiftPosition, spliceDiff } from '../lib/collab/textDiff';
import { blankComment, blankDocument, now } from '../lib/factory';
import {
  childDocuments,
  descendantIds,
  entityRoute,
  entityTitle,
  extractMethodRefs,
  orderedDocuments,
  relationshipsFor,
} from '../lib/selectors';
import { downloadFile, formatDateTime, readingMinutes, relativeTime, slugify, wordCount } from '../lib/utils';
import { downloadManuscriptMarkdown, downloadManuscriptText } from '../lib/exports';

const childKindFor: Record<DocKind, DocKind> = {
  part: 'chapter',
  chapter: 'section',
  section: 'subsection',
  subsection: 'passage',
  passage: 'passage',
};

const kindLabel: Record<DocKind, string> = {
  part: 'Part',
  chapter: 'Chapter',
  section: 'Section',
  subsection: 'Subsection',
  passage: 'Passage',
};

function statusCount(project: { documents: ManuscriptDoc[] }, status: DocStatus): number {
  return project.documents.filter((d) => d.status === status).length;
}

export function StudioOverviewPage() {
  const { project, update } = useStore();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKind, setNewKind] = useState<DocKind>('part');
  const [query, setQuery] = useState('');
  const words = project.documents.reduce((sum, d) => sum + wordCount(d.content), 0);
  const comments = project.documents.reduce((sum, d) => sum + d.comments.filter((c) => !c.resolved).length, 0);
  const ongoing = project.documents.filter((d) => d.status === 'Draft' || d.status === 'Revising').length;

  const filteredTree = useMemo(() => {
    if (!query.trim()) return orderedDocuments(project);
    const q = query.toLowerCase();
    return orderedDocuments(project).filter(({ doc }) => doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q));
  }, [project, query]);

  return (
    <div className="page studio-overview">
      <PageHeader
        eyebrow="The manuscript"
        title="Writing Studio"
        subtitle="A long-form workspace for the book itself. Structure the argument, write chapters, and keep methods and sources connected to the prose."
        actions={
          <>
            <button className="button ghost" onClick={() => downloadManuscriptText(project)}>
              <Icon name="download" size={15} /> Plain text
            </button>
            <button className="button ghost" onClick={() => downloadManuscriptMarkdown(project)}>
              <Icon name="download" size={15} /> Markdown
            </button>
            <button className="button primary" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} /> New part or chapter
            </button>
          </>
        }
      />

      <div className="studio-stat-bar">
        <div><strong>{words.toLocaleString()}</strong><span>words</span></div>
        <div><strong>{project.documents.filter((d) => d.kind === 'chapter').length}</strong><span>chapters</span></div>
        <div><strong>{ongoing}</strong><span>drafts in progress</span></div>
        <div><strong>{comments}</strong><span>open notes</span></div>
        <div><strong>{project.methods.length}</strong><span>methods available to reference</span></div>
      </div>

      <div className="studio-overview-grid">
        <section className="panel manuscript-structure">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Structure</p>
              <h2>The manuscript</h2>
            </div>
            <label className="mini-search">
              <Icon name="search" size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter structure…" />
            </label>
          </div>
          {filteredTree.length ? (
            <div className="overview-tree">
              {filteredTree.map(({ doc, depth }) => (
                <Link key={doc.id} to={`/studio/${doc.id}`} className={`overview-doc kind-${doc.kind}`} style={{ paddingLeft: `${12 + depth * 22}px` }}>
                  <span className={`doc-kind-badge kind-${doc.kind}`}>{kindLabel[doc.kind]}</span>
                  <span className="overview-doc-title">{doc.title}</span>
                  <span className="overview-doc-meta">{wordCount(doc.content).toLocaleString()}w</span>
                  <StatusPill status={doc.status} />
                  {doc.comments.some((c) => !c.resolved) ? (
                    <span className="comment-count"><Icon name="comment" size={12} /> {doc.comments.filter((c) => !c.resolved).length}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="pen"
              title={query ? 'No documents match' : 'The manuscript is empty'}
              body={query ? 'Try a different word.' : 'Begin with a part, then add chapters beneath it. You can restructure everything later without losing content.'}
              action={<button className="button primary" onClick={() => setCreateOpen(true)}>Create the first part</button>}
            />
          )}
          <div className="structure-actions">
            <button className="text-button small" onClick={() => { setNewKind('part'); setCreateOpen(true); }}>
              <Icon name="plus" size={13} /> Add part
            </button>
            <button className="text-button small" onClick={() => { setNewKind('chapter'); setCreateOpen(true); }}>
              <Icon name="plus" size={13} /> Add top-level chapter
            </button>
          </div>
        </section>

        <aside className="studio-overview-side">
          <section className="panel">
            <p className="eyebrow">Working rhythm</p>
            <h2>Recent writing</h2>
            {project.documents.filter((d) => wordCount(d.content) > 0).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5).map((doc) => (
              <Link key={doc.id} to={`/studio/${doc.id}`} className="recent-writing">
                <strong>{doc.title}</strong>
                <span>{wordCount(doc.content).toLocaleString()} words · {relativeTime(doc.updatedAt)}</span>
              </Link>
            ))}
            {!project.documents.some((d) => wordCount(d.content) > 0) ? <p className="muted small">No prose yet. Open a chapter to begin.</p> : null}
          </section>
          <section className="panel studio-guidance">
            <p className="eyebrow">Private by default</p>
            <p className="small">
              The manuscript is stored in this browser and is never published automatically. Only records marked <strong>Published</strong> appear in the
              reader view or reader export.
            </p>
            <Link to="/settings" className="text-button small">Privacy and exports <Icon name="arrow-right" size={13} /></Link>
          </section>
          <section className="panel">
            <p className="eyebrow">Status</p>
            <div className="doc-status-grid">
              {DOC_STATUSES.map((status) => (
                <div key={status}><span>{status}</span><strong>{statusCount(project, status)}</strong></div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add to the manuscript"
        eyebrow="New document"
        footer={
          <>
            <button className="button ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button
              className="button primary"
              onClick={() => {
                const doc = blankDocument({ kind: newKind, title: newKind === 'part' ? 'Untitled part' : newKind === 'chapter' ? 'Untitled chapter' : 'Untitled section', order: project.documents.filter((d) => !d.parentId).length });
                update((draft) => {
                  draft.documents.push(doc);
                });
                setCreateOpen(false);
                navigate(`/studio/${doc.id}`);
              }}
            >
              Create document
            </button>
          </>
        }
      >
        <div className="form-stack">
          <div className="field">
            <span>Kind</span>
            <div className="kind-options">
              {DOC_KINDS.map((kind) => (
                <button key={kind} type="button" className={`kind-option ${newKind === kind ? 'active' : ''}`} onClick={() => setNewKind(kind)}>
                  {kindLabel[kind]}
                </button>
              ))}
            </div>
          </div>
          <p className="form-note">The document opens immediately so you can write the title and prose. Nested documents can be reorganised at any time.</p>
        </div>
      </Modal>
    </div>
  );
}

function ManuscriptTree({
  activeId,
  onAdd,
  onDelete,
}: {
  activeId: string;
  onAdd: (parentId: string | null, kind: DocKind) => void;
  onDelete: (doc: ManuscriptDoc) => void;
}) {
  const { project, update } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [moveDoc, setMoveDoc] = useState<ManuscriptDoc | null>(null);
  const [targetParent, setTargetParent] = useState('');
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const tree = orderedDocuments(project);
  const matching = filter.trim()
    ? tree.filter(({ doc }) => doc.title.toLowerCase().includes(filter.toLowerCase()) || doc.content.toLowerCase().includes(filter.toLowerCase()))
    : tree;
  const hiddenByCollapse = (doc: ManuscriptDoc) => {
    let parentId = doc.parentId;
    while (parentId) {
      if (open[parentId] === false) return true;
      parentId = project.documents.find((d) => d.id === parentId)?.parentId ?? null;
    }
    return false;
  };
  const visible = matching.filter(({ doc }) => filter.trim() || !hiddenByCollapse(doc));

  const move = (doc: ManuscriptDoc, direction: -1 | 1) => {
    update((draft) => {
      const siblings = draft.documents.filter((d) => d.parentId === doc.parentId).sort((a, b) => a.order - b.order);
      const index = siblings.findIndex((d) => d.id === doc.id);
      const swap = siblings[index + direction];
      if (!swap) return;
      const currentOrder = doc.order;
      const target = draft.documents.find((d) => d.id === doc.id);
      const other = draft.documents.find((d) => d.id === swap.id);
      if (!target || !other) return;
      target.order = swap.order;
      other.order = currentOrder;
    });
  };

  const commitMove = () => {
    if (!moveDoc) return;
    const parentId = targetParent || null;
    if (parentId && (parentId === moveDoc.id || descendantIds(project, moveDoc.id).includes(parentId))) return;
    update((draft) => {
      const target = draft.documents.find((d) => d.id === moveDoc.id);
      if (!target) return;
      target.parentId = parentId;
      target.order = draft.documents.filter((d) => d.parentId === parentId).length;
    });
    setMoveDoc(null);
    setTargetParent('');
  };

  return (
    <div className="tree-panel">
      <div className="tree-head">
        <div>
          <p className="eyebrow">Manuscript</p>
          <Link to="/studio" className="tree-title">Structure</Link>
        </div>
        <button className="icon-button subtle" onClick={() => onAdd(null, 'part')} aria-label="Add part">
          <Icon name="plus" size={16} />
        </button>
      </div>
      <label className="mini-search tree-search">
        <Icon name="search" size={14} />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a document…" />
      </label>
      <div className="tree-scroll">
        {visible.map(({ doc, depth }) => {
          const hasChildren = childDocuments(project, doc.id).length > 0;
          const isOpen = open[doc.id] !== false;
          return (
            <div            key={doc.id}
            className={`tree-row ${doc.id === activeId ? 'active' : ''} kind-${doc.kind}`} style={{ paddingLeft: `${8 + depth * 13}px` }}>
              <button
                className={`tree-toggle ${hasChildren ? '' : 'leaf'}`}
                onClick={() => setOpen((prev) => ({ ...prev, [doc.id]: !isOpen }))}
                aria-label={hasChildren ? (isOpen ? 'Collapse' : 'Expand') : undefined}
                tabIndex={hasChildren ? 0 : -1}
              >
                {hasChildren ? <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={12} /> : <span className="tree-dot" />}
              </button>
              <button className="tree-doc" onClick={() => navigate(`/studio/${doc.id}`)} title={doc.title}>
                <span className="tree-doc-title">{doc.title || 'Untitled'}</span>
                <span className="tree-doc-meta">
                  {kindLabel[doc.kind]} · {wordCount(doc.content).toLocaleString()}w
                  {doc.comments.some((c) => !c.resolved) ? ` · ${doc.comments.filter((c) => !c.resolved).length} note${doc.comments.filter((c) => !c.resolved).length > 1 ? 's' : ''}` : ''}
                </span>
              </button>
              <div className="tree-row-actions">
                <button className="icon-button tiny" onClick={() => move(doc, -1)} aria-label="Move up"><Icon name="chevron-up" size={12} /></button>
                <button className="icon-button tiny" onClick={() => move(doc, 1)} aria-label="Move down"><Icon name="chevron-down" size={12} /></button>
                <button className="icon-button tiny" onClick={() => onAdd(doc.id, childKindFor[doc.kind])} aria-label="Add child document"><Icon name="plus" size={12} /></button>
                <button className="icon-button tiny" onClick={() => { setMoveDoc(doc); setTargetParent(doc.parentId ?? ''); }} aria-label="Move under another document"><Icon name="indent" size={12} /></button>
                <button className="icon-button tiny danger-text" onClick={() => onDelete(doc)} aria-label="Delete document"><Icon name="trash" size={12} /></button>
              </div>
            </div>
          );
        })}
        {!visible.length ? <p className="muted small tree-empty">No documents. Add a part to begin.</p> : null}
      </div>
      <div className="tree-foot">
        <button className="text-button small" onClick={() => onAdd(null, 'part')}><Icon name="plus" size={12} /> Add part</button>
        <span>{tree.length} documents</span>
      </div>

      <Modal
        open={Boolean(moveDoc)}
        onClose={() => setMoveDoc(null)}
        title="Move document"
        eyebrow={moveDoc?.title}
        footer={
          <>
            <button className="button ghost" onClick={() => setMoveDoc(null)}>Cancel</button>
            <button className="button primary" onClick={commitMove}>Move</button>
          </>
        }
      >
        <div className="form-stack">
          <label className="field">
            <span>New parent</span>
            <select value={targetParent} onChange={(e) => setTargetParent(e.target.value)}>
              <option value="">Top level</option>
              {project.documents
                .filter((d) => moveDoc && d.id !== moveDoc.id && !descendantIds(project, moveDoc.id).includes(d.id))
                .map((d) => <option key={d.id} value={d.id}>{`${'— '.repeat(0)}${d.title} (${kindLabel[d.kind]})`}</option>)}
            </select>
          </label>
          <p className="form-note">Moving a document keeps its content, comments and links. Its children move with it.</p>
        </div>
      </Modal>
    </div>
  );
}

function StudioEditor({ doc }: { doc: ManuscriptDoc }) {
  const { project, update, trashEntity, toast, linkRecords, unlink } = useStore();
  const navigate = useNavigate();
  const focusMode = new URLSearchParams(window.location.search).get('focus') === '1';
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [status, setStatus] = useState<DocStatus>(doc.status);
  const [savedState, setSavedState] = useState<'saved' | 'saving'>('saved');
  const [lastSaved, setLastSaved] = useState<string | null>(doc.updatedAt);
  const [preview, setPreview] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [panel, setPanel] = useState('outline');
  const [treeOpen, setTreeOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentExcerpt, setCommentExcerpt] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [methodPicker, setMethodPicker] = useState(false);
  const [methodQuery, setMethodQuery] = useState('');
  const [linking, setLinking] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKind, setNewKind] = useState<DocKind>('chapter');
  const [newParentId, setNewParentId] = useState<string | null>(doc.id);
  const [newTitle, setNewTitle] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const latest = useRef({ title, content, status });
  const mounted = useRef(false);
  const dirty = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const lastPush = useRef(0);

  useEffect(() => {
    latest.current = { title, content, status };
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title, content, status]);

  /**
   * The stored title, text and status as this editor last saw them. A save
   * writes only what differs from it, and a change arriving from a
   * collaborator is merged against it (see the effect below), so two people in
   * the same document keep each other's words.
   */
  const base = useRef({ title: doc.title, content: doc.content, status: doc.status });
  const caret = useRef<{ start: number; end: number } | null>(null);

  const writeChanges = useCallback(
    (snapshot: { title: string; content: string; status: DocStatus }) => {
      const before = base.current;
      const written = { title: snapshot.title.trim() || 'Untitled', content: snapshot.content, status: snapshot.status };
      // Taking in a collaborator's change also passes through here; with nothing
      // of this person's to write, it must not bounce back as a fresh save.
      if (written.title === before.title && written.content === before.content && written.status === before.status) return;
      // Move the base forward by this save alone, so its echo is not merged again.
      base.current = written;
      update((draft) => {
        const target = draft.documents.find((d) => d.id === doc.id);
        if (!target) return;
        if (written.title !== before.title) target.title = written.title;
        if (written.content !== before.content) target.content = written.content;
        if (written.status !== before.status) target.status = written.status;
        target.updatedAt = now();
        target.illustrative = false;
      });
    },
    [doc.id, update],
  );

  useEffect(() => {
    const before = base.current;
    const incoming = { title: doc.title, content: doc.content, status: doc.status };
    if (incoming.title === before.title && incoming.content === before.content && incoming.status === before.status) return;
    const mine = latest.current;
    const nextTitle = mine.title.trim() === before.title ? incoming.title : mergeText(before.title, mine.title, incoming.title);
    const nextContent = mine.content === before.content ? incoming.content : mergeText(before.content, mine.content, incoming.content);
    const nextStatus = mine.status === before.status ? incoming.status : mine.status;
    base.current = incoming;
    if (nextContent !== mine.content) {
      const el = textarea.current;
      if (el && document.activeElement === el) {
        const splice = spliceDiff(mine.content, nextContent);
        caret.current = { start: shiftPosition(el.selectionStart, splice), end: shiftPosition(el.selectionEnd, splice) };
      }
      setContent(nextContent);
    }
    if (nextTitle !== mine.title && nextTitle !== mine.title.trim()) setTitle(nextTitle);
    if (nextStatus !== mine.status) setStatus(nextStatus);
  }, [doc.title, doc.content, doc.status]);

  // Keep the caret where the person left it when a collaborator's text lands.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!caret.current || !el) return;
    el.setSelectionRange(caret.current.start, caret.current.end);
    caret.current = null;
  }, [content]);

  const commit = useCallback(() => {
    if (!dirty.current) return;
    const snapshot = latest.current;
    writeChanges(snapshot);
    dirty.current = false;
    setSavedState('saved');
    setLastSaved(now());
  }, [writeChanges]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setSavedState('saving');
    dirty.current = true;
    const timer = window.setTimeout(commit, 700);
    return () => window.clearTimeout(timer);
  }, [title, content, status, commit]);

  useEffect(() => {
    return () => {
      if (dirty.current) writeChanges(latest.current);
    };
  }, [writeChanges]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const history = (next: string) => {
    if (next === content) return;
    const stamp = Date.now();
    if (stamp - lastPush.current > 700) {
      past.current.push(content);
      if (past.current.length > 100) past.current.shift();
      lastPush.current = stamp;
      future.current = [];
    }
    setContent(next);
  };

  const undo = () => {
    const previous = past.current.pop();
    if (previous === undefined) return;
    future.current.push(content);
    setContent(previous);
    lastPush.current = 0;
  };

  const redo = () => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(content);
    setContent(next);
    lastPush.current = 0;
  };

  const importMarkdown = async (file: File) => {
    const raw = (await file.text()).replace(/\r\n/g, '\n').trim();
    if (!raw) {
      toast('That file has no text to import.', 'error');
      return;
    }
    let body = raw;
    // A leading H1 becomes the document title when this document is still blank.
    const heading = /^#\s+(.+?)\s*\n+/.exec(body);
    const nextTitle = heading && !content.trim() ? heading[1].trim() : title;
    if (heading && !content.trim()) body = body.slice(heading[0].length);
    const next = content.trim() ? `${content.replace(/\s+$/, '')}\n\n${body}` : body;
    past.current.push(content);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    lastPush.current = Date.now();
    setContent(next);
    if (nextTitle !== title) setTitle(nextTitle);
    toast(`Imported ${file.name}. Undo restores the previous text.`, 'success');
  };

  const insert = (before: string, after = '', fallback = 'text') => {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || fallback;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    history(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertAtLineStart = (prefix: string) => {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    history(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const outline = useMemo(() => {
    const headings: { level: number; text: string; index: number }[] = [];
    const regex = /^(#{1,5})\s+(.+)$/gm;
    let match = regex.exec(content);
    while (match) {
      headings.push({ level: match[1].length, text: match[2], index: match.index });
      match = regex.exec(content);
    }
    return headings;
  }, [content]);

  const jumpTo = (index: number) => {
    const el = textarea.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(index, index + 1);
    const ratio = index / Math.max(1, content.length);
    el.scrollTop = ratio * el.scrollHeight;
  };

  const matches = useMemo(() => {
    if (!find.trim()) return 0;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (content.match(new RegExp(escaped, 'gi')) ?? []).length;
  }, [content, find]);

  const replaceAll = () => {
    if (!find) return;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = content.replace(new RegExp(escaped, 'gi'), replace);
    if (next !== content) {
      past.current.push(content);
      future.current = [];
      setContent(next);
      toast(`Replaced ${matches} occurrence${matches === 1 ? '' : 's'}.`, 'success');
    }
  };

  const replaceOne = () => {
    if (!find) return;
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const next = content.replace(regex, replace);
    if (next !== content) {
      past.current.push(content);
      future.current = [];
      setContent(next);
    }
  };

  const captureSelection = () => {
    const el = textarea.current;
    if (!el) return '';
    return content.slice(el.selectionStart, el.selectionEnd).trim();
  };

  const addComment = () => {
    if (!commentBody.trim()) return;
    update((draft) => {
      const target = draft.documents.find((d) => d.id === doc.id);
      if (!target) return;
      target.comments.unshift(blankComment({ excerpt: commentExcerpt.trim(), body: commentBody.trim() }));
      target.updatedAt = now();
    });
    setCommentOpen(false);
    setCommentBody('');
    setCommentExcerpt('');
    setPanel('notes');
    toast('Note attached to the passage.', 'success');
  };

  const words = wordCount(content);
  const links = relationshipsFor(project, doc.id);
  const tokenRefs = extractMethodRefs(content);
  const relatedMethods = tokenRefs
    .map((ref) => project.methods.find((m) => m.id === ref.id) ?? null)
    .filter(Boolean);
  const relatedRecords = links.filter((l) => l.other.type !== 'method');

  const addDocument = (parentId: string | null, kind: DocKind) => {
    const siblings = project.documents.filter((d) => d.parentId === parentId);
    const newDoc = blankDocument({ parentId, kind, order: siblings.length, title: newTitle.trim() || `Untitled ${kindLabel[kind].toLowerCase()}` });
    update((draft) => {
      draft.documents.push(newDoc);
    });
    setCreateOpen(false);
    setNewTitle('');
    navigate(`/studio/${newDoc.id}`);
  };

  const [deleteTarget, setDeleteTarget] = useState<ManuscriptDoc | null>(null);

  const openCreate = (parentId: string | null, kind: DocKind) => {
    setNewParentId(parentId);
    setNewKind(kind);
    setCreateOpen(true);
  };

  const tree = (
    <ManuscriptTree
      activeId={doc.id}
      onAdd={openCreate}
      onDelete={(target) => setDeleteTarget(target)}
    />
  );

  if (focusMode) {
    return (
      <div className="studio-focus">
        <div className="focus-bar">
          <button className="button ghost small" onClick={() => navigate(`/studio/${doc.id}`)}>
            <Icon name="arrow-left" size={14} /> Leave focus
          </button>
          <span className="focus-title">{title}</span>
          <span className="focus-meta">{words.toLocaleString()} words · {savedState === 'saving' ? 'Saving…' : 'Saved'}</span>
          <button className="button ghost small" onClick={() => setPreview((v) => !v)}>
            <Icon name="eye" size={14} /> {preview ? 'Write' : 'Read'}
          </button>
        </div>
        {preview ? (
          <article className="focus-preview"><h1>{title}</h1><Markdown content={content} /></article>
        ) : (
          <textarea
            ref={textarea}
            className="focus-textarea"
            value={content}
            onChange={(e) => history(e.target.value)}
            placeholder="Begin writing…"
            spellCheck
          />
        )}
      </div>
    );
  }

  return (
    <div className="studio-layout">
      <div className={`studio-tree-wrap ${treeOpen ? 'open' : ''}`}>
        {tree}
      </div>
      {treeOpen ? <button className="tree-scrim" onClick={() => setTreeOpen(false)} aria-label="Close document list" /> : null}

      <div className="studio-main">
        <div className="studio-doc-head">
          <div className="studio-doc-title-row">
            <button className="icon-button mobile-tree-button" onClick={() => setTreeOpen(true)} aria-label="Open manuscript structure">
              <Icon name="menu" size={18} />
            </button>
            <textarea
              ref={titleRef}
              rows={1}
              className="doc-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              aria-label="Document title"
            />
            <div className="studio-doc-actions">
              <span className={`editor-save ${savedState === 'saving' ? 'dirty' : ''}`}>
                <span className="save-dot" />
                {savedState === 'saving' ? 'Saving…' : `Saved ${relativeTime(lastSaved)}`}
              </span>
              <button className="icon-button" onClick={() => setPreview((v) => !v)} title={preview ? 'Write' : 'Preview'} aria-label={preview ? 'Write' : 'Preview'}>
                <Icon name={preview ? 'pen' : 'eye'} size={17} />
              </button>
              <button className="icon-button" onClick={() => setPanel(panel === 'notes' ? 'outline' : 'notes')} title="Notes and comments" aria-label="Notes and comments">
                <Icon name="comment" size={17} />
                {doc.comments.filter((c) => !c.resolved).length ? <span className="icon-count">{doc.comments.filter((c) => !c.resolved).length}</span> : null}
              </button>
              <button className="icon-button" onClick={() => navigate(`/studio/${doc.id}?focus=1`)} title="Focus mode" aria-label="Focus mode">
                <Icon name="focus" size={17} />
              </button>
              <button className="button ghost small" onClick={() => downloadFile(`${slugify(title) || 'chapter'}.md`, `# ${title}\n\n${content}`, 'text/markdown;charset=utf-8')}>
                <Icon name="download" size={14} /> Export
              </button>
            </div>
          </div>
          <div className="studio-doc-meta">
            <span className={`doc-kind-badge kind-${doc.kind}`}>{kindLabel[doc.kind]}</span>
            <span>{words.toLocaleString()} words</span>
            <span>{readingMinutes(words)} min read</span>
            <span>Updated {formatDateTime(doc.updatedAt)}</span>
            <label className="inline-status">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as DocStatus)}>
                {DOC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="editor-toolbar">
          <div className="toolbar-group">
            <button className="icon-button" onClick={() => insertAtLineStart('## ')} title="Heading"><Icon name="heading" size={16} /></button>
            <button className="icon-button" onClick={() => insert('**', '**', 'bold text')} title="Bold"><Icon name="bold" size={15} /></button>
            <button className="icon-button" onClick={() => insert('*', '*', 'italic text')} title="Italic"><Icon name="italic" size={15} /></button>
            <button className="icon-button" onClick={() => insertAtLineStart('- ')} title="List"><Icon name="list" size={16} /></button>
            <button className="icon-button" onClick={() => insertAtLineStart('> ')} title="Quotation"><Icon name="quote" size={15} /></button>
            <button className="icon-button" onClick={() => { const url = window.prompt('Link URL'); if (url) insert('[', `](${url})`, 'link text'); }} title="Link"><Icon name="link" size={15} /></button>
          </div>
          <div className="toolbar-group">
            <button className="icon-button" onClick={undo} title="Undo"><Icon name="undo" size={16} /></button>
            <button className="icon-button" onClick={redo} title="Redo"><Icon name="redo" size={16} /></button>
            <button className={`toolbar-text-button ${findOpen ? 'active' : ''}`} onClick={() => setFindOpen((v) => !v)}>
              Find &amp; replace
            </button>
            <button className="toolbar-text-button" onClick={() => setMethodPicker(true)}>
              <Icon name="book" size={14} /> Insert method
            </button>
            <button
              className="toolbar-text-button"
              onClick={() => {
                setCommentExcerpt(captureSelection());
                setCommentOpen(true);
              }}
            >
              <Icon name="comment" size={14} /> Note
            </button>
            <button className="toolbar-text-button" onClick={() => importInput.current?.click()} title="Append a Markdown or plain-text file to this document">
              <Icon name="upload" size={14} /> Import .md
            </button>
            <input
              ref={importInput}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importMarkdown(file);
                e.target.value = '';
              }}
            />
          </div>
          <span className="toolbar-spacer" />
          <span className="toolbar-count">{words.toLocaleString()} words</span>
        </div>

        {findOpen ? (
          <div className="find-panel">
            <label>
              <span>Find</span>
              <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Text to find" />
            </label>
            <label>
              <span>Replace with</span>
              <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replacement" />
            </label>
            <span className="find-count">{matches} {matches === 1 ? 'match' : 'matches'}</span>
            <button className="button ghost small" onClick={replaceOne} disabled={!matches}>Replace</button>
            <button className="button ghost small" onClick={replaceAll} disabled={!matches}>Replace all</button>
            <button className="icon-button subtle" onClick={() => setFindOpen(false)} aria-label="Close find"><Icon name="close" size={14} /></button>
          </div>
        ) : null}

        <div className="studio-editor-grid">
          <div className="write-area">
            {preview ? (
              <article className="preview-panel">
                <h1>{title}</h1>
                <Markdown content={content} />
              </article>
            ) : (
              <textarea
                ref={textarea}
                className="prose-editor"
                value={content}
                onChange={(e) => history(e.target.value)}
                placeholder={`Begin writing “${title}”…\n\nMarkdown is supported: headings, lists, quotations and links. Insert a method reference with the toolbar.`}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    commit();
                    toast('Chapter saved.', 'success');
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    setFindOpen(true);
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redo();
                    else undo();
                  }
                }}
                spellCheck
              />
            )}
            <div className="editor-statusbar">
              <span>{words.toLocaleString()} words</span>
              <span>{content.length.toLocaleString()} characters</span>
              <span>{readingMinutes(words)} min read</span>
              <span className="statusbar-saved">{savedState === 'saving' ? 'Saving…' : `Saved ${relativeTime(lastSaved)}`}</span>
              <span>Markdown</span>
            </div>
          </div>

          <aside className="studio-side">
            <Tabs
              tabs={[
                { key: 'outline', label: 'Outline' },
                { key: 'notes', label: 'Notes', count: doc.comments.filter((c) => !c.resolved).length },
                { key: 'links', label: 'Links', count: relatedMethods.length + relatedRecords.length },
              ]}
              active={panel}
              onChange={setPanel}
            />

            {panel === 'outline' ? (
              <div className="side-panel">
                <div className="outline-head">
                  <p className="eyebrow">Headings</p>
                  <span>{outline.length}</span>
                </div>
                {outline.length ? (
                  <div className="outline-list">
                    {outline.map((heading, index) => (
                      <button key={index} className={`outline-item level-${heading.level}`} onClick={() => jumpTo(heading.index)}>
                        {heading.text}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">Add headings with the toolbar to create an outline.</p>
                )}
                <div className="side-divider" />
                <p className="eyebrow">This chapter</p>
                <dl className="meta-list compact">
                  <div><dt>Kind</dt><dd>{kindLabel[doc.kind]}</dd></div>
                  <div><dt>Status</dt><dd>{status}</dd></div>
                  <div><dt>Words</dt><dd>{words.toLocaleString()}</dd></div>
                  <div><dt>Notes</dt><dd>{doc.comments.length}</dd></div>
                </dl>
                <div className="side-divider" />
                <p className="eyebrow">Structure actions</p>
                <button className="text-button small" onClick={() => openCreate(doc.id, childKindFor[doc.kind])}>
                  <Icon name="plus" size={13} /> Add {kindLabel[childKindFor[doc.kind]].toLowerCase()}
                </button>
                <button className="text-button small" onClick={() => setDeleteOpen(true)}>
                  <Icon name="trash" size={13} /> Delete this document
                </button>
              </div>
            ) : null}

            {panel === 'notes' ? (
              <div className="side-panel comments-panel">
                <div className="panel-head tight">
                  <p className="eyebrow">Passage notes</p>
                  <button className="text-button small" onClick={() => { setCommentExcerpt(captureSelection()); setCommentOpen(true); }}>
                    <Icon name="plus" size={13} /> Add
                  </button>
                </div>
                {doc.comments.length ? (
                  <div className="comments-list">
                    {doc.comments.map((comment) => (
                      <div key={comment.id} className={`comment ${comment.resolved ? 'resolved' : ''}`}>
                        {comment.excerpt ? (
                          <button className="comment-excerpt" onClick={() => jumpTo(content.indexOf(comment.excerpt))}>
                            “{comment.excerpt}”
                          </button>
                        ) : null}
                        <p>{comment.body}</p>
                        <div className="comment-meta">
                          <span>{relativeTime(comment.createdAt)}</span>
                          <button
                            className="text-button tiny"
                            onClick={() =>
                              update((draft) => {
                                const target = draft.documents.find((d) => d.id === doc.id);
                                const c = target?.comments.find((x) => x.id === comment.id);
                                if (c) c.resolved = !c.resolved;
                              })
                            }
                          >
                            {comment.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            className="text-button tiny danger-text"
                            onClick={() =>
                              update((draft) => {
                                const target = draft.documents.find((d) => d.id === doc.id);
                                if (target) target.comments = target.comments.filter((x) => x.id !== comment.id);
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">Select a passage in the editor, then add a note. Notes stay attached to this chapter and can be resolved.</p>
                )}
              </div>
            ) : null}

            {panel === 'links' ? (
              <div className="side-panel links-panel">
                <div className="panel-head tight">
                  <p className="eyebrow">Referenced methods</p>
                  <button className="button ghost small" onClick={() => setLinking(true)}>
                    <Icon name="link" size={13} /> Link
                  </button>
                </div>
                {relatedMethods.length ? (
                  <div className="linked-method-list">
                    {relatedMethods.map((method) =>
                      method ? (
                        <div key={method.id} className="linked-method">
                          <Link to={`/method/${method.id}`}>{method.title}</Link>
                          <span>{method.status}</span>
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <p className="muted small">No methods referenced yet. Use “Insert method” in the toolbar to reference the canonical record rather than copying it.</p>
                )}
                <div className="side-divider" />
                <p className="eyebrow">Other connections</p>
                {relatedRecords.length ? (
                  <div className="side-relation-list">
                    {relatedRecords.map((link) => (
                      <div key={link.relationship.id} className="side-relation">
                        <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                        <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                        <button className="icon-button tiny" onClick={() => unlink(link.relationship.id)} aria-label="Remove link">
                          <Icon name="unlink" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">Connect this chapter to sources, notes or experiments.</p>
                )}
                <button className="text-button small" onClick={() => setMethodPicker(true)}>
                  <Icon name="book" size={13} /> Insert method reference
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      <Modal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        title="Add a passage note"
        eyebrow={doc.title}
        footer={
          <>
            <button className="button ghost" onClick={() => setCommentOpen(false)}>Cancel</button>
            <button className="button primary" onClick={addComment} disabled={!commentBody.trim()}>Add note</button>
          </>
        }
      >
        <div className="form-stack">
          <label className="field">
            <span>Passage <em>optional</em></span>
            <textarea rows={2} value={commentExcerpt} onChange={(e) => setCommentExcerpt(e.target.value)} placeholder="Select text in the editor, or quote a phrase here." />
          </label>
          <label className="field">
            <span>Note</span>
            <textarea rows={5} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="A question, reminder or editorial note." autoFocus />
          </label>
        </div>
      </Modal>

      <Modal
        open={methodPicker}
        onClose={() => setMethodPicker(false)}
        title="Insert a method reference"
        eyebrow="Reference the canonical record"
        wide
        footer={<button className="button ghost" onClick={() => setMethodPicker(false)}>Close</button>}
      >
        <div className="form-stack">
          <label className="field">
            <span>Find a method</span>
            <input value={methodQuery} onChange={(e) => setMethodQuery(e.target.value)} placeholder="Search methods…" autoFocus />
          </label>
          <div className="picker-list">
            {project.methods
              .filter((m) => m.title.toLowerCase().includes(methodQuery.toLowerCase()) || m.summary.toLowerCase().includes(methodQuery.toLowerCase()))
              .map((method) => (
                <button
                  key={method.id}
                  className="picker-item"
                  onClick={() => {
                    const el = textarea.current;
                    if (!el) return;
                    const marker = `[[method:${method.id}|${method.title}]]`;
                    const start = el.selectionStart;
                    const next = content.slice(0, start) + marker + content.slice(el.selectionEnd);
                    history(next);
                    linkRecords(doc.id, method.id, 'references', 'Referenced from the manuscript.');
                    setMethodPicker(false);
                    toast('Method reference inserted.', 'success');
                    requestAnimationFrame(() => {
                      el.focus();
                      el.setSelectionRange(start + marker.length, start + marker.length);
                    });
                  }}
                >
                  <span className="picker-type">{method.status}</span>
                  <span className="picker-title">{method.title}</span>
                  <span className="picker-sub">{method.summary}</span>
                </button>
              ))}
            {!project.methods.length ? <p className="muted small">No methods exist yet.</p> : null}
          </div>
          <p className="form-note">The chapter will always show the current version of the method. Changing the method here would require editing the canonical record.</p>
        </div>
      </Modal>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={doc.id} defaultType="references" title="Link this chapter to a record" />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Add ${kindLabel[newKind].toLowerCase()}`}
        eyebrow={doc.title}
        footer={
          <>
            <button className="button ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="button primary" onClick={() => addDocument(newParentId, newKind)}>Create</button>
          </>
        }
      >
        <div className="form-stack">
          <label className="field">
            <span>Title</span>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={`Untitled ${kindLabel[newKind].toLowerCase()}`} autoFocus />
          </label>
          <label className="field">
            <span>Kind</span>
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as DocKind)}>
              {DOC_KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}
            </select>
          </label>
          <p className="form-note">You can move it later without affecting its content.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          const parent = doc.parentId;
          trashEntity('document', doc.id, doc.title);
          toast('Document moved to deleted items.');
          navigate(parent ? `/studio/${parent}` : '/studio');
        }}
        title="Delete this document?"
        body={`“${doc.title}” and any nested documents will move to deleted items. You can restore them from Settings.`}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const parent = deleteTarget.parentId;
          trashEntity('document', deleteTarget.id, deleteTarget.title);
          toast('Document moved to deleted items.');
          if (deleteTarget.id === doc.id) navigate(parent ? `/studio/${parent}` : '/studio');
        }}
        title="Delete this document?"
        body={`“${deleteTarget?.title ?? ''}” and any nested documents will move to deleted items. You can restore them from Settings.`}
      />

      <p className="sr-only" aria-live="polite">{savedState === 'saving' ? 'Saving chapter' : 'Chapter saved'}</p>
    </div>
  );
}

export function StudioDocumentPage() {
  const { docId = '' } = useParams();
  const { project } = useStore();
  const doc = project.documents.find((d) => d.id === docId);
  if (!doc) {
    return (
      <div className="page">
        <EmptyState
          icon="pen"
          title="Document not found"
          body="It may have been deleted. Restore it from deleted items in Settings, or return to the manuscript overview."
          action={<Link className="button primary" to="/studio">Back to the studio</Link>}
        />
      </div>
    );
  }
  return <StudioEditor key={doc.id} doc={doc} />;
}

