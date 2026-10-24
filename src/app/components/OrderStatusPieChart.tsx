'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboardOrders } from '@/lib/useDashboardOrders';

const statusDefinitions = [
  { name: 'Otvoren', color: '#3b82f6' },
  { name: 'U toku', color: '#f59e0b' },
  { name: 'Čeka dijelove', color: '#8b5cf6' },
  { name: 'Spreman za preuzimanje', color: '#10b981' },
  { name: 'Zatvoren', color: '#94a3b8' },
  { name: 'Otkazan', color: '#ef4444' },
] as const;

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg shadow-card p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
        <span className="font-medium text-foreground">{item.name}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {item.value} naloga ·{' '}
        <span className="font-semibold text-foreground">
          {total ? ((item.value / total) * 100).toFixed(1) : '0.0'}%
        </span>
      </p>
    </div>
  );
}

export default function OrderStatusPieChart() {
  const orders = useDashboardOrders();
  const statusData = React.useMemo(
    () =>
      statusDefinitions.map((status) => ({
        ...status,
        value: orders.filter((order) => order.status === status.name).length,
      })),
    [orders]
  );
  const total = statusData.reduce((sum, item) => sum + item.value, 0);
  const activeOrders = statusData
    .filter((item) => !['Zatvoren', 'Otkazan'].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5 h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">Status naloga</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Ukupna distribucija</p>
      </div>

      <div className="relative flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value">
              {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground tabular-nums">{activeOrders}</span>
          <span className="text-xs text-muted-foreground">aktivno</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {statusData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-medium text-foreground tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
