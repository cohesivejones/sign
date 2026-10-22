let next = 0;

/**
 * Unique id for in-memory items. crypto.randomUUID() is only available in
 * secure contexts (HTTPS or localhost), so it can't be used when the app is
 * served over plain HTTP on a LAN address.
 */
export function newId(): string {
  return `id-${Date.now().toString(36)}-${(next++).toString(36)}`;
}
