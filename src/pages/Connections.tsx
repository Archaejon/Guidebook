import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import type { RelationshipType } from '../types';
import { RELATIONSHIP_TYPES } from '../types';
import { Icon } from '../components/Icon';
import {
  EmptyState,
  LinkDialog,
  PageHeader,
} from '../components/ui';
import {
  entityRoute,
  entityTitle,
  entityTypeLabel,
  getEntity,
  type ResolvedEntity,
} from '../lib/selectors';
import type { ID } from '../types';

interface GraphNode {
  id: ID;
  label: string;
  type: string;
  x: number;
  y: number;
}

export function ConnectionsPage() {
  const { project, unlink } = useStore();
  const [activeTypes, setActiveTypes] = useState<RelationshipType[]>(RELATIONSHIP_TYPES.map((t) => t.key));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [fromId, setFromId] = useState(project.methods[0]?.id ?? project.sources[0]?.id ?? '');
  const [listFilter, setListFilter] = useState('');

  const visibleRelationships = useMemo(
    () => project.relationships.filter((rel) => activeTypes.includes(rel.type)),
    [project.relationships, activeTypes],
  );

  const graph = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const ensure = (id: string) => {
      if (nodeMap.has(id)) return;
      const entity = getEntity(project, id);
      if (!entity) return;
      const angle = nodeMap.size * 2.39996;
      nodeMap.set(id, {
        id,
        label: entityTitle(entity),
        type: entity.type,
        x: 500 + Math.cos(angle) * (120 + (nodeMap.size % 4) * 45),
        y: 300 + Math.sin(angle) * (100 + (nodeMap.size % 3) * 35),
      });
    };
    for (const rel of visibleRelationships) {
      ensure(rel.fromId);
      ensure(rel.toId);
    }
    const nodes = Array.from(nodeMap.values());
    const velocities = nodes.map(() => ({ vx: 0, vy: 0 }));
    if (!nodes.length) return { nodes, edges: [] as typeof visibleRelationships, width: 1000, height: 600 };

    for (let iteration = 0; iteration < 380; iteration += 1) {
      const cooling = Math.max(0.25, 1 - iteration / 430);
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = Math.max(3200, dx * dx + dy * dy);
          const force = 52000 / distSq;
          const dist = Math.sqrt(distSq);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          velocities[i].vx -= fx;
          velocities[i].vy -= fy;
          velocities[j].vx += fx;
          velocities[j].vy += fy;
        }
      }
      for (const rel of visibleRelationships) {
        const from = nodes.find((n) => n.id === rel.fromId);
        const to = nodes.find((n) => n.id === rel.toId);
        if (!from || !to) continue;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - 200) * 0.009;
        const fi = nodes.indexOf(from);
        const ti = nodes.indexOf(to);
        velocities[fi].vx += (dx / dist) * force;
        velocities[fi].vy += (dy / dist) * force;
        velocities[ti].vx -= (dx / dist) * force;
        velocities[ti].vy -= (dy / dist) * force;
      }
      for (let i = 0; i < nodes.length; i += 1) {
        velocities[i].vx += (500 - nodes[i].x) * 0.0016;
        velocities[i].vy += (300 - nodes[i].y) * 0.0016;
        velocities[i].vx *= 0.84 * cooling;
        velocities[i].vy *= 0.84 * cooling;
        nodes[i].x = Math.min(930, Math.max(70, nodes[i].x + velocities[i].vx));
        nodes[i].y = Math.min(555, Math.max(50, nodes[i].y + velocities[i].vy));
      }
    }
    return { nodes, edges: visibleRelationships };
  }, [project, visibleRelationships]);

  const selectedEntity = selected ? getEntity(project, selected) : null;
  const selectedLinks = selectedEntity
    ? project.relationships.filter((r) => r.fromId === selected || r.toId === selected)
    : [];

  const filteredRelationships = useMemo(() => {
    const q = (listFilter || query).trim().toLowerCase();
    return project.relationships.filter((rel) => {
      if (!activeTypes.includes(rel.type)) return false;
      if (!q) return true;
      const from = getEntity(project, rel.fromId);
      const to = getEntity(project, rel.toId);
      return [entityTitle(from), entityTitle(to), rel.note, rel.type].join(' ').toLowerCase().includes(q);
    });
  }, [project, activeTypes, query, listFilter]);

  const toggleType = (type: RelationshipType) => {
    setActiveTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  };

  const allEntities = useMemo(() => {
    const list: ResolvedEntity[] = [
      ...project.methods.map((record) => ({ type: 'method' as const, record })),
      ...project.sections.map((record) => ({ type: 'section' as const, record })),
      ...project.domains.map((record) => ({ type: 'domain' as const, record })),
      ...project.documents.map((record) => ({ type: 'document' as const, record })),
      ...project.sources.map((record) => ({ type: 'source' as const, record })),
      ...project.notes.map((record) => ({ type: 'note' as const, record })),
      ...project.experiments.map((record) => ({ type: 'experiment' as const, record })),
      ...project.claims.map((record) => ({ type: 'claim' as const, record })),
      ...project.quotations.map((record) => ({ type: 'quotation' as const, record })),
    ];
    return list;
  }, [project]);

  const neighbourIds = selected
    ? new Set(selectedLinks.flatMap((r) => [r.fromId, r.toId]))
    : new Set<string>();

  return (
    <div className="page connections-page">
      <PageHeader
        eyebrow="Knowledge graph"
        title="Connections"
        subtitle="Meaningful relationships between methods, research, manuscript passages and experiments. The graph is a way in; the list below is the reliable index."
        actions={
          <button className="button primary" onClick={() => setLinkOpen(true)} disabled={!fromId}>
            <Icon name="link" size={15} /> New relationship
          </button>
        }
      />

      <div className="connection-stats">
        <div><strong>{project.relationships.length}</strong><span>relationships</span></div>
        <div><strong>{graph.nodes.length}</strong><span>connected records</span></div>
        <div><strong>{new Set(project.relationships.map((r) => r.type)).size}</strong><span>relationship types in use</span></div>
        <div><strong>{project.methods.length + project.sources.length}</strong><span>central records</span></div>
      </div>

      <div className="type-filter-bar">
        <span className="field-label">Relationship types</span>
        <div className="type-toggles">
          {RELATIONSHIP_TYPES.map((type) => (
            <button
              key={type.key}
              className={`type-toggle type-${type.key} ${activeTypes.includes(type.key) ? 'active' : ''}`}
              onClick={() => toggleType(type.key)}
              title={type.description}
            >
              <span className="type-dot" />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="connections-layout">
        <section className="graph-panel panel">
          <div className="graph-head">
            <div>
              <p className="eyebrow">Map</p>
              <h2>Relationship map</h2>
            </div>
            <label className="mini-search">
              <Icon name="search" size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Highlight in list…" />
            </label>
          </div>
          {graph.nodes.length ? (
            <div className="graph-wrap">                <svg viewBox="0 0 1000 600" className="graph-svg" role="img" aria-label="Network of project relationships">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-strong)" />
                  </marker>
                </defs>
                {graph.edges.map((rel) => {
                  const from = graph.nodes.find((n) => n.id === rel.fromId);
                  const to = graph.nodes.find((n) => n.id === rel.toId);
                  if (!from || !to) return null;
                  const dimmed = selected && rel.fromId !== selected && rel.toId !== selected;
                  const highlighted = selected && (rel.fromId === selected || rel.toId === selected);
                  return (
                    <g key={rel.id} className={`graph-edge type-${rel.type} ${dimmed ? 'dimmed' : ''} ${highlighted ? 'highlighted' : ''}`}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd="url(#arrow)" />
                    </g>
                  );
                })}
                {graph.nodes.map((node) => {
                  const isSelected = node.id === selected;
                  const isNeighbour = neighbourIds.has(node.id);
                  const dimmed = selected && !isSelected && !isNeighbour;
                  return (
                    <g
                      key={node.id}
                      className={`graph-node type-${node.type} ${isSelected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => setSelected(isSelected ? '' : node.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelected(node.id); }}
                    >
                      <circle r={isSelected ? 11 : 7} />
                      <text y={-14} textAnchor="middle" className="node-label">{node.label.length > 26 ? `${node.label.slice(0, 24)}…` : node.label}</text>
                      <text y={26} textAnchor="middle" className="node-type">{entityTypeLabel(node.type as never)}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <EmptyState
              compact
              icon="network"
              title="No relationships to show"
              body="Create a relationship between records, or enable more relationship types."
            />
          )}
          <div className="graph-legend">
            <span><span className="legend-dot method" /> Method</span>
            <span><span className="legend-dot source" /> Research</span>
            <span><span className="legend-dot document" /> Manuscript</span>
            <span><span className="legend-dot experiment" /> Experiment</span>
            <span><span className="legend-dot note" /> Note</span>
            <span className="muted">Click a node to inspect it</span>
          </div>
        </section>

        <aside className="connection-side">
          {selectedEntity ? (
            <section className="panel selected-node">
              <div className="panel-head tight">
                <div>
                  <p className="eyebrow">{entityTypeLabel(selectedEntity.type)}</p>
                  <h2>{entityTitle(selectedEntity)}</h2>
                </div>
                <button className="icon-button subtle" onClick={() => setSelected('')} aria-label="Clear selection"><Icon name="close" size={15} /></button>
              </div>
              <Link to={entityRoute(selectedEntity)} className="button ghost small full">
                <Icon name="external" size={14} /> Open record
              </Link>
              <p className="eyebrow spaced">Relationships</p>
              {selectedLinks.length ? (
                <div className="selected-rel-list">
                  {selectedLinks.map((rel) => {
                    const other = getEntity(project, rel.fromId === selected ? rel.toId : rel.fromId);
                    if (!other) return null;
                    return (
                      <div key={rel.id} className="selected-rel">
                        <span className="relationship-type">{rel.type.replace(/_/g, ' ')}</span>
                        <Link to={entityRoute(other)}>{entityTitle(other)}</Link>
                        <button className="icon-button tiny" onClick={() => unlink(rel.id)} aria-label="Remove relationship"><Icon name="unlink" size={12} /></button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted small">No relationships yet.</p>
              )}
              <button className="text-button small" onClick={() => { setFromId(selected); setLinkOpen(true); }}>
                <Icon name="link" size={13} /> Link from this record
              </button>
            </section>
          ) : (
            <section className="panel selected-node empty-selected">
              <Icon name="network" size={22} />
              <h3>Inspect a record</h3>
              <p className="muted small">Select a node to see its incoming and outgoing relationships. Use the list below to find anything without the graph.</p>
            </section>
          )}
          <section className="panel link-from-panel">
            <p className="eyebrow">Create a link</p>
            <label className="field">
              <span>From</span>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {allEntities.map((entity) => (
                  <option key={entity.record.id} value={entity.record.id}>
                    {entityTypeLabel(entity.type)} — {entityTitle(entity)}
                  </option>
                ))}
              </select>
            </label>
            <button className="button ghost small full" onClick={() => setLinkOpen(true)} disabled={!fromId}>
              <Icon name="link" size={14} /> Choose target and type
            </button>
          </section>
        </aside>
      </div>

      <section className="panel relationship-index">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Index</p>
            <h2>All relationships</h2>
          </div>
          <label className="mini-search">
            <Icon name="search" size={14} />
            <input value={listFilter} onChange={(e) => setListFilter(e.target.value)} placeholder="Filter this list…" />
          </label>
        </div>
        {filteredRelationships.length ? (
          <div className="relationship-index-list">
            {filteredRelationships.map((rel) => {
              const from = getEntity(project, rel.fromId);
              const to = getEntity(project, rel.toId);
              if (!from || !to) return null;
              return (
                <div key={rel.id} className="relationship-index-row">
                  <Link to={entityRoute(from)} className="ri-from">{entityTitle(from)}</Link>
                  <span className={`ri-type type-${rel.type}`}>{rel.type.replace(/_/g, ' ')}</span>
                  <Link to={entityRoute(to)} className="ri-to">{entityTitle(to)}</Link>
                  <span className="ri-note">{rel.note}</span>
                  <button className="icon-button tiny" onClick={() => unlink(rel.id)} aria-label="Remove relationship"><Icon name="unlink" size={12} /></button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted small">No relationships match this filter.</p>
        )}
      </section>

      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} fromId={fromId} />
    </div>
  );
}
