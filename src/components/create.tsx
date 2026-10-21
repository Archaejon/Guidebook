import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Domain, Method, Section } from '../types';
import { useStore } from '../store';
import { blankMethod, blankSection } from '../lib/factory';
import { Modal } from './ui';
import { Icon } from './Icon';
import { splitTags } from '../lib/utils';

export function NewMethodDialog({
  open,
  onClose,
  defaultDomainId = '',
  defaultSectionId = '',
}: {
  open: boolean;
  onClose: () => void;
  defaultDomainId?: string;
  defaultSectionId?: string;
}) {
  const { project, update, toast } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [domainId, setDomainId] = useState(defaultDomainId || project.domains[0]?.id || '');
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setSummary('');
      setDomainId(defaultDomainId || project.domains[0]?.id || '');
      setSectionId(defaultSectionId);
      setTags('');
    }
  }, [open, defaultDomainId, defaultSectionId, project.domains]);

  const sections = project.sections.filter((s) => s.domainId === domainId);

  const create = () => {
    if (!title.trim()) return;
    const method = blankMethod({
      title: title.trim(),
      summary: summary.trim(),
      primaryDomainId: domainId,
      primarySectionId: sectionId,
      tags: splitTags(tags),
      status: 'Idea',
    });
    update((draft) => {
      draft.methods.push(method);
    });
    toast('Method created. Complete the template at your own pace.', 'success');
    onClose();
    navigate(`/method/${method.id}/edit`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New method"
      eyebrow="Add to the guide"
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={create} disabled={!title.trim()}>
            Create method
          </button>
        </>
      }
    >
      <div className="form-stack">
        <label className="field">
          <span>Method title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. A weekly walking meeting"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
        </label>
        <label className="field">
          <span>Short summary <em>optional</em></span>
          <textarea
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One or two sentences describing the practice."
          />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Primary domain</span>
            <select
              value={domainId}
              onChange={(e) => {
                setDomainId(e.target.value);
                setSectionId('');
              }}
            >
              {project.domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.roman}. {d.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Primary section</span>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">Not yet assigned</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Tags <em>optional, comma separated</em></span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="movement, routine, attention" />
        </label>
        <p className="form-note">
          <Icon name="book" size={14} /> Every field can be edited later. Start with an Idea and promote it as the method matures.
        </p>
      </div>
    </Modal>
  );
}

export function SectionDialog({
  open,
  onClose,
  domainId,
  section,
}: {
  open: boolean;
  onClose: () => void;
  domainId: string;
  section?: Section;
}) {
  const { project, update, toast } = useStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [frameworks, setFrameworks] = useState('');
  const [questions, setQuestions] = useState('');
  const [draft, setDraft] = useState('');
  const [related, setRelated] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(section?.title ?? '');
    setDescription(section?.description ?? '');
    setOutcomes((section?.outcomes ?? []).join('\n'));
    setFrameworks((section?.frameworks ?? []).join('\n'));
    setQuestions((section?.questions ?? []).join('\n'));
    setDraft(section?.draft ?? '');
    setRelated(section?.relatedSectionIds ?? []);
  }, [open, section]);

  const save = () => {
    if (!title.trim()) return;
    const lines = (value: string) =>
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (section) {
      update((draftProject) => {
        const target = draftProject.sections.find((s) => s.id === section.id);
        if (!target) return;
        Object.assign(target, {
          title: title.trim(),
          description: description.trim(),
          outcomes: lines(outcomes),
          frameworks: lines(frameworks),
          questions: lines(questions),
          draft: draft.trim(),
          relatedSectionIds: related,
          updatedAt: new Date().toISOString(),
        });
      });
      toast('Section updated.', 'success');
      onClose();
    } else {
      const newSection = blankSection({
        domainId,
        title: title.trim(),
        description: description.trim(),
        outcomes: lines(outcomes),
        frameworks: lines(frameworks),
        questions: lines(questions),
        draft: draft.trim(),
        relatedSectionIds: related,
      });
      update((draftProject) => {
        draftProject.sections.push(newSection);
      });
      toast('Section created.', 'success');
      onClose();
      navigate(`/guide/section/${newSection.id}`);
    }
  };

  const options = project.sections.filter((s) => s.domainId === domainId && s.id !== section?.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? 'Edit section' : 'New section'}
      eyebrow={`Domain: ${project.domains.find((d) => d.id === domainId)?.title ?? 'Unassigned'}`}
      wide
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={save} disabled={!title.trim()}>
            {section ? 'Save section' : 'Create section'}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-grid two">
          <label className="field">
            <span>Section title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Related sections <em>within this domain</em></span>
            <select
              multiple
              value={related}
              onChange={(e) => setRelated(Array.from(e.target.selectedOptions).map((o) => o.value))}
              className="multi-select"
            >
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Problem or opportunity addressed</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Intended outcomes <em>one per line</em></span>
            <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={4} />
          </label>
          <label className="field">
            <span>Frameworks &amp; traditions <em>one per line</em></span>
            <textarea value={frameworks} onChange={(e) => setFrameworks(e.target.value)} rows={4} />
          </label>
        </div>
        <label className="field">
          <span>Open questions <em>one per line</em></span>
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} />
        </label>
        <label className="field">
          <span>Section introduction / book draft</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder="Write the section-level introduction or argument. Markdown is supported."
          />
        </label>
      </div>
    </Modal>
  );
}

export function DomainEditDialog({
  open,
  onClose,
  domain,
}: {
  open: boolean;
  onClose: () => void;
  domain: Domain;
}) {
  const { project, update, toast } = useStore();
  const [title, setTitle] = useState(domain.title);
  const [subtitle, setSubtitle] = useState(domain.subtitle);
  const [intro, setIntro] = useState(domain.intro);
  const [purpose, setPurpose] = useState(domain.purpose);
  const [outcomes, setOutcomes] = useState(domain.outcomes.join('\n'));
  const [principles, setPrinciples] = useState(domain.principles.join('\n'));
  const [questions, setQuestions] = useState(domain.questions.join('\n'));
  const [connections, setConnections] = useState<Record<string, string>>(
    Object.fromEntries(domain.connections.map((c) => [c.domainId, c.note])),
  );

  useEffect(() => {
    if (!open) return;
    setTitle(domain.title);
    setSubtitle(domain.subtitle);
    setIntro(domain.intro);
    setPurpose(domain.purpose);
    setOutcomes(domain.outcomes.join('\n'));
    setPrinciples(domain.principles.join('\n'));
    setQuestions(domain.questions.join('\n'));
    setConnections(Object.fromEntries(domain.connections.map((c) => [c.domainId, c.note])));
  }, [open, domain]);

  const save = () => {
    const lines = (value: string) =>
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    update((draft) => {
      const target = draft.domains.find((d) => d.id === domain.id);
      if (!target) return;
      Object.assign(target, {
        title: title.trim() || domain.title,
        subtitle: subtitle.trim(),
        intro: intro.trim(),
        purpose: purpose.trim(),
        outcomes: lines(outcomes),
        principles: lines(principles),
        questions: lines(questions),
        connections: project.domains
          .filter((d) => d.id !== domain.id)
          .map((d) => ({ domainId: d.id, note: connections[d.id]?.trim() ?? '' }))
          .filter((c) => c.note),
        updatedAt: new Date().toISOString(),
        illustrative: false,
      });
    });
    toast('Domain framing updated.', 'success');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit domain framing"
      eyebrow={`Domain ${domain.roman}`}
      wide
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" onClick={save}>
            Save domain
          </button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-grid two">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Subtitle</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Introduction</span>
          <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={4} />
        </label>
        <label className="field">
          <span>Purpose and intended outcomes</span>
          <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} />
        </label>
        <div className="form-grid two">
          <label className="field">
            <span>Outcomes <em>one per line</em></span>
            <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={4} />
          </label>
          <label className="field">
            <span>Underlying principles <em>one per line</em></span>
            <textarea value={principles} onChange={(e) => setPrinciples(e.target.value)} rows={4} />
          </label>
        </div>
        <label className="field">
          <span>Questions and unresolved issues <em>one per line</em></span>
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={3} />
        </label>
        <div className="field">
          <span>Connections to other domains</span>
          <div className="connection-edit-grid">
            {project.domains
              .filter((d) => d.id !== domain.id)
              .map((d) => (
                <label key={d.id} className="connection-edit">
                  <span className={`accent-text-${d.accent}`}>{d.title}</span>
                  <textarea
                    rows={2}
                    value={connections[d.id] ?? ''}
                    onChange={(e) => setConnections((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    placeholder="How does this domain connect?"
                  />
                </label>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteMethodDialog({
  open,
  onClose,
  method,
}: {
  open: boolean;
  onClose: () => void;
  method: Method;
}) {
  const { trashEntity } = useStore();
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move method to deleted items?"
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button danger"
            onClick={() => {
              trashEntity('method', method.id, method.title);
              onClose();
              navigate('/guide');
            }}
          >
            Delete method
          </button>
        </>
      }
    >
      <p className="modal-copy">
        “{method.title}” and its relationships will be removed from the guide. It can be restored from the deleted items list in Settings.
      </p>
    </Modal>
  );
}
