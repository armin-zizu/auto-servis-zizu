'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const statusData = [
  { name: 'Otvoren', value: 5, color: '#3b82f6' },
  { name: 'U toku', value: 6, color: '#f59e0b' },
  { name: 'Čeka dijelove', value: 3, color: '#8b5cf6' },
  { name: 'Spreman za preuzimanje', value: 4, color: '#10b981' },
  { name: 'Zatvoren', value: 47, color: '#94a3b8' },
  { name: 'Otkazan', value: 2, color: '#ef4444' },
];

const total = statusData.reduce((sum, d) => sum + d.value, 0);

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-3 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.payload.color }}
          />
          <span className="font-medium text-foreground">{item.name}</span>
        </div>
        <p className="text-muted-foreground mt-1">
          {item.value} naloga ·{' '}
          <span className="font-semibold text-foreground">
            {((item.value / total) * 100).toFixed(1)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default function OrderStatusPieChart() {
  const activeOrders = statusData
    .filter((d) => !['Zatvoren', 'Otkazan'].includes(d.name))
    .reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5 h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-foreground">
          Status naloga
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ukupna distribucija
        </p>
      </div>

      <div className="relative flex-1 min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {statusData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {activeOrders}
          </span>
          <span className="text-xs text-muted-foreground">aktivno</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {statusData.map((item) => (
          <div key={`legend-${item.name}`} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
