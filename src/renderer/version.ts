/**
 * The build version, exposed the three ways §6.7 requires so a bug report names the right build.
 *
 * The three are not redundant — they are read by three different things:
 *
 * 1. **On screen**, from the main process over IPC (the footer). A person can read it out.
 * 2. **`<meta name="app-version">`**, which the shared `BugReportButton` looks for first.
 * 3. **`window.__APP_VERSION__`**, which it falls back to.
 *
 * All three come from `package.json` at build time. A literal typed into the HTML would drift the
 * first time someone bumped the manifest and not the template, and the reports would quietly start
 * naming a version that never existed — which is worse than no version at all, because it looks true.
 */

/** The token the HTML template carries, replaced at build time. */
export const VERSION_PLACEHOLDER = '__APP_VERSION__';

/**
 * Replace every {@link VERSION_PLACEHOLDER} in `html` with `version`.
 *
 * Pure and exported so the build's behaviour is unit-tested. The alternative — a closure inside the
 * Vite config — is only checkable by building and grepping, which is exactly how the placeholder
 * shipped unreplaced in the first place.
 */
export function injectAppVersion(html: string, version: string): string {
  return html.split(VERSION_PLACEHOLDER).join(version);
}

/**
 * Publish the version as a global for the bug-report widget's fallback path.
 *
 * Reads the meta tag rather than taking the version as an argument, so there is ONE source in the
 * document and the global cannot disagree with the tag.
 */
export function publishAppVersion(doc: Document = document): string | null {
  const meta = doc.querySelector('meta[name="app-version"]');
  const version = meta?.getAttribute('content') ?? null;
  // An unreplaced placeholder is not a version. Publishing it would put the literal token into bug
  // reports, which reads as a real value to whoever triages them.
  if (!version || version === VERSION_PLACEHOLDER) return null;
  (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = version;
  return version;
}
