'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';

interface MechanicPayout {
  id: string;
  name: string;
  ordersCompleted: number;
  laborRevenue: number;
  payoutPct: number;
  payoutDue: number;
  paid: boolean;
}

const initialMechanics: MechanicPayout[] = [
  {
    id: 'mech-001',
    name: 'Derek Hollis',
    ordersCompleted: 18,
    laborRevenue: 6240,
    payoutPct: 35,
    payoutDue: 2184,
    paid: false,
  },
  {
    id: 'mech-002',
    name: 'Tomas Reyes',
    ordersCompleted: 14,
    laborRevenue: 4820,
    payoutPct: 32,
    payoutDue: 1542,
    paid: false,
  },
  {
    id: 'mech-003',
    name: 'Mei-Ling Park',
    ordersCompleted: 11,
    laborRevenue: 3180,
    payoutPct: 30,
    payoutDue: 954,
    paid: false,
  },
  {
    id: 'mech-004',
    name: 'Antoine Briggs',
    ordersCompleted: 9,
    laborRevenue: 2640,
    payoutPct: 30,
    payoutDue: 792,
    paid: true,
  },
];

export default function MechanicPayoutList() {
  const [mechanics, setMechanics] = useState(initialMechanics);
  const [salaryTotal, setSalaryTotal] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try {
        const session = JSON.parse(window.sessionStorage.getItem('autoservis-session') || window.localStorage.getItem('autoservis-session') || 'null') as { userRole?: string; userName?: string } | null;
        const storedPayouts = JSON.parse(window.localStorage.getItem('autoservis-payouts') || '[]') as Array<{ id: string; amount: number; paid: boolean }>;
        const storedSalaries = JSON.parse(window.localStorage.getItem('autoservis-salaries') || '[]') as Array<{ name?: string; amount: number; paid: boolean }>;
        const isMechanic = session?.userRole === 'mechanic';
        if (storedPayouts.length > 0) {
          setMechanics((current) => current.filter((mechanic) => !isMechanic || mechanic.name === session?.userName).map((mechanic) => {
            const stored = storedPayouts.find((payout) => payout.id === mechanic.id);
            return stored ? { ...mechanic, payoutDue: Number(stored.amount) || 0, paid: stored.paid } : mechanic;
          }));
        }
        setSalaryTotal(storedSalaries
          .filter((salary) => !salary.paid && (!isMechanic || salary.name === session?.userName))
          .reduce((sum, salary) => sum + Number(salary.amount || 0), 0));
      } catch {
        setMechanics(initialMechanics);
        setSalaryTotal(0);
      }
    };
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const totalDue = mechanics
    .filter((m) => !m.paid)
    .reduce((sum, m) => sum + m.payoutDue, salaryTotal);

  return (
    <div className="bg-card border border-border rounded-xl shadow-card flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Isplate majstorima
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              MTD · udio od rada
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ukupno za isplatu</p>
            <p className="text-lg font-bold text-amber-600 tabular-nums">
              {totalDue.toLocaleString()} KM
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 divide-y divide-border overflow-y-auto scrollbar-thin">
        {mechanics.map((m) => (
          <div key={m.id} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {m.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {m.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.ordersCompleted} naloga · {m.payoutPct}% stopa
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold tabular-nums ${
                    m.paid ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {m.payoutDue.toLocaleString()} KM
                </p>
                {m.paid ? (
                  <span className="text-xs text-emerald-600 font-medium">Isplaćeno</span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">Neisplaćeno</span>
                )}
              </div>
            </div>
            {/* Progress bar: payout as % of labor revenue */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${m.paid ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${m.payoutPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={`px-5 py-3.5 border-t border-border rounded-b-xl ${totalDue > 0 ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`${totalDue > 0 ? 'text-amber-700' : 'text-emerald-700'} font-medium flex items-center gap-1.5`}>
            <DollarSign size={13} />
            {totalDue > 0 ? 'Postoje neisplaćene obaveze' : 'Sve isplaćeno ovaj mjesec'}
          </span>
          <Link href="/finansije?section=isplate" className="text-primary font-semibold hover:underline">
            Pregledaj isplate
          </Link>
        </div>
      </div>
    </div>
  );
}