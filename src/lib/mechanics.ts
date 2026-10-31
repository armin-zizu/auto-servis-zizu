'use client';

import { useCallback, useEffect, useState } from 'react';
import { readCache, writeCache, subscribe, push, pull } from './syncStore';

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
const demoMechanicIds = new Set(['mech-001', 'mech-002', 'mech-003', 'mech-004']);

// A new workshop starts with no mechanics. Only people entered by the user are
// available for assigning and filtering work orders.
export const defaultMechanics: Mechanic[] = [];

export function readMechanics(): Mechanic[] {
  if (typeof window === 'undefined') return defaultMechanics;
  return readCache<Mechanic[]>(MECHANICS_STORAGE_KEY, defaultMechanics).filter(
    (mechanic) => !demoMechanicIds.has(mechanic.id)
  );
}

export async function writeMechanics(mechanics: Mechanic[]) {
  if (typeof window === 'undefined') return;
  writeCache(MECHANICS_STORAGE_KEY, mechanics);
  window.dispatchEvent(new Event(MECHANICS_EVENT));
  void push(MECHANICS_STORAGE_KEY, mechanics);
}

export function findMechanic(mechanics: Mechanic[], id?: string): Mechanic | undefined {
  return id ? mechanics.find((mechanic) => mechanic.id === id) : undefined;
}

export function activeMechanicNames(mechanics: Mechanic[]): string[] {
  return mechanics.filter((mechanic) => mechanic.active).map((mechanic) => mechanic.name);
}

/** Active mechanics, plus an existing inactive assignment while editing. */
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
    const unsubscribe = subscribe<Mechanic[]>(MECHANICS_STORAGE_KEY, sync);
    void pull<Mechanic[]>(MECHANICS_STORAGE_KEY);
    return () => {
      window.removeEventListener(MECHANICS_EVENT, sync);
      window.removeEventListener('storage', sync);
      unsubscribe();
    };
  }, []);

  const save = useCallback((next: Mechanic[]) => {
    setMechanics(next);
    void writeMechanics(next);
  }, []);

  return { mechanics, loaded, save };
}
