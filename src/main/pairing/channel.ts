/**
 * The transport half of the dig-app identity channel: one JSON-RPC-over-WebSocket connection to the
 * loopback port, and the seam that lets everything above it be tested without a socket.
 *
 * # Where this runs, and why that is a security property
 *
 * In the MAIN process, never the renderer. Two reasons, both load-bearing:
 *
 * 1. The channel secret is a credential. A renderer that could open the socket would need the
 *    secret, and anything the renderer holds is one XSS away from being exfiltrated.
 * 2. dig-app's connection guard admits a caller that sends NO `Origin` header, on the reasoning that
 *    browsers always attach one — so the absence identifies a native client. A renderer's WebSocket
 *    would attach `Origin: http://localhost:…`, which dig-app refuses outright. The architecture and
 *    the guard agree, which is the comfortable case.
 */

import { WebSocket } from 'ws';

import { ChannelUnreachableError, toChannelError } from './errors';
import type { JsonValue } from './frame';

/** The canonical dig-app identity loopback port (dig-app `LOOPBACK_PORT`; the `canonical` skill). */
export const IDENTITY_PORT = 9779;

/**
 * The loopback authorities to try, IPv6 first (ecosystem §5.2).
 *
 * Both are tried because a host can have either family disabled, and because `localhost` resolving
 * to `::1` while a service listens only on `127.0.0.1` is a failure mode this ecosystem has already
 * paid for once. Each URL's authority is one dig-app's `Host` allowlist accepts verbatim.
 */
export const IDENTITY_ENDPOINTS = [
  `ws://[::1]:${IDENTITY_PORT}`,
  `ws://127.0.0.1:${IDENTITY_PORT}`,
] as const;

/** How long to wait for a socket to open before trying the next family, in milliseconds. */
export const CONNECT_TIMEOUT_MS = 2_000;

/**
 * How long to wait for a response frame, in milliseconds.
 *
 * Generous, because several of these calls block on a HUMAN: `pair.begin` draws a confirm window
 * that a person has to read and answer. A timeout shorter than a person's attention would abandon
 * requests that were about to succeed.
 */
export const REQUEST_TIMEOUT_MS = 120_000;

/** One request frame as it goes onto the wire. */
export interface RequestFrame {
  readonly method: string;
  readonly params: JsonValue;
  readonly auth?: { pairing_id: string; nonce: number; mac_b64: string };
}

/** An open channel to dig-app. */
export interface Channel {
  /**
   * Send one frame and resolve its `result`.
   *
   * @throws {ChannelError} when dig-app answered with an `error`.
   * @throws {ChannelUnreachableError} when the socket failed or the response never arrived.
   */
  request(frame: RequestFrame): Promise<JsonValue>;
  /** Close the socket. Idempotent. */
  close(): void;
}

/** Opens channels. A seam: tests supply a fake, production supplies {@link connect}. */
export interface ChannelFactory {
  open(): Promise<Channel>;
}

/**
 * Open a channel to the first loopback endpoint that answers, IPv6 first.
 *
 * @throws {ChannelUnreachableError} when no endpoint accepted a connection — which is the honest
 * meaning of "the DIG App is not running", and is reported to the user as exactly that rather than
 * as a pairing failure.
 */
export async function connect(
  endpoints: readonly string[] = IDENTITY_ENDPOINTS,
  timeoutMs = CONNECT_TIMEOUT_MS,
): Promise<Channel> {
  let lastFailure: unknown;
  for (const endpoint of endpoints) {
    try {
      return new WebSocketChannel(await openSocket(endpoint, timeoutMs));
    } catch (failure) {
      lastFailure = failure;
    }
  }
  throw new ChannelUnreachableError(lastFailure);
}

/** The production {@link ChannelFactory}. */
export const loopbackChannelFactory: ChannelFactory = { open: () => connect() };

/** Open one WebSocket, or reject once `timeoutMs` has passed with no `open` event. */
function openSocket(endpoint: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(endpoint, { handshakeTimeout: timeoutMs });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error(`no answer from ${endpoint} within ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('error', (failure) => {
      clearTimeout(timer);
      reject(failure);
    });
  });
}

/**
 * A {@link Channel} over one open WebSocket, correlating responses by the JSON-RPC `id`.
 *
 * Correlation matters even though the app is request/response in practice: `pair.begin` can sit in
 * front of a person for a minute, and a response that arrived while another request was outstanding
 * must reach the caller that asked for it rather than whichever promise happened to be pending.
 */
export class WebSocketChannel implements Channel {
  private readonly socket: WebSocket;
  private readonly pending = new Map<
    number,
    { resolve: (value: JsonValue) => void; reject: (failure: unknown) => void; timer: NodeJS.Timeout }
  >();
  private nextId = 1;
  private closed = false;

  constructor(socket: WebSocket, private readonly timeoutMs = REQUEST_TIMEOUT_MS) {
    this.socket = socket;
    this.socket.on('message', (data: Buffer) => this.receive(data.toString('utf8')));
    this.socket.on('close', () => this.failAll(new ChannelUnreachableError('the channel closed')));
    this.socket.on('error', (failure) => this.failAll(new ChannelUnreachableError(failure)));
  }

  request(frame: RequestFrame): Promise<JsonValue> {
    if (this.closed) return Promise.reject(new ChannelUnreachableError('the channel is closed'));

    const id = this.nextId++;
    return new Promise<JsonValue>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ChannelUnreachableError(`no response to ${frame.method} in ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });

      try {
        this.socket.send(JSON.stringify({ jsonrpc: '2.0', id, ...frame }));
      } catch (failure) {
        this.settle(id, () => reject(new ChannelUnreachableError(failure)));
      }
    });
  }

  close(): void {
    this.closed = true;
    this.failAll(new ChannelUnreachableError('the channel was closed locally'));
    this.socket.close();
  }

  /**
   * Route one response frame to the request that is waiting for it.
   *
   * Every field here is UNTRUSTED input from another process. A frame that does not parse, or whose
   * `id` matches nothing outstanding, is dropped in silence — there is no caller it could belong to,
   * and answering it would be inventing a conversation.
   */
  private receive(text: string): void {
    let frame: { id?: unknown; result?: JsonValue; error?: { code?: unknown; message?: unknown } };
    try {
      frame = JSON.parse(text) as typeof frame;
    } catch {
      return;
    }
    if (typeof frame.id !== 'number') return;
    const id = frame.id;
    if (!this.pending.has(id)) return;

    if (frame.error !== undefined && frame.error !== null) {
      const error = toChannelError(frame.error);
      this.settle(id, (waiter) => waiter.reject(error));
      return;
    }
    const result = frame.result ?? null;
    this.settle(id, (waiter) => waiter.resolve(result));
  }

  /** Clear a pending entry and hand it to `finish`, cancelling its timeout exactly once. */
  private settle(
    id: number,
    finish: (waiter: { resolve: (value: JsonValue) => void; reject: (failure: unknown) => void }) => void,
  ): void {
    const waiter = this.pending.get(id);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.pending.delete(id);
    finish(waiter);
  }

  /** Fail every outstanding request — a dropped socket must not leave a promise pending forever. */
  private failAll(failure: unknown): void {
    for (const id of [...this.pending.keys()]) {
      this.settle(id, (waiter) => waiter.reject(failure));
    }
  }
}
