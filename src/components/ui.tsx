import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Domain, RelationshipType } from '../types';
import { RELATIONSHIP_TYPES } from '../types';
import type { EntityType, ResolvedEntity } from '../lib/selectors';
import { useStore } from '../store';
import {
  entityRoute,
  entitySubtitle,
  entityTitle,
  entityTypeLabel,
  getEntity,
  getSection,
} from '../lib/selectors';
import { Icon, type IconName } from './Icon';

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus(), 40);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="modal-head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Delete',
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`button ${danger ? 'danger' : 'primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="modal-copy">{body}</p>
    </Modal>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon = 'book',
  title,
  body,
  action,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  body: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? 'empty-compact' : ''}`}>
      <span className="empty-icon">
        <Icon name={icon} size={compact ? 20 : 26} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        {action ? <div className="empty-action">{action}</div> : null}
      </div>
    </div>
  );
}

export function StatusPill({ status, prefix }: { status: string; prefix?: string }) {
  const slug = status.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <span className="status-pill" data-status={slug}>
      {prefix ? <span className="status-prefix">{prefix}</span> : null}
      {status}
    </span>
  );
}

export function SampleBadge({ show = true }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="sample-badge" title="Illustrative sample content — edit or delete it freely">
      Sample
    </span>
  );
}

export function DomainChip({
  domain,
  small = false,
}: {
  domain: Domain | undefined;
  small?: boolean;
}) {
  if (!domain) return <span className="chip muted-chip">Unassigned</span>;
  return (
    <Link
      to={`/guide/${domain.id}`}
      className={`domain-chip accent-${domain.accent} ${small ? 'chip-small' : ''}`}
    >
      <span className="accent-dot" />
      {domain.title}
    </Link>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={`tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {typeof tab.count === 'number' ? <span className="tab-count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function LinkDialog({
  open,
  onClose,
  fromId,
  defaultType = 'related_to',
  title = 'Create a relationship',
}: {
  open: boolean;
  onClose: () => void;
  fromId: string;
  defaultType?: RelationshipType;
  title?: string;
}) {
  const { project, linkRecords } = useStore();
  const [type, setType] = useState<RelationshipType>(defaultType);
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState('');
  const [note, setNote] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setTargetId('');
      setNote('');
      setType(defaultType);
      setTypeFilter('');
    }
  }, [open, defaultType]);

  const candidates = useMemo(() => {
    const all: ResolvedEntity[] = [
      ...project.methods.map((record) => ({ type: 'method' as EntityType, record })),
      ...project.sections.map((record) => ({ type: 'section' as EntityType, record })),
      ...project.domains.map((record) => ({ type: 'domain' as EntityType, record })),
      ...project.documents.map((record) => ({ type: 'document' as EntityType, record })),
      ...project.sources.map((record) => ({ type: 'source' as EntityType, record })),
      ...project.notes.map((record) => ({ type: 'note' as EntityType, record })),
      ...project.experiments.map((record) => ({ type: 'experiment' as EntityType, record })),
      ...project.claims.map((record) => ({ type: 'claim' as EntityType, record })),
      ...project.quotations.map((record) => ({ type: 'quotation' as EntityType, record })),
    ].filter((entity) => entity.record.id !== fromId);
    const q = query.trim().toLowerCase();
    return all
      .filter((entity) => {
        if (typeFilter && entity.type !== typeFilter) return false;
        if (!q) return true;
        return (
          entityTitle(entity).toLowerCase().includes(q) ||
          entitySubtitle(entity).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => entityTitle(a).localeCompare(entityTitle(b)))
      .slice(0, 60);
  }, [project, fromId, query, typeFilter]);

  const selected = targetId ? getEntity(project, targetId) : null;
  const typeInfo = RELATIONSHIP_TYPES.find((t) => t.key === type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={fromId ? `From: ${entityTitle(getEntity(project, fromId))}` : undefined}
      wide
      footer={
        <>
          <button className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              const created = linkRecords(fromId, selected.record.id as string, type, note.trim());
              if (created) onClose();
            }}
          >
            <Icon name="link" size={15} /> Link record
          </button>
        </>
      }
    >
      <div className="link-dialog">
        <div className="form-grid two">
          <label className="field">
            <span>Relationship type</span>
            <select value={type} onChange={(e) => setType(e.target.value as RelationshipType)}>
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <small className="field-hint">{typeInfo?.description}</small>
          </label>
          <label className="field">
            <span>Filter targets</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All record types</option>
              <option value="method">Methods</option>
              <option value="section">Sections</option>
              <option value="domain">Domains</option>
              <option value="document">Manuscript</option>
              <option value="source">Research sources</option>
              <option value="note">Reading notes</option>
              <option value="experiment">Experiments</option>
              <option value="claim">Claims</option>
              <option value="quotation">Quotations</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Find a record</span>
          <input
            type="search"
            placeholder="Search titles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="picker-list" role="listbox" aria-label="Records to link">
          {candidates.length === 0 ? (
            <p className="muted picker-empty">No matching records. Try a different search or filter.</p>
          ) : (
            candidates.map((entity) => (
              <button
                key={entity.record.id as string}
                className={`picker-item ${targetId === entity.record.id ? 'selected' : ''}`}
                onClick={() => setTargetId(entity.record.id as string)}
                type="button"
              >
                <span className="picker-type">{entityTypeLabel(entity.type)}</span>
                <span className="picker-title">{entityTitle(entity)}</span>
                <span className="picker-sub">{entitySubtitle(entity).slice(0, 110)}</span>
              </button>
            ))
          )}
        </div>
        {selected ? (
          <div className="selected-target">
            <Icon name="check" size={15} />
            <div>
              <strong>{entityTitle(selected)}</strong>
              <span>{entityTypeLabel(selected.type)}</span>
            </div>
          </div>
        ) : null}
        <label className="field">
          <span>Note on this connection <em>optional</em></span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are these records connected? What kind of support or tension is involved?"
          />
        </label>
      </div>
    </Modal>
  );
}

export function RelationshipRow({
  label,
  title,
  type,
  route,
  note,
  onRemove,
}: {
  label?: string;
  title: string;
  type?: string;
  route: string;
  note?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="relationship-row">
      <div className="relationship-main">
        <div className="relationship-meta">
          {type ? <span className="relationship-type">{type.replace(/_/g, ' ')}</span> : null}
          {label ? <span className="relationship-label">{label}</span> : null}
        </div>
        <Link to={route} className="relationship-title">
          {title}
        </Link>
        {note ? <p className="relationship-note">{note}</p> : null}
      </div>
      {onRemove ? (
        <button className="icon-button subtle" onClick={onRemove} aria-label={`Remove link to ${title}`}>
          <Icon name="unlink" size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span className="toast-icon">
            <Icon name={toast.kind === 'error' ? 'alert' : toast.kind === 'success' ? 'check' : 'spark'} size={15} />
          </span>
          <p>{toast.message}</p>
          <button className="icon-button subtle" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function InlineLinkList({
  ids,
  empty = 'None linked yet.',
}: {
  ids: string[];
  empty?: string;
}) {
  const { project } = useStore();
  if (!ids.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="inline-link-list">
      {ids.map((id) => {
        const section = getSection(project, id);
        if (!section) return null;
        return (
          <li key={id}>
            <Link to={`/guide/section/${id}`}>{section.title}</Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CoverStat({ value, label, to }: { value: string | number; label: string; to?: string }) {
  const body = (
    <>
      <span className="cover-stat-value">{value}</span>
      <span className="cover-stat-label">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className="cover-stat">
      {body}
    </Link>
  ) : (
    <div className="cover-stat">{body}</div>
  );
}

export function LinkedEntityCard({
  entity,
  type,
  note,
  onRemove,
}: {
  entity: ResolvedEntity;
  type: string;
  note?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="linked-entity">
      <div>
        <span className="linked-type">{entityTypeLabel(entity.type)}</span>
        <Link to={entityRoute(entity)}>{entityTitle(entity)}</Link>
        {note ? <p className="linked-note">{note}</p> : null}
      </div>
      <div className="linked-actions">
        <span className="relationship-type">{type.replace(/_/g, ' ')}</span>
        {onRemove ? (
          <button className="icon-button subtle" onClick={onRemove} aria-label="Remove relationship">
            <Icon name="unlink" size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
