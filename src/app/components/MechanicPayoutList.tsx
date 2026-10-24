'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import { PayoutRecord } from '@/lib/financeData';
import { pull, readCache, subscribe, SYNC_EVENT } from '@/lib/syncStore';

const PAYOUTS_STORAGE_KEY = 'autoservis-payouts';

function readSession() {
  try {
    return JSON.parse(
      window.sessionStorage.getItem('autoservis-session') ||
        window.localStorage.getItem('autoservis-session') ||
        'null'
    ) as { userRole?: string; userName?: string } | null;
  } catch {
    return null;
  }
}

export default function MechanicPayoutList() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [session, setSession] = useState<{ userRole?: string; userName?: string } | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSession(readSession());
      setPayouts(readCache<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, []).filter((payout) => Boolean(payout.date)));
    };
    refresh();
    void pull<PayoutRecord[]>(PAYOUTS_STORAGE_KEY).then(refresh);
    const unsubscribe = subscribe<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const visiblePayouts = useMemo(() => {
    const rows = session?.userRole === 'mechanic'
      ? payouts.filter((payout) => payout.name === session.userName)
      : payouts;
    return rows.slice(0, 5);
  }, [payouts, session]);
  const unpaid = payouts
    .filter((payout) => !payout.paid && (session?.userRole !== 'mechanic' || payout.name === session.userName))
    .reduce((total, payout) => total + (Number(payout.amount) || 0), 0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-card flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Ručno unesene isplate</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Bez automatskih plata i bonusa</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Neisplaćeno</p>
          <p className="text-lg font-bold text-amber-600 tabular-nums">{unpaid.toLocaleString('bs-BA')} KM</p>
        </div>
      </div>
      <div className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
        {visiblePayouts.map((payout) => (
          <div key={payout.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">{payout.name.split(' ').map((part) => part[0]).join('')}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{payout.name}</p>
                <p className="text-xs text-muted-foreground truncate">{payout.date || 'Datum nije naveden'}{payout.note ? ` · ${payout.note}` : ''}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${payout.paid ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{Number(payout.amount || 0).toLocaleString('bs-BA')} KM</p>
              <span className={`text-xs font-medium ${payout.paid ? 'text-emerald-600' : 'text-amber-600'}`}>{payout.paid ? 'Isplaćeno' : 'Neisplaćeno'}</span>
            </div>
          </div>
        ))}
        {!visiblePayouts.length && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Još nema ručno unesenih isplata.</p>}
      </div>
      <div className="px-5 py-3.5 border-t border-border rounded-b-xl bg-muted/20 flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign size={13} /> Evidentiranje je ručno</span>
        <Link href="/finansije#isplate" className="text-primary font-semibold hover:underline">Otvori Finansije</Link>
      </div>
    </div>
  );
}