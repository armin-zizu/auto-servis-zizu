'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import FinancePeriodPicker from '@/app/components/FinancePeriodPicker';
import FinanceTrendChart from '@/app/components/FinanceTrendChart';
import { useFinanceSummary, PeriodFilter } from '@/lib/financeData';

const formatKm = (value: number) =>
  `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;

export default function RevenuePage() {
  const [period, setPeriod] = useState<PeriodFilter>({
    mode: 'month',
    month: new Date().toISOString().slice(0, 7),
  });
  const finance = useFinanceSummary(period);

  const cards = [
    {
      label: 'Ukupni prihod',
      value: finance.revenue,
      description: `${finance.closedOrders} zatvorenih naloga`,
      className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      label: 'Naplata rada',
      value: finance.laborRevenue - finance.mechanicEarnings,
      description: 'Nakon 10% za majstore',
      className: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    },
    {
      label: 'Prihod od dijelova',
      value: finance.partsRevenue,
      description: 'Prodaja dijelova i materijala',
      className: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      label: 'Dobit',
      value: finance.operatingProfit,
      description: 'Nakon dijelova i isplata majstorima',
      className: 'bg-violet-50 border-violet-200 text-violet-700',
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
          <h1 className="text-2xl font-semibold text-foreground mt-2">Prihodi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zatvorenih naloga u odabranom periodu: {finance.closedOrders}
          </p>
        </div>

        <FinancePeriodPicker period={period} onChange={setPeriod} />

        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="font-semibold text-foreground">Prihod i dobit</h2>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        <FinanceTrendChart period={period} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
