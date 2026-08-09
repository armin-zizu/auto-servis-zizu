'use client';

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { WorkOrder } from '@/app/work-order-managment/data/mockWorkOrders';

interface CompleteWorkOrderModalProps {
  open: boolean;
  order: WorkOrder | null;
  onClose: () => void;
  onConfirm: (partsDiscountPct: number, oilDiscountPct: number) => void;
}

export default function CompleteWorkOrderModal({
  open,
  order,
  onClose,
  onConfirm,
}: CompleteWorkOrderModalProps) {
  const [partsDiscountPct, setPartsDiscountPct] = useState('');
  const [oilDiscountPct, setOilDiscountPct] = useState('');

  const handleConfirm = () => {
    const normalize = (value: string) => Math.min(100, Math.max(0, Number(value) || 0));
    onConfirm(normalize(partsDiscountPct), normalize(oilDiscountPct));
    setPartsDiscountPct('');
    setOilDiscountPct('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Završi radni nalog"
      subtitle={order ? `${order.orderNum} · ${order.clientName}` : undefined}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-muted rounded-lg">
            Otkaži
          </button>
          <button type="button" onClick={handleConfirm} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Završi nalog
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-3 p-3 bg-primary/5 border border-primary/15 rounded-lg">
          <Calculator size={17} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unesite popust koji ste dobili od dobavljača. Polja nisu obavezna; prazno polje znači 0% popusta.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-foreground">
            Popust dobavljača na dijelove (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={partsDiscountPct}
              onChange={(event) => setPartsDiscountPct(event.target.value)}
              placeholder="0"
              className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="text-xs font-medium text-foreground">
            Popust na ulje (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={oilDiscountPct}
              onChange={(event) => setOilDiscountPct(event.target.value)}
              placeholder="0"
              className="mt-1 w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}
