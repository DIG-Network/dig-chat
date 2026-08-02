/**
 * Encrypted history archive: portable, passphrase-derived export/import of
 * dig-chat message history.
 *
 * Container format `DIGCHAT-ARCHIVE` v1 — Argon2id (m=65536, t=3, p=1) key
 * derivation + AES-256-GCM authenticated encryption. Device-independent: any
 * conforming tool can decrypt with the passphrase (SPEC §5.7).
 */

// TODO(#444): implement encodeArchive / decodeArchive + archive error classes.
export const ARCHIVE_MAGIC = 'DIGCHAT-ARCHIVE';
