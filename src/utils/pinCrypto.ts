import { RecentGroupEntry } from '@/src/types/classroom';

const LEGACY_LOCAL_PIN_VAULT_KEY = 'batchverse_seat_pins_v1';
const SESSION_PIN_VAULT_KEY = 'batchverse_session_seat_pins_v2';
const RECENT_GROUPS_KEY = 'batchverse_recent_groups_v1';

export function isValidFourDigitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim());
}

export function isValidFiveDigitCode(code: string): boolean {
  return /^\d{5}$/.test(code.trim());
}

export function generateRandomFiveDigitCode(): string {
  const min = 10000;
  const max = 99999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Computes a deterministic 64-char lowercase hex SHA-256 hash of a student's
 * 4-digit Edit PIN scoped to their school group.
 */
export async function hashSeatPin(groupId: string, pin4Digits: string): Promise<string> {
  const payload = `batchverse:${groupId}:seat-pin:${pin4Digits.trim()}`;
  const encoded = new TextEncoder().encode(payload);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    const bytes = new Uint8Array(hashBuffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Deterministic fallback hash producing 64 hex chars if subtle crypto is unavailable
  let h1 = 0xdeadbeef ^ encoded.length;
  let h2 = 0x41c6ce57 ^ encoded.length;
  for (let i = 0; i < encoded.length; i += 1) {
    h1 = Math.imul(h1 ^ encoded[i], 2654435761);
    h2 = Math.imul(h2 ^ encoded[i], 1597334677);
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const seed = part(h1) + part(h2) + part(h1 ^ h2) + part(Math.imul(h1, 31) ^ h2);
  return (seed + seed).slice(0, 64);
}

type PinVaultMap = Record<string, Record<string, string>>;

function purgeLegacyLocalPinVault(): void {
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_PIN_VAULT_KEY);
  } catch {
    // Ignore storage errors
  }
}

function readPinVault(): PinVaultMap {
  purgeLegacyLocalPinVault();
  try {
    const raw = window.sessionStorage.getItem(SESSION_PIN_VAULT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as PinVaultMap) : {};
  } catch {
    return {};
  }
}

function writePinVault(vault: PinVaultMap): void {
  purgeLegacyLocalPinVault();
  try {
    window.sessionStorage.setItem(SESSION_PIN_VAULT_KEY, JSON.stringify(vault));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllSessionSeatPins(): void {
  purgeLegacyLocalPinVault();
  try {
    window.sessionStorage.removeItem(SESSION_PIN_VAULT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getSavedSeatPinHash(groupId: string, seatId: string): string | null {
  const vault = readPinVault();
  return vault[groupId]?.[seatId] ?? null;
}

export function getSavedGroupSeatPins(groupId: string): Record<string, string> {
  const vault = readPinVault();
  return vault[groupId] ?? {};
}

export function saveSeatPinHash(groupId: string, seatId: string, pinHash: string): void {
  const vault = readPinVault();
  if (!vault[groupId]) vault[groupId] = {};
  vault[groupId][seatId] = pinHash;
  writePinVault(vault);
}

export function removeSeatPinHash(groupId: string, seatId: string): void {
  const vault = readPinVault();
  if (!vault[groupId]) return;
  delete vault[groupId][seatId];
  writePinVault(vault);
}

export function moveSeatPinHash(
  groupId: string,
  fromSeatId: string,
  toSeatId: string,
  pinHash: string
): void {
  const vault = readPinVault();
  if (!vault[groupId]) vault[groupId] = {};
  delete vault[groupId][fromSeatId];
  vault[groupId][toSeatId] = pinHash;
  writePinVault(vault);
}

export function getRecentGroups(): RecentGroupEntry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentGroupEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentGroup(entry: RecentGroupEntry): void {
  try {
    const existing = getRecentGroups().filter((item) => item.groupId !== entry.groupId);
    const updated = [entry, ...existing].slice(0, 6);
    window.localStorage.setItem(RECENT_GROUPS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
