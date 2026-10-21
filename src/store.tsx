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
  createBackup: (label?: string) => Promise<void>;
  restoreSnapshot: (snapshot: Snapshot) => Promise<void>;
  removeSnapshot: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const COLLECTIONS: { key: keyof Project; entityType: string }[] = [
  { key: 'sections', entityType: 'section' },
  { key: 'methods', entityType: 'method' },
  { key: 'documents', entityType: 'document' },
  { key: 'sources', entityType: 'source' },
  { key: 'notes', entityType: 'note' },
  { key: 'quotations', entityType: 'quotation' },
  { key: 'claims', entityType: 'claim' },
  { key: 'experiments', entityType: 'experiment' },
  { key: 'domains', entityType: 'domain' },
  { key: 'inbox', entityType: 'inbox' },
];

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
        const savedAt = now();
        await saveProject({ ...project, meta: { ...project.meta, lastSavedAt: savedAt } });
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
        void saveProject({ ...project, meta: { ...project.meta, lastSavedAt: now() } });
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
    setProject(normalizeProject(next));
    setReady(true);
    try {
      await saveProject(normalizeProject(next));
      setSaveState('saved');
      setLastSavedAt(now());
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
      update((draft) => {
        const collection = COLLECTIONS.find((c) => c.entityType === entityType);
        if (collection) {
          const arr = draft[collection.key] as { id: string }[];
          const idx = arr.findIndex((item) => item.id === id);
          if (idx >= 0) {
            const data = arr[idx];
            draft.trash.unshift({
              id: uid('trash'),
              entityType,
              label,
              deletedAt: now(),
              data,
            });
            arr.splice(idx, 1);
          }
        }
        draft.relationships = draft.relationships.filter((r) => r.fromId !== id && r.toId !== id);
        if (entityType === 'document') {
          // Remove descendant documents too, storing each so the whole branch can be restored.
          const descendants: string[] = [];
          const collect = (parentId: string) => {
            for (const doc of draft.documents.filter((d) => d.parentId === parentId)) {
              descendants.push(doc.id);
              collect(doc.id);
            }
          };
          collect(id);
          for (const childId of descendants) {
            const idx = draft.documents.findIndex((d) => d.id === childId);
            if (idx >= 0) {
              draft.trash.unshift({
                id: uid('trash'),
                entityType: 'document',
                label: draft.documents[idx].title,
                deletedAt: now(),
                data: draft.documents[idx],
              });
              draft.documents.splice(idx, 1);
            }
          }
          draft.relationships = draft.relationships.filter((r) => !descendants.includes(r.fromId) && !descendants.includes(r.toId));
        }
        if (entityType === 'section') {
          for (const m of draft.methods) {
            if (m.primarySectionId === id) m.primarySectionId = '';
            m.relatedSectionIds = m.relatedSectionIds.filter((sid) => sid !== id);
          }
          for (const s of draft.sections) {
            s.relatedSectionIds = s.relatedSectionIds.filter((sid) => sid !== id);
          }
        }
        if (entityType === 'domain') {
          // Domains are structural; deleting one unassigns its sections rather than orphaning records.
          for (const s of draft.sections) if (s.domainId === id) s.domainId = '';
          for (const m of draft.methods) {
            if (m.primaryDomainId === id) m.primaryDomainId = '';
            m.secondaryDomainIds = m.secondaryDomainIds.filter((d) => d !== id);
          }
        }
        if (entityType === 'source') {
          for (const note of draft.notes) if (note.sourceId === id) note.sourceId = '';
          for (const quote of draft.quotations) if (quote.sourceId === id) quote.sourceId = '';
          for (const claim of draft.claims) claim.sourceIds = claim.sourceIds.filter((s) => s !== id);
        }
      });
      toast(`“${label}” moved to Recently deleted in Settings. You can restore it there.`);
    },
    [toast, update],
  );

  const restoreTrash = useCallback(
    (trashId: string) => {
      update((draft) => {
        const idx = draft.trash.findIndex((t) => t.id === trashId);
        if (idx < 0) return;
        const item = draft.trash[idx];
        const collection = COLLECTIONS.find((c) => c.entityType === item.entityType);
        if (collection) {
          const arr = draft[collection.key] as unknown as { id: string }[];
          if (!arr.some((r) => r.id === (item.data as { id: string }).id)) {
            arr.push(item.data as { id: string });
          }
          draft.trash.splice(idx, 1);
        }
      });
      toast('Record restored.', 'success');
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
    async (label = 'Manual backup point') => {
      await createSnapshot(project, label);
      await refreshSnapshots();
      toast('Backup point created in this browser.', 'success');
    },
    [project, refreshSnapshots, toast],
  );

  const restoreSnapshot = useCallback(
    async (snapshot: Snapshot) => {
      await createSnapshot(project, `Before restoring: ${snapshot.label}`);
      await replaceProject(snapshot.project);
      await refreshSnapshots();
      toast(`Restored “${snapshot.label}”. The previous state was saved first.`, 'success');
    },
    [project, replaceProject, refreshSnapshots, toast],
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
