/**
 * Shared workspaces and the invite links that open them.
 *
 * An invite is `<site>/join#r=<room>&k=<key>&n=<name>`. Everything after `#` is
 * a URL fragment, which browsers never send to any server, including the one
 * hosting the site. `room` names the meeting point. `key` is the password: it
 * encrypts the connection handshake, so anyone without the full link can
 * neither join nor read the offers peers exchange through the public relays.
 * Once connected, peers talk directly over WebRTC, which is itself encrypted.
 *
 * Holding the link is the whole permission model: anyone it is sent to can
 * read and edit the shared project. There is no account and no revocation
 * short of starting a new shared project.
 */
export interface SharedWorkspace {
  room: string;
  key: string;
  name: string;
  joinedAt: string;
  /** True on the browser that created it. */
  host: boolean;
}

const LIST_KEY = 'guidebook-future:shared-workspaces';
const ACTIVE_KEY = 'guidebook-future:active-workspace';
const NAME_KEY = 'guidebook-future:display-name';

function randomToken(bytes = 16): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the shared workspace still works for this visit.
  }
}

export function listSharedWorkspaces(): SharedWorkspace[] {
  const list = read<SharedWorkspace[]>(LIST_KEY, []);
  return Array.isArray(list) ? list.filter((w) => w && TOKEN.test(w.room) && TOKEN.test(w.key)) : [];
}

/** The open shared workspace, or null for the personal one. */
export function activeSharedWorkspace(): SharedWorkspace | null {
  const room = read<string | null>(ACTIVE_KEY, null);
  return listSharedWorkspaces().find((w) => w.room === room) ?? null;
}

export function setActiveWorkspace(room: string | null): void {
  write(ACTIVE_KEY, room);
}

export function rememberWorkspace(workspace: SharedWorkspace): void {
  const others = listSharedWorkspaces().filter((w) => w.room !== workspace.room);
  write(LIST_KEY, [workspace, ...others]);
}

export function forgetWorkspace(room: string): void {
  write(LIST_KEY, listSharedWorkspaces().filter((w) => w.room !== room));
  if (read<string | null>(ACTIVE_KEY, null) === room) write(ACTIVE_KEY, null);
}

export function newSharedWorkspace(name: string): SharedWorkspace {
  return { room: randomToken(), key: randomToken(), name: name.trim() || 'Shared project', joinedAt: new Date().toISOString(), host: true };
}

export function inviteLink(workspace: SharedWorkspace, origin = location.origin, base = import.meta.env.BASE_URL): string {
  const params = new URLSearchParams({ r: workspace.room, k: workspace.key, n: workspace.name });
  return `${origin}${base.replace(/\/?$/, '/')}join#${params.toString()}`;
}

/** Reads an invite fragment (`#r=…&k=…&n=…`). Returns null for anything malformed. */
export function parseInvite(hash: string): Omit<SharedWorkspace, 'joinedAt' | 'host'> | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const room = params.get('r') ?? '';
  const key = params.get('k') ?? '';
  if (!TOKEN.test(room) || !TOKEN.test(key)) return null;
  const name = (params.get('n') ?? '').trim().slice(0, 80) || 'Shared project';
  return { room, key, name };
}

/** What collaborators see this person called. Kept per browser, never synced into the project. */
export function displayName(): string {
  return read<string>(NAME_KEY, '').trim();
}

export function setDisplayName(name: string): void {
  write(NAME_KEY, name.trim().slice(0, 40));
}
