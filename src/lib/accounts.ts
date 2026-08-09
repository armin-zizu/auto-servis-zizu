'use client';

import { readCache, writeCache } from './syncStore';

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
  return readCache<MechanicAccount[]>(ACCOUNTS_STORAGE_KEY, []);
}

export async function writeAccounts(accounts: MechanicAccount[]) {
  if (typeof window === 'undefined') return;
  writeCache(ACCOUNTS_STORAGE_KEY, accounts);
  // Push to shared Supabase storage so other devices see it.
  const { push } = await import('./syncStore');
  void push(ACCOUNTS_STORAGE_KEY, accounts);
}
