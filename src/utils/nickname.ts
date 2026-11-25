/**
 * Strips any leading "aka", "a.k.a.", or wrapping quotes so nicknames
 * never display duplicate prefixes like `aka "aka dada"`.
 */
export function cleanNickname(raw?: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^(?:a\.?\s*k\.?\s*a\.?\s*)+/i, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
}

/** Formats as `aka dada` (or empty string if blank). */
export function formatNickname(raw?: string): string {
  const clean = cleanNickname(raw);
  return clean ? `aka ${clean}` : '';
}

/** Formats as `aka "dada"` for 3D classroom nameplates (or empty string if blank). */
export function formatNicknameQuoted(raw?: string): string {
  const clean = cleanNickname(raw);
  return clean ? `aka "${clean}"` : '';
}
