import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { InboxItem } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState, Modal, PageHeader } from '../components/ui';
import { blankDocument, blankExperiment, blankMethod, blankNote, blankSection, blankSource, now, uid } from '../lib/factory';
import { formatDateTime, titleFromText } from '../lib/utils';

type TargetType = 'method' | 'source' | 'note' | 'passage' | 'section' | 'experiment';

const TARGETS: { key: TargetType; label: string; description: string; icon: 'book' | 'library' | 'file' | 'pen' | 'folder' | 'flask' }[] = [
  { key: 'method', label: 'Method', description: 'Create a new method record with this text as its summary.', icon: 'book' },
  { key: 'source', label: 'Research record', description: 'File as an observation or question in the research library.', icon: 'library' },
  { key: 'note', label: 'Reading note', description: 'Create a reading note with this text as the body.', icon: 'file' },
  { key: 'passage', label: 'Manuscript passage', description: 'Add as a passage beneath an existing manuscript document.', icon: 'pen' },
  { key: 'section', label: 'Guide section', description: 'Create a new section in one of the five domains.', icon: 'folder' },
  { key: 'experiment', label: 'Experiment', description: 'Record this as a hypothesis or trial to run.', icon: 'flask' },
];

export function InboxPage() {
  const { project, update, toast } = useStore();
  const navigate = useNavigate();
  const [capture, setCapture] = useState('');
  const [filing, setFiling] = useState<InboxItem | null>(null);
  const [target, setTarget] = useState<TargetType>('method');
  const [title, setTitle] = useState('');
  const [domainId, setDomainId] = useState(project.domains[0]?.id ?? '');
  const [parentDocId, setParentDocId] = useState(project.documents[0]?.id ?? '');

  const add = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!capture.trim()) return;
    update((draft) => {
      draft.inbox.unshift({ id: uid('inbox'), text: capture.trim(), createdAt: now() });
    });
    setCapture('');
    toast('Captured. File it when you are ready.', 'success');
  };

  const openFile = (item: InboxItem) => {
    setFiling(item);
    setTitle(titleFromText(item.text));
    setTarget('method');
    setDomainId(project.domains[0]?.id ?? '');
    setParentDocId(project.documents[0]?.id ?? '');
  };

  const removeItem = (id: string) => {
    update((draft) => {
      draft.inbox = draft.inbox.filter((item) => item.id !== id);
    });
    toast('Inbox item deleted.');
  };

  const file = () => {
    if (!filing) return;
    const text = filing.text;
    let route = '';
    update((draft) => {
      if (target === 'method') {
        const method = blankMethod({
          title: title.trim() || titleFromText(text),
          summary: text,
          primaryDomainId: domainId,
          primarySectionId: '',
          notes: { questions: [], disagreements: '', reflections: '', improvements: '', futureExperiments: '' },
        });
        draft.methods.push(method);
        route = `/method/${method.id}/edit`;
      }
      if (target === 'source') {
        const isQuestion = text.trim().endsWith('?');
        const source = blankSource({
          title: title.trim() || titleFromText(text),
          kind: isQuestion ? 'question' : 'observation',
          summary: text,
          verification: 'Needs verification',
          readingStatus: 'Unread',
        });
        draft.sources.unshift(source);
        route = `/research/${source.id}/edit`;
      }
      if (target === 'note') {
        const note = blankNote({ title: title.trim() || titleFromText(text), body: text });
        draft.notes.unshift(note);
        route = `/research/note/${note.id}`;
      }
      if (target === 'passage') {
        const parent = parentDocId || project.documents[0]?.id || '';
        const passage = blankDocument({
          parentId: parent || null,
          kind: 'passage',
          title: title.trim() || titleFromText(text),
          content: text,
          order: draft.documents.filter((d) => d.parentId === parent).length,
        });
        draft.documents.push(passage);
        route = `/studio/${passage.id}`;
      }
      if (target === 'section') {
        const section = blankSection({
          domainId,
          title: title.trim() || titleFromText(text),
          description: text,
        });
        draft.sections.push(section);
        route = `/guide/section/${section.id}`;
      }
      if (target === 'experiment') {
        const experiment = blankExperiment({ title: title.trim() || titleFromText(text), hypothesis: text });
        draft.experiments.unshift(experiment);
        route = `/experiments/${experiment.id}`;
      }
      draft.inbox = draft.inbox.filter((item) => item.id !== filing.id);
    });
    setFiling(null);
    toast('Filed without losing the original text.', 'success');
    if (route) navigate(route);
  };

  return (
    <div className="page inbox-page">
      <PageHeader
        eyebrow="Before it belongs anywhere"
        title="Inbox"
        subtitle="A holding place for observations, questions, references and half-formed ideas. Capturing is cheap; filing can wait."
      />

      <form className="panel capture-inbox" onSubmit={add}>
        <label className="field">
          <span>Quick capture</span>
          <textarea
            rows={4}
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder="Write the thought before it disappears. You can decide later whether it is a method, source, note, passage or experiment."
            autoFocus
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add();
            }}
          />
        </label>
        <div className="capture-actions">
          <span className="muted small">⌘↵ to capture · {project.inbox.length} waiting</span>
          <button className="button primary" disabled={!capture.trim()}><Icon name="inbox" size={15} /> Capture</button>
        </div>
      </form>

      <section className="inbox-list">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Unfiled</p>
            <h2>Waiting to be placed</h2>
          </div>
          <span className="muted small">{project.inbox.length} item{project.inbox.length === 1 ? '' : 's'}</span>
        </div>
        {project.inbox.length ? (
          project.inbox.map((item) => (
            <article key={item.id} className="inbox-item">
              <div className="inbox-item-main">
                <p>{item.text}</p>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="inbox-item-actions">
                <button className="button ghost small" onClick={() => openFile(item)}>
                  <Icon name="indent" size={14} /> File
                </button>
                <button className="icon-button subtle" onClick={() => removeItem(item.id)} aria-label="Delete inbox item">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            icon="inbox"
            title="The inbox is clear"
            body="Capture a thought above. Nothing here needs to be categorised until you know what it is for."
          />
        )}
      </section>

      <div className="inbox-guidance panel">
        <Icon name="spark" size={18} />
        <div>
          <h3>Capture is not filing</h3>
          <p>
            The inbox holds material without forcing a decision. When you file an item, its full text is preserved in the new record. If it later belongs
            somewhere else, move or link the record rather than duplicating it.
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(filing)}
        onClose={() => setFiling(null)}
        title="File this capture"
        eyebrow={filing?.text.slice(0, 90)}
        wide
        footer={
          <>
            <button className="button ghost" onClick={() => setFiling(null)}>Cancel</button>
            <button className="button primary" onClick={file}>File record</button>
          </>
        }
      >
        <div className="form-stack">
          <div className="kind-options">
            {TARGETS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`kind-option ${target === option.key ? 'active' : ''}`}
                onClick={() => setTarget(option.key)}
              >
                <Icon name={option.icon} size={15} />
                {option.label}
              </button>
            ))}
          </div>
          <p className="form-note">{TARGETS.find((t) => t.key === target)?.description}</p>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A working title" />
          </label>
          {target === 'method' || target === 'section' ? (
            <label className="field">
              <span>Domain</span>
              <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                {project.domains.map((d) => <option key={d.id} value={d.id}>{d.roman}. {d.title}</option>)}
              </select>
            </label>
          ) : null}
          {target === 'passage' ? (
            <label className="field">
              <span>Place beneath</span>
              <select value={parentDocId} onChange={(e) => setParentDocId(e.target.value)}>
                {project.documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title} ({doc.kind})</option>)}
              </select>
            </label>
          ) : null}
          <div className="filing-preview">
            <p className="field-label">Full text to preserve</p>
            <p>{filing?.text}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
