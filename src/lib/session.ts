'use client';

export interface AppSession {
  userRole: 'owner' | 'mechanic';
  userName: string;
  userEmail: string;
}

export const defaultSession: AppSession = {
  userRole: 'owner',
  userName: 'Armin Mujić',
  userEmail: 'armin@autoservis.com',
};

export function readSession(): AppSession {
  if (typeof window === 'undefined') return defaultSession;
  try {
    const stored =
      window.sessionStorage.getItem('autoservis-session') ||
      window.localStorage.getItem('autoservis-session');
    if (!stored) return defaultSession;
    return { ...defaultSession, ...(JSON.parse(stored) as Partial<AppSession>) };
  } catch {
    return defaultSession;
  }
}
