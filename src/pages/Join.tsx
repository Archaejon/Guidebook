import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  displayName,
  listSharedWorkspaces,
  parseInvite,
  rememberWorkspace,
  setActiveWorkspace,
  setDisplayName,
} from '../lib/collab/invite';

/**
 * Where an invite link lands: `/join#r=…&k=…&n=…`. Reads the fragment, asks
 * for a display name, records the shared project in this browser and opens it.
 * `location.replace` drops this page from history, so the secret link is not
 * left behind in Back or in the history list.
 */
export function JoinPage() {
  const [invite] = useState(() => parseInvite(window.location.hash));
  const [name, setName] = useState(() => displayName());
  const known = invite ? listSharedWorkspaces().find((w) => w.room === invite.room) : undefined;

  if (!invite) {
    return (
      <div className="join-page">
        <p className="eyebrow">Shared project</p>
        <h1>This invite link is incomplete</h1>
        <p className="muted">
          The part of the link after <code>#</code> carries the project’s key, and it is missing or damaged here.
          Ask for the link again and open it exactly as sent.
        </p>
        <Link className="button ghost" to="/">Open my own project</Link>
      </div>
    );
  }

  const join = () => {
    setDisplayName(name);
    if (!known) rememberWorkspace({ ...invite, joinedAt: new Date().toISOString(), host: false });
    setActiveWorkspace(invite.room);
    window.location.replace(import.meta.env.BASE_URL);
  };

  return (
    <div className="join-page">
      <p className="eyebrow">You have been invited</p>
      <h1>{invite.name}</h1>
      <p>
        This is a shared project in <strong>Guidebook for the Future</strong>. Once you join, you and the person who invited
        you edit it together, live. It opens as its own project, separate from anything already in this browser.
      </p>
      <label className="field">
        <span>Your name, as they will see it</span>
        <input value={name} maxLength={40} placeholder="e.g. Sam" autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <p className="form-note">
        Your browsers connect directly and encrypt everything they exchange. Public relays only introduce you to each
        other and never see the project. Anyone holding this link can join, so do not forward it.
      </p>
      <div className="settings-inline">
        <button className="button primary" onClick={join}>
          <Icon name="arrow-right" size={14} /> {known ? 'Open the shared project' : 'Join the shared project'}
        </button>
        <Link className="text-button small" to="/">Not now</Link>
      </div>
    </div>
  );
}
