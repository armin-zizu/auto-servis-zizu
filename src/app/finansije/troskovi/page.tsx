'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import FinancePeriodPicker from '@/app/components/FinancePeriodPicker';
import FinanceTrendChart from '@/app/components/FinanceTrendChart';
import { useFinanceSummary, PeriodFilter } from '@/lib/financeData';

const formatKm = (value: number) =>
  `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;

export default function CostsPage() {
  const [period, setPeriod] = useState<PeriodFilter>({
    mode: 'month',
    month: new Date().toISOString().slice(0, 7),
  });
  const finance = useFinanceSummary(period);

  const cards = [
    {
      label: 'Dijelovi i materijal',
      value: finance.partsCost,
      description: 'Nabavna cijena kod dobavljača',
      className: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    {
      label: 'Isplate majstorima',
      value: finance.mechanicEarnings,
      description: 'Zarada majstora iz zatvorenih naloga',
      className: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      label: 'Ukupni trošak',
      value: finance.partsCost + finance.mechanicEarnings,
      description: 'Dijelovi + isplate',
      className: 'bg-red-50 border-red-200 text-red-700',
    },
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

        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="font-semibold text-foreground">Troškovi</h2>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        <FinanceTrendChart period={period} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`rounded-xl border p-5 shadow-card ${card.className}`}>
              <p className="text-xs font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                {formatKm(card.value)}
              </p>
              <p className="text-xs mt-1 opacity-80">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
