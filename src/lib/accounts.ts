'use client';

export interface MechanicAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: 'mechanic';
  /** Id of the mechanic in the roster this login belongs to. */
  mechanicId?: string;
}

export const ACCOUNTS_STORAGE_KEY = 'autoservis-mechanic-accounts';

export function readAccounts(): MechanicAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as MechanicAccount[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAccounts(accounts: MechanicAccount[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}
