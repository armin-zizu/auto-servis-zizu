import React from 'react';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import RecentOrdersTable from './components/RecentOrdersTable';
import MechanicPayoutList from './components/MechanicPayoutList';
import DashboardChartsRow from './components/DashboardChartsRow';

// Backend integration point: fetch dashboard summary data from API
// GET /api/dashboard/summary?period=mtd&role=owner

export default function DashboardPage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Kontrolna tabla</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pregled radionice · Avgust 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Uživo · Upravo ažurirano
            </span>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <MetricsBentoGrid />

        {/* Charts Row */}
        <DashboardChartsRow />

        {/* Bottom Row: Recent Orders + Mechanic Payouts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentOrdersTable />
          </div>
          <div>
            <MechanicPayoutList />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}