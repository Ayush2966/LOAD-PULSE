import Peer, { type DataConnection, type PeerOptions } from 'peerjs'
import type { SwarmMessage } from './types'

const ROOM_PREFIX = 'loadpulse-swarm-'

/**
 * STUN alone can't traverse symmetric NATs / restrictive corporate firewalls —
 * without a TURN relay, joiners behind those networks silently fail to connect.
 * openrelay.metered.ca is a free public TURN service (shared demo credentials,
 * rate-limited) — good enough to unblock most restrictive networks without
 * requiring LoadPulse to run or pay for its own relay infrastructure.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
]

const PEER_OPTIONS: PeerOptions = { config: { iceServers: ICE_SERVERS } }

export function roomIdToPeerId(roomId: string): string {
  return `${ROOM_PREFIX}${roomId.trim().toLowerCase()}`
}

export function randomRoomId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export interface HostHandle {
  peer: Peer
  connections: Map<string, DataConnection>
  broadcast: (msg: SwarmMessage) => void
  close: () => void
}

/** Host: claims a well-known peer id derived from the room code so joiners can dial it directly (no separate signaling server needed beyond PeerJS's free public broker). */
export function hostSwarm(
  roomId: string,
  onNodeJoined: (nodeId: string) => void,
  onNodeLeft: (nodeId: string) => void,
  onMessage: (nodeId: string, msg: SwarmMessage) => void,
  onError: (err: Error) => void,
): HostHandle {
  const peer = new Peer(roomIdToPeerId(roomId), PEER_OPTIONS)
  const connections = new Map<string, DataConnection>()

  peer.on('error', err => onError(err as unknown as Error))

  peer.on('connection', conn => {
    connections.set(conn.peer, conn)
    conn.on('open', () => onNodeJoined(conn.peer))
    conn.on('data', data => onMessage(conn.peer, data as SwarmMessage))
    conn.on('close', () => { connections.delete(conn.peer); onNodeLeft(conn.peer) })
  })

  return {
    peer,
    connections,
    broadcast(msg) {
      for (const conn of connections.values()) {
        if (conn.open) conn.send(msg)
      }
    },
    close() {
      connections.forEach(c => c.close())
      peer.destroy()
    },
  }
}

export interface NodeHandle {
  peer: Peer
  conn: DataConnection | null
  send: (msg: SwarmMessage) => void
  close: () => void
}

/** Joiner: dials the host's well-known peer id for this room. */
export function joinSwarm(
  roomId: string,
  onOpen: () => void,
  onMessage: (msg: SwarmMessage) => void,
  onClose: () => void,
  onError: (err: Error) => void,
): NodeHandle {
  const peer = new Peer(PEER_OPTIONS)
  const handle: NodeHandle = {
    peer,
    conn: null,
    send(msg) { if (handle.conn?.open) handle.conn.send(msg) },
    close() { handle.conn?.close(); peer.destroy() },
  }

  peer.on('error', err => onError(err as unknown as Error))
  peer.on('open', () => {
    const conn = peer.connect(roomIdToPeerId(roomId), { reliable: true })
    handle.conn = conn
    conn.on('open', onOpen)
    conn.on('data', data => onMessage(data as SwarmMessage))
    conn.on('close', onClose)
    conn.on('error', err => onError(err as unknown as Error))
  })

  return handle
}
