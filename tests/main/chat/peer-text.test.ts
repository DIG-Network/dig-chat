import { describe, expect, it } from 'vitest';

import {
  MAX_PEER_TEXT_CHARS,
  decodePeerText,
  forLog,
  sanitizeIdentifier,
  sanitizePeerText,
} from '../../../src/main/chat/peer-text';

describe('sanitizePeerText', () => {
  it('keeps a newline in a BODY, where it belongs', () => {
    // The control for the identifier test below. A sanitiser that stripped newlines everywhere would
    // pass every log-forgery assertion and silently destroy every multi-line message a person sends.
    expect(sanitizePeerText('line one\nline two')).toBe('line one\nline two');
  });

  it('removes the ESC that starts an ANSI sequence', () => {
    // A terminal reading these logs would otherwise be repainted by the peer.
    expect(sanitizePeerText('\u001B[2Jcleared')).toBe('[2Jcleared');
    expect(sanitizePeerText('\u009B31mred')).toBe('31mred');
  });

  it('removes bidirectional overrides that make a DID render as another DID', () => {
    // U+202E reverses what follows, so a name can be stored as one thing and READ as another — the
    // trick that makes a person approve the wrong counterparty. Escaping would preserve it;
    // removing it means it is not there.
    expect(sanitizePeerText('did:chia:\u202Eeciovni')).toBe('did:chia:eciovni');
    expect(sanitizePeerText('\u2066a\u2069')).toBe('a');
  });

  it('removes a zero-width no-break space that makes two identical DIDs unequal', () => {
    expect(sanitizePeerText('did:chia:bob\uFEFF')).toBe('did:chia:bob');
  });

  it('keeps the whitespace a real message legitimately contains', () => {
    // The control: a sanitiser that stripped everything would pass every test above and destroy
    // ordinary multi-line messages.
    expect(sanitizePeerText('line one\nline two\tindented')).toBe('line one\nline two\tindented');
    expect(sanitizePeerText('café — naïve 🎉 日本語')).toBe('café — naïve 🎉 日本語');
  });

  it('bounds the length', () => {
    const long = 'a'.repeat(MAX_PEER_TEXT_CHARS + 500);
    expect(sanitizePeerText(long)).toHaveLength(MAX_PEER_TEXT_CHARS);
    // At the bound, nothing is removed — the bound is pinned from both sides.
    expect(sanitizePeerText('a'.repeat(MAX_PEER_TEXT_CHARS))).toHaveLength(MAX_PEER_TEXT_CHARS);
  });
});

describe('sanitizeIdentifier', () => {
  it('removes the newline that forges a log record', () => {
    // The defect class this ecosystem shipped a cascade for: a peer-controlled string reaching a log
    // line. A DID carrying a newline writes a second, fake record that reads exactly like a real one.
    const forged = 'did:chia:bob\n2026-07-31 ERROR pairing revoked by user';
    expect(sanitizeIdentifier(forged)).toBe('did:chia:bob2026-07-31 ERROR pairing revoked by user');
    expect(sanitizeIdentifier(forged)).not.toContain('\n');
    expect(sanitizeIdentifier('a\rb')).toBe('ab');
    expect(sanitizeIdentifier('a\tb')).toBe('ab');
  });

  it('inherits the rest of the neutralisation', () => {
    expect(sanitizeIdentifier('did:chia:‮eciovni')).toBe('did:chia:eciovni');
    expect(sanitizeIdentifier('did:chia:bob﻿')).toBe('did:chia:bob');
  });
});

describe('decodePeerText', () => {
  it('reads valid UTF-8', () => {
    expect(decodePeerText(new TextEncoder().encode('hello 🎉'))).toBe('hello 🎉');
  });

  it('does not throw on a bad byte in a message body', () => {
    // One corrupt byte should not lose a whole message; the replacement character is the honest
    // rendering of "this byte was not text".
    expect(decodePeerText(new Uint8Array([0x68, 0xff, 0x69]))).toContain('h');
  });

  it('neutralises what it decodes', () => {
    // decodePeerText must not be a way around sanitizePeerText — an implementation that decoded and
    // returned would pass the two tests above.
    expect(decodePeerText(new TextEncoder().encode('a\u001B[2Jb'))).toBe('a[2Jb');
  });
});

describe('forLog', () => {
  it('quotes the value so it cannot be read as the next field', () => {
    expect(forLog('did:chia:bob')).toBe('"did:chia:bob"');
  });

  it('flattens the whitespace a log line cannot carry', () => {
    expect(forLog('a\nb\tc')).toBe('"a b c"');
  });

  it('truncates to its own tighter budget', () => {
    const rendered = forLog('x'.repeat(500));
    expect(rendered).toHaveLength(120 + 3); // 120 characters, an ellipsis, and two quotes
    expect(rendered.endsWith('…"')).toBe(true);
  });
});
