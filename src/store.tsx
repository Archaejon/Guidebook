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
  }, [refreshSnapshots]);

  useEffect(() => {
    if (!ready) return;
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
  }, [project, ready]);

  useEffect(() => {
    const flush = () => {
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
  }, [project]);

  const update = useCallback((mutator: (draft: Project) => void) => {
    setProject((prev) => {
      const draft: Project = structuredClone(prev);
      mutator(draft);
      draft.meta.revision = (prev.meta.revision ?? 0) + 1;
      return draft;
    });
  }, []);

  const replaceProject = useCallback(async (next: Project) => {
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
  }, []);

  const resetToSample = useCallback(async () => {
    const seeded = createSeedProject();
    await replaceProject(seeded);
    toast('Project reset to the illustrative sample content.', 'success');
  }, [replaceProject, toast]);

  const resetToEmpty = useCallback(async () => {
    const seeded = createSeedProject();
    const empty: Project = {
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
    await replaceProject(empty);
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
