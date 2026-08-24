'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import FinancePeriodPicker from '@/app/components/FinancePeriodPicker';
import { useFinanceSummary, PeriodFilter } from '@/lib/financeData';

const formatKm = (value: number) =>
  `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;

export default function CostsPage() {
  const [period, setPeriod] = useState<PeriodFilter>({
    mode: 'month',
    month: new Date().toISOString().slice(0, 7),
  });
  const finance = useFinanceSummary(period);

  const rows = [
    { label: 'Dijelovi i materijal (nabavna cijena)', value: finance.partsCost },
    { label: 'Isplate majstorima', value: finance.mechanicEarnings },
    { label: 'Ukupni trošak', value: finance.partsCost + finance.mechanicEarnings },
  ];

  const periodLabel =
    period.mode === 'range'
      ? `${period.from || '...'} — ${period.to || '...'}`
      : `${period.month || ''} (MTD)`.trim();

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Troškovi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nabavna cijena dijelova i isplate za odabrani period.
          </p>
        </div>

        <FinancePeriodPicker period={period} onChange={setPeriod} />

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <h2 className="font-semibold text-foreground">Troškovi</h2>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-4">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatKm(row.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
