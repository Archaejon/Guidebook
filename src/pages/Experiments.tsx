import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Experiment, ExperimentScale, ExperimentStatus } from '../types';
import { EXPERIMENT_SCALES, EXPERIMENT_STATUSES } from '../types';
import { Icon } from '../components/Icon';
import {
  ConfirmDialog,
  EmptyState,
  LinkDialog,
  PageHeader,
  SampleBadge,
  StatusPill,
} from '../components/ui';
import { blankExperiment, now } from '../lib/factory';
import { entityRoute, entityTitle, relationshipsFor } from '../lib/selectors';
import { formatDate, excerpt, wordCount } from '../lib/utils';

export function ExperimentsPage() {
  const { project, update, toast } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scale, setScale] = useState('');
  const [status, setStatus] = useState('');

  const experiments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return project.experiments
      .filter((experiment) => {
        if (scale && experiment.scale !== scale) return false;
        if (status && experiment.status !== status) return false;
        if (!q) return true;
        return [experiment.title, experiment.hypothesis, experiment.observations, experiment.lessons, experiment.context]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [project.experiments, query, scale, status]);

  const create = () => {
    const experiment = blankExperiment({ title: 'Untitled experiment' });
    update((draft) => {
      draft.experiments.unshift(experiment);
    });
    toast('Experiment created. State the question before you begin.', 'success');
    navigate(`/experiments/${experiment.id}`);
  };

  return (
    <div className="page experiments-page">
      <PageHeader
        eyebrow="Practise and evaluate"
        title="Experiments &amp; Reflections"
        subtitle="Record attempts to apply the guidebook's methods — individual trials and community-scale experiments — and distinguish personal experience from generalisable evidence."
        actions={
          <button className="button primary" onClick={create}>
            <Icon name="plus" size={15} /> New experiment
          </button>
        }
      />

      <div className="experiment-stats">
        <div><strong>{project.experiments.length}</strong><span>experiments</span></div>
        <div><strong>{project.experiments.filter((e) => e.scale === 'Community').length}</strong><span>community scale</span></div>
        <div><strong>{project.experiments.filter((e) => e.status === 'Running').length}</strong><span>running</span></div>
        <div><strong>{project.experiments.filter((e) => e.status === 'Complete').length}</strong><span>complete</span></div>
      </div>

      <div className="toolbar-row wrap">
        <label className="search-field">
          <Icon name="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search experiments…" />
        </label>
        <select value={scale} onChange={(e) => setScale(e.target.value)} aria-label="Filter by scale">
          <option value="">All scales</option>
          {EXPERIMENT_SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {EXPERIMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <p className="result-count">{experiments.length} {experiments.length === 1 ? 'experiment' : 'experiments'}</p>
      {experiments.length ? (
        <div className="experiment-grid">
          {experiments.map((experiment) => {
            const links = relationshipsFor(project, experiment.id);
            const methods = links.filter((l) => l.other.type === 'method');
            return (
              <Link key={experiment.id} to={`/experiments/${experiment.id}`} className="experiment-card">
                <div className="experiment-card-top">
                  <span className="experiment-scale">{experiment.scale}</span>
                  <StatusPill status={experiment.status} />
                  <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(experiment.illustrative)} />
                </div>
                <h3>{experiment.title}</h3>
                <p className="experiment-hypothesis">{experiment.hypothesis || 'No hypothesis stated yet.'}</p>
                <div className="experiment-card-meta">
                  {methods.map((link) => (
                    <span key={link.relationship.id} className="mini-tag">{entityTitle(link.other)}</span>
                  ))}
                  <span>{experiment.startDate ? `${formatDate(experiment.startDate)}${experiment.endDate ? ` – ${formatDate(experiment.endDate)}` : ''}` : 'No dates set'}</span>
                </div>
                {experiment.observations ? <p className="experiment-observation">{excerpt(experiment.observations, '', 150)}</p> : null}
                <div className="experiment-card-foot">
                  <span>{wordCount(experiment.observations) ? 'Observations recorded' : 'Awaiting observations'}</span>
                  <span>{wordCount(experiment.lessons) ? 'Lessons noted' : 'No lessons yet'}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="flask"
          title={query || scale || status ? 'No experiments match' : 'No experiments yet'}
          body={
            query || scale || status
              ? 'Clear a filter or try a different search.'
              : 'A method becomes knowledge when it is tried. Record a small trial, a community pilot or a deliberate self-experiment — and be honest about confounding factors.'
          }
          action={<button className="button primary" onClick={create}>Create an experiment</button>}
        />
      )}
    </div>
  );
}

export function ExperimentDetailPage() {
  const { experimentId = '' } = useParams();
  const { project, update, trashEntity, unlink, toast } = useStore();
  const navigate = useNavigate();
  const experiment = project.experiments.find((e) => e.id === experimentId);
  const [draft, setDraft] = useState<Experiment | null>(experiment ? structuredClone(experiment) : null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<Experiment | null>(draft);

  useEffect(() => {
    if (experiment) {
      setDraft(structuredClone(experiment));
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = window.setTimeout(() => {
      update((projectDraft) => {
        const target = projectDraft.experiments.find((e) => e.id === draft.id);
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
          const target = projectDraft.experiments.find((e) => e.id === latest.id);
          if (target) Object.assign(target, { ...structuredClone(latest), updatedAt: now(), illustrative: false });
        });
      }
    };
  }, [update]);

  if (!experiment || !draft) {
    return (
      <div className="page">
        <EmptyState icon="flask" title="Experiment not found" body="It may have been deleted." action={<Link className="button primary" to="/experiments">Back to experiments</Link>} />
      </div>
    );
  }

  const change = (values: Partial<Experiment>) => {
    setDraft((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
    dirtyRef.current = true;
  };

  const saveNow = () => {
    if (!draft) return;
    update((projectDraft) => {
      const target = projectDraft.experiments.find((e) => e.id === draft.id);
      if (target) Object.assign(target, { ...structuredClone(draft), updatedAt: now(), illustrative: false });
    });
    setDirty(false);
    dirtyRef.current = false;
    setSavedAt(now());
  };

  const links = relationshipsFor(project, draft.id);
  const methods = links.filter((l) => l.other.type === 'method');
  const research = links.filter((l) => ['source', 'note', 'quotation', 'claim'].includes(l.other.type));

  return (
    <div className="method-editor experiment-editor">
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <Link to="/experiments" className="back-link"><Icon name="arrow-left" size={15} /> Experiments</Link>
          <span className="topbar-sep" />
          <span className="editor-doc-title">{draft.title || 'Untitled experiment'}</span>
        </div>
        <div className="editor-topbar-right">
          <span className={`editor-save ${dirty ? 'dirty' : ''}`}>
            <span className="save-dot" /> {dirty ? 'Unsaved changes' : savedAt ? `Saved ${formatDate(savedAt)}` : 'All changes saved'}
          </span>
          <select className="status-select" value={draft.status} onChange={(e) => change({ status: e.target.value as ExperimentStatus })} aria-label="Experiment status">
            {EXPERIMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="button ghost small" onClick={saveNow} disabled={!dirty}>Save now</button>
          <button className="button primary small" onClick={() => { saveNow(); navigate('/experiments'); }}>Done</button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          <section className="editor-section">
            <input
              className="doc-title-input experiment-title-input"
              value={draft.title}
              onChange={(e) => change({ title: e.target.value })}
              placeholder="Experiment title"
              aria-label="Experiment title"
            />
            <div className="experiment-tags-row">
              <label className="inline-field">
                <span>Scale</span>
                <select value={draft.scale} onChange={(e) => change({ scale: e.target.value as ExperimentScale })}>
                  {EXPERIMENT_SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="inline-field">
                <span>Start</span>
                <input type="date" value={draft.startDate} onChange={(e) => change({ startDate: e.target.value })} />
              </label>
              <label className="inline-field">
                <span>End</span>
                <input type="date" value={draft.endDate} onChange={(e) => change({ endDate: e.target.value })} />
              </label>
              <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(experiment.illustrative)} />
            </div>
          </section>

          <section className="editor-section">
            <p className="eyebrow">Question and design</p>
            <h2>What are you testing?</h2>
            <div className="form-stack">
              <Field label="Question or hypothesis" rows={3} value={draft.hypothesis} onChange={(v) => change({ hypothesis: v })} placeholder="State what you expect and why. A prediction you can be wrong about is more useful than a hope." />
              <Field label="Context" rows={3} value={draft.context} onChange={(v) => change({ context: v })} placeholder="Where, when and under what conditions? What is the setting like?" />
              <Field label="Participants, if relevant" rows={2} value={draft.participants} onChange={(v) => change({ participants: v })} placeholder="Who is involved? How were they included? Any relevant constraints?" />
              <Field label="Planned procedure" rows={5} value={draft.procedure} onChange={(v) => change({ procedure: v })} placeholder="What exactly will you do, how often, for how long, and what will you record?" />
              <Field label="Expected outcome" rows={3} value={draft.expected} onChange={(v) => change({ expected: v })} />
            </div>
          </section>

          <section className="editor-section">
            <p className="eyebrow">Observations</p>
            <h2>What actually happened?</h2>
            <div className="form-stack">
              <Field label="Actual observations" rows={6} value={draft.observations} onChange={(v) => change({ observations: v })} placeholder="Record what happened, including the disappointing or ambiguous parts. Include dates and specific examples where possible." />
              <div className="form-grid two">
                <Field label="What appeared to work" rows={4} value={draft.worked} onChange={(v) => change({ worked: v })} />
                <Field label="What appeared to fail" rows={4} value={draft.failed} onChange={(v) => change({ failed: v })} />
              </div>
              <Field label="Potential confounding factors" rows={3} value={draft.confounders} onChange={(v) => change({ confounders: v })} placeholder="Weather, selection, motivation, season, other changes in your life, the attention of being observed…" />
            </div>
            <div className="editor-callout">
              <Icon name="alert" size={15} />
              <span>A successful personal experiment may justify further investigation. It does not prove that the method will work for everyone.</span>
            </div>
          </section>

          <section className="editor-section">
            <p className="eyebrow">Reflection</p>
            <h2>What follows?</h2>
            <div className="form-stack">
              <Field label="Lessons learned" rows={4} value={draft.lessons} onChange={(v) => change({ lessons: v })} />
              <Field label="Proposed revisions to the method" rows={4} value={draft.revisions} onChange={(v) => change({ revisions: v })} placeholder="What should change in the method, the procedure, or the conditions for testing it?" />
            </div>
          </section>

          <section className="editor-section">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Connections</p>
                <h2>Methods and research</h2>
              </div>
              <button className="button ghost small" onClick={() => setLinking(true)}>
                <Icon name="link" size={14} /> Link record
              </button>
            </div>
            {methods.length ? (
              <>
                <p className="field-label">Methods being tested</p>
                <div className="linked-list">
                  {methods.map((link) => (
                    <div key={link.relationship.id} className="linked-row">
                      <span className="linked-kind method">Method</span>
                      <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                      <span className="relationship-type">{link.relationship.type}</span>
                      <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Unlink"><Icon name="unlink" size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted small">No method linked yet. Use “Link record” and choose Tests.</p>
            )}
            {research.length ? (
              <>
                <p className="field-label">Related research</p>
                <div className="linked-list">
                  {research.map((link) => (
                    <div key={link.relationship.id} className="linked-row">
                      <span className="linked-kind">{link.other.type}</span>
                      <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                      <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                      <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Unlink"><Icon name="unlink" size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <div className="experiment-danger">
            <button className="text-button danger-text" onClick={() => setDeleting(true)}>
              <Icon name="trash" size={14} /> Delete this experiment
            </button>
          </div>
        </div>

        <aside className="editor-aside">
          <div className="editor-aside-card">
            <p className="eyebrow">Epistemic caution</p>
            <p className="small">
              Record observations before interpreting them where possible. Note what you expected, what you hoped for, and what would have counted as
              failure.
            </p>
            <button className="text-button small" onClick={() => { saveNow(); toast('Experiment saved.', 'success'); }}>Save now</button>
          </div>
          <div className="editor-aside-card">
            <p className="eyebrow">At a glance</p>
            <dl className="meta-list compact">
              <div><dt>Scale</dt><dd>{draft.scale}</dd></div>
              <div><dt>Status</dt><dd>{draft.status}</dd></div>
              <div><dt>Start</dt><dd>{draft.startDate ? formatDate(draft.startDate) : '—'}</dd></div>
              <div><dt>End</dt><dd>{draft.endDate ? formatDate(draft.endDate) : '—'}</dd></div>
              <div><dt>Methods</dt><dd>{methods.length}</dd></div>
              <div><dt>Research</dt><dd>{research.length}</dd></div>
            </dl>
          </div>
          <div className="editor-aside-card">
            <p className="eyebrow">Next step</p>
            <p className="small">If the experiment suggests a revision, update the method's author notes or evaluation section.</p>
            {methods.map((link) => (
              <Link key={link.relationship.id} to={entityRoute(link.other)} className="text-button small">{entityTitle(link.other)} <Icon name="arrow-right" size={12} /></Link>
            ))}
          </div>
        </aside>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={draft.id} defaultType="tests" />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          trashEntity('experiment', draft.id, draft.title);
          navigate('/experiments');
        }}
        title="Delete this experiment?"
        body="The experiment will move to deleted items and can be restored from Settings. Its relationships will be removed."
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
