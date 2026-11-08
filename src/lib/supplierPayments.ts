'use client';

import {
  PartLineItem,
  SupplierPaymentRecord,
  WorkOrder,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { orderFinanceDate } from './financeData';

export function supplierOrderAmount(order: WorkOrder, supplier = 'Motorex'): number {
  if (order.status !== 'Zatvoren') return 0;
  return (order.parts ?? []).reduce((total: number, part: PartLineItem) => {
    if ((part.supplier?.trim() || order.supplier?.trim() || 'Motorex') !== supplier) return total;
    const rebatePct =
      part.category === 'oil'
        ? Number(order.supplierOilDiscountPct) || 0
        : Number(order.supplierPartsDiscountPct) || 0;
    return total + Number(part.qty || 0) * Number(part.unitCost || 0) * (1 - rebatePct / 100);
  }, 0);
}

export function supplierPaidAmount(order: WorkOrder, supplier = 'Motorex'): number {
  return (order.supplierPaymentAllocations ?? [])
    .filter((allocation) => allocation.supplier === supplier)
    .reduce((total, allocation) => total + Number(allocation.amount || 0), 0);
}

export function supplierRemainingAmount(order: WorkOrder, supplier = 'Motorex'): number {
  return Math.max(0, supplierOrderAmount(order, supplier) - supplierPaidAmount(order, supplier));
}

export function orderSupplierPaymentState(
  order: WorkOrder,
  supplier?: string
): 'unpaid' | 'partial' | 'paid' {
  if (supplier) {
    if (supplierRemainingAmount(order, supplier) <= 0) {
      return supplierPaidAmount(order, supplier) > 0 ? 'paid' : 'unpaid';
    }
    return supplierPaidAmount(order, supplier) > 0 ? 'partial' : 'unpaid';
  }

  const suppliers = [
    ...new Set(
      (order.parts ?? [])
        .filter((part) => Number(part.qty) * Number(part.unitCost) > 0)
        .map((part) => part.supplier?.trim() || order.supplier?.trim() || 'Motorex')
    ),
  ];
  const amountDue = suppliers.reduce((sum, name) => sum + supplierOrderAmount(order, name), 0);
  const amountPaid = suppliers.reduce((sum, name) => sum + supplierPaidAmount(order, name), 0);
  if (amountDue <= 0 || amountPaid <= 0) return 'unpaid';
  return amountDue - amountPaid <= 0.005 ? 'paid' : 'partial';
}

export function lastSupplierPaymentDate(
  records: SupplierPaymentRecord[],
  supplier = 'Motorex'
): string {
  const matching = records.filter((record) => record.supplier === supplier && record.paidAt);
  if (!matching.length) return '';
  return [...matching].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0].paidAt.slice(0, 10);
}

export function dateWithinRange(order: WorkOrder, from: string, to: string): boolean {
  const date = orderFinanceDate(order);
  return (!from || date >= from) && (!to || date <= to);
}
