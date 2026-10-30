'use client';

import { PartLineItem, SupplierPaymentRecord, WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';
import { orderFinanceDate } from './financeData';

export function supplierOrderAmount(order: WorkOrder, supplier = 'Motorex'): number {
  if (order.status !== 'Zatvoren') return 0;
  return (order.parts ?? []).reduce((total: number, part: PartLineItem) => {
    if ((part.supplier || 'Motorex') !== supplier) return total;
    const rebatePct = part.category === 'oil'
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

export function orderSupplierPaymentState(order: WorkOrder, supplier = 'Motorex'): 'unpaid' | 'partial' | 'paid' {
  if (supplierRemainingAmount(order, supplier) <= 0) {
    return supplierPaidAmount(order, supplier) > 0 ? 'paid' : 'unpaid';
  }
  return supplierPaidAmount(order, supplier) > 0 ? 'partial' : 'unpaid';
}

export function lastSupplierPaymentDate(records: SupplierPaymentRecord[], supplier = 'Motorex'): string {
  const matching = records.filter((record) => record.supplier === supplier && record.paidAt);
  if (!matching.length) return '';
  return [...matching].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0].paidAt.slice(0, 10);
}

export function dateWithinRange(order: WorkOrder, from: string, to: string): boolean {
  const date = orderFinanceDate(order);
  return (!from || date >= from) && (!to || date <= to);
}
