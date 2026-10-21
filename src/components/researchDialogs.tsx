import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Claim, ClaimStatus, Quotation, SourceKind } from '../types';
import { CLAIM_STATUSES, SOURCE_KINDS } from '../types';
import { useStore } from '../store';
import { blankClaim, blankQuotation, blankSource, now } from '../lib/factory';
import { Modal } from './ui';
import { splitTags } from '../lib/utils';

export function SourceCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update, toast } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<SourceKind>('book');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setKind('book');
      setCreator('');
      setYear('');
      setTags('');
    }
  }, [open]);

  const create = () => {
    if (!title.trim()) return;
    const source = blankSource({ title: title.trim(), kind, creator: creator.trim(), year: year.trim(), tags: splitTags(tags) });
    update((draft) => {
      draft.sources.unshift(source);
    });
    toast('Source created. Add the citation details and reading notes.', 'success');
    onClose();
    navigate(`/research/${source.id}/edit`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a research source"
      eyebrow="Research library"
      footer={
        <>
          <button className="button ghost" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={create} disabled={!title.trim()}>Create source</button>
        </>
      }
    >
      <div className="form-stack">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Exact title of the work" />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
              {SOURCE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Creator <em>optional</em></span>
            <input value={creator} onChange={(e) => setCreator(e.target.value)} />
          </label>
        </div>
        <div className="form-grid two">
          <label className="field">
            <span>Year <em>optional</em></span>
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 1951" />
          </label>
          <label className="field">
            <span>Tags <em>comma separated</em></span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="attention, rest" />
          </label>
        </div>
        <p className="form-note">Do not invent citation details. Empty fields are honest; fill them from the physical or digital source when you can.</p>
      </div>
    </Modal>
  );
}

export function QuotationDialog({
  open,
  onClose,
  quotation,
  defaultSourceId = '',
}: {
  open: boolean;
  onClose: () => void;
  quotation?: Quotation;
  defaultSourceId?: string;
}) {
  const { project, update, toast } = useStore();
  const [text, setText] = useState('');
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const [page, setPage] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setText(quotation?.text ?? '');
    setSourceId(quotation?.sourceId ?? defaultSourceId);
    setPage(quotation?.page ?? '');
    setNote(quotation?.note ?? '');
  }, [open, quotation, defaultSourceId]);

  const save = () => {
    if (!text.trim()) return;
    if (quotation) {
      update((draft) => {
        const target = draft.quotations.find((q) => q.id === quotation.id);
        if (target) Object.assign(target, { text: text.trim(), sourceId, page: page.trim(), note: note.trim() });
      });
      toast('Quotation updated.', 'success');
    } else {
      update((draft) => {
        draft.quotations.unshift(blankQuotation({ text: text.trim(), sourceId, page: page.trim(), note: note.trim() }));
      });
      toast('Quotation saved. Verify the wording and page against your edition.', 'success');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={quotation ? 'Edit quotation' : 'Add a quotation'}
      eyebrow="Verbatim material"
      wide
      footer={
        <>
          <button className="button ghost" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={save} disabled={!text.trim()}>Save quotation</button>
        </>
      }
    >
      <div className="form-stack">
        <label className="field">
          <span>Quotation</span>
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Exact wording from the source, in quotation marks if appropriate." autoFocus />
        </label>
        <div className="form-grid three">
          <label className="field">
            <span>Source</span>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">Unattributed — not yet safe to cite</option>
              {project.sources.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Page / location</span>
            <input value={page} onChange={(e) => setPage(e.target.value)} placeholder="e.g. p. 42" />
          </label>
          <label className="field">
            <span>Your note <em>optional</em></span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <p className="form-note">Quotations must be checked against the original edition. Do not paraphrase inside quotation marks.</p>
      </div>
    </Modal>
  );
}

export function ClaimDialog({
  open,
  onClose,
  claim,
  defaultSourceId = '',
}: {
  open: boolean;
  onClose: () => void;
  claim?: Claim;
  defaultSourceId?: string;
}) {
  const { project, update, toast } = useStore();
  const [statement, setStatement] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('Needs source');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatement(claim?.statement ?? '');
    setStatus(claim?.status ?? 'Needs source');
    setSourceIds(claim?.sourceIds ?? (defaultSourceId ? [defaultSourceId] : []));
    setNotes(claim?.notes ?? '');
  }, [open, claim, defaultSourceId]);

  const save = () => {
    if (!statement.trim()) return;
    if (claim) {
      update((draft) => {
        const target = draft.claims.find((c) => c.id === claim.id);
        if (target) Object.assign(target, { statement: statement.trim(), status, sourceIds, notes: notes.trim(), updatedAt: now() });
      });
      toast('Claim updated.', 'success');
    } else {
      update((draft) => {
        draft.claims.unshift(blankClaim({ statement: statement.trim(), status, sourceIds, notes: notes.trim() }));
      });
      toast('Claim recorded. Keep unsourced claims marked as such.', 'success');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={claim ? 'Edit claim' : 'Record a claim'}
      eyebrow="Claims and verification"
      wide
      footer={
        <>
          <button className="button ghost" onClick={onClose}>Cancel</button>
          <button className="button primary" onClick={save} disabled={!statement.trim()}>Save claim</button>
        </>
      }
    >
      <div className="form-stack">
        <label className="field">
          <span>Claim</span>
          <textarea rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="State the claim precisely enough to be tested or contradicted." autoFocus />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as ClaimStatus)}>
              {CLAIM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What would verify or undermine this?" />
          </label>
        </div>
        <div className="field">
          <span>Sources</span>
          <div className="checkbox-grid">
            {project.sources.map((source) => (
              <label key={source.id} className="check-row compact">
                <input
                  type="checkbox"
                  checked={sourceIds.includes(source.id)}
                  onChange={(e) => setSourceIds(e.target.checked ? [...sourceIds, source.id] : sourceIds.filter((id) => id !== source.id))}
                />
                <span>{source.title}</span>
              </label>
            ))}
            {!project.sources.length ? <p className="muted small">No sources recorded yet.</p> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
