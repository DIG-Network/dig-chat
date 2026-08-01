/**
 * The renderer's one reference to the preload bridge.
 *
 * Routing every call through this accessor rather than touching `window.digChat` directly buys two
 * things: a single place where the bridge's absence is a clear error instead of
 * `Cannot read properties of undefined`, and a single seam a test replaces.
 */

import type { DigChatApi } from '../preload/index';

declare global {
  // eslint-disable-next-line no-var
  var digChat: DigChatApi | undefined;
  interface Window {
    digChat?: DigChatApi;
  }
}

/**
 * The bridge.
 *
 * @throws {Error} when the preload did not run — which means the app is misconfigured, not that the
 * user did anything. Failing loudly here beats every call site failing obscurely later.
 */
export function digChat(): DigChatApi {
  const api = globalThis.window?.digChat ?? globalThis.digChat;
  if (!api) throw new Error('the DIG Chat preload bridge is not available');
  return api;
}
