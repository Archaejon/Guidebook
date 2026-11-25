import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Project, RelationshipType, Snapshot, TrashItem } from './types';
import { createSeedProject } from './seed';
import {
  clearProject,
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
  loadProject,
  saveProject,
} from './lib/storage';
import { now, uid } from './lib/factory';
import { restoreRecord, trashRecord } from './lib/trash';
import {
  activeSharedWorkspace,
  displayName,
  forgetWorkspace,
  newSharedWorkspace,
  rememberWorkspace,
  setActiveWorkspace,
  setDisplayName,
  type SharedWorkspace,
} from './lib/collab/invite';
import type { CollabSession, CollabState } from './lib/collab/session';
import { deleteRoomState } from './lib/storage';

type CollabRuntime = typeof import('./lib/collab/runtime');

type SaveState = 'loading' | 'saved' | 'saving' | 'error';

interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'error' | 'success';
}

interface StoreValue {
  project: Project;
  ready: boolean;
  saveState: SaveState;
  lastSavedAt: string | null;
  update: (mutator: (draft: Project) => void) => void;
  replaceProject: (project: Project) => Promise<void>;
  resetToSample: () => Promise<void>;
  resetToEmpty: () => Promise<void>;
  toast: (message: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  linkRecords: (fromId: string, toId: string, type: RelationshipType, note?: string) => boolean;
  unlink: (relationshipId: string) => void;
  trashEntity: (entityType: string, id: string, label: string) => void;
  restoreTrash: (trashId: string) => void;
  purgeTrash: (trashId: string) => void;
  snapshots: Snapshot[];
  refreshSnapshots: () => Promise<void>;
  /**
   * Writes a backup point and returns whether it landed. `announce: false` is for
   * the safety net before a destructive action, whose caller reports the outcome
   * itself; a failure is always announced.
   */
  createBackup: (label?: string, announce?: boolean) => Promise<boolean>;
  restoreSnapshot: (snapshot: Snapshot) => Promise<void>;
  removeSnapshot: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  /** The open shared project, or null in the personal workspace. */
  shared: SharedWorkspace | null;
  /** Connection state of the open shared project. */
  collab: CollabState | null;
  /** True until a guest has received anything from the host. */
  awaitingFirstSync: boolean;
  myName: string;
  setMyName: (name: string) => void;
  /** Creates a shared project from a copy of this one (or an empty one) and opens it. */
  startSharedProject: (name: string, source: 'copy' | 'empty') => Promise<void>;
  /** Reloads into a shared project, or the personal one for null. */
  switchWorkspace: (room: string | null) => void;
  /** Forgets a shared project on this browser and deletes its local copy. */
  leaveSharedProject: (room: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function normalizeProject(input: Project): Project {
  const base = createSeedProject();
  const project: Project = { ...base, ...input };
  project.domains = Array.isArray(input.domains) ? input.domains : base.domains;
  project.sections = Array.isArray(input.sections) ? input.sections : [];
  project.methods = Array.isArray(input.methods) ? input.methods : [];
  project.documents = Array.isArray(input.documents) ? input.documents : [];
  project.sources = Array.isArray(input.sources) ? input.sources : [];
  project.notes = Array.isArray(input.notes) ? input.notes : [];
  project.quotations = Array.isArray(input.quotations) ? input.quotations : [];
  project.claims = Array.isArray(input.claims) ? input.claims : [];
  project.experiments = Array.isArray(input.experiments) ? input.experiments : [];
  project.inbox = Array.isArray(input.inbox) ? input.inbox : [];
  project.relationships = Array.isArray(input.relationships) ? input.relationships : [];
  project.trash = Array.isArray(input.trash) ? input.trash : [];
  project.settings = {
    ...base.settings,
    ...(input.settings ?? {}),
    dashboard: { ...base.settings.dashboard, ...(input.settings?.dashboard ?? {}) },
  };
  project.meta = { ...base.meta, ...(input.meta ?? {}) };
  return project;
}

/** A blank project: the five domains as scaffolding and one empty part. */
export function createEmptyProject(): Project {
  const seeded = createSeedProject();
  return {
    ...seeded,
    sections: [],
    methods: [],
    sources: [],
    notes: [],
    quotations: [],
    claims: [],
    experiments: [],
    inbox: [],
    relationships: [],
    trash: [],
    documents: [
      { ...seeded.documents[0], id: 'doc_part1', title: 'Part I — The Individual', content: '', comments: [] },
    ],
    domains: seeded.domains.map((d) => ({
      ...d,
      intro: '',
      purpose: '',
      outcomes: [],
      principles: [],
      connections: [],
      questions: [],
      illustrative: false,
    })),
    settings: {
      ...seeded.settings,
      dashboard: { ...seeded.settings.dashboard, pinnedSectionIds: [] },
    },
  };
}

/**
 * What a guest starts from before the host's project arrives: no records at
 * all, so nothing of theirs can leak into the shared project.
 */
function blankSharedBase(name: string): Project {
  const seeded = createSeedProject();
  const empty = Object.fromEntries(
    (['domains', 'sections', 'methods', 'documents', 'sources', 'notes', 'quotations', 'claims', 'experiments', 'inbox', 'relationships', 'trash'] as const).map((k) => [k, []]),
  );
  return {
    ...seeded,
    ...empty,
    settings: { ...seeded.settings, projectTitle: name, dashboard: { ...seeded.settings.dashboard, pinnedSectionIds: [] } },
  } as Project;
}

/** Per-person settings for a shared project, which the shared document never carries. */
function sharedSettingsKey(room: string): string {
  return `guidebook-future:shared-settings:${room}`;
}

function loadSharedSettings(room: string): Project['settings'] | null {
  try {
    const raw = localStorage.getItem(sharedSettingsKey(room));
    return raw ? (JSON.parse(raw) as Project['settings']) : null;
  } catch {
    return null;
  }
}

function saveSharedSettings(room: string, settings: Project['settings']): void {
  try {
    localStorage.setItem(sharedSettingsKey(room), JSON.stringify(settings));
  } catch {
    // Storage blocked: settings fall back to defaults next visit.
  }
}

function workspaceUrl(path = ''): string {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path}`;
}

/**
 * Opens `path` with a full page load, which is how the store switches
 * workspace. `location.assign` to the current page with only a different
 * `#fragment` would merely scroll, leaving the old workspace open.
 */
function reloadInto(path = ''): void {
  const target = new URL(workspaceUrl(path), window.location.href);
  if (target.pathname === window.location.pathname && target.search === window.location.search) {
    window.history.replaceState(null, '', target);
    window.location.reload();
  } else {
    window.location.assign(target);
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(() => createSeedProject());
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const dirtyRef = useRef(false);
  const skipSaveRef = useRef(true);
  const saveTimer = useRef<number | null>(null);
  // Fixed for the life of the page: switching workspace reloads.
  const [shared] = useState<SharedWorkspace | null>(() => activeSharedWorkspace());
  const [collab, setCollab] = useState<CollabState | null>(null);
  const [awaitingFirstSync, setAwaitingFirstSync] = useState(false);
  const [myName, setMyNameState] = useState(() => displayName());
  const sessionRef = useRef<CollabSession | null>(null);
  const runtimeRef = useRef<CollabRuntime | null>(null);
  /** The project as last written to (or read from) the shared document. */
  const syncedRef = useRef<Project | null>(null);
  /** Set when the next project change came from a collaborator, not this screen. */
  const fromRemoteRef = useRef(false);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshSnapshots = useCallback(async () => {
    setSnapshots(await listSnapshots());
  }, []);

  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    let unsubscribe = () => {};
    (async () => {
      const runtime = await import('./lib/collab/runtime');
      const session = new runtime.CollabSession(shared, () => displayName() || 'A collaborator');
      await session.load();
      if (cancelled) return;
      runtimeRef.current = runtime;
      sessionRef.current = session;
      const base = blankSharedBase(shared.name);
      base.settings = { ...base.settings, ...(loadSharedSettings(shared.room) ?? {}) };
      const initial = runtime.readProject(session.doc, base);
      syncedRef.current = initial;
      setProject(initial);
      setAwaitingFirstSync(runtime.isEmptyDoc(session.doc));
      setReady(true);
      setSaveState('saved');
      session.doc.on('update', (_update: Uint8Array, origin: unknown) => {
        if (origin !== 'remote') return;
        setAwaitingFirstSync(false);
        setProject((prev) => {
          // A local edit may be rendered but not yet written (its effect runs
          // after the render). Write it first, or reading would drop it.
          if (prev !== syncedRef.current) {
            runtime.writeProject(session.doc, syncedRef.current, prev, 'local');
            syncedRef.current = prev;
          }
          const next = runtime.readProject(session.doc, prev);
          if (next === prev) return prev;
          syncedRef.current = next;
          fromRemoteRef.current = true;
          return next;
        });
      });
      unsubscribe = session.subscribe(setCollab);
      session.connect();
      void refreshSnapshots();
    })();
    return () => {
      cancelled = true;
      unsubscribe();
      void sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, [shared, refreshSnapshots]);

  useEffect(() => {
    if (shared) return;
    let cancelled = false;
    (async () => {
      const stored = await loadProject();
      if (cancelled) return;
      if (stored) {
        setProject(normalizeProject(stored));
        setReady(true);
        setSaveState('saved');
        setLastSavedAt(stored.meta?.lastSavedAt ?? null);
      } else {
        const seeded = createSeedProject();
        setProject(seeded);
        setReady(true);
        skipSaveRef.current = false;
      }
      void refreshSnapshots();
    })();
    return () => {
      cancelled = true;
    };
  }, [shared, refreshSnapshots]);

  useEffect(() => {
    if (!ready || !shared) return;
    const session = sessionRef.current;
    const runtime = runtimeRef.current;
    if (!session || !runtime) return;
    saveSharedSettings(shared.room, project.settings);
    if (fromRemoteRef.current) {
      fromRemoteRef.current = false;
      return;
    }
    // Local edits go to collaborators at once: editors already wait for a
    // pause in typing, and the session batches the write to disk itself.
    runtime.writeProject(session.doc, syncedRef.current, project, 'local');
    syncedRef.current = project;
    const savedAt = now();
    setLastSavedAt(savedAt);
    setSaveState('saved');
  }, [project, ready, shared]);

  useEffect(() => {
    if (!ready || shared) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const savedAt = await saveProject(project);
        dirtyRef.current = false;
        setLastSavedAt(savedAt);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 650);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [project, ready, shared]);

  useEffect(() => {
    const flush = () => {
      if (shared) {
        void sessionRef.current?.persist();
        return;
      }
      if (dirtyRef.current) {
        void saveProject(project);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [project, shared]);

  const update = useCallback((mutator: (draft: Project) => void) => {
    setProject((prev) => {
      const draft: Project = structuredClone(prev);
      mutator(draft);
      draft.meta.revision = (prev.meta.revision ?? 0) + 1;
      return draft;
    });
  }, []);

  const replaceProject = useCallback(async (next: Project) => {
    if (shared) {
      // Replacing a shared project would replace it for every collaborator.
      // Settings hides these actions in a shared project; this is the backstop.
      throw new Error('Replacing the project is not available in a shared project.');
    }
    const normalized = normalizeProject(next);
    setProject(normalized);
    setReady(true);
    try {
      const savedAt = await saveProject(normalized);
      setSaveState('saved');
      setLastSavedAt(savedAt);
    } catch {
      setSaveState('error');
    }
  }, [shared]);

  const resetToSample = useCallback(async () => {
    const seeded = createSeedProject();
    await replaceProject(seeded);
    toast('Project reset to the illustrative sample content.', 'success');
  }, [replaceProject, toast]);

  const resetToEmpty = useCallback(async () => {
    await replaceProject(createEmptyProject());
    toast('Started an empty project. The five domains remain as scaffolding.', 'success');
  }, [replaceProject, toast]);

  const linkRecords = useCallback(
    (fromId: string, toId: string, type: RelationshipType, note = '') => {
      if (!fromId || !toId) {
        toast('Choose both records before linking.', 'error');
        return false;
      }
      if (fromId === toId) {
        toast('A record cannot be linked to itself.', 'error');
        return false;
      }
      let created = false;
      let duplicate = false;
      update((draft) => {
        const exists = draft.relationships.some(
          (r) => r.fromId === fromId && r.toId === toId && r.type === type,
        );
        if (exists) {
          duplicate = true;
          return;
        }
        draft.relationships.push({
          id: uid('rel'),
          fromId,
          toId,
          type,
          note,
          createdAt: now(),
        });
        created = true;
      });
      if (duplicate) {
        toast('That relationship already exists.');
        return false;
      }
      if (created) toast('Relationship created.', 'success');
      return created;
    },
    [toast, update],
  );

  const unlink = useCallback(
    (relationshipId: string) => {
      update((draft) => {
        draft.relationships = draft.relationships.filter((r) => r.id !== relationshipId);
      });
      toast('Relationship removed.');
    },
    [toast, update],
  );

  const trashEntity = useCallback(
    (entityType: string, id: string, label: string) => {
      let moved = false;
      update((draft) => {
        moved = trashRecord(draft, entityType, id, label) !== null;
      });
      toast(
        moved
          ? `“${label}” moved to Recently deleted in Settings. You can restore it there.`
          : `“${label}” could not be deleted because it is no longer in the project.`,
        moved ? undefined : 'error',
      );
    },
    [toast, update],
  );

  const restoreTrash = useCallback(
    (trashId: string) => {
      let restored = false;
      update((draft) => {
        restored = restoreRecord(draft, trashId);
      });
      toast(
        restored
          ? 'Record restored, with the connections and assignments it had before it was deleted.'
          : 'That record could not be restored.',
        restored ? 'success' : 'error',
      );
    },
    [toast, update],
  );

  const purgeTrash = useCallback(
    (trashId: string) => {
      update((draft) => {
        draft.trash = draft.trash.filter((t) => t.id !== trashId);
      });
    },
    [update],
  );

  const createBackup = useCallback(
    async (label = 'Manual backup point', announce = true) => {
      try {
        await createSnapshot(project, label);
      } catch {
        // The snapshot is the safety net for what comes next, so a refused
        // write must stop the caller rather than be reported as a backup.
        toast(
          'Could not create a backup point in this browser — storage may be full, blocked or unavailable. No changes were made.',
          'error',
        );
        return false;
      }
      await refreshSnapshots();
      if (announce) toast('Backup point created in this browser.', 'success');
      return true;
    },
    [project, refreshSnapshots, toast],
  );

  const restoreSnapshot = useCallback(
    async (snapshot: Snapshot) => {
      // Restoring overwrites the current project, so it may only proceed once
      // the current state is safely stored.
      if (!(await createBackup(`Before restoring: ${snapshot.label}`, false))) return;
      await replaceProject(snapshot.project);
      await refreshSnapshots();
      toast(`Restored “${snapshot.label}”. The previous state was saved first.`, 'success');
    },
    [createBackup, replaceProject, refreshSnapshots, toast],
  );

  const removeSnapshot = useCallback(
    async (id: string) => {
      await deleteSnapshot(id);
      await refreshSnapshots();
    },
    [refreshSnapshots],
  );

  const clearAllData = useCallback(async () => {
    await clearProject();
    const seeded = createSeedProject();
    await replaceProject(seeded);
    await refreshSnapshots();
    toast('Local data cleared and the sample project restored.', 'success');
  }, [refreshSnapshots, replaceProject, toast]);

  const setMyName = useCallback((name: string) => {
    setDisplayName(name);
    setMyNameState(displayName());
    sessionRef.current?.announce();
  }, []);

  const switchWorkspace = useCallback((room: string | null) => {
    void sessionRef.current?.persist();
    setActiveWorkspace(room);
    reloadInto();
  }, []);

  const startSharedProject = useCallback(
    async (name: string, source: 'copy' | 'empty') => {
      const workspace = newSharedWorkspace(name);
      const runtime = await import('./lib/collab/runtime');
      const seed = source === 'copy' ? structuredClone(project) : createEmptyProject();
      try {
        await runtime.seedSharedProject(workspace.room, seed);
      } catch {
        toast('Could not create the shared project: this browser refused to store it.', 'error');
        return;
      }
      saveSharedSettings(workspace.room, { ...seed.settings, projectTitle: workspace.name });
      rememberWorkspace(workspace);
      setActiveWorkspace(workspace.room);
      reloadInto('settings#collaborate');
    },
    [project, toast],
  );

  const leaveSharedProject = useCallback(async (room: string) => {
    if (sessionRef.current?.workspace.room === room) await sessionRef.current.destroy();
    await deleteRoomState(room);
    try {
      localStorage.removeItem(sharedSettingsKey(room));
    } catch {
      // Nothing to remove.
    }
    forgetWorkspace(room);
    reloadInto();
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      project,
      ready,
      saveState,
      lastSavedAt,
      update,
      replaceProject,
      resetToSample,
      resetToEmpty,
      toast,
      toasts,
      dismissToast,
      linkRecords,
      unlink,
      trashEntity,
      restoreTrash,
      purgeTrash,
      snapshots,
      refreshSnapshots,
      createBackup,
      restoreSnapshot,
      removeSnapshot,
      clearAllData,
      shared,
      collab,
      awaitingFirstSync,
      myName,
      setMyName,
      startSharedProject,
      switchWorkspace,
      leaveSharedProject,
    }),
    [
      project,
      ready,
      saveState,
      lastSavedAt,
      update,
      replaceProject,
      resetToSample,
      resetToEmpty,
      toast,
      toasts,
      dismissToast,
      linkRecords,
      unlink,
      trashEntity,
      restoreTrash,
      purgeTrash,
      snapshots,
      refreshSnapshots,
      createBackup,
      restoreSnapshot,
      removeSnapshot,
      clearAllData,
      shared,
      collab,
      awaitingFirstSync,
      myName,
      setMyName,
      startSharedProject,
      switchWorkspace,
      leaveSharedProject,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}

export type { TrashItem };
