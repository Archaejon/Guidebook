import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Icon } from './Icon';
import { ConfirmDialog } from './ui';
import { inviteLink, listSharedWorkspaces } from '../lib/collab/invite';
import { formatDate } from '../lib/utils';

/**
 * Settings → Collaborate. In the personal workspace: start a shared project and
 * switch to one. In a shared project: the invite link, who is here, and the
 * way back.
 */
export function CollaborateSection() {
  const { project, shared, collab, myName, setMyName, startSharedProject, switchWorkspace, leaveSharedProject, toast } = useStore();
  const [name, setName] = useState(myName);
  const [title, setTitle] = useState(project.settings.projectTitle || 'Shared guidebook');
  const [source, setSource] = useState<'copy' | 'empty'>('copy');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const workspaces = listSharedWorkspaces();

  useEffect(() => {
    if (window.location.hash === '#collaborate') sectionRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  const saveName = () => {
    if (name.trim() !== myName) setMyName(name);
  };

  const copyInvite = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Invite link copied. Send it only to people who should be able to edit.', 'success');
    } catch {
      toast('Could not copy automatically. Select the link and copy it by hand.', 'error');
    }
  };

  const nameField = (
    <label className="field">
      <span>Your name, as collaborators see it</span>
      <input value={name} placeholder="e.g. George" maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
    </label>
  );

  const otherWorkspaces = workspaces.filter((w) => w.room !== shared?.room);

  return (
    <section className="panel settings-section" id="collaborate" ref={sectionRef}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">Collaborate</p>
          <h2>{shared ? `Shared project: ${shared.name}` : 'Write together'}</h2>
        </div>
      </div>

      {shared ? (
        <>
          <p className="muted small">
            Everyone with the invite link can read and edit this project. Changes travel directly between your browsers,
            encrypted, and each of you keeps a full copy. You both need the app open at the same time for changes to
            pass between you; anything written while apart syncs the next time you are both here.
          </p>
          <div className="field">
            <span>Invite link</span>
            <div className="invite-box">
              <input readOnly value={inviteLink(shared)} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
              <button className="button primary" onClick={() => void copyInvite(inviteLink(shared))}>
                <Icon name="link" size={14} /> Copy invite link
              </button>
            </div>
          </div>
          <div className="field">
            <span>Here now</span>
            {collab?.peers.length ? (
              <ul className="collab-peers">
                {collab.peers.map((peer) => (
                  <li key={peer.id}>{peer.name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted small">
                {collab?.status === 'offline'
                  ? 'You are offline. Your changes are kept and will sync when you reconnect.'
                  : 'Nobody else is connected right now.'}
              </p>
            )}
          </div>
          {nameField}
          <div className="settings-inline">
            <button className="button ghost" onClick={() => switchWorkspace(null)}>
              <Icon name="arrow-left" size={14} /> Back to my own project
            </button>
            <button className="text-button small danger-text" onClick={() => setLeaving(shared.room)}>
              Leave this shared project
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">
            Start a shared project and send the invite link to someone. You will both edit the same project live:
            methods, manuscript, research and connections. It is a separate project from this one, which stays private
            in this browser.
          </p>
          <div className="form-grid two">
            <label className="field">
              <span>Shared project name</span>
              <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </label>
            {nameField}
          </div>
          <div className="kind-options" role="radiogroup" aria-label="Start from">
            <button type="button" role="radio" aria-checked={source === 'copy'} className={`kind-option ${source === 'copy' ? 'active' : ''}`} onClick={() => setSource('copy')}>
              Start from a copy of this project
            </button>
            <button type="button" role="radio" aria-checked={source === 'empty'} className={`kind-option ${source === 'empty' ? 'active' : ''}`} onClick={() => setSource('empty')}>
              Start empty
            </button>
          </div>
          <p className="form-note">
            Connecting uses public relays only to introduce your browsers; they see an encrypted handshake, never the
            project. Your browsers' network addresses are visible to each other, as on any video call.
          </p>
          <button
            className="button primary"
            disabled={busy || !title.trim()}
            onClick={() => {
              saveName();
              setBusy(true);
              void startSharedProject(title, source).finally(() => setBusy(false));
            }}
          >
            <Icon name="plus" size={14} /> {busy ? 'Creating…' : 'Create shared project'}
          </button>
        </>
      )}

      {otherWorkspaces.length || shared ? (
        <div className="field">
          <span>{shared ? 'Your projects' : 'Shared projects in this browser'}</span>
          <div className="workspace-list">
            {shared ? (
              <div className="workspace-row">
                <div><strong>My own project</strong><small>Private to this browser</small></div>
                <button className="button ghost small" onClick={() => switchWorkspace(null)}>Open</button>
              </div>
            ) : null}
            {otherWorkspaces.map((w) => (
              <div key={w.room} className="workspace-row">
                <div>
                  <strong>{w.name}</strong>
                  <small>{w.host ? 'You started it' : 'You were invited'} · {formatDate(w.joinedAt)}</small>
                </div>
                <div className="settings-inline">
                  <button className="button ghost small" onClick={() => switchWorkspace(w.room)}>Open</button>
                  <button className="text-button small danger-text" onClick={() => setLeaving(w.room)}>Leave</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        onConfirm={() => {
          if (leaving) void leaveSharedProject(leaving);
        }}
        title="Leave this shared project?"
        body="This removes the shared project and its copy from this browser. Collaborators keep their copies and can carry on. You can only rejoin with the invite link, so keep it if you may want to come back; export a JSON backup first if you want your own copy."
        confirmLabel="Leave and remove"
      />
    </section>
  );
}
