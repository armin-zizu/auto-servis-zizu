import React from 'react';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from '@/app/components/MetricsBentoGrid';
import RecentOrdersTable from './components/RecentOrdersTable';
import MechanicPayoutList from '@/app/components/MechanicPayoutList';
import DashboardChartsRow from './components/DashboardChartsRow';

// Backend integration point: fetch dashboard summary data from API
// GET /api/dashboard/summary?period=mtd&role=owner

export default function DashboardPage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
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
