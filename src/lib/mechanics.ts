'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  active: boolean;
}

export const MECHANICS_STORAGE_KEY = 'autoservis-mechanics';
const MECHANICS_EVENT = 'autoservis-mechanics-changed';

export const defaultMechanics: Mechanic[] = [
  {
    id: 'mech-001',
    name: 'Derek Hollis',
    specialty: 'Servis i dijagnostika',
    email: 'derek.hollis@autoservis.shop',
    phone: '',
    active: true,
  },
  {
    id: 'mech-002',
    name: 'Tomas Reyes',
    specialty: 'Kočnice i ovjes',
    email: 'tomas.reyes@autoservis.shop',
    phone: '',
    active: true,
  },
  {
    id: 'mech-003',
    name: 'Mei-Ling Park',
    specialty: 'Elektronika',
    email: 'mei.park@autoservis.shop',
    phone: '',
    active: true,
  },
  {
    id: 'mech-004',
    name: 'Antoine Briggs',
    specialty: 'Motor i mjenjač',
    email: 'antoine.briggs@autoservis.shop',
    phone: '',
    active: true,
  },
];

export function readMechanics(): Mechanic[] {
  if (typeof window === 'undefined') return defaultMechanics;
  try {
    const stored = window.localStorage.getItem(MECHANICS_STORAGE_KEY);
    if (!stored) return defaultMechanics;
    const parsed = JSON.parse(stored) as Mechanic[];
    return Array.isArray(parsed) ? parsed : defaultMechanics;
  } catch {
    return defaultMechanics;
  }
}

export function writeMechanics(mechanics: Mechanic[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MECHANICS_STORAGE_KEY, JSON.stringify(mechanics));
  window.dispatchEvent(new Event(MECHANICS_EVENT));
}

export function findMechanic(mechanics: Mechanic[], id?: string): Mechanic | undefined {
  return id ? mechanics.find((mechanic) => mechanic.id === id) : undefined;
}

export function activeMechanicNames(mechanics: Mechanic[]): string[] {
  return mechanics.filter((mechanic) => mechanic.active).map((mechanic) => mechanic.name);
}

/**
 * Options for a mechanic dropdown: active mechanics, plus `keepName` when it
 * refers to a mechanic that is no longer active so existing records stay valid.
 */
export function mechanicOptions(mechanics: Mechanic[], keepName?: string): string[] {
  const names = activeMechanicNames(mechanics);
  if (keepName && !names.includes(keepName)) return [keepName, ...names];
  return names;
}

export function useMechanics() {
  const [mechanics, setMechanics] = useState<Mechanic[]>(defaultMechanics);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setMechanics(readMechanics());
    sync();
    setLoaded(true);
    window.addEventListener(MECHANICS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MECHANICS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const save = useCallback((next: Mechanic[]) => {
    setMechanics(next);
    writeMechanics(next);
  }, []);

  return { mechanics, loaded, save };
}
