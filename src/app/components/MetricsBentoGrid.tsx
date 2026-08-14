'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { readCache, SYNC_EVENT } from '@/lib/syncStore';
import { WEEKLY_BONUSES_STORAGE_KEY } from '@/lib/weeklyBonuses';
import {
  ClipboardList,
  CheckCircle2,
  DollarSign,
  Package,
  Wrench,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface MetricCardData {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  variant: 'default' | 'alert' | 'positive' | 'warning' | 'hero';
  colSpan?: number;
  href: string;
}

const metrics: MetricCardData[] = [
  {
    id: 'open-orders',
    label: 'Otvoreni nalozi',
    value: '14',
    subValue: '3 čekaju dijelove',
    trend: 2,
    trendLabel: 'vs jučer',
    icon: <ClipboardList size={22} />,
    variant: 'hero',
    colSpan: 2,
    href: '/work-order-managment?status=active',
  },
  {
    id: 'revenue-mtd',
    label: 'Prihod MTD',
    value: '24,810 KM',
    subValue: 'Aug 1–5',
    trend: 8.3,
    trendLabel: 'vs prošli mjesec',
    icon: <DollarSign size={22} />,
    variant: 'positive',
    href: '/finansije/prihodi?period=mtd',
  },
  {
    id: 'profit-mtd',
    label: 'Dobit MTD',
    value: '15,468 KM',
    subValue: 'Nakon nabavne cijene dijelova',
    icon: <TrendingUp size={22} />,
    variant: 'positive',
    href: '/finansije',
  },
  {
    id: 'closed-today',
    label: 'Zatvoreno danas',
    value: '6',
    subValue: 'naloga završeno',
    trend: -1,
    trendLabel: 'vs jučer',
    icon: <CheckCircle2 size={22} />,
    variant: 'default',
    href: '/work-order-managment?status=Zatvoren',
  },
  {
    id: 'parts-cost-mtd',
    label: 'Trošak dijelova MTD',
    value: '9,342 KM',
    subValue: '37.6% od prihoda',
    trend: 12.1,
    trendLabel: 'vs prošli mjesec',
    icon: <Package size={22} />,
    variant: 'default',
    href: '/finansije/troskovi?period=mtd',
  },
  {
    id: 'labor-revenue',
    label: 'Naplata rada MTD',
    value: '15,468 KM',
    subValue: '62.4% od prihoda',
    trend: 5.9,
    trendLabel: 'vs prošli mjesec',
    icon: <Wrench size={22} />,
    variant: 'positive',
    href: '/finansije/prihodi?period=mtd&type=labor',
  },
  {
    id: 'mechanic-payouts',
    label: 'Isplate majstorima',
    value: '4,218 KM',
    subValue: '4 majstora · neisplaćeno',
    trend: undefined,
    trendLabel: 'potrebna pažnja',
    icon: <AlertCircle size={22} />,
    variant: 'alert',
    href: '/finansije?section=isplate',
  },
  {
    id: 'avg-order-value',
    label: 'Prosječna vrijednost naloga',
    value: '412 KM',
    subValue: 'po zatvorenom nalogu',
    trend: 3.2,
    trendLabel: 'vs prošli mjesec',
    icon: <Zap size={22} />,
    variant: 'default',
    href: '/work-order-managment',
  },
];

interface DashboardOrder {
  mechanic: string;
  status: string;
  partsTotal: number;
  laborTotal: number;
  orderTotal: number;
  partsPurchaseCost?: number;
}

interface DashboardPayout {
  amount: number;
  paid: boolean;
}

interface DashboardSalary {
  amount: number;
  paid: boolean;
}

interface DashboardBonus {
  mechanic: string;
  amount: number;
  paid: boolean;
}

function readDashboardData() {
  try {
    const storedOrders = readCache<DashboardOrder[] | null>('autoservis-work-orders', null);
    const storedPayouts = readCache<DashboardPayout[] | null>('autoservis-payouts', null);
    const storedSalaries = readCache<DashboardSalary[] | null>('autoservis-salaries', null);
    const storedBonuses = readCache<DashboardBonus[] | null>(WEEKLY_BONUSES_STORAGE_KEY, null);
    if (!storedOrders && !storedPayouts && !storedSalaries && !storedBonuses) return {};
    const session = JSON.parse(window.sessionStorage.getItem('autoservis-session') || window.localStorage.getItem('autoservis-session') || 'null') as { userRole?: string; userName?: string } | null;
const allOrders = (storedOrders || []) as DashboardOrder[];
    const allPayouts = (storedPayouts || []) as (DashboardPayout & { name?: string })[];
    const allSalaries = (storedSalaries || []) as (DashboardSalary & { name?: string })[];
    const allBonuses = (storedBonuses || []) as DashboardBonus[];
    const isMechanic = session?.userRole === 'mechanic';
    const orders = isMechanic ? allOrders.filter((order) => order.mechanic === session?.userName) : allOrders;
    const payouts = isMechanic ? allPayouts.filter((payout) => payout.name === session?.userName) : allPayouts;
    const salaries = isMechanic ? allSalaries.filter((salary) => salary.name === session?.userName) : allSalaries;
    const bonuses = isMechanic ? allBonuses.filter((bonus) => bonus.mechanic === session?.userName) : allBonuses;
    const activeOrders = orders.filter((order) => order.status !== 'Zatvoren' && order.status !== 'Otkazan');
    const closedOrders = orders.filter((order) => order.status === 'Zatvoren');
    const revenue = orders.reduce((sum, order) => sum + Number(order.orderTotal || 0), 0);
    const parts = orders.reduce((sum, order) => sum + Number(order.partsTotal || 0), 0);
    const labor = orders.reduce((sum, order) => sum + Number(order.laborTotal || 0), 0);
    const mechanicShare = orders.reduce((sum, order) => sum + Number(order.laborTotal || 0) * 0.1, 0);
    const partsPurchaseCost = orders.reduce(
      (sum, order) => sum + Number(order.partsPurchaseCost ?? order.partsTotal ?? 0),
      0
    );
    const profit = revenue - partsPurchaseCost - mechanicShare;
    const unpaid = payouts.filter((payout) => !payout.paid).reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
      + salaries.filter((salary) => !salary.paid).reduce((sum, salary) => sum + Number(salary.amount || 0), 0)
      + bonuses.filter((bonus) => !bonus.paid).reduce((sum, bonus) => sum + Number(bonus.amount || 0), 0);
    const formatKm = (value: number) => `${Math.round(value).toLocaleString()} KM`;
    const revenuePercent = revenue ? `${((labor / revenue) * 100).toFixed(1)}% od prihoda` : '0% od prihoda';

    return {
      'open-orders': { value: String(activeOrders.length), subValue: `${activeOrders.filter((order) => order.status === 'Čeka dijelove').length} čekaju dijelove` },
      'revenue-mtd': { value: formatKm(revenue), subValue: 'Sačuvani radni nalozi' },
      'profit-mtd': { value: formatKm(profit), subValue: 'Nakon dijelova i 10% za majstore' },
      'closed-today': { value: String(closedOrders.length), subValue: 'zatvorenih naloga' },
      'parts-cost-mtd': { value: formatKm(parts), subValue: revenue ? `${((parts / revenue) * 100).toFixed(1)}% od prihoda` : '0% od prihoda' },
      'labor-revenue': { value: formatKm(labor - mechanicShare), subValue: 'Nakon 10% za majstore' },
      'mechanic-payouts': {
        value: formatKm(unpaid),
        subValue: unpaid > 0
          ? `${payouts.filter((payout) => !payout.paid).length + salaries.filter((salary) => !salary.paid).length} neisplaćenih stavki`
          : 'Sve isplaćeno',
        trendLabel: unpaid > 0 ? 'potrebna pažnja' : 'sve riješeno',
        variant: unpaid > 0 ? 'alert' : 'positive',
        icon: unpaid > 0 ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />,
      },
      'avg-order-value': { value: formatKm(closedOrders.length ? revenue / closedOrders.length : 0), subValue: 'po zatvorenom nalogu' },
    } as Record<string, Partial<MetricCardData>>;
  } catch {
    return {};
  }
}

// Grid plan: 7 cards → grid-cols-4
// Row 1: hero (col-span-2) + 2 regular cards = 4 cols
// Row 2: 3 regular cards (last spans 2 to fill) — actually 4 regular cards across 2 rows
// Adjusted: hero(2) + card + card = row1(4); card + card + card(2) = row2(5)→ hero(2)+card+card / card+card+card+card
// Final: hero spans 2, remaining 6 cards fill 3+3 across rows 2-3

function MetricCard({ metric }: { metric: MetricCardData }) {
  const variantStyles: Record<string, string> = {
    hero: 'bg-primary text-primary-foreground',
    alert: 'bg-amber-50 border-amber-200',
    positive: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-orange-50 border-orange-200',
    default: 'bg-card border-border',
  };

  const iconStyles: Record<string, string> = {
    hero: 'bg-white/20 text-white',
    alert: 'bg-amber-100 text-amber-700',
    positive: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-orange-100 text-orange-700',
    default: 'bg-muted text-primary',
  };

  const labelStyles: Record<string, string> = {
    hero: 'text-primary-foreground/70',
    alert: 'text-amber-700',
    positive: 'text-emerald-700',
    warning: 'text-orange-700',
    default: 'text-muted-foreground',
  };

  const valueStyles: Record<string, string> = {
    hero: 'text-white',
    alert: 'text-amber-900',
    positive: 'text-emerald-900',
    warning: 'text-orange-900',
    default: 'text-foreground',
  };

  const subStyles: Record<string, string> = {
    hero: 'text-primary-foreground/60',
    alert: 'text-amber-600',
    positive: 'text-emerald-600',
    warning: 'text-orange-600',
    default: 'text-muted-foreground',
  };

  const isPositiveTrend = metric.trend !== undefined && metric.trend > 0;
  const isNegativeTrend = metric.trend !== undefined && metric.trend < 0;

  return (
    <Link
      href={metric.href}
      className={`rounded-xl border shadow-card p-5 flex flex-col gap-4 h-full transition-shadow duration-200 hover:shadow-card-hover
        ${variantStyles[metric.variant]}
        ${metric.colSpan === 2 ? 'col-span-1 md:col-span-2' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconStyles[metric.variant]}`}
        >
          {metric.icon}
        </div>
        {metric.variant === 'alert' && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
            Potrebna akcija
          </span>
        )}
      </div>

      <div>
        <p
          className={`text-xs font-medium uppercase tracking-wide mb-1 ${labelStyles[metric.variant]}`}
        >
          {metric.label}
        </p>
        <p
          className={`text-3xl font-bold tabular-nums leading-none ${valueStyles[metric.variant]}`}
        >
          {metric.value}
        </p>
        {metric.subValue && (
          <p className={`text-xs mt-1.5 ${subStyles[metric.variant]}`}>
            {metric.subValue}
          </p>
        )}
      </div>

      {(metric.trend !== undefined || metric.trendLabel) && (
        <div className="flex items-center gap-1.5 mt-auto">
          {metric.trend !== undefined ? (
            <>
              {isPositiveTrend ? (
                <TrendingUp
                  size={14}
                  className={
                    metric.variant === 'hero' ?'text-white/70' :'text-emerald-600'
                  }
                />
              ) : isNegativeTrend ? (
                <TrendingDown
                  size={14}
                  className={
                    metric.variant === 'hero' ? 'text-white/70' : 'text-red-500'
                  }
                />
              ) : null}
              <span
                className={`text-xs font-medium tabular-nums ${
                  metric.variant === 'hero' ?'text-white/70'
                    : isPositiveTrend
                    ? 'text-emerald-600' :'text-red-500'
                }`}
              >
                {metric.trend > 0 ? '+' : ''}
                {metric.trend}%
              </span>
            </>
          ) : null}
          {metric.trendLabel && (
            <span
              className={`text-xs ${
                metric.variant === 'hero' ?'text-primary-foreground/50' :'text-muted-foreground'
              }`}
            >
              {metric.trendLabel}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function MetricsBentoGrid() {
  // Grid plan: 7 cards
  // Row 1: hero card (col-span-2) + 2 regular = 4 cols filled
  // Row 2: 3 regular cards + 1 regular = 4 cols filled
  // hero is first in array (col-span-2), then 6 remaining fill 2 rows of 3

  const [dynamicMetrics, setDynamicMetrics] = useState<Record<string, Partial<MetricCardData>>>({});

useEffect(() => {
    const refresh = () => setDynamicMetrics(readDashboardData());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(SYNC_EVENT, refresh);
    };
  }, []);

  const liveMetrics = metrics.map((metric) => ({ ...metric, ...dynamicMetrics[metric.id] }));
  const heroCard = liveMetrics[0];
  const remainingCards = liveMetrics.slice(1);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Hero card */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-2">
        <MetricCard metric={heroCard} />
      </div>
      {/* Remaining 6 cards across remaining 2 cols in row 1 + full row 2 */}
      {remainingCards.map((metric) => (
        <div key={metric.id} className="col-span-1">
          <MetricCard metric={metric} />
        </div>
      ))}
    </div>
  );
}
