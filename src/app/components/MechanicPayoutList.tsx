'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import { pull, readCache, subscribe, SYNC_EVENT } from '@/lib/syncStore';
import { formatBonusPeriod, WeeklyBonus, WEEKLY_BONUSES_STORAGE_KEY } from '@/lib/weeklyBonuses';

interface Payout {
  id: string;
  name: string;
  orders: number;
  amount: number;
  paid: boolean;
}

interface Salary {
  id: string;
  name: string;
  month: string;
  amount: number;
  paid: boolean;
}

interface PaymentRow {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  detail: string;
}

const initialPayouts: Payout[] = [];
const demoPayoutIds = new Set(['mech-001', 'mech-002', 'mech-003', 'mech-004']);

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
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [weeklyBonuses, setWeeklyBonuses] = useState<WeeklyBonus[]>([]);
  const [session, setSession] = useState<{ userRole?: string; userName?: string } | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSession(readSession());
      setPayouts(
        readCache<Payout[]>('autoservis-payouts', initialPayouts).filter(
          (payout) => !demoPayoutIds.has(payout.id)
        )
      );
      setSalaries(readCache<Salary[]>('autoservis-salaries', []));
      setWeeklyBonuses(readCache<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, []));
    };
    refresh();
    const unsubscribePayouts = subscribe<Payout[]>('autoservis-payouts', refresh);
    const unsubscribeSalaries = subscribe<Salary[]>('autoservis-salaries', refresh);
    const unsubscribeBonuses = subscribe<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY, refresh);
    void pull<Payout[]>('autoservis-payouts').then(refresh);
    void pull<Salary[]>('autoservis-salaries').then(refresh);
    void pull<WeeklyBonus[]>(WEEKLY_BONUSES_STORAGE_KEY).then(refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribePayouts();
      unsubscribeSalaries();
      unsubscribeBonuses();
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const payments = useMemo(() => {
    const rows: PaymentRow[] = [
      ...payouts.map((payout) => ({
        id: payout.id,
        name: payout.name,
        amount: Number(payout.amount) || 0,
        paid: payout.paid,
        detail: `${payout.orders} završenih naloga`,
      })),
      ...salaries.map((salary) => ({
        id: salary.id,
        name: salary.name,
        amount: Number(salary.amount) || 0,
        paid: salary.paid,
        detail: `Mjesečna plata · ${salary.month}`,
      })),
      ...weeklyBonuses.map((bonus) => ({
        id: bonus.id,
        name: bonus.mechanic,
        amount: Number(bonus.amount) || 0,
        paid: bonus.paid,
        detail: `Bonus 10% · ${formatBonusPeriod({ start: bonus.periodStart, end: bonus.periodEnd })}`,
      })),
    ];
    return session?.userRole === 'mechanic'
      ? rows.filter((row) => row.name === session.userName)
      : rows;
  }, [payouts, salaries, weeklyBonuses, session]);

  const totalDue = payments.filter((payment) => !payment.paid).reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-card flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Isplate majstorima</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Stvarne obaveze za isplatu</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Ukupno za isplatu</p>
          <p className="text-lg font-bold text-amber-600 tabular-nums">{totalDue.toLocaleString()} KM</p>
        </div>
      </div>

      <div className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
        {payments.map((payment) => (
          <div key={payment.id} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{payment.name.split(' ').map((part) => part[0]).join('')}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">{payment.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{payment.detail}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold tabular-nums ${payment.paid ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {payment.amount.toLocaleString()} KM
                </p>
                <span className={`text-xs font-medium ${payment.paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {payment.paid ? 'Isplaćeno' : 'Neisplaćeno'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!payments.length && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nema isplata za prikaz.</p>}
      </div>

      <div className={`px-5 py-3.5 border-t border-border rounded-b-xl ${totalDue > 0 ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`${totalDue > 0 ? 'text-amber-700' : 'text-emerald-700'} font-medium flex items-center gap-1.5`}>
            <DollarSign size={13} />
            {totalDue > 0 ? 'Postoje neisplaćene obaveze' : 'Sve isplaćeno'}
          </span>
          <Link href="/majstori/isplate" className="text-primary font-semibold hover:underline">Pregledaj isplate</Link>
        </div>
      </div>
    </div>
  );
}
