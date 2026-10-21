import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Method, MethodSectionKey } from '../types';
import { METHOD_STATUSES, SCALES } from '../types';
import { Icon } from '../components/Icon';
import {
  DomainChip,
  EmptyState,
  LinkDialog,
  SampleBadge,
  StatusPill,
} from '../components/ui';
import { DeleteMethodDialog } from '../components/create';
import {
  documentsForMethod,
  entityRoute,
  entityTitle,
  relationshipsFor,
} from '../lib/selectors';
import { formatDate } from '../lib/utils';

const SECTION_NAV: { key: MethodSectionKey | 'identification' | 'status'; label: string; letter: string }[] = [
  { key: 'identification', label: 'Identification', letter: 'A' },
  { key: 'purpose', label: 'Purpose', letter: 'B' },
  { key: 'instructions', label: 'Practical instructions', letter: 'C' },
  { key: 'rationale', label: 'Rationale', letter: 'D' },
  { key: 'knowledge', label: 'Supporting knowledge', letter: 'E' },
  { key: 'evaluation', label: 'Evaluation', letter: 'F' },
  { key: 'application', label: 'Personal & collective application', letter: 'G' },
  { key: 'scales', label: 'Multi-scale impacts', letter: 'H' },
  { key: 'notes', label: 'Author’s notes', letter: 'I' },
  { key: 'status', label: 'Publication status', letter: 'J' },
];

export function MethodPage() {
  const { methodId = '' } = useParams();
  const { project, update, unlink, toast } = useStore();
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const method = project.methods.find((m) => m.id === methodId);

  const links = useMemo(() => (method ? relationshipsFor(project, method.id) : []), [project, method]);

  if (!method) {
    return (
      <div className="page">
        <EmptyState
          icon="alert"
          title="Method not found"
          body="It may have been deleted. Deleted records can be restored from Settings if they have not been cleared."
          action={<Link className="button primary" to="/guide/methods">Browse methods</Link>}
        />
      </div>
    );
  }

  const domain = project.domains.find((d) => d.id === method.primaryDomainId);
  const section = project.sections.find((s) => s.id === method.primarySectionId);
  const secondaryDomains = method.secondaryDomainIds
    .map((id) => project.domains.find((d) => d.id === id))
    .filter(Boolean);
  const relatedSections = method.relatedSectionIds
    .map((id) => project.sections.find((s) => s.id === id))
    .filter(Boolean);
  const linkedResearch = links.filter((l) => ['source', 'note', 'quotation', 'claim'].includes(l.other.type));
  const linkedDocuments = documentsForMethod(project, method.id);
  const linkedExperiments = links.filter((l) => l.other.type === 'experiment');
  const sourceCount = linkedResearch.filter((l) => l.other.type === 'source').length;
  const hidden = method.hiddenSections;
  const visible = (key: MethodSectionKey) => !hidden.includes(key);
  const hasText = (...values: (string | undefined)[]) => values.some((v) => Boolean(v && v.trim()));

  const setStatus = (status: string) => {
    update((draft) => {
      const target = draft.methods.find((m) => m.id === method.id);
      if (target) {
        target.status = status as Method['status'];
        target.updatedAt = new Date().toISOString();
      }
    });
    toast(`Status set to “${status}”. This describes editorial progress, not scientific validity.`);
  };

  return (
    <div className={`page method-page accent-${domain?.accent ?? 'physical'}`}>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/guide">The Guide</Link>
        <Icon name="chevron-right" size={12} />
        {domain ? <Link to={`/guide/${domain.id}`}>{domain.title}</Link> : <span>Unassigned</span>}
        {section ? (
          <>
            <Icon name="chevron-right" size={12} />
            <Link to={`/guide/section/${section.id}`}>{section.title}</Link>
          </>
        ) : null}
        <Icon name="chevron-right" size={12} />
        <span>{method.title}</span>
      </nav>

      <header className="method-hero">
        <div className="method-hero-top">
          <div className="method-hero-chips">
            <DomainChip domain={domain} />
            {section ? <Link to={`/guide/section/${section.id}`} className="chip">{section.title}</Link> : null}
            <StatusPill status={method.status} />
            <SampleBadge show={project.settings.showIllustrativeBadges && Boolean(method.illustrative)} />
          </div>
          <div className="method-hero-actions">
            <button className="button ghost small" onClick={() => window.print()}>
              <Icon name="file" size={14} /> Print / PDF
            </button>
            <button className="button ghost small" onClick={() => setLinking(true)}>
              <Icon name="link" size={14} /> Connect
            </button>
            <Link className="button primary small" to={`/method/${method.id}/edit`}>
              <Icon name="edit" size={14} /> Edit method
            </Link>
          </div>
        </div>
        <h1>{method.title}</h1>
        <p className="method-summary">{method.summary || 'No summary has been written yet.'}</p>
        <div className="method-meta">
          {method.tags.map((tag) => (
            <span key={tag} className="mini-tag">{tag}</span>
          ))}
          <span className="muted small">Created {formatDate(method.createdAt)} · updated {formatDate(method.updatedAt)}</span>
        </div>
        {secondaryDomains.length ? (
          <div className="method-secondary-domains">
            <span className="field-label">Also in</span>
            {secondaryDomains.map((d) => (d ? <DomainChip key={d.id} domain={d} small /> : null))}
          </div>
        ) : null}
      </header>

      <div className="method-layout">
        <aside className="method-nav">
          <p className="eyebrow">On this page</p>
          <nav>
            {SECTION_NAV.filter((item) => item.key === 'identification' || item.key === 'status' || item.key === 'scales' || visible(item.key as MethodSectionKey)).map((item) => (
              <a key={item.key} href={`#${item.key}`}>
                <span>{item.letter}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="method-evidence-note">
            <Icon name={sourceCount ? 'library' : 'alert'} size={16} />
            <div>
              <strong>{sourceCount ? `${sourceCount} source${sourceCount === 1 ? '' : 's'} linked` : 'No sources linked yet'}</strong>
              <small>
                {sourceCount
                  ? 'Check that each claim in the rationale is actually supported by a source.'
                  : 'Claims in this method should be treated as provisional until sources are attached.'}
              </small>
            </div>
          </div>
        </aside>

        <div className="method-content">
          <section id="identification" className="method-block">
            <div className="method-block-head">
              <span className="method-letter">A</span>
              <div>
                <p className="eyebrow">Identification</p>
                <h2>What this method is</h2>
              </div>
            </div>
            <div className="identification-grid">
              <div>
                <p className="field-label">Primary domain</p>
                <DomainChip domain={domain} />
                <p className="field-label">Primary section</p>
                {section ? <Link to={`/guide/section/${section.id}`}>{section.title}</Link> : <span className="muted">Not assigned</span>}
              </div>
              <div>
                <p className="field-label">Secondary domains</p>
                {secondaryDomains.length ? (
                  <div className="chip-row">
                    {secondaryDomains.map((d) => (d ? <DomainChip key={d.id} domain={d} small /> : null))}
                  </div>
                ) : (
                  <p className="muted small">None recorded.</p>
                )}
                <p className="field-label">Related sections</p>
                {relatedSections.length ? (
                  <ul className="inline-link-list">
                    {relatedSections.map((s) => (
                      <li key={s?.id}><Link to={`/guide/section/${s?.id}`}>{s?.title}</Link></li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">None recorded.</p>
                )}
              </div>
              <div>
                <p className="field-label">Keywords</p>
                {method.tags.length ? (
                  <div className="chip-row">
                    {method.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
                  </div>
                ) : (
                  <p className="muted small">No tags.</p>
                )}
                <p className="field-label">Editorial status</p>
                <StatusPill status={method.status} />
                <p className="field-label">Last revised</p>
                <p className="small muted">{formatDate(method.updatedAt)}</p>
              </div>
            </div>
          </section>

          {visible('purpose') ? (
            <section id="purpose" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">B</span>
                <div><p className="eyebrow">Purpose</p><h2>Why this method exists</h2></div>
              </div>
              <div className="prose-block">
                <SubBlock label="The problem or opportunity" value={method.purpose.problem} />
                <SubBlock label="Why it matters" value={method.purpose.importance} />
                <SubBlock label="Intended outcomes" value={method.purpose.outcomes} />
                <div className="two-col-prose">
                  <SubBlock label="Appropriate for" value={method.purpose.suitableFor} />
                  <SubBlock label="May be unsuitable when" value={method.purpose.unsuitableWhen} />
                </div>
                {!hasText(method.purpose.problem, method.purpose.importance, method.purpose.outcomes, method.purpose.suitableFor, method.purpose.unsuitableWhen) ? (
                  <BlockEmpty text="The purpose of this method has not been written yet." />
                ) : null}
              </div>
            </section>
          ) : null}

          {visible('instructions') ? (
            <section id="instructions" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">C</span>
                <div><p className="eyebrow">Practical instructions</p><h2>How to do it</h2></div>
              </div>
              <div className="prose-block">
                <SubBlock label="Preparation and materials" value={method.instructions.preparation} />
                {method.instructions.steps.some(Boolean) ? (
                  <div className="instruction-steps">
                    <p className="field-label">Steps</p>
                    <ol>
                      {method.instructions.steps.filter(Boolean).map((step, i) => (
                        <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <SubBlock label="Frequency and duration" value={method.instructions.frequency} />
                <div className="variation-grid">
                  <Variation label="Beginner" value={method.instructions.beginner} />
                  <Variation label="Intermediate" value={method.instructions.intermediate} />
                  <Variation label="Advanced" value={method.instructions.advanced} />
                </div>
                <SubBlock label="Adaptations" value={method.instructions.adaptations} />
                <SubBlock label="Common mistakes" value={method.instructions.mistakes} />
                {method.instructions.safety ? (
                  <div className="safety-note">
                    <Icon name="alert" size={17} />
                    <div>
                      <strong>Safety and contraindications</strong>
                      <p>{method.instructions.safety}</p>
                    </div>
                  </div>
                ) : null}
                {!hasText(method.instructions.preparation, method.instructions.frequency, method.instructions.beginner, method.instructions.intermediate, method.instructions.advanced, method.instructions.adaptations, method.instructions.mistakes, method.instructions.safety) && !method.instructions.steps.some(Boolean) ? (
                  <BlockEmpty text="No practical instructions yet. This is the part a reader will need first." />
                ) : null}
              </div>
            </section>
          ) : null}

          {visible('rationale') ? (
            <section id="rationale" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">D</span>
                <div><p className="eyebrow">Rationale</p><h2>Why it might work</h2></div>
              </div>
              <div className="prose-block">
                <SubBlock label="Proposed mechanisms" value={method.rationale.mechanisms} />
                <SubBlock label="Evidence" value={method.rationale.evidence} tone="evidence" />
                <SubBlock label="Evidence that contradicts or limits it" value={method.rationale.counterEvidence} tone="counter" />
                <div className="two-col-prose">
                  <SubBlock label="Assumptions" value={method.rationale.assumptions} />
                  <SubBlock label="What remains uncertain" value={method.rationale.uncertainties} />
                </div>
              </div>
            </section>
          ) : null}

          {visible('knowledge') ? (
            <section id="knowledge" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">E</span>
                <div><p className="eyebrow">Supporting knowledge</p><h2>Sources, traditions and observations</h2></div>
              </div>
              <div className="knowledge-grid">
                <KnowledgeBlock label="Scientific studies and reviews" value={method.knowledge.science} />
                <KnowledgeBlock label="Books and publications" value={method.knowledge.books} />
                <KnowledgeBlock label="Religious and philosophical sources" value={method.knowledge.philosophy} />
                <KnowledgeBlock label="Historical examples" value={method.knowledge.history} />
                <KnowledgeBlock label="Personal and community observations" value={method.knowledge.observations} wide />
              </div>
              <div className="linked-records">
                <div className="linked-records-head">
                  <p className="field-label">Linked research records</p>
                  <button className="text-button small" onClick={() => setLinking(true)}>
                    <Icon name="plus" size={13} /> Add
                  </button>
                </div>
                {linkedResearch.length ? (
                  <div className="linked-list">
                    {linkedResearch.map((link) => (
                      <div key={link.relationship.id} className="linked-row">
                        <span className={`linked-kind ${link.other.type}`}>{link.other.type === 'source' ? 'Source' : link.other.type === 'note' ? 'Reading note' : link.other.type === 'quotation' ? 'Quotation' : 'Claim'}</span>
                        <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                        <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                        <button
                          className="icon-button subtle"
                          onClick={() => unlink(link.relationship.id)}
                          aria-label="Remove relationship"
                        >
                          <Icon name="unlink" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted small">No research records linked. Add sources before treating the claims as supported.</p>
                )}
              </div>
            </section>
          ) : null}

          {visible('evaluation') ? (
            <section id="evaluation" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">F</span>
                <div><p className="eyebrow">Evaluation</p><h2>How we would know</h2></div>
              </div>
              <div className="evaluation-grid">
                <SubBlock label="What would count as success" value={method.evaluation.success} />
                <SubBlock label="Observable outcomes and measures" value={method.evaluation.measures} />
                <SubBlock label="Appropriate timeframe" value={method.evaluation.timeframe} />
                <SubBlock label="Costs, risks and trade-offs" value={method.evaluation.costs} />
                <SubBlock label="Confidence in the method and its effects" value={method.evaluation.confidence} />
              </div>
            </section>
          ) : null}

          {visible('application') ? (
            <section id="application" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">G</span>
                <div><p className="eyebrow">Application</p><h2>Personal and collective use</h2></div>
              </div>
              <div className="application-grid">
                <ApplicationCard label="Individual" value={method.application.self} icon="home" />
                <ApplicationCard label="Family and close relationships" value={method.application.family} icon="network" />
                <ApplicationCard label="Community" value={method.application.community} icon="network" />
                <ApplicationCard label="Society" value={method.application.society} icon="graph" />
                <ApplicationCard label="Ecological effects" value={method.application.ecological} icon="book" wide />
              </div>
            </section>
          ) : null}

          {visible('scales') ? (
            <section id="scales" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">H</span>
                <div>
                  <p className="eyebrow">Multi-scale thinking</p>
                  <h2>Impacts across scales</h2>
                </div>
                <Link to="/scales" className="text-button small">Compare across methods</Link>
              </div>
              <div className="scale-grid">
                {SCALES.map((scale, index) => {
                  const value = method.scales[scale.key];
                  const filled = Object.values(value).some(Boolean);
                  return (
                    <div key={scale.key} className={`scale-card ${filled ? 'filled' : ''}`}>
                      <div className="scale-head">
                        <span className="scale-number">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h4>{scale.label}</h4>
                          <p>{scale.description}</p>
                        </div>
                      </div>
                      {filled ? (
                        <dl className="scale-list">
                          {value.direct ? <><dt>Direct effects</dt><dd>{value.direct}</dd></> : null}
                          {value.indirect ? <><dt>Indirect effects</dt><dd>{value.indirect}</dd></> : null}
                          {value.beneficiaries ? <><dt>Who benefits</dt><dd>{value.beneficiaries}</dd></> : null}
                          {value.costs ? <><dt>Who bears the costs</dt><dd>{value.costs}</dd></> : null}
                          {value.dependencies ? <><dt>Dependencies</dt><dd>{value.dependencies}</dd></> : null}
                          {value.unintended ? <><dt>Unintended consequences</dt><dd>{value.unintended}</dd></> : null}
                        </dl>
                      ) : (
                        <p className="muted small">Not yet considered at this scale.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {visible('notes') ? (
            <section id="notes" className="method-block">
              <div className="method-block-head">
                <span className="method-letter">I</span>
                <div><p className="eyebrow">Author’s notes</p><h2>Open work and reflections</h2></div>
              </div>
              <div className="prose-block">
                {method.notes.questions.filter(Boolean).length ? (
                  <div>
                    <p className="field-label">Questions to investigate</p>
                    <ul className="question-list compact">
                      {method.notes.questions.filter(Boolean).map((q, i) => (
                        <li key={i}><span className="question-mark">?</span><span>{q}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <SubBlock label="Unresolved disagreements" value={method.notes.disagreements} />
                <SubBlock label="Personal reflections" value={method.notes.reflections} />
                <SubBlock label="Possible improvements" value={method.notes.improvements} />
                <SubBlock label="Future experiments" value={method.notes.futureExperiments} />
                <div className="manuscript-backlinks">
                  <p className="field-label">Discussed in the manuscript</p>
                  {linkedDocuments.length ? (
                    linkedDocuments.map((doc) => (
                      <Link key={doc.id} to={`/studio/${doc.id}`} className="doc-backlink">
                        <Icon name="pen" size={14} />
                        <span>{doc.title}</span>
                        <small>{doc.status}</small>
                      </Link>
                    ))
                  ) : (
                    <p className="muted small">No manuscript passage references this method yet.</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section id="status" className="method-block status-block">
            <div className="method-block-head">
              <span className="method-letter">J</span>
              <div><p className="eyebrow">Publication status</p><h2>Where this method stands</h2></div>
            </div>
            <div className="status-control">
              <label className="field">
                <span>Editorial stage</span>
                <select value={method.status} onChange={(e) => setStatus(e.target.value)}>
                  {METHOD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <p className="muted small">
                These stages describe editorial progress, not the scientific validity of the method. Evidence status belongs in the rationale and
                evaluation sections.
              </p>
            </div>
          </section>

          {hidden.length ? (
            <p className="hidden-note">
              <Icon name="eye" size={14} /> {hidden.length} section{hidden.length > 1 ? 's are' : ' is'} hidden from this view.
              <Link to={`/method/${method.id}/edit`}> Manage visible sections</Link>
            </p>
          ) : null}

          <section className="method-block connections-block">
            <div className="method-block-head">
              <span className="method-letter"><Icon name="network" size={16} /></span>
              <div><p className="eyebrow">Connections</p><h2>How this method relates to the rest of the project</h2></div>
              <button className="text-button small" onClick={() => setLinking(true)}>
                <Icon name="plus" size={13} /> Link record
              </button>
            </div>
            {links.length ? (
              <div className="connection-groups">
                {links.map((link) => (
                  <div key={link.relationship.id} className="connection-row">
                    <span className={`connection-direction ${link.direction}`}>{link.direction === 'outgoing' ? '→' : '←'}</span>
                    <div className="connection-body">
                      <div className="connection-top">
                        <span className="relationship-type">{link.relationship.type.replace(/_/g, ' ')}</span>
                        <span className="muted small">{link.other.type}</span>
                      </div>
                      <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                      {link.relationship.note ? <p>{link.relationship.note}</p> : null}
                    </div>
                    <button className="icon-button subtle" onClick={() => unlink(link.relationship.id)} aria-label="Remove relationship">
                      <Icon name="unlink" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No relationships yet. Connect this method to research, chapters, experiments or other methods.</p>
            )}
            {linkedExperiments.length ? (
              <>
                <p className="field-label">Experiments testing this method</p>
                <div className="linked-list">
                  {linkedExperiments.map((link) => (
                    <div key={link.relationship.id} className="linked-row">
                      <span className="linked-kind experiment">Experiment</span>
                      <Link to={entityRoute(link.other)}>{entityTitle(link.other)}</Link>
                      <span className="relationship-type">{link.relationship.type}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <div className="method-danger-zone">
            <button className="text-button danger-text" onClick={() => setDeleting(true)}>
              <Icon name="trash" size={14} /> Move this method to deleted items
            </button>
          </div>
        </div>
      </div>

      <LinkDialog open={linking} onClose={() => setLinking(false)} fromId={method.id} />
      <DeleteMethodDialog open={deleting} onClose={() => setDeleting(false)} method={method} />
    </div>
  );
}

function SubBlock({ label, value, tone }: { label: string; value: string; tone?: 'evidence' | 'counter' }) {
  if (!value.trim()) return null;
  return (
    <div className={`sub-block ${tone ? `tone-${tone}` : ''}`}>
      <p className="field-label">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function Variation({ label, value }: { label: string; value: string }) {
  return (
    <div className={`variation ${value ? '' : 'empty'}`}>
      <span className="variation-label">{label}</span>
      <p>{value || 'Not described yet.'}</p>
    </div>
  );
}

function BlockEmpty({ text }: { text: string }) {
  return (
    <div className="block-empty">
      <Icon name="pen" size={16} />
      <p>{text}</p>
    </div>
  );
}

function KnowledgeBlock({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`knowledge-block ${wide ? 'wide' : ''} ${value ? '' : 'empty'}`}>
      <p className="field-label">{label}</p>
      <p>{value || 'Nothing recorded yet.'}</p>
    </div>
  );
}

function ApplicationCard({ label, value, icon, wide }: { label: string; value: string; icon: 'home' | 'network' | 'graph' | 'book'; wide?: boolean }) {
  return (
    <div className={`application-card ${wide ? 'wide' : ''} ${value ? '' : 'empty'}`}>
      <div className="application-head">
        <Icon name={icon} size={16} />
        <h4>{label}</h4>
      </div>
      <p>{value || 'Not yet considered.'}</p>
    </div>
  );
}
