'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const RevenueBarChart = dynamic(() => import('./RevenueBarChart'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-muted rounded-xl h-64 w-full" />
  ),
});

const OrderStatusPieChart = dynamic(() => import('./OrderStatusPieChart'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-muted rounded-xl h-64 w-full" />
  ),
});

export default function DashboardChartsRow() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <RevenueBarChart />
      </div>
      <div>
        <OrderStatusPieChart />
      </div>
    </div>
  );
}