import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Icon, type IconName } from './Icon';
import { relativeTime } from '../lib/utils';
import { ToastHost } from './ui';

const primaryNav: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/guide', label: 'The Guide', icon: 'book' },
  { to: '/studio', label: 'Writing Studio', icon: 'pen' },
  { to: '/research', label: 'Research Library', icon: 'library' },
  { to: '/connections', label: 'Connections', icon: 'network' },
  { to: '/experiments', label: 'Experiments', icon: 'flask' },
];

const mobileNav: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/guide', label: 'Guide', icon: 'book' },
  { to: '/studio', label: 'Studio', icon: 'pen' },
  { to: '/research', label: 'Research', icon: 'library' },
];

function SaveIndicator() {
  const { saveState, lastSavedAt } = useStore();
  const label =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Save failed'
        : saveState === 'loading'
          ? 'Opening workspace…'
          : 'All changes saved';
  return (
    <div className={`save-indicator save-${saveState}`} title={lastSavedAt ? `Last saved ${relativeTime(lastSavedAt)}` : undefined}>
      <span className="save-dot" />
      <div>
        <span>{label}</span>
        {lastSavedAt && saveState === 'saved' ? <small>{relativeTime(lastSavedAt)}</small> : null}
      </div>
    </div>
  );
}

/**
 * A failed write means the visible project and the stored project have started
 * to diverge, which is the one failure a local-first app must never hide. The
 * sidebar indicator is inside the drawer on narrow screens, so this banner is
 * the version that cannot be missed.
 */
function SaveWarning() {
  const { saveState, lastSavedAt } = useStore();
  if (saveState !== 'error') return null;
  return (
    <div className="save-warning" role="alert">
      <Icon name="alert" size={16} />
      <p>
        <strong>Changes are not being saved.</strong> This browser refused the last write — usually a
        full storage quota or private browsing.{' '}
        {lastSavedAt ? `Last successful save ${relativeTime(lastSavedAt)}. ` : ''}
        Export a JSON backup from <Link to="/settings">Settings</Link> before closing this tab.
      </p>
    </div>
  );
}

/** Who is here, for the sidebar of a shared project. */
function CollabIndicator() {
  const { shared, collab } = useStore();
  if (!shared) return null;
  const peers = collab?.peers ?? [];
  const status = collab?.status ?? 'connecting';
  const label =
    status === 'offline'
      ? 'Offline: changes will sync when you reconnect'
      : peers.length
        ? `With ${peers.map((p) => p.name).join(', ')}`
        : 'Waiting for collaborators';
  return (
    <Link to="/settings#collaborate" className={`collab-indicator collab-${peers.length ? 'connected' : status}`}>
      <span className="collab-dot" aria-hidden="true" />
      <span>
        <strong>Shared: {shared.name}</strong>
        <small>{label}</small>
      </span>
    </Link>
  );
}

/**
 * The states of a shared project someone must not miss: a guest who has not
 * received the project yet (an empty workspace is otherwise alarming), and a
 * browser that could not keep its copy.
 */
function CollabBanner() {
  const { shared, collab, awaitingFirstSync } = useStore();
  if (!shared) return null;
  if (collab?.persistFailed) {
    return (
      <div className="save-warning" role="alert">
        <Icon name="alert" size={16} />
        <p>
          <strong>This browser could not store its copy of “{shared.name}”.</strong> Your changes still reach anyone
          connected, but if you close this tab before they receive them, they will be lost.
        </p>
      </div>
    );
  }
  if (!awaitingFirstSync) return null;
  return (
    <div className="collab-banner" role="status" aria-live="polite">
      <Icon name="clock" size={16} />
      <p>
        <strong>Waiting for “{shared.name}” to arrive.</strong> The project comes directly from whoever invited you, so
        they need to have the app open too. It appears here as soon as you are connected.
      </p>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
  end,
  onClick,
  badge,
}: {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <Icon name={icon} size={17} />
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </NavLink>
  );
}

function SidebarContent({ close }: { close?: () => void }) {
  const { project, shared } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') ?? '');
  }, [location.search]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    close?.();
  };

  return (
    <>
      <div className="brand">
        <Link to="/" className="brand-link" onClick={close}>
          <span className="brand-mark">
            <Icon name="book" size={20} />
          </span>
          <span className="brand-text">
            <strong>Guidebook</strong>
            <em>for the Future</em>
          </span>
        </Link>
        <p className="brand-caption">A private studio for theory &amp; practice</p>
      </div>

      <form className="sidebar-search" onSubmit={submit} role="search">
        <Icon name="search" size={15} />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everything…"
          aria-label="Search the project"
        />
        <kbd>/</kbd>
      </form>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <p className="nav-heading">Workspace</p>
        {primaryNav.slice(0, 3).map((item) => (
          <NavItem key={item.to} {...item} onClick={close} />
        ))}
        <p className="nav-heading">Knowledge</p>
        {primaryNav.slice(3).map((item) => (
          <NavItem key={item.to} {...item} onClick={close} />
        ))}
        <NavItem to="/inbox" label="Inbox" icon="inbox" onClick={close} badge={project.inbox.length} />
        <NavItem to="/scales" label="Multi-scale view" icon="scale" onClick={close} />
      </nav>

      <div className="sidebar-domains">
        <p className="nav-heading">Five domains</p>
        <div className="domain-nav-list">
          {project.domains.map((domain) => (
            <NavLink
              key={domain.id}
              to={`/guide/${domain.id}`}
              className={({ isActive }) => `domain-nav accent-${domain.accent} ${isActive ? 'active' : ''}`}
              onClick={close}
            >
              <span className="domain-roman">{domain.roman}</span>
              <span>{domain.title}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="sidebar-foot">
        <CollabIndicator />
        <SaveIndicator />
        <NavLink to="/settings" className={({ isActive }) => `sidebar-settings ${isActive ? 'active' : ''}`} onClick={close}>
          <Icon name="settings" size={16} />
          <span>Settings &amp; export</span>
        </NavLink>
        <p className="privacy-note">
          <Icon name="bookmark" size={12} /> {shared ? 'Shared with whoever holds the invite link.' : 'Local workspace. Private by default.'}
        </p>
      </div>
    </>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const focusMode = new URLSearchParams(location.search).get('focus') === '1';

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', drawerOpen);
    return () => document.body.classList.remove('drawer-open');
  }, [drawerOpen]);

  if (focusMode) {
    return (
      <div className="focus-shell">
        <main className="focus-main" id="main">
          <SaveWarning />
          <CollabBanner />
          {children}
        </main>
        <ToastHost />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <SidebarContent />
      </aside>

      <div className={`drawer ${drawerOpen ? 'open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="drawer-panel">
          <button className="drawer-close icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <Icon name="close" size={20} />
          </button>
          <SidebarContent close={() => setDrawerOpen(false)} />
        </div>
        <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="Close menu" tabIndex={-1} />
      </div>

      <header className="mobile-topbar">
        <button className="icon-button" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={21} />
        </button>
        <Link to="/" className="mobile-brand">
          <span className="brand-mark small">
            <Icon name="book" size={16} />
          </span>
          <span>Guidebook</span>
        </Link>
        <button className="icon-button" onClick={() => navigate('/search')} aria-label="Search">
          <Icon name="search" size={20} />
        </button>
      </header>

      <main className="main-content" id="main" tabIndex={-1}>
        <SaveWarning />
        <CollabBanner />
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {mobileNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button className={`bottom-nav-item ${drawerOpen ? 'active' : ''}`} onClick={() => setDrawerOpen(true)}>
          <Icon name="more" size={19} />
          <span>More</span>
        </button>
      </nav>

      <ToastHost />
    </div>
  );
}
