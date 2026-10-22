'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleDollarSign, Package, TrendingUp, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import FinancePeriodPicker from '@/app/components/FinancePeriodPicker';
import FinanceTrendChart from '@/app/components/FinanceTrendChart';
import FinancePayouts from '@/app/components/FinancePayouts';
import { useFinanceSummary, PeriodFilter } from '@/lib/financeData';

const formatKm = (value: number) =>
  `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;

export default function FinancePage() {
  const [period, setPeriod] = useState<PeriodFilter>({
    mode: 'month',
    month: new Date().toISOString().slice(0, 7),
  });
  const finance = useFinanceSummary(period);

  const sections = [
    {
      label: 'Prihod',
      financeFilter: '',
      value: formatKm(finance.revenue),
      description: 'Naplata rada + ostvareni rabat na dijelove i ulje',
      icon: CircleDollarSign,
      className: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    },
    {
      label: 'Trošak dijelova i ulja',
      financeFilter: 'parts',
      value: formatKm(finance.partsCost),
      description: 'Iznos nakon odbitka unesenog rabata',
      icon: Package,
      className: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    {
      label: 'Ručno unesene isplate',
      financeFilter: 'payouts',
      value: formatKm(finance.mechanicEarnings),
      description: `${formatKm(finance.unpaidPayouts)} još nije označeno kao isplaćeno`,
      icon: Users,
      className: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      label: 'Rezultat nakon isplata',
      financeFilter: '',
      value: formatKm(finance.operatingProfit),
      description: 'Prihod umanjen za ručno unesene isplate',
      icon: TrendingUp,
      className: 'bg-violet-50 border-violet-200 text-violet-700',
    },
  ];

  const periodLabel =
    period.mode === 'range'
      ? `${period.from || '...'} — ${period.to || '...'}`
      : `${period.month || ''} (MTD)`.trim();

  const getSectionHref = (financeFilter: string) => {
    if (financeFilter === 'payouts') return '/finansije#isplate';
    let from = period.from;
    let to = period.to;
    if (period.mode === 'month' && period.month) {
      const [year, month] = period.month.split('-').map(Number);
      from = `${period.month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      to = `${period.month}-${String(lastDay).padStart(2, '0')}`;
    }
    const params = new URLSearchParams({ status: 'Zatvoren' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (financeFilter) params.set('finance', financeFilter);
    return `/work-order-managment?${params.toString()}`;
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">
            Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Finansije</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled prihoda, troška dijelova i ručno evidentiranih isplata.</p>
        </div>

        <FinancePeriodPicker period={period} onChange={setPeriod} />

        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="font-semibold text-foreground">Finansijski pregled · {finance.closedOrders} zatvorenih naloga</h2>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>

        <FinanceTrendChart period={period} />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.label}
                href={getSectionHref(section.financeFilter)}
                className={`rounded-xl border p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-ring ${section.className}`}
                title={`Prikaži naloge za period ${periodLabel}`}
              >
                <div className="flex items-start justify-between">
                  <Icon size={22} />
                  <ArrowRight size={17} className="opacity-40" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wide mt-6">{section.label}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                  {section.value}
                </p>
                <p className="text-xs mt-1 opacity-80">{section.description}</p>
              </Link>
            );
          })}
        </div>

        <FinancePayouts period={period} />
      </div>
    </AppLayout>
  );
}
