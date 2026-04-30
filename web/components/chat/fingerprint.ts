import { INPUT_LIMITS } from '@/lib/types';

const STORAGE_KEY = 'fp';

function generate(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  let out = '';
  for (let i = 0; i < 32; i += 1) {
    out += Math.floor(Math.random() * 36).toString(36);
  }
  return out;
}

function isValid(value: string): boolean {
  return (
    value.length >= 8 &&
    value.length <= INPUT_LIMITS.fingerprintMaxLength &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}

let memoryFingerprint: string | null = null;

function readFromStorage(storage: Storage | null): string | null {
  if (!storage) return null;
  try {
    const v = storage.getItem(STORAGE_KEY);
    return v && isValid(v) ? v : null;
  } catch {
    return null;
  }
}

function writeToStorage(storage: Storage | null, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function getStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadOrCreateFingerprint(): string {
  if (typeof window === 'undefined') {
    return memoryFingerprint ?? (memoryFingerprint = generate());
  }

  const local = getStorage('local');
  const fromLocal = readFromStorage(local);
  if (fromLocal) return fromLocal;

  const session = getStorage('session');
  const fromSession = readFromStorage(session);
  if (fromSession) return fromSession;

  if (memoryFingerprint && isValid(memoryFingerprint)) return memoryFingerprint;

  const fresh = generate();
  if (!writeToStorage(local, fresh) && !writeToStorage(session, fresh)) {
    memoryFingerprint = fresh;
  }
  return fresh;
}
