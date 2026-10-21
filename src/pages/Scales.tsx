import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SCALES } from '../types';
import type { Method } from '../types';
import { Icon } from '../components/Icon';
import { DomainChip, EmptyState, PageHeader, StatusPill } from '../components/ui';
import { methodsForDomain } from '../lib/selectors';

function scaleScore(method: Method): number {
  return SCALES.reduce((sum, scale) => sum + Object.values(method.scales[scale.key]).filter(Boolean).length, 0);
}

export function ScalesPage() {
  const { project } = useStore();
  const navigate = useNavigate();
  const [domainId, setDomainId] = useState('');
  const [expanded, setExpanded] = useState<string>('');
  const [onlyFilled, setOnlyFilled] = useState(true);

  const methods = useMemo(() => {
    const list = domainId ? methodsForDomain(project, domainId) : project.methods;
    return list
      .filter((m) => (onlyFilled ? scaleScore(m) > 0 : true))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [project, domainId, onlyFilled]);

  const totalNotes = project.methods.reduce((sum, m) => sum + scaleScore(m), 0);

  return (
    <div className="page scales-page">
      <PageHeader
        eyebrow="Cross-domain and multi-scale thinking"
        title="Multi-scale view"
        subtitle="Compare how methods act at different levels — self, family, community, region, global humanity and the living world — and where costs and benefits fall."
        actions={
          <Link to="/guide/methods" className="button ghost">
            <Icon name="book" size={15} /> Method library
          </Link>
        }
      />

      <div className="scale-intro panel">
        <div>
          <p className="eyebrow">A note on scale</p>
          <p>
            These six perspectives overlap. A method may operate at several scales at once, and what benefits one group can impose costs on another.
            Blank cells are not failures; they mark where the analysis has not yet been done.
          </p>
        </div>
        <div className="scale-intro-stat">
          <strong>{totalNotes}</strong>
          <span>recorded scale observations</span>
        </div>
      </div>

      <div className="scale-legend">
        {SCALES.map((scale, index) => (
          <div key={scale.key} className="scale-legend-item">
            <span className="scale-number">{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{scale.label}</strong><small>{scale.description}</small></div>
          </div>
        ))}
      </div>

      <div className="toolbar-row wrap">
        <select value={domainId} onChange={(e) => setDomainId(e.target.value)} aria-label="Filter by domain">
          <option value="">All domains</option>
          {project.domains.map((d) => <option key={d.id} value={d.id}>{d.roman}. {d.title}</option>)}
        </select>
        <label className="check-inline">
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} />
          Only methods with scale notes
        </label>
        <span className="muted small">{methods.length} methods</span>
      </div>

      {methods.length ? (
        <section className="panel scale-matrix-panel">
          <div className="scale-matrix-scroll">
            <table className="scale-matrix">
              <thead>
                <tr>
                  <th className="sticky-col">Method</th>
                  {SCALES.map((scale, index) => (
                    <th key={scale.key} title={scale.description}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      {scale.short}
                    </th>
                  ))}
                  <th>Filled</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => {
                  const domain = project.domains.find((d) => d.id === method.primaryDomainId);
                  const isOpen = expanded === method.id;
                  return (
                    <React.Fragment key={method.id}>
                      <tr className={`scale-row ${isOpen ? 'expanded' : ''}`} onClick={() => setExpanded(isOpen ? '' : method.id)}>
                        <td className="sticky-col">
                          <div className="scale-method-cell">
                            <DomainChip domain={domain} small />
                            <button className="scale-method-link" onClick={(e) => { e.stopPropagation(); navigate(`/method/${method.id}`); }}>
                              {method.title}
                            </button>
                            <StatusPill status={method.status} />
                          </div>
                        </td>
                        {SCALES.map((scale) => {
                          const values = Object.values(method.scales[scale.key]).filter(Boolean);
                          return (
                            <td key={scale.key}>
                              <span className={`scale-cell ${values.length ? 'filled' : ''} ${values.length >= 4 ? 'rich' : ''}`} title={`${values.length} observations`}>
                                {values.length ? values.length : '·'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="scale-total">{scaleScore(method)}</td>
                      </tr>
                      {isOpen ? (
                        <tr className="scale-expanded-row">
                          <td colSpan={SCALES.length + 2}>
                            <div className="scale-detail">
                              {SCALES.map((scale) => {
                                const value = method.scales[scale.key];
                                const filled = Object.values(value).some(Boolean);
                                if (!filled) return null;
                                return (
                                  <div key={scale.key} className="scale-detail-card">
                                    <h4>{scale.label}</h4>
                                    {value.direct ? <p><strong>Direct:</strong> {value.direct}</p> : null}
                                    {value.indirect ? <p><strong>Indirect:</strong> {value.indirect}</p> : null}
                                    {value.beneficiaries ? <p><strong>Benefits:</strong> {value.beneficiaries}</p> : null}
                                    {value.costs ? <p><strong>Costs:</strong> {value.costs}</p> : null}
                                    {value.dependencies ? <p><strong>Depends on:</strong> {value.dependencies}</p> : null}
                                    {value.unintended ? <p><strong>Unintended:</strong> {value.unintended}</p> : null}
                                  </div>
                                );
                              })}
                              <div className="scale-detail-actions">
                                <Link to={`/method/${method.id}/edit`} className="button ghost small">Edit scale analysis</Link>
                                <Link to={`/method/${method.id}`} className="text-button small">Open method page <Icon name="arrow-right" size={13} /></Link>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          icon="scale"
          title="No scale analysis to compare"
          body="Open a method and complete some of its multi-scale fields. They will appear here for comparison across domains."
          action={<Link to="/guide/methods" className="button primary">Choose a method</Link>}
        />
      )}

      <section className="panel scale-guidance">
        <p className="eyebrow">How to use this view</p>
        <div className="scale-guidance-grid">
          <div><h3>Look for asymmetries</h3><p>Who receives the benefit and who carries the cost? A method can be excellent for an individual and extractive at a community scale.</p></div>
          <div><h3>Note dependencies</h3><p>A practice that requires leisure, space or money will not scale by being recommended more loudly. Record what it depends on.</p></div>
          <div><h3>Think across generations</h3><p>Short-term gains can borrow from the future. Use the ecological and global columns to ask what is being passed on.</p></div>
        </div>
      </section>
    </div>
  );
}
