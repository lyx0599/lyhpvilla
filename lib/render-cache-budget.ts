export function idleRenderCacheKeys(
  entries: Iterable<[string, { estimatedBytes: number; refs: number; lastUsed: number }]>,
  maxEntries: number,
  maxBytes: number
) {
  const all = Array.from(entries);
  let count = all.length;
  let bytes = all.reduce((sum, [, entry]) => sum + entry.estimatedBytes, 0);
  const keys: string[] = [];
  const idle = all.filter(([, entry]) => entry.refs === 0).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  for (const [key, entry] of idle) {
    if (count <= maxEntries && bytes <= maxBytes) break;
    keys.push(key);
    count -= 1;
    bytes -= entry.estimatedBytes;
  }
  // A live scene may exceed the soft byte budget. Never dispose its active maps.
  return keys;
}
