import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore, normalizeProject } from '../store';
import type { Project, Snapshot } from '../types';
import { Icon } from '../components/Icon';
import { ConfirmDialog, PageHeader } from '../components/ui';
import {
  downloadBibliography,
  downloadJsonBackup,
  downloadManuscriptMarkdown,
  downloadManuscriptText,
  downloadMethodLibrary,
  downloadReaderHtml,
} from '../lib/exports';
import { manuscriptWords, projectStats } from '../lib/selectors';
import { formatDateTime } from '../lib/utils';

type ConfirmKind = 'restore' | 'sample' | 'empty' | 'clear' | null;

export function SettingsPage() {
  const {
    project,
    update,
    replaceProject,
    resetToSample,
    resetToEmpty,
    clearAllData,
    snapshots,
    createBackup,
    restoreSnapshot,
    removeSnapshot,
    restoreTrash,
    purgeTrash,
    saveState,
    lastSavedAt,
    toast,
  } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);

  const stats = projectStats(project);
  const trashItems = project.trash;

  const importFile = async (file: File) => {
    try {
      await createBackup('Before importing a backup');
      const text = await file.text();
      const parsed = JSON.parse(text) as { project?: Project; format?: string } | Project;
      const candidate = 'project' in parsed && parsed.project ? parsed.project : (parsed as Project);
      if (!candidate || !Array.isArray(candidate.domains) || !Array.isArray(candidate.methods)) {
        toast('This file does not look like a Guidebook backup.', 'error');
        return;
      }
      await replaceProject(normalizeProject(candidate));
      toast('Project imported. A backup of the previous state was saved first.', 'success');
    } catch {
      toast('Could not read that file. Check that it is a JSON backup from this app.', 'error');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Workspace"
        title="Settings &amp; export"
        subtitle="Preferences, local backups, import and export, deleted items and privacy. Everything here is stored in this browser unless you export it."
      />

      <div className="settings-layout">
        <div className="settings-main">
          <section className="panel settings-section">
            <div className="panel-head">
              <div><p className="eyebrow">Identity</p><h2>Project details</h2></div>
              <span className={`editor-save ${saveState === 'saving' ? 'dirty' : ''}`}><span className="save-dot" /> {saveState === 'saving' ? 'Saving…' : 'Saved'}</span>
            </div>
            <div className="form-grid two">
              <label className="field">
                <span>Project title</span>
                <input
                  value={project.settings.projectTitle}
                  onChange={(e) => update((draft) => { draft.settings.projectTitle = e.target.value; })}
                />
              </label>
              <label className="field">
                <span>Author name</span>
                <input
                  value={project.settings.authorName}
                  onChange={(e) => update((draft) => { draft.settings.authorName = e.target.value; })}
                />
              </label>
            </div>
            <label className="field">
              <span>Reader edition title</span>
              <input
                value={project.settings.readerTitle}
                onChange={(e) => update((draft) => { draft.settings.readerTitle = e.target.value; })}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={project.settings.showIllustrativeBadges}
                onChange={(e) => update((draft) => { draft.settings.showIllustrativeBadges = e.target.checked; })}
              />
              <span>
                <strong>Show “Sample” badges</strong>
                <small>Marks the illustrative seed material. Editing a record removes its sample flag.</small>
              </span>
            </label>
            <div className="settings-inline">
              <Link to="/" className="text-button small">Customise dashboard widgets <Icon name="arrow-right" size={13} /></Link>
              <span className="muted small">Last saved {lastSavedAt ? formatDateTime(lastSavedAt) : 'not yet'}</span>
            </div>
          </section>

          <section className="panel settings-section">
            <div className="panel-head">
              <div><p className="eyebrow">Portability</p><h2>Export the project</h2></div>
            </div>
            <p className="muted small">Exports are generated from the saved project in this browser. Review them before sharing; drafts are private by default.</p>
            <div className="export-grid">
              <button className="export-card" onClick={() => downloadJsonBackup(project)}>
                <Icon name="download" size={18} />
                <strong>Full JSON backup</strong>
                <span>Everything, including drafts, links, notes and settings. Use this to move or restore the project.</span>
              </button>
              <button className="export-card" onClick={() => downloadManuscriptMarkdown(project)}>
                <Icon name="pen" size={18} />
                <strong>Manuscript — Markdown</strong>
                <span>All documents in order, with headings, links, lists and method references.</span>
              </button>
              <button className="export-card" onClick={() => downloadManuscriptText(project)}>
                <Icon name="file" size={18} />
                <strong>Manuscript — plain text</strong>
                <span>A clean reading copy for editing elsewhere.</span>
              </button>
              <button className="export-card" onClick={() => downloadMethodLibrary(project)}>
                <Icon name="book" size={18} />
                <strong>Method library</strong>
                <span>Every method with its full template and connections.</span>
              </button>
              <button className="export-card" onClick={() => downloadBibliography(project)}>
                <Icon name="library" size={18} />
                <strong>Sources &amp; references</strong>
                <span>Bibliography, quotations, and claims still marked for verification.</span>
              </button>
              <button className="export-card" onClick={() => downloadReaderHtml(project)}>
                <Icon name="eye" size={18} />
                <strong>Reader edition HTML</strong>
                <span>Only records marked Published. A portable, print-friendly reading copy.</span>
              </button>
            </div>
            <div className="export-stats">
              <span>{stats.methods} methods</span>
              <span>{stats.words.toLocaleString()} manuscript words</span>
              <span>{stats.sources} sources</span>
              <span>{project.documents.length} documents</span>
            </div>
          </section>

          <section className="panel settings-section">
            <div className="panel-head">
              <div><p className="eyebrow">Restore</p><h2>Import a backup</h2></div>
            </div>
            <p className="muted small">
              Importing replaces the current project with a JSON backup. A restore point of the current state is created automatically before the import.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden-input"
              id="backup-import"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <button className="button ghost" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={15} /> Choose a backup file
            </button>
          </section>

          <section className="panel settings-section">
            <div className="panel-head">
              <div><p className="eyebrow">History</p><h2>Backup points</h2></div>
              <button className="button ghost small" onClick={() => void createBackup()}>
                <Icon name="plus" size={13} /> Create backup point
              </button>
            </div>
            <p className="muted small">Backup points are stored locally in this browser. They are not cloud backups.</p>
            {snapshots.length ? (
              <div className="snapshot-list">
                {snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="snapshot-row">
                    <div>
                      <strong>{snapshot.label}</strong>
                      <span>{formatDateTime(snapshot.createdAt)} · {manuscriptWords(snapshot.project).toLocaleString()} manuscript words</span>
                    </div>
                    <div className="snapshot-actions">
                      <button className="button ghost small" onClick={() => setRestoreTarget(snapshot)}>Restore</button>
                      <button className="icon-button subtle" onClick={() => void removeSnapshot(snapshot.id)} aria-label="Delete backup point"><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No backup points yet. Create one before major restructuring.</p>
            )}
          </section>

          <section className="panel settings-section">
            <div className="panel-head">
              <div><p className="eyebrow">Recovery</p><h2>Deleted items</h2></div>
              <span className="muted small">{trashItems.length} item{trashItems.length === 1 ? '' : 's'}</span>
            </div>
            {trashItems.length ? (
              <div className="trash-list">
                {trashItems.map((item) => (
                  <div key={item.id} className="trash-row">
                    <span className="trash-type">{item.entityType}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>Deleted {formatDateTime(item.deletedAt)}</span>
                    </div>
                    <div className="trash-actions">
                      <button className="text-button tiny" onClick={() => restoreTrash(item.id)}>Restore</button>
                      <button className="text-button tiny danger-text" onClick={() => purgeTrash(item.id)}>Delete forever</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No deleted records. Deleting a method, source, note, experiment or manuscript document moves it here first.</p>
            )}
          </section>

          <section className="panel settings-section danger-zone">
            <div className="panel-head">
              <div><p className="eyebrow">Reset</p><h2>Project data</h2></div>
            </div>
            <p className="muted small">
              These actions affect only this browser. Export a JSON backup first if the project matters. A backup point is created automatically before each reset.
            </p>
            <div className="danger-actions">
              <button className="button ghost" onClick={() => setConfirmKind('sample')}>Restore illustrative sample</button>
              <button className="button ghost" onClick={() => setConfirmKind('empty')}>Start an empty project</button>
              <button className="button danger" onClick={() => setConfirmKind('clear')}>Erase local data</button>
            </div>
          </section>
        </div>

        <aside className="settings-side">
          <section className="panel privacy-panel">
            <p className="eyebrow">Privacy</p>
            <h2>Private by default</h2>
            <p>
              This app is a local authoring environment. Data is saved in this browser’s IndexedDB with a localStorage fallback; it is not sent to a
              server and is not synchronised between devices.
            </p>
            <ul>
              <li>Drafts never leave this browser unless you export them.</li>
              <li>The reader view and reader export include only records marked Published.</li>
              <li>Clearing browser data can erase the project; keep JSON backups.</li>
              <li>There is no account, cloud sync or public URL for this browser’s workspace.</li>
            </ul>
            <Link to="/preview" className="text-button small">Open this workspace’s reader view <Icon name="arrow-right" size={13} /></Link>
            <Link to="/read" className="text-button small">Read the published edition <Icon name="arrow-right" size={13} /></Link>
          </section>
          <section className="panel">
            <p className="eyebrow">Data at a glance</p>
            <dl className="meta-list compact">
              <div><dt>Methods</dt><dd>{stats.methods}</dd></div>
              <div><dt>Sections</dt><dd>{stats.sections}</dd></div>
              <div><dt>Documents</dt><dd>{stats.documents}</dd></div>
              <div><dt>Sources</dt><dd>{stats.sources}</dd></div>
              <div><dt>Relationships</dt><dd>{project.relationships.length}</dd></div>
              <div><dt>Inbox</dt><dd>{project.inbox.length}</dd></div>
            </dl>
            <p className="muted small">Project revision {project.meta.revision}. IDB + fallback storage.</p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => {
          const run = async () => {
            await createBackup('Before reset');
            if (confirmKind === 'sample') await resetToSample();
            if (confirmKind === 'empty') await resetToEmpty();
            if (confirmKind === 'clear') await clearAllData();
          };
          void run();
        }}
        title={
          confirmKind === 'sample' ? 'Restore the illustrative sample?' : confirmKind === 'empty' ? 'Start an empty project?' : 'Erase local data?'
        }
        body={
          confirmKind === 'sample'
            ? 'This replaces the current project with the original sample material. A backup point is created first, so it can be recovered from this page.'
            : confirmKind === 'empty'
              ? 'This clears methods, sources, notes, experiments, relationships and manuscript content, leaving the five domains as empty scaffolding. A backup point is created first.'
              : 'This clears the local database and restores the sample project. Export a JSON backup if you need a copy outside this browser. A backup point is created first.'
        }
        confirmLabel={confirmKind === 'clear' ? 'Erase and reset' : 'Continue'}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (restoreTarget) void restoreSnapshot(restoreTarget);
        }}
        title="Restore this backup point?"
        body={`“${restoreTarget?.label ?? ''}” will replace the current project. The current state is saved as a new backup point first.`}
        confirmLabel="Restore"
      />
    </div>
  );
}

