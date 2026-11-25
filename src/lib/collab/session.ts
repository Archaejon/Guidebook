import * as Y from 'yjs';
import { joinRoom, type Room } from 'trystero/nostr';
import { loadRoomState, saveRoomState } from '../storage';
import type { SharedWorkspace } from './invite';

/**
 * One open shared workspace: its Yjs document, its local copy on disk, and the
 * peer-to-peer room that keeps it in step with collaborators.
 *
 * Peers find each other through public Nostr relays (Trystero's default
 * strategy). The relays only ever see an encrypted handshake under a topic
 * derived from the room id; the project itself travels peer to peer over WebRTC
 * and never passes through them. Public STUN servers tell each browser its own
 * address, which is how two people behind home routers connect. A network that
 * blocks peer-to-peer traffic outright (some offices, some mobile carriers)
 * would need a TURN relay, which this app does not configure.
 *
 * Sync is the standard Yjs exchange. Each side sends its state vector ("what I
 * have") and answers with exactly what the other is missing, on connect and
 * then every 20 seconds as a safety net. Live edits are broadcast as they
 * happen. Applying an update twice is harmless, so lost or repeated messages
 * cannot corrupt the document.
 */
export type CollabStatus = 'connecting' | 'connected' | 'offline';

export interface CollabPeer {
  id: string;
  name: string;
}

export interface CollabState {
  status: CollabStatus;
  peers: CollabPeer[];
  persistFailed: boolean;
}

const APP_ID = 'guidebook-for-the-future/collab-v1';
const RESYNC_MS = 20_000;
const PERSIST_MS = 400;

function bytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Unexpected sync payload');
}

export class CollabSession {
  readonly doc = new Y.Doc();
  private room: Room | null = null;
  private peers = new Map<string, string>();
  private status: CollabStatus = 'connecting';
  private listeners = new Set<(state: CollabState) => void>();
  private resyncTimer: number | null = null;
  private persistTimer: number | null = null;
  private onlineHandler = () => this.reconnect();
  private offlineHandler = () => this.setStatus('offline');

  constructor(
    readonly workspace: SharedWorkspace,
    private readonly name: () => string,
  ) {}

  /** Loads this browser's copy of the shared document, if it has one. */
  async load(): Promise<void> {
    const stored = await loadRoomState(this.workspace.room);
    if (stored) Y.applyUpdate(this.doc, stored, 'storage');
    this.doc.on('update', this.onDocUpdate);
  }

  connect(): void {
    if (this.room) return;
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }
    const room = joinRoom({ appId: APP_ID, password: this.workspace.key }, this.workspace.room, {
      onJoinError: () => this.setStatus('offline'),
    });
    this.room = room;

    const updates = room.makeAction<Uint8Array>('update');
    const vectors = room.makeAction<Uint8Array>('vector');
    const hello = room.makeAction<{ name: string }>('hello');

    updates.onMessage = (data) => {
      try {
        Y.applyUpdate(this.doc, bytes(data), 'remote');
      } catch {
        // A malformed update is dropped; the next resync repairs any gap.
      }
    };
    vectors.onMessage = (data, { peerId }) => {
      try {
        const missing = Y.encodeStateAsUpdate(this.doc, bytes(data));
        void updates.send(missing, { target: peerId });
      } catch {
        // Ignore a malformed state vector.
      }
    };
    hello.onMessage = (data, { peerId }) => {
      const name = typeof data?.name === 'string' ? data.name.trim().slice(0, 40) : '';
      this.peers.set(peerId, name || 'A collaborator');
      this.emit();
    };

    room.onPeerJoin = (peerId) => {
      this.peers.set(peerId, this.peers.get(peerId) ?? 'A collaborator');
      this.setStatus('connected');
      void vectors.send(Y.encodeStateVector(this.doc), { target: peerId });
      void hello.send({ name: this.name() }, { target: peerId });
    };
    room.onPeerLeave = (peerId) => {
      this.peers.delete(peerId);
      this.setStatus(this.peers.size ? 'connected' : 'connecting');
    };

    this.sendUpdate = (update) => {
      if (this.peers.size) void updates.send(update);
    };
    this.sendHello = () => {
      if (this.peers.size) void hello.send({ name: this.name() });
    };
    this.resyncTimer = window.setInterval(() => {
      if (this.peers.size) void vectors.send(Y.encodeStateVector(this.doc));
    }, RESYNC_MS);
    this.setStatus(this.peers.size ? 'connected' : 'connecting');
  }

  /** Tells connected peers this person's (new) display name. */
  announce(): void {
    this.sendHello();
  }

  private sendUpdate: (update: Uint8Array) => void = () => {};
  private sendHello: () => void = () => {};
  /** Set when a save to this browser's storage fails; the store shows it. */
  persistFailed = false;

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote' && origin !== 'storage') this.sendUpdate(update);
    this.schedulePersist();
  };

  private schedulePersist(): void {
    if (this.persistTimer) window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => void this.persist(), PERSIST_MS);
  }

  /** Writes the whole document to this browser's storage. */
  async persist(): Promise<void> {
    if (this.persistTimer) window.clearTimeout(this.persistTimer);
    this.persistTimer = null;
    try {
      await saveRoomState(this.workspace.room, Y.encodeStateAsUpdate(this.doc));
      this.persistFailed = false;
    } catch {
      // The document is still in memory and with any connected peer; the
      // store's banner tells the person this browser could not keep a copy.
      this.persistFailed = true;
    }
    this.emit();
  }

  private async reconnect(): Promise<void> {
    await this.disconnect();
    this.connect();
  }

  async disconnect(): Promise<void> {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    if (this.resyncTimer) window.clearInterval(this.resyncTimer);
    this.resyncTimer = null;
    this.sendUpdate = () => {};
    this.sendHello = () => {};
    const room = this.room;
    this.room = null;
    this.peers.clear();
    if (room) await room.leave();
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.doc.off('update', this.onDocUpdate);
    if (this.persistTimer) await this.persist();
    this.listeners.clear();
  }

  state(): CollabState {
    return {
      status: this.status,
      peers: [...this.peers].map(([id, name]) => ({ id, name })),
      persistFailed: this.persistFailed,
    };
  }

  subscribe(listener: (state: CollabState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state());
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: CollabStatus): void {
    this.status = status;
    this.emit();
  }

  private emit(): void {
    const state = this.state();
    for (const listener of this.listeners) listener(state);
  }
}
