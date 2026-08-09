import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import WorkOrdersClient from './components/WorkOrdersClient';

// Backend integration point: fetch all work orders
// GET /api/work-orders?page=1&limit=10&status=all&mechanic=all

export default function WorkOrderManagementPage() {
  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Učitavanje radnih naloga…</div>}>
        <WorkOrdersClient />
      </Suspense>
    </AppLayout>
  );
}