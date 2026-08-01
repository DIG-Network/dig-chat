import { describe, expect, it } from 'vitest';

import {
  VERSION_PLACEHOLDER,
  injectAppVersion,
  publishAppVersion,
} from '../../src/renderer/version';

describe('injectAppVersion', () => {
  it('replaces the placeholder in the meta tag', () => {
    // The regression this exists for: the placeholder shipped UNREPLACED, because Vite's `define`
    // rewrites JavaScript and not HTML. A bug report would have carried the literal token.
    const html = `<meta name="app-version" content="${VERSION_PLACEHOLDER}" />`;
    expect(injectAppVersion(html, '1.2.3')).toBe('<meta name="app-version" content="1.2.3" />');
  });

  it('replaces every occurrence, not just the first', () => {
    const html = `${VERSION_PLACEHOLDER} and ${VERSION_PLACEHOLDER}`;
    expect(injectAppVersion(html, '9.9.9')).toBe('9.9.9 and 9.9.9');
  });

  it('leaves html that carries no placeholder alone', () => {
    expect(injectAppVersion('<p>nothing here</p>', '1.0.0')).toBe('<p>nothing here</p>');
  });
});

describe('publishAppVersion', () => {
  it('publishes the meta tag value as the global the widget falls back to', () => {
    document.head.innerHTML = '<meta name="app-version" content="4.5.6" />';
    expect(publishAppVersion(document)).toBe('4.5.6');
    expect((globalThis as { __APP_VERSION__?: string }).__APP_VERSION__).toBe('4.5.6');
  });

  it('publishes nothing when the placeholder was never replaced', () => {
    // An unreplaced token is not a version, and publishing it would put a literal `__APP_VERSION__`
    // into bug reports where it reads as a real value to whoever triages them.
    delete (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__;
    document.head.innerHTML = `<meta name="app-version" content="${VERSION_PLACEHOLDER}" />`;
    expect(publishAppVersion(document)).toBeNull();
    expect((globalThis as { __APP_VERSION__?: string }).__APP_VERSION__).toBeUndefined();
  });

  it('publishes nothing when there is no meta tag at all', () => {
    delete (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__;
    document.head.innerHTML = '';
    expect(publishAppVersion(document)).toBeNull();
  });
});
