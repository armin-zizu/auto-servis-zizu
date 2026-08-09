import React from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';

const revenueRows = [
  { label: 'Prihod od rada', value: 15468, detail: '62.4% ukupnog prihoda' },
  { label: 'Prihod od dijelova', value: 9342, detail: '37.6% ukupnog prihoda' },
  { label: 'Ukupni prihod', value: 24810, detail: 'Avgust 2026 do danas' },
];

export default function RevenuePage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">Prihodi</h1>
          <p className="text-sm text-muted-foreground mt-1">Pregled prihoda od početka mjeseca</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Prihod MTD</h2>
          </div>
          <div className="divide-y divide-border">
            {revenueRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{row.detail}</p>
                </div>
                <p className="text-lg font-bold text-foreground tabular-nums">{row.value.toLocaleString()} KM</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
