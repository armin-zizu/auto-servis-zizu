'use client';

import { useEffect, useMemo, useState } from 'react';
import { WorkOrder, ORDERS_STORAGE_KEY } from '@/app/work-order-managment/data/mockWorkOrders';
import { readCache, pull, subscribe, SYNC_EVENT } from './syncStore';

export interface PayoutRecord {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  date: string;
  note?: string;
}

export interface FinanceSummary {
  revenue: number;
  laborRevenue: number;
  partsRevenue: number;
  partsCost: number;
  payoutsTotal: number;
  unpaidPayouts: number;
  mechanicEarnings: number;
  operatingProfit: number;
  closedOrders: number;
}

const PAYOUTS_STORAGE_KEY = 'autoservis-payouts';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export type PeriodMode = 'month' | 'range';

export interface PeriodFilter {
  mode: PeriodMode;
  /** YYYY-MM when mode is 'month' */
  month?: string;
  /** YYYY-MM-DD bounds when mode is 'range' (inclusive) */
  from?: string;
  to?: string;
}

/** Order date used for finance calculations: the day work was done. */
export function orderFinanceDate(order: WorkOrder): string {
  return order.workDate || order.updatedAt || order.createdAt;
}

export function orderInPeriod(order: WorkOrder, period: PeriodFilter): boolean {
  const date = orderFinanceDate(order);
  if (!date) return false;
  if (period.mode === 'month') {
    return date.slice(0, 7) === period.month;
  }
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}

export function orderPartsCost(order: WorkOrder): number {
  if (order.partsPurchaseCost !== undefined) return Number(order.partsPurchaseCost) || 0;
  return order.parts.reduce((total, part) => {
    const rebatePct = part.category === 'oil'
      ? Number(order.supplierOilDiscountPct) || 0
      : Number(order.supplierPartsDiscountPct) || 0;
    return total + part.qty * part.unitCost * (1 - rebatePct / 100);
  }, 0);
}

/** Selling total for parts after the discount given to the customer. */
export function orderPartsSales(order: WorkOrder): number {
  const rawPartsTotal = order.parts.reduce((total, part) => total + part.qty * part.unitCost, 0);
  const customerDiscountPct = Math.min(100, Math.max(0, Number(order.discountPct) || 0));
  return rawPartsTotal * (1 - customerDiscountPct / 100);
}

export function orderPartsRebate(order: WorkOrder): number {
  return orderPartsSales(order) - orderPartsCost(order);
}

export function orderServiceProfit(order: WorkOrder): number {
  return (Number(order.laborTotal) || 0) + orderPartsRebate(order);
}

function dateInPeriod(date: string, period: PeriodFilter): boolean {
  if (period.mode === 'month') return date.slice(0, 7) === period.month;
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}

export function useFinanceSummary(period?: PeriodFilter): FinanceSummary {
  const [version, setVersion] = useState(0);
  const periodKey = period
    ? period.mode === 'month'
      ? `m:${period.month}`
      : `r:${period.from}:${period.to}`
    : 'current';

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    const keys = [ORDERS_STORAGE_KEY, PAYOUTS_STORAGE_KEY];
    const unsubscribers = keys.map((key) => subscribe(key, refresh));
    void Promise.all(keys.map((key) => pull(key))).then(refresh);
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return useMemo(() => {
    const orders = readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []);
    const payouts = readCache<PayoutRecord[]>(PAYOUTS_STORAGE_KEY, []);
    const activePeriod: PeriodFilter = period ?? { mode: 'month', month: currentMonth() };
    const closedOrders = orders.filter(
      (order) => order.status === 'Zatvoren' && orderInPeriod(order, activePeriod)
    );
    const periodPayouts = payouts.filter(
      (payout) => payout.date && dateInPeriod(payout.date, activePeriod)
    );
    const mechanicEarnings = periodPayouts.reduce(
      (total, payout) => total + (Number(payout.amount) || 0),
      0
    );
    const partsCost = closedOrders.reduce((total, order) => total + orderPartsCost(order), 0);
    const partsRevenue = closedOrders.reduce((total, order) => total + orderPartsRebate(order), 0);
    const laborRevenue = closedOrders.reduce(
      (total, order) => total + (Number(order.laborTotal) || 0),
      0
    );
    const revenue = laborRevenue + partsRevenue;

    return {
      revenue,
      laborRevenue,
      partsRevenue,
      partsCost,
      payoutsTotal: mechanicEarnings,
      unpaidPayouts: periodPayouts
        .filter((record) => !record.paid)
        .reduce((total, record) => total + (Number(record.amount) || 0), 0),
      mechanicEarnings,
      // Revenue already includes only the earned rebate margin on parts; parts
      // procurement is shown separately and is not deducted a second time.
      operatingProfit: revenue - mechanicEarnings,
      closedOrders: closedOrders.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, periodKey]);
}
