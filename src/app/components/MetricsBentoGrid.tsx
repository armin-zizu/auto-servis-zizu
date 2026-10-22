'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';
import FinancePeriodPicker from '@/app/components/FinancePeriodPicker';
import {
  PeriodFilter,
  orderInPeriod,
  useFinanceSummary,
} from '@/lib/financeData';
import { ORDERS_STORAGE_KEY, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, SYNC_EVENT } from '@/lib/syncStore';

interface MetricCardData {
  id: string;
  label: string;
  value: string;
  subValue: string;
  icon: React.ReactNode;
  style: string;
  iconStyle: string;
  href: string;
  highlighted?: boolean;
}

function periodQuery(period: PeriodFilter, status: string, finance?: string): string {
  const params = new URLSearchParams({ status });
  let from = period.from;
  let to = period.to;
  if (period.mode === 'month' && period.month) {
    const [year, month] = period.month.split('-').map(Number);
    from = `${period.month}-01`;
    to = `${period.month}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  }
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (finance) params.set('finance', finance);
  return `/work-order-managment?${params.toString()}`;
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  return (
    <Link
      href={metric.href}
      className={`rounded-xl border shadow-card p-5 flex flex-col gap-4 h-full min-h-40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring ${metric.style} ${metric.highlighted ? 'text-primary-foreground' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${metric.iconStyle} ${metric.highlighted ? 'bg-white/20 text-white' : ''}`}>
          {metric.icon}
        </div>
        <span className={`text-xs ${metric.highlighted ? 'text-white/70' : 'text-muted-foreground'}`}>Otvori naloge →</span>
      </div>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${metric.highlighted ? 'text-white/75' : 'text-muted-foreground'}`}>{metric.label}</p>
        <p className={`text-3xl font-bold tabular-nums leading-none ${metric.highlighted ? 'text-white' : 'text-foreground'}`}>{metric.value}</p>
        <p className={`text-xs mt-1.5 ${metric.highlighted ? 'text-white/75' : 'text-muted-foreground'}`}>{metric.subValue}</p>
      </div>
    </Link>
  );
}

export default function MetricsBentoGrid() {
  const [period, setPeriod] = useState<PeriodFilter>({
    mode: 'month',
    month: new Date().toISOString().slice(0, 7),
  });
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const finance = useFinanceSummary(period);

  useEffect(() => {
    const refresh = () => setOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
    refresh();
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const { activeCount, closedCount } = useMemo(() => {
    const active = orders.filter((order) => order.status !== 'Zatvoren' && order.status !== 'Otkazan');
    const closed = orders.filter(
      (order) => order.status === 'Zatvoren' && orderInPeriod(order, period)
    );
    return { activeCount: active.length, closedCount: closed.length };
  }, [orders, period]);

  const formatKm = (value: number) =>
    `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;
  const currentOrdersHref = periodQuery(period, 'Zatvoren');
  const cards: MetricCardData[] = [
    {
      id: 'open-orders',
      label: 'Aktivni nalozi',
      value: String(activeCount),
      subValue: 'Nisu zatvoreni ili otkazani',
      icon: <ClipboardList size={21} />,
      style: 'bg-primary border-primary',
      iconStyle: '',
      href: '/work-order-managment?status=active',
      highlighted: true,
    },
    {
      id: 'revenue',
      label: 'Prihod',
      value: formatKm(finance.revenue),
      subValue: 'Rad + ostvareni rabat na dijelove i ulje',
      icon: <DollarSign size={21} />,
      style: 'bg-emerald-50 border-emerald-200',
      iconStyle: 'bg-emerald-100 text-emerald-700',
      href: currentOrdersHref,
    },
    {
      id: 'parts-cost',
      label: 'Trošak dijelova i ulja',
      value: formatKm(finance.partsCost),
      subValue: 'Nakon odbitka rabata',
      icon: <Package size={21} />,
      style: 'bg-amber-50 border-amber-200',
      iconStyle: 'bg-amber-100 text-amber-700',
      href: periodQuery(period, 'Zatvoren', 'parts'),
    },
    {
      id: 'payouts',
      label: 'Ručno unesene isplate',
      value: formatKm(finance.mechanicEarnings),
      subValue: `${formatKm(finance.unpaidPayouts)} neisplaćeno`,
      icon: <Users size={21} />,
      style: 'bg-blue-50 border-blue-200',
      iconStyle: 'bg-blue-100 text-blue-700',
      href: '/finansije#isplate',
    },
    {
      id: 'result',
      label: 'Rezultat nakon isplata',
      value: formatKm(finance.operatingProfit),
      subValue: 'Prihod umanjen za ručne isplate',
      icon: <TrendingUp size={21} />,
      style: 'bg-violet-50 border-violet-200',
      iconStyle: 'bg-violet-100 text-violet-700',
      href: currentOrdersHref,
    },
    {
      id: 'closed-orders',
      label: 'Zatvoreni nalozi',
      value: String(closedCount),
      subValue: 'U odabranom periodu',
      icon: <CheckCircle2 size={21} />,
      style: 'bg-card border-border',
      iconStyle: 'bg-muted text-primary',
      href: currentOrdersHref,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pregled poslovanja</h2>
          <p className="text-xs text-muted-foreground">Finansije i zatvoreni nalozi za isti period</p>
        </div>
      </div>
      <FinancePeriodPicker period={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
