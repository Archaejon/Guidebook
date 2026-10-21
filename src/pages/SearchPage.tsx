import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import type { EntityType } from '../lib/selectors';
import { allTags, EMPTY_FILTERS, searchProject, type SearchFilters } from '../lib/search';
import { READ_OPTIONS, STATUS_OPTIONS } from '../lib/filterOptions';
import { Icon } from '../components/Icon';
import { EmptyState, PageHeader } from '../components/ui';
import { relativeTime } from '../lib/utils';
import { SOURCE_KINDS } from '../types';

const TYPE_OPTIONS: { key: EntityType; label: string }[] = [
  { key: 'method', label: 'Methods' },
  { key: 'section', label: 'Sections' },
  { key: 'domain', label: 'Domains' },
  { key: 'document', label: 'Manuscript' },
  { key: 'source', label: 'Sources' },
  { key: 'note', label: 'Reading notes' },
  { key: 'quotation', label: 'Quotations' },
  { key: 'claim', label: 'Claims' },
  { key: 'experiment', label: 'Experiments' },
  { key: 'inbox', label: 'Inbox' },
];

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? <mark key={index}>{part}</mark> : <React.Fragment key={index}>{part}</React.Fragment>,
      )}
    </>
  );
}

export function SearchPage() {
  const { project } = useStore();
  const [params] = useSearchParams();
  const location = useLocation();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [filters, setFilters] = useState<SearchFilters>({
    ...EMPTY_FILTERS,
    types: params.get('types') ? params.get('types')!.split(',') : [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('relevance');
  const tags = allTags(project);

  useEffect(() => {
    setQuery(params.get('q') ?? '');
    if (params.get('types')) setFilters((current) => ({ ...current, types: params.get('types')!.split(',') }));
  }, [location.search, params]);

  const results = useMemo(() => searchProject(project, query, filters), [project, query, filters]);
  const sorted = useMemo(() => {
    if (sort === 'recent') return [...results].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    if (sort === 'title') return [...results].sort((a, b) => a.title.localeCompare(b.title));
    return results;
  }, [results, sort]);

  const activeFilterCount =
    filters.types.length + (filters.domainId ? 1 : 0) + (filters.status ? 1 : 0) + (filters.sourceKind ? 1 : 0) + (filters.tag ? 1 : 0) + (filters.dateRange ? 1 : 0);

  const toggleType = (type: string) => {
    setFilters((current) => ({
      ...current,
      types: current.types.includes(type) ? current.types.filter((t) => t !== type) : [...current.types, type],
    }));
  };

  const clear = () => {
    setFilters(EMPTY_FILTERS);
    setQuery('');
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof sorted>();
    for (const result of sorted) {
      const list = map.get(result.type) ?? [];
      list.push(result);
      map.set(result.type, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [sorted]);

  return (
    <div className="page search-page">
      <PageHeader
        eyebrow="Across the whole project"
        title="Search"
        subtitle="Methods, domains, manuscript prose, research records, quotations, experiments and inbox captures — in one place."
      />

      <div className="search-hero">
        <label className="search-field large">
          <Icon name="search" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything…"
            autoFocus
            aria-label="Search the project"
          />
          {query ? (
            <button className="icon-button subtle" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={15} /></button>
          ) : null}
        </label>
        <button className={`button ghost ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters((v) => !v)}>
          <Icon name="filter" size={15} /> Filters {activeFilterCount ? <span className="filter-count">{activeFilterCount}</span> : null}
        </button>
      </div>

      <div className="quick-type-filters">
        {TYPE_OPTIONS.map((type) => (
          <button key={type.key} className={`filter-chip ${filters.types.includes(type.key) ? 'active' : ''}`} onClick={() => toggleType(type.key)}>
            {type.label}
          </button>
        ))}
        {activeFilterCount ? (
          <button className="text-button tiny" onClick={clear}>Clear all</button>
        ) : null}
      </div>

      {showFilters ? (
        <section className="panel filter-panel">
          <div className="filter-grid">
            <label className="field">
              <span>Domain</span>
              <select value={filters.domainId} onChange={(e) => setFilters((f) => ({ ...f, domainId: e.target.value }))}>
                <option value="">Any domain</option>
                {project.domains.map((d) => <option key={d.id} value={d.id}>{d.roman}. {d.title}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">Any status</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Source type</span>
              <select value={filters.sourceKind} onChange={(e) => setFilters((f) => ({ ...f, sourceKind: e.target.value }))}>
                <option value="">Any source type</option>
                {SOURCE_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Tag</span>
              <select value={filters.tag} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}>
                <option value="">Any tag</option>
                {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Updated</span>
              <select value={filters.dateRange} onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}>
                <option value="">Any time</option>
                {READ_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="recent">Recently updated</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <div className="search-summary">
        <span>
          {query ? <><strong>{results.length}</strong> result{results.length === 1 ? '' : 's'} for “{query}”</> : <><strong>{results.length}</strong> records to browse</>}
        </span>
        {activeFilterCount ? <span className="muted">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span> : null}
      </div>

      {sorted.length ? (
        <div className="search-results">
          {grouped.map(([type, items]) => (
            <section key={type} className="search-group">
              <div className="search-group-head">
                <h2>{TYPE_OPTIONS.find((t) => t.key === type)?.label ?? type}</h2>
                <span>{items.length}</span>
              </div>
              {items.map((result) => (
                <Link key={`${result.type}-${result.id}`} to={result.route} className="search-result">
                  <span className="search-type">{type}</span>
                  <div className="search-result-main">
                    <h3><Highlight text={result.title} query={query} /></h3>
                    <p className="search-result-sub">{result.subtitle}</p>
                    {result.excerpt ? <p className="search-result-excerpt"><Highlight text={result.excerpt} query={query} /></p> : null}
                    <div className="search-result-meta">
                      {result.tags.slice(0, 3).map((tag) => <span key={tag} className="mini-tag">{tag}</span>)}
                      <span>{relativeTime(result.updatedAt)}</span>
                      {result.status ? <span>{result.status}</span> : null}
                    </div>
                  </div>
                  <Icon name="chevron-right" size={15} />
                </Link>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title={query ? 'Nothing matched' : 'No records yet'}
          body={
            query
              ? 'Try a broader term, remove a filter, or search for a method, author, tag or phrase from the manuscript.'
              : 'As the project grows, everything you write will be searchable here.'
          }
          action={activeFilterCount || query ? <button className="button ghost" onClick={clear}>Clear search and filters</button> : undefined}
        />
      )}
    </div>
  );
}
