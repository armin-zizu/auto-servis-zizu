'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  } from 'recharts';

const data = [
  { day: 'Jul 23', revenue: 1820, partsCost: 680 },
  { day: 'Jul 24', revenue: 2340, partsCost: 910 },
  { day: 'Jul 25', revenue: 980, partsCost: 340 },
  { day: 'Jul 26', revenue: 0, partsCost: 0 },
  { day: 'Jul 27', revenue: 0, partsCost: 0 },
  { day: 'Jul 28', revenue: 3120, partsCost: 1240 },
  { day: 'Jul 29', revenue: 2680, partsCost: 890 },
  { day: 'Jul 30', revenue: 1950, partsCost: 720 },
  { day: 'Jul 31', revenue: 4210, partsCost: 1580 },
  { day: 'Aug 1', revenue: 3840, partsCost: 1420 },
  { day: 'Aug 2', revenue: 0, partsCost: 0 },
  { day: 'Aug 3', revenue: 0, partsCost: 0 },
  { day: 'Aug 4', revenue: 5120, partsCost: 1980 },
  { day: 'Aug 5', revenue: 4680, partsCost: 1760 },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card-hover p-3 text-sm min-w-[160px]">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry) => (
          <div
            key={`tooltip-${entry.name}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {entry.value.toLocaleString()} KM
            </span>
          </div>
        ))}
        {payload.length === 2 && payload[0].value > 0 && (
          <div className="mt-2 pt-2 border-t border-border flex justify-between">
            <span className="text-muted-foreground">Gross Margin</span>
            <span className="font-semibold text-emerald-600 tabular-nums">
              {(payload[0].value - payload[1].value).toLocaleString()} KM
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function RevenueBarChart() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Prihod vs Trošak dijelova
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posljednjih 14 dana · Dnevni pregled
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
            Prihod
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
            Trošak dijelova
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
          barGap={2}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k KM`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
          <Bar dataKey="revenue" name="Prihod" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="partsCost" name="Trošak dijelova" fill="var(--accent)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}