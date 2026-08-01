/**
 * The Electron hardening, as VALUES rather than as arguments buried in a window constructor.
 *
 * # Why they live here
 *
 * `src/main/index.ts` cannot run outside a packaged Electron process, so anything asserted about it
 * would have to be asserted by launching a browser window — which is slow, flaky, and in CI usually
 * skipped. Every decision that matters is therefore a constant in this file, `index.ts` applies them
 * without choosing anything, and `tests/main/security.test.ts` checks the constants. The test cannot
 * prove the window was built with them; it CAN prove that the values this app ships are the right
 * ones, and `index.ts` has no second copy to drift from.
 *
 * # What each one is for
 *
 * This app talks to a custody surface. The renderer displays text a stranger wrote. Those two facts
 * together are why none of the settings below is negotiable.
 */

/**
 * The `webPreferences` every dig-chat window is built with.
 *
 * - `contextIsolation` — the renderer's JavaScript world is separate from the preload's, so page
 *   script cannot reach preload internals by walking the prototype chain.
 * - `nodeIntegration: false` — no `require`, no `process`, no `fs` in the renderer. A cross-site
 *   scripting bug in a chat app that had Node would be remote code execution on the user's machine.
 * - `sandbox: true` — the renderer process runs under the OS sandbox, so even native-code
 *   exploitation of the renderer does not immediately own the machine.
 * - `webSecurity` — same-origin policy stays on. It is on by default; it is stated because turning
 *   it off is the kind of thing someone does for an afternoon and forgets.
 * - `allowRunningInsecureContent`, `experimentalFeatures` — off.
 */
export const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webviewTag: false,
} as const;

/**
 * The Content-Security-Policy served with the renderer document.
 *
 * `script-src 'self'` with no `unsafe-inline` and no `unsafe-eval` is the load-bearing part: even
 * given an injection, there is no way to execute a string. `connect-src` names the ONE remote origin
 * dig-chat talks to — the bug-report API — and nothing else; the identity channel is spoken by the
 * MAIN process, so the renderer needs no loopback origin at all and is not given one.
 *
 * `style-src` allows `'unsafe-inline'`, and that is a real concession stated rather than hidden: the
 * React toolchain injects styles inline. It cannot execute script.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src https://api.bugreport.dig.net",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

/**
 * Whether dig-chat will navigate to `url`.
 *
 * `false` for everything that is not the app's own document. A chat window renders text a stranger
 * wrote; a link in it that could navigate the window would let that stranger replace the app's UI
 * with their own page, inside a window the user believes is dig-chat. External links are opened in
 * the user's real browser instead, where the address bar tells the truth.
 */
export function isInternalNavigation(url: string, appOrigin: string): boolean {
  try {
    return new URL(url).origin === new URL(appOrigin).origin;
  } catch {
    return false;
  }
}

/**
 * Whether an external `url` may be handed to the OS browser.
 *
 * Restricted to `https:`. A `file:` URL opens a local file, and the platform-specific schemes
 * (`ms-msdt:`, `search-ms:`, and their relatives) have each been an execution vector at some point.
 * A peer supplies these strings, so the allowlist is a scheme allowlist rather than a blocklist of
 * the ones known to be bad today.
 */
export function mayOpenExternally(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}
