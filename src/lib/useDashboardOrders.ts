'use client';

import { useEffect, useState } from 'react';
import {
  ORDERS_STORAGE_KEY,
  mockWorkOrders,
  WorkOrder,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, pull, subscribe, SYNC_EVENT } from './syncStore';

function readOrders(): WorkOrder[] {
  return readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, mockWorkOrders);
}

/** The dashboard uses the exact same order store as the work-orders page. */
export function useDashboardOrders(): WorkOrder[] {
  const [orders, setOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    const refresh = () => setOrders(readOrders());
    refresh();
    // Always fetch the latest from Supabase — realtime alone is not reliable
    // (it can silently fail), so this guarantees fresh data on every mount.
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then(refresh);
    const unsubscribe = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return orders;
}

export function orderDate(order: WorkOrder): Date {
  const value = order.updatedAt || order.createdAt;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
