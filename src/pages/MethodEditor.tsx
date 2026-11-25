import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { saveDraft, useRecordBase } from '../lib/collab/useRecordBase';
import type { Method, MethodSectionKey } from '../types';
import { METHOD_STATUSES, SCALES } from '../types';
import { Icon } from '../components/Icon';
import { EmptyState, LinkDialog } from '../components/ui';
import { entityRoute, entityTitle, relationshipsFor } from '../lib/selectors';
import { now } from '../lib/factory';
import { splitTags, formatDate } from '../lib/utils';

type TabKey = 'identity' | 'purpose' | 'instructions' | 'rationale' | 'knowledge' | 'evaluation' | 'application' | 'scales' | 'notes';

const TABS: { key: TabKey; label: string; letter: string }[] = [
  { key: 'identity', label: 'Identity', letter: 'A' },
  { key: 'purpose', label: 'Purpose', letter: 'B' },
  { key: 'instructions', label: 'Instructions', letter: 'C' },
  { key: 'rationale', label: 'Rationale', letter: 'D' },
  { key: 'knowledge', label: 'Knowledge', letter: 'E' },
  { key: 'evaluation', label: 'Evaluation', letter: 'F' },
  { key: 'application', label: 'Application', letter: 'G' },
  { key: 'scales', label: 'Scales', letter: 'H' },
  { key: 'notes', label: 'Notes', letter: 'I' },
];

export function MethodEditorPage() {
  const { methodId = '' } = useParams();
  const { project, update, unlink, toast } = useStore();
  const navigate = useNavigate();
  const method = project.methods.find((m) => m.id === methodId);
  const [draft, setDraft] = useState<Method | null>(method ? structuredClone(method) : null);
  const baseRef = useRecordBase(method, setDraft);
  const [tab, setTab] = useState<TabKey>('identity');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const dirtyRef = useRef(false);
  const draftRef = useRef<Method | null>(draft);

  useEffect(() => {
    if (method) {
      setDraft(structuredClone(method));
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(null);
    }
    // Re-initialise only when the selected method changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!draft || !dirty) return;
    const timer = window.setTimeout(() => {
      update((projectDraft) => {
        const target = projectDraft.methods.find((m) => m.id === draft.id);
        if (!target) return;
        saveDraft(baseRef, target, draft, { updatedAt: now(), illustrative: false });
      });
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(now());
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, update]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    return () => {
      if (dirtyRef.current && draftRef.current) {
        const latest = draftRef.current;
        update((projectDraft) => {
          const target = projectDraft.methods.find((m) => m.id === latest.id);
          if (target) saveDraft(baseRef, target, latest, { updatedAt: now(), illustrative: false });
        });
      }
    };
  }, [update]);

  const saveNow = () => {
    if (!draft) return;
    update((projectDraft) => {
      const target = projectDraft.methods.find((m) => m.id === draft.id);
      if (target) saveDraft(baseRef, target, draft, { updatedAt: now(), illustrative: false });
    });
    setDirty(false);
    dirtyRef.current = false;
    setSavedAt(now());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
        toast('Method saved.', 'success');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!method || !draft) {
    return (
      <div className="page">
        <EmptyState icon="alert" title="Method not found" body="This method may have been deleted." action={<Link className="button primary" to="/guide/methods">Browse methods</Link>} />
      </div>
    );
  }

  const change = (updater: (current: Method) => Method) => {
    setDraft((current) => (current ? updater(structuredClone(current)) : current));
    setDirty(true);
    dirtyRef.current = true;
  };

  const patch = (group: 'purpose' | 'instructions' | 'rationale' | 'knowledge' | 'evaluation' | 'application' | 'notes', values: Record<string, unknown>) => {
    change((current) => ({ ...current, [group]: { ...(current[group] as object), ...values } } as Method));
  };

  const setScale = (scale: keyof Method['scales'], field: string, value: string) => {
    change((current) => ({
      ...current,
      scales: { ...current.scales, [scale]: { ...current.scales[scale], [field]: value } },
    }));
  };

  const toggleHidden = (key: MethodSectionKey) => {
    change((current) => ({
      ...current,
      hiddenSections: current.hiddenSections.includes(key)
        ? current.hiddenSections.filter((k) => k !== key)
        : [...current.hiddenSections, key],
    }));
  };

  const sections = project.sections.filter((s) => s.domainId === draft.primaryDomainId);
  const links = relationshipsFor(project, draft.id);
  const sourceLinks = links.filter((l) => l.other.type === 'source' || l.other.type === 'note');
  const discussed = project.documents.filter((doc) => doc.content.includes(`[[method:${draft.id}|`));
  const visibleSections = TABS.filter((t) => t.key !== 'identity').length - draft.hiddenSections.length;

  return (
    <div className="method-editor">
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <Link to={`/method/${method.id}`} className="back-link">
            <Icon name="arrow-left" size={15} /> Back to method
          </Link>
          <span className="topbar-sep" />
          <span className="editor-doc-title">{draft.title || 'Untitled method'}</span>
        </div>
        <div className="editor-topbar-right">
          <span className={`editor-save ${dirty ? 'dirty' : ''}`}>
            <span className="save-dot" />
            {dirty ? 'Unsaved changes' : savedAt ? `Saved ${formatDate(savedAt)}` : 'All changes saved'}
          </span>
          <select
            className="status-select"
            value={draft.status}
            onChange={(e) => change((current) => ({ ...current, status: e.target.value as Method['status'] }))}
            aria-label="Editorial status"
          >
            {METHOD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="button ghost small" onClick={saveNow} disabled={!dirty}>
            Save now
          </button>
          <button
            className="button primary small"
            onClick={() => {
              saveNow();
              navigate(`/method/${method.id}`);
            }}
          >
            Done
          </button>
        </div>
      </div>

      <div className="method-tabs">
        {TABS.map((item) => (
          <button key={item.key} className={`method-tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
            <span>{item.letter}</span>
            {item.label}
            {item.key !== 'identity' && draft.hiddenSections.includes(item.key as MethodSectionKey) ? (
              <Icon name="eye" size={12} className="hidden-icon" />
            ) : null}
          </button>
        ))}
        <div className="method-tabs-note">{visibleSections + 1} of {TABS.length} sections visible</div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          {tab === 'identity' ? (
            <section className="editor-section">
              <EditorHeading letter="A" title="Identification" subtitle="The basic record. Keep the title concrete and the summary short enough to scan." />
              <div className="form-stack">
                <label className="field">
                  <span>Method title</span>
                  <input className="title-input" value={draft.title} onChange={(e) => change((c) => ({ ...c, title: e.target.value }))} />
                </label>
                <label className="field">
                  <span>Short summary</span>
                  <textarea
                    rows={3}
                    value={draft.summary}
                    onChange={(e) => change((c) => ({ ...c, summary: e.target.value }))}
                    placeholder="What is the practice, in one or two sentences?"
                  />
                </label>
                <div className="form-grid two">
                  <label className="field">
                    <span>Primary domain</span>
                    <select
                      value={draft.primaryDomainId}
                      onChange={(e) =>
                        change((c) => {
                          const nextDomain = e.target.value;
                          const sectionBelongs = project.sections.some(
                            (s) => s.id === c.primarySectionId && s.domainId === nextDomain,
                          );
                          return { ...c, primaryDomainId: nextDomain, primarySectionId: sectionBelongs ? c.primarySectionId : '' };
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {project.domains.map((d) => <option key={d.id} value={d.id}>{d.roman}. {d.title}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Primary section</span>
                    <select value={draft.primarySectionId} onChange={(e) => change((c) => ({ ...c, primarySectionId: e.target.value }))}>
                      <option value="">Not yet assigned</option>
                      {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </label>
                </div>
                <div className="field">
                  <span>Secondary domains</span>
                  <div className="checkbox-grid">
                    {project.domains.map((d) => (
                      <label key={d.id} className="check-row compact">
                        <input
                          type="checkbox"
                          checked={draft.secondaryDomainIds.includes(d.id)}
                          disabled={d.id === draft.primaryDomainId}
                          onChange={(e) =>
                            change((c) => ({
                              ...c,
                              secondaryDomainIds: e.target.checked
                                ? [...c.secondaryDomainIds, d.id]
                                : c.secondaryDomainIds.filter((id) => id !== d.id),
                            }))
                          }
                        />
                        <span>{d.roman}. {d.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="field">
                  <span>Related sections <em>across any domain</em></span>
                  <select
                    multiple
                    className="multi-select"
                    value={draft.relatedSectionIds}
                    onChange={(e) =>
                      change((c) => ({
                        ...c,
                        relatedSectionIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                      }))
                    }
                  >
                    {project.domains.map((domain) => {
                      const domainSections = project.sections.filter((s) => s.domainId === domain.id && s.id !== draft.primarySectionId);
                      if (!domainSections.length) return null;
                      return (
                        <optgroup key={domain.id} label={`${domain.roman}. ${domain.title}`}>
                          {domainSections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </optgroup>
                      );
                    })}
                  </select>
                </label>
                <div className="form-grid two">
                  <label className="field">
                    <span>Tags <em>comma separated</em></span>
                    <input value={draft.tags.join(', ')} onChange={(e) => change((c) => ({ ...c, tags: splitTags(e.target.value) }))} />
                  </label>
                  <label className="field">
                    <span>Editorial stage</span>
                    <select value={draft.status} onChange={(e) => change((c) => ({ ...c, status: e.target.value as Method['status'] }))}>
                      {METHOD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <div className="record-meta-row">
                  <span>Created {formatDate(method.createdAt)}</span>
                  <span>Last saved {formatDate(method.updatedAt)}</span>
                  <span>{draft.tags.length} tags</span>
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'purpose' ? (
            <section className="editor-section">
              <EditorHeading
                letter="B"
                title="Purpose"
                subtitle="Be concrete about the problem and the person it is for. It is fine to leave fields blank at first."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('purpose')} onToggle={() => toggleHidden('purpose')} />}
              />
              <div className="form-stack">
                <Field label="What problem or opportunity does this method address?" value={draft.purpose.problem} onChange={(v) => patch('purpose', { problem: v })} rows={3} />
                <Field label="Why does the problem matter?" value={draft.purpose.importance} onChange={(v) => patch('purpose', { importance: v })} rows={3} />
                <Field label="What outcomes is it intended to produce?" value={draft.purpose.outcomes} onChange={(v) => patch('purpose', { outcomes: v })} rows={3} />
                <div className="form-grid two">
                  <Field label="For whom is it appropriate?" value={draft.purpose.suitableFor} onChange={(v) => patch('purpose', { suitableFor: v })} rows={3} />
                  <Field label="When might it be useful or unsuitable?" value={draft.purpose.unsuitableWhen} onChange={(v) => patch('purpose', { unsuitableWhen: v })} rows={3} />
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'instructions' ? (
            <section className="editor-section">
              <EditorHeading
                letter="C"
                title="Practical instructions"
                subtitle="Write this for someone who has never done it. Variation and safety are part of the method, not footnotes."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('instructions')} onToggle={() => toggleHidden('instructions')} />}
              />
              <div className="form-stack">
                <Field label="Preparation and required materials" value={draft.instructions.preparation} onChange={(v) => patch('instructions', { preparation: v })} rows={3} />
                <ListEditor
                  label="Step-by-step instructions"
                  items={draft.instructions.steps}
                  onChange={(steps) => patch('instructions', { steps })}
                  placeholder="Describe one step…"
                  addLabel="Add step"
                />
                <Field label="Recommended frequency and duration" value={draft.instructions.frequency} onChange={(v) => patch('instructions', { frequency: v })} rows={2} />
                <div className="form-grid three">
                  <Field label="Beginner variation" value={draft.instructions.beginner} onChange={(v) => patch('instructions', { beginner: v })} rows={3} />
                  <Field label="Intermediate variation" value={draft.instructions.intermediate} onChange={(v) => patch('instructions', { intermediate: v })} rows={3} />
                  <Field label="Advanced variation" value={draft.instructions.advanced} onChange={(v) => patch('instructions', { advanced: v })} rows={3} />
                </div>
                <Field label="Ways to adapt it to different circumstances" value={draft.instructions.adaptations} onChange={(v) => patch('instructions', { adaptations: v })} rows={3} />
                <Field label="Common mistakes and troubleshooting" value={draft.instructions.mistakes} onChange={(v) => patch('instructions', { mistakes: v })} rows={3} />
                <Field label="Safety considerations and contraindications" value={draft.instructions.safety} onChange={(v) => patch('instructions', { safety: v })} rows={3} hint="Be explicit where the practice carries physical, psychological or social risk." />
              </div>
            </section>
          ) : null}

          {tab === 'rationale' ? (
            <section className="editor-section">
              <EditorHeading
                letter="D"
                title="Rationale"
                subtitle="Distinguish mechanisms from evidence, and be honest about what would count against the method."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('rationale')} onToggle={() => toggleHidden('rationale')} />}
              />
              <div className="form-stack">
                <Field label="Why might it work? Proposed mechanisms" value={draft.rationale.mechanisms} onChange={(v) => patch('rationale', { mechanisms: v })} rows={4} />
                <div className="editor-callout">
                  <Icon name="alert" size={15} />
                  <span>Do not present a claim as supported when no source is attached. Mark guesses and hypotheses explicitly.</span>
                </div>
                <Field label="What evidence supports it?" value={draft.rationale.evidence} onChange={(v) => patch('rationale', { evidence: v })} rows={4} hint="Name the kind of evidence and link the records in the Knowledge tab." />
                <Field label="What evidence contradicts or limits it?" value={draft.rationale.counterEvidence} onChange={(v) => patch('rationale', { counterEvidence: v })} rows={4} />
                <div className="form-grid two">
                  <Field label="What assumptions does it depend on?" value={draft.rationale.assumptions} onChange={(v) => patch('rationale', { assumptions: v })} rows={3} />
                  <Field label="What remains uncertain?" value={draft.rationale.uncertainties} onChange={(v) => patch('rationale', { uncertainties: v })} rows={3} />
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'knowledge' ? (
            <section className="editor-section">
              <EditorHeading
                letter="E"
                title="Supporting knowledge"
                subtitle="Different kinds of knowledge require different standards. A religious text, a clinical trial and a personal observation are not interchangeable."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('knowledge')} onToggle={() => toggleHidden('knowledge')} />}
              />
              <div className="form-stack">
                <Field label="Scientific studies and reviews" value={draft.knowledge.science} onChange={(v) => patch('knowledge', { science: v })} rows={3} />
                <Field label="Books and other publications" value={draft.knowledge.books} onChange={(v) => patch('knowledge', { books: v })} rows={2} />
                <Field label="Religious and philosophical sources" value={draft.knowledge.philosophy} onChange={(v) => patch('knowledge', { philosophy: v })} rows={3} />
                <Field label="Historical examples" value={draft.knowledge.history} onChange={(v) => patch('knowledge', { history: v })} rows={2} />
                <Field label="Personal observations and community experience" value={draft.knowledge.observations} onChange={(v) => patch('knowledge', { observations: v })} rows={3} />
              </div>
              <div className="editor-linked-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Records</p>
                    <h3>Linked research and notes</h3>
                  </div>
                  <button className="button ghost small" onClick={() => setLinking(true)}>
                    <Icon name="link" size={14} /> Link record
                  </button>
                </div>
                {sourceLinks.length ? (
                  <div className="linked-list">
                    {sourceLinks.map((link) => (
                      <div key={link.relationship.id} className="linked-row">
                        <span className="linked-kind">{link.other.type === 'source' ? 'Source' : 'Note'}</span>
                        <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                        <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                        <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Unlink">
                          <Icon name="unlink" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">No sources linked yet. You can add a new source from the Research Library, then return here to connect it.</p>
                )}
                <Link to="/research?new=source" className="text-button small">
                  <Icon name="plus" size={13} /> Go to the research library
                </Link>
              </div>
            </section>
          ) : null}

          {tab === 'evaluation' ? (
            <section className="editor-section">
              <EditorHeading
                letter="F"
                title="Evaluation"
                subtitle="What would count as evidence that this practice is working — or not? Include costs and trade-offs."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('evaluation')} onToggle={() => toggleHidden('evaluation')} />}
              />
              <div className="form-stack">
                <Field label="What would count as success?" value={draft.evaluation.success} onChange={(v) => patch('evaluation', { success: v })} rows={3} />
                <Field label="Which outcomes could be observed or measured?" value={draft.evaluation.measures} onChange={(v) => patch('evaluation', { measures: v })} rows={3} />
                <div className="form-grid two">
                  <Field label="Appropriate timeframe" value={draft.evaluation.timeframe} onChange={(v) => patch('evaluation', { timeframe: v })} rows={2} />
                  <Field label="Costs, risks and trade-offs" value={draft.evaluation.costs} onChange={(v) => patch('evaluation', { costs: v })} rows={2} />
                </div>
                <Field label="How confident are we, and why?" value={draft.evaluation.confidence} onChange={(v) => patch('evaluation', { confidence: v })} rows={3} hint="Separate confidence in the method from confidence in the evidence." />
              </div>
            </section>
          ) : null}

          {tab === 'application' ? (
            <section className="editor-section">
              <EditorHeading
                letter="G"
                title="Personal and collective application"
                subtitle="The same method changes character with scale. Note what is required to make it work beyond the individual."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('application')} onToggle={() => toggleHidden('application')} />}
              />
              <div className="form-stack">
                <Field label="Individual use" value={draft.application.self} onChange={(v) => patch('application', { self: v })} rows={3} />
                <Field label="Family or close relationship" value={draft.application.family} onChange={(v) => patch('application', { family: v })} rows={3} />
                <Field label="Community adoption" value={draft.application.community} onChange={(v) => patch('application', { community: v })} rows={3} />
                <Field label="Wider social effects" value={draft.application.society} onChange={(v) => patch('application', { society: v })} rows={3} />
                <Field label="Ecological effects and adaptations" value={draft.application.ecological} onChange={(v) => patch('application', { ecological: v })} rows={3} />
              </div>
            </section>
          ) : null}

          {tab === 'scales' ? (
            <section className="editor-section">
              <EditorHeading
                letter="H"
                title="Multi-scale impacts"
                subtitle="These are overlapping perspectives, not a rigid hierarchy. Record what you can see; leave the rest blank."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('scales')} onToggle={() => toggleHidden('scales')} />}
              />
              <div className="scale-editor-list">
                {SCALES.map((scale, index) => (
                  <div key={scale.key} className="scale-editor">
                    <div className="scale-editor-head">
                      <span className="scale-number">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{scale.label}</h3>
                        <p>{scale.description}</p>
                      </div>
                    </div>
                    <div className="form-grid two">
                      <Field label="Direct effects" value={draft.scales[scale.key].direct} onChange={(v) => setScale(scale.key, 'direct', v)} rows={2} />
                      <Field label="Indirect effects" value={draft.scales[scale.key].indirect} onChange={(v) => setScale(scale.key, 'indirect', v)} rows={2} />
                      <Field label="Who benefits" value={draft.scales[scale.key].beneficiaries} onChange={(v) => setScale(scale.key, 'beneficiaries', v)} rows={2} />
                      <Field label="Who bears the costs" value={draft.scales[scale.key].costs} onChange={(v) => setScale(scale.key, 'costs', v)} rows={2} />
                      <Field label="Dependencies on other systems" value={draft.scales[scale.key].dependencies} onChange={(v) => setScale(scale.key, 'dependencies', v)} rows={2} />
                      <Field label="Unintended consequences" value={draft.scales[scale.key].unintended} onChange={(v) => setScale(scale.key, 'unintended', v)} rows={2} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab === 'notes' ? (
            <section className="editor-section">
              <EditorHeading
                letter="I"
                title="Author’s notes"
                subtitle="This section is for you. Questions, disagreements and future experiments do not need to be polished prose."
                aside={<VisibilityToggle hidden={draft.hiddenSections.includes('notes')} onToggle={() => toggleHidden('notes')} />}
              />
              <div className="form-stack">
                <ListEditor
                  label="Questions to investigate"
                  items={draft.notes.questions}
                  onChange={(questions) => patch('notes', { questions })}
                  placeholder="What do you still need to find out?"
                  addLabel="Add question"
                />
                <Field label="Unresolved disagreements" value={draft.notes.disagreements} onChange={(v) => patch('notes', { disagreements: v })} rows={3} />
                <Field label="Personal reflections" value={draft.notes.reflections} onChange={(v) => patch('notes', { reflections: v })} rows={4} />
                <Field label="Possible improvements" value={draft.notes.improvements} onChange={(v) => patch('notes', { improvements: v })} rows={3} />
                <Field label="Future experiments" value={draft.notes.futureExperiments} onChange={(v) => patch('notes', { futureExperiments: v })} rows={3} />
              </div>
              <div className="editor-linked-panel">
                <p className="eyebrow">Manuscript passages</p>
                <h3>Discussed in</h3>
                {discussed.length ? (
                  discussed.map((doc) => (
                    <Link key={doc.id} to={`/studio/${doc.id}`} className="doc-backlink">
                      <Icon name="pen" size={14} /> <span>{doc.title}</span> <small>{doc.status}</small>
                    </Link>
                  ))
                ) : (
                  <p className="muted small">No manuscript passage references this method yet. Insert a method reference from the Studio.</p>
                )}
                <div className="panel-head spaced">
                  <p className="eyebrow">All relationships</p>
                  <button className="text-button small" onClick={() => setLinking(true)}>
                    <Icon name="link" size={13} /> Link a record
                  </button>
                </div>
                {links.length ? (
                  <div className="linked-list">
                    {links.map((link) => (
                      <div key={link.relationship.id} className="linked-row">
                        <span className="linked-kind">{link.other.type}</span>
                        <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                        <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                        <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Unlink">
                          <Icon name="unlink" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">No relationships yet.</p>
                )}
              </div>
            </section>
          ) : null}

          <div className="editor-bottom-nav">
            {TABS.map((item, index) => (
              <button
                key={item.key}
                className={`editor-nav-dot ${tab === item.key ? 'active' : ''}`}
                onClick={() => setTab(item.key)}
                aria-label={`Go to ${item.label}`}
              >
                {item.letter}
                <span>{item.label}</span>
                {index < TABS.length - 1 ? <span className="dot-sep">·</span> : null}
              </button>
            ))}
          </div>
        </div>

        <aside className="editor-aside">
          <div className="editor-aside-card">
            <p className="eyebrow">At a glance</p>
            <h3>{draft.title || 'Untitled method'}</h3>
            <p className="muted small">{draft.summary || 'No summary yet.'}</p>
            <dl className="meta-list compact">
              <div><dt>Status</dt><dd>{draft.status}</dd></div>
              <div><dt>Domain</dt><dd>{project.domains.find((d) => d.id === draft.primaryDomainId)?.title ?? '—'}</dd></div>
              <div><dt>Sources</dt><dd>{sourceLinks.filter((l) => l.other.type === 'source').length}</dd></div>
              <div><dt>Visible sections</dt><dd>{visibleSections + 1}</dd></div>
            </dl>
            <button className="button ghost small full" onClick={saveNow} disabled={!dirty}>
              Save changes now
            </button>
          </div>
          <div className="editor-aside-card help-card">
            <p className="eyebrow">A useful constraint</p>
            <p className="small">
              Not every field needs content. Leave what you do not know blank, mark uncertainty as uncertainty, and hide sections that are not relevant
              to this method.
            </p>
            <Link to={`/method/${method.id}`} className="text-button small">See how the page reads <Icon name="arrow-right" size={13} /></Link>
          </div>
        </aside>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={method.id} />
    </div>
  );
}

function EditorHeading({
  letter,
  title,
  subtitle,
  aside,
}: {
  letter: string;
  title: string;
  subtitle: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="editor-heading">
      <div className="editor-heading-title">
        <span className="method-letter">{letter}</span>
        <div>
          <p className="eyebrow">Method template</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {aside ? <div className="editor-heading-aside">{aside}</div> : null}
    </div>
  );
}

function VisibilityToggle({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <label className="visibility-toggle">
      <input type="checkbox" checked={!hidden} onChange={onToggle} />
      <span>{hidden ? 'Hidden on method page' : 'Visible on method page'}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel = 'Add item',
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const updateAt = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };
  return (
    <div className="field list-editor">
      <span>{label}</span>
      <div className="list-editor-rows">
        {items.map((item, index) => (
          <div key={index} className="list-row">
            <span className="list-index">{String(index + 1).padStart(2, '0')}</span>
            <textarea rows={2} value={item} onChange={(e) => updateAt(index, e.target.value)} placeholder={placeholder} />
            <div className="list-row-actions">
              <button
                type="button"
                className="icon-button subtle"
                disabled={index === 0}
                onClick={() => {
                  const next = [...items];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
                aria-label="Move up"
              >
                <Icon name="chevron-up" size={14} />
              </button>
              <button
                type="button"
                className="icon-button subtle"
                disabled={index === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  onChange(next);
                }}
                aria-label="Move down"
              >
                <Icon name="chevron-down" size={14} />
              </button>
              <button type="button" className="icon-button subtle" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove item">
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
        {!items.length ? <p className="muted small">No steps yet.</p> : null}
      </div>
      <button type="button" className="text-button small" onClick={() => onChange([...items, ''])}>
        <Icon name="plus" size={13} /> {addLabel}
      </button>
    </div>
  );
}
