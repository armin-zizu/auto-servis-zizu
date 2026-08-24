'use client';

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { WorkOrder, ORDERS_STORAGE_KEY } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache } from '@/lib/syncStore';
import { PeriodFilter, orderFinanceDate, orderInPeriod } from '@/lib/financeData';

interface FinanceTrendChartProps {
  period: PeriodFilter;
}

function buildDays(period: PeriodFilter): string[] {
  const result: string[] = [];
  let start: Date;
  let end: Date;

  if (period.mode === 'month' && period.month) {
    const [year, month] = period.month.split('-').map(Number);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0);
  } else {
    const parse = (value?: string) => {
      if (!value) return null;
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const from = parse(period.from);
    const to = parse(period.to) ?? new Date();
    if (!from) return [];
    // Cap very long ranges so the chart stays readable.
    const maxDays = 120;
    const cappedTo = new Date(Math.min(to.getTime(), from.getTime() + (maxDays - 1) * 86400000));
    start = from;
    end = cappedTo;
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return result;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-card-hover p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`tip-${entry.name}`} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {entry.value.toLocaleString('bs-BA', { maximumFractionDigits: 0 })} KM
          </span>
        </div>
      ))}
    </div>
  );
};

/** Daily line chart of revenue, parts cost, mechanic payouts and profit. */
export default function FinanceTrendChart({ period }: FinanceTrendChartProps) {
  const data = useMemo(() => {
    const orders = readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []);
    const days = buildDays(period);
    if (days.length === 0) return [];

    const byDay = new Map(
      days.map((day) => [day, { day, revenue: 0, partsCost: 0, payouts: 0, profit: 0 }])
    );

    orders.forEach((order) => {
      if (order.status !== 'Zatvoren') return;
      if (!orderInPeriod(order, period)) return;
      const bucket = byDay.get(orderFinanceDate(order));
      if (!bucket) return;
      const revenue = Number(order.orderTotal) || 0;
      const partsCost = Number(order.partsPurchaseCost ?? order.partsTotal) || 0;
      const payout = Number(order.mechanicPayout) || 0;
      bucket.revenue += revenue;
      bucket.partsCost += partsCost;
      bucket.payouts += payout;
      bucket.profit += revenue - partsCost - payout;
    });

    return days.map((day) => {
      const bucket = byDay.get(day)!;
      const date = new Date(`${day}T00:00:00`);
      return {
        ...bucket,
        label: new Intl.DateTimeFormat('bs-BA', { day: 'numeric', month: 'short' }).format(date),
      };
    });
  }, [period]);

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-card p-10 text-center text-sm text-muted-foreground">
        Nema podataka za odabrani period.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Kretanje po danima</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Prihod · trošak dijelova · isplate majstorima · dobit
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Prihod"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="partsCost"
            name="Trošak dijelova"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="payouts"
            name="Isplate majstorima"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Dobit"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
