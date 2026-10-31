'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { ArrowRight, Building2, Plus, Trash2 } from 'lucide-react';
import {
  SUPPLIER_PAYMENTS_STORAGE_KEY,
  SUPPLIERS_STORAGE_KEY,
  DEFAULT_SUPPLIER,
  DEFAULT_SUPPLIERS,
  SupplierPaymentRecord,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { pull, readCache, subscribe, writeCache, push } from '@/lib/syncStore';
import { supplierSlug } from '@/lib/supplierRoutes';

const money = (value: number) =>
  `${value.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`;

export default function SuppliersPage() {
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [newSupplier, setNewSupplier] = useState('');

  useEffect(() => {
    const refresh = () => {
      setPayments(readCache<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY, []));
      setSuppliers(readCache<string[]>(SUPPLIERS_STORAGE_KEY, DEFAULT_SUPPLIERS));
    };
    refresh();
    void pull<SupplierPaymentRecord[]>(SUPPLIER_PAYMENTS_STORAGE_KEY).then(refresh);
    void pull<string[]>(SUPPLIERS_STORAGE_KEY).then(refresh);
    const unsubSuppliers = subscribe<string[]>(SUPPLIERS_STORAGE_KEY, refresh);
    const unsubPayments = subscribe<SupplierPaymentRecord[]>(
      SUPPLIER_PAYMENTS_STORAGE_KEY,
      refresh
    );
    return () => {
      unsubSuppliers();
      unsubPayments();
    };
  }, []);

  const addSupplier = () => {
    const name = newSupplier.trim();
    if (
      !name ||
      suppliers.some((supplier) => supplier.toLocaleLowerCase() === name.toLocaleLowerCase())
    )
      return;
    const next = [...suppliers, name];
    setSuppliers(next);
    writeCache(SUPPLIERS_STORAGE_KEY, next);
    void push(SUPPLIERS_STORAGE_KEY, next);
    setNewSupplier('');
  };

  const removeSupplier = (supplier: string) => {
    if (supplier.toLocaleLowerCase() === DEFAULT_SUPPLIER.toLocaleLowerCase()) return;
    if (!window.confirm(`Obrisati dobavljača ${supplier}?`)) return;
    const next = suppliers.filter((item) => item !== supplier);
    setSuppliers(next);
    writeCache(SUPPLIERS_STORAGE_KEY, next);
    void push(SUPPLIERS_STORAGE_KEY, next);
  };

  return (
    <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com">
      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Plaćanja</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Dobavljači</h1>
          <p className="mt-1 text-sm text-muted-foreground">Zbirna plaćanja po dobavljaču.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newSupplier}
            onChange={(event) => setNewSupplier(event.target.value)}
            placeholder="Naziv dobavljača"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm sm:max-w-sm"
          />
          <button
            type="button"
            onClick={addSupplier}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={15} /> Dodaj dobavljača
          </button>
        </div>
        <div className="space-y-3">
          {suppliers.map((supplier) => {
            const supplierPayments = payments.filter((payment) => payment.supplier === supplier);
            const supplierPaidTotal = supplierPayments.reduce(
              (sum, payment) => sum + Number(payment.amount || 0),
              0
            );
            const isDefaultSupplier =
              supplier.toLocaleLowerCase() === DEFAULT_SUPPLIER.toLocaleLowerCase();
            const href = isDefaultSupplier
              ? '/dobavljaci/motorex'
              : `/dobavljaci/${encodeURIComponent(supplierSlug(supplier))}`;
            return (
              <div
                key={supplier}
                className="group min-w-0 rounded-xl border border-border bg-card p-3 shadow-card transition hover:border-primary/30 hover:shadow-card-hover sm:p-5"
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <Link href={href} className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 size={21} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words font-semibold text-foreground">{supplier}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {supplierPayments.length} zbirnih uplata
                      </p>
                    </div>
                    <ArrowRight size={18} className="mt-1 shrink-0" />
                  </Link>
                  {!isDefaultSupplier && (
                    <button
                      type="button"
                      onClick={() => removeSupplier(supplier)}
                      aria-label={`Obriši dobavljača ${supplier}`}
                      title="Obriši dobavljača"
                      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                  <div className="min-w-0 rounded-lg bg-muted/40 p-2 sm:p-3">
                    <p className="text-xs text-muted-foreground">Ukupno plaćeno</p>
                    <p className="mt-1 break-words font-bold tabular-nums">
                      {money(supplierPaidTotal)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg bg-muted/40 p-2 sm:p-3">
                    <p className="text-xs text-muted-foreground">Zadnja uplata</p>
                    <p className="mt-1 break-words font-bold">
                      {supplierPayments[0]?.paidAt?.slice(0, 10) || '—'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
