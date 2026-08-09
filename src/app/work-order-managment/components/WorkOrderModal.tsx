'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import {
  WorkOrder,
  PartLineItem,
  LaborEntry,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { OrderStatus } from '@/components/ui/StatusBadge';
import { mechanicOptions, useMechanics } from '@/lib/mechanics';
import { defaultSession, readSession } from '@/lib/session';

const FIXED_MECHANIC_PAYOUT_PCT = 10;
const STATUSES: OrderStatus[] = [
  'Otvoren',
  'U toku',
  'Čeka dijelove',
  'Spreman za preuzimanje',
  'Zatvoren',
  'Otkazan',
];

interface FormValues {
  clientName: string;
  clientPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVin: string;
  mechanic: string;
  mechanicPayoutPct: number;
  status: OrderStatus;
  discountPct: number;
  notes: string;
  parts: PartLineItem[];
  laborEntries: LaborEntry[];
}

interface WorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: WorkOrder | null;
  onSave: (order: WorkOrder) => void;
}

let orderCounter = 90;

export default function WorkOrderModal({ open, onClose, order, onSave }: WorkOrderModalProps) {
  const [saving, setSaving] = useState(false);
  const { mechanics } = useMechanics();
  const [session, setSession] = useState(defaultSession);
  const availableMechanics = mechanicOptions(mechanics, order?.mechanic);
  const isMechanicUser = session.userRole === 'mechanic';
  const assignableMechanics = isMechanicUser
    ? Array.from(new Set([session.userName, ...(order ? [order.mechanic] : [])]))
    : availableMechanics;
  const defaultMechanicName = isMechanicUser ? session.userName : (availableMechanics[0] ?? '');

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      clientName: '',
      clientPhone: '',
      vehicleYear: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleVin: '',
      mechanic: '',
      mechanicPayoutPct: FIXED_MECHANIC_PAYOUT_PCT,
      status: 'Otvoren',
      discountPct: 0,
      notes: '',
      parts: [{ id: 'part-new-1', name: '', qty: 1, unitCost: 0, category: 'part' }],
      laborEntries: [{ id: 'labor-new-1', description: '', hours: 1, rate: 85 }],
    },
  });

  const {
    fields: partFields,
    append: appendPart,
    remove: removePart,
  } = useFieldArray({ control, name: 'parts' });

  const {
    fields: laborFields,
    append: appendLabor,
    remove: removeLabor,
  } = useFieldArray({ control, name: 'laborEntries' });

  useEffect(() => {
    if (open) {
      setSession(readSession());
      if (order) {
        reset({
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          vehicleYear: order.vehicleYear,
          vehicleMake: order.vehicleMake,
          vehicleModel: order.vehicleModel,
          vehicleVin: order.vehicleVin,
          mechanic: order.mechanic,
          mechanicPayoutPct: FIXED_MECHANIC_PAYOUT_PCT,
          status: order.status,
          discountPct: order.discountPct,
          notes: order.notes,
          parts: order.parts,
          laborEntries: order.laborEntries,
        });
      } else {
        reset({
          clientName: '',
          clientPhone: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleVin: '',
          mechanic: defaultMechanicName,
          mechanicPayoutPct: FIXED_MECHANIC_PAYOUT_PCT,
          status: 'Otvoren',
          discountPct: 0,
          notes: '',
          parts: [{ id: 'part-new-1', name: '', qty: 1, unitCost: 0, category: 'part' }],
          laborEntries: [{ id: 'labor-new-1', description: '', hours: 1, rate: 85 }],
        });
      }
    }
  }, [open, order, reset, defaultMechanicName]);

  const watchedParts = watch('parts');
  const watchedLabor = watch('laborEntries');
  const watchedDiscount = watch('discountPct');
  const watchedPayoutPct = watch('mechanicPayoutPct');

  const rawPartsTotal = watchedParts.reduce(
    (s, p) => s + (Number(p.qty) || 0) * (Number(p.unitCost) || 0),
    0
  );
  const discountAmount = rawPartsTotal * ((Number(watchedDiscount) || 0) / 100);
  const partsTotal = rawPartsTotal - discountAmount;
  const laborTotal = watchedLabor.reduce(
    (s, l) => s + (Number(l.hours) || 0) * (Number(l.rate) || 0),
    0
  );
  const orderTotal = partsTotal + laborTotal;
  const mechanicPayout = laborTotal * ((Number(watchedPayoutPct) || 0) / 100);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const id = order?.id ?? `order-new-${Date.now()}`;
    const orderNum = order?.orderNum ?? `WO-2026-${String(orderCounter++).padStart(4, '0')}`;
    const saved: WorkOrder = {
      id,
      orderNum,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      vehicleYear: data.vehicleYear,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleVin: data.vehicleVin,
      vehicle: `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}`,
      mechanic: data.mechanic,
      mechanicPayoutPct: FIXED_MECHANIC_PAYOUT_PCT,
      status: data.status,
      parts: data.parts,
      laborEntries: data.laborEntries,
      discountPct: Number(data.discountPct),
      partsTotal,
      laborTotal,
      orderTotal,
      mechanicPayout,
      notes: data.notes,
      createdBy: order?.createdBy ?? session.userName,
      createdByRole: order?.createdByRole ?? session.userRole,
      createdAt: order?.createdAt ?? new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setSaving(false);
    onSave(saved);
  };

  const isEditing = !!order;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Uredi ${order?.orderNum}` : 'Novi radni nalog'}
      subtitle={
        isEditing
          ? `${order?.clientName} · ${order?.vehicle}`
          : 'Kreirajte novi radni nalog za vozilo klijenta'
      }
      size="2xl"
      footer={
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={13} />
                Nespremljene promjene
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              form="work-order-form"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all duration-150 active:scale-95 flex items-center gap-2 min-w-[130px] justify-center"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Snimanje…
                </>
              ) : isEditing ? (
                'Spremi promjene'
              ) : (
                'Kreiraj radni nalog'
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="work-order-form" onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {/* Sekcija 1: Klijent */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              1
            </span>
            Podaci o klijentu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Ime klijenta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="npr. Rafael Dominguez"
                {...register('clientName', { required: 'Ime klijenta je obavezno' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {errors.clientName && (
                <p className="text-xs text-red-500 mt-1">{errors.clientName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Broj telefona
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="(512) 883-4201"
                {...register('clientPhone')}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 2: Vozilo */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              2
            </span>
            Podaci o vozilu
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Godina <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="2019"
                maxLength={4}
                {...register('vehicleYear', { required: 'Godina je obavezna' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {errors.vehicleYear && (
                <p className="text-xs text-red-500 mt-1">{errors.vehicleYear.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Marka <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Toyota"
                {...register('vehicleMake', { required: 'Marka je obavezna' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {errors.vehicleMake && (
                <p className="text-xs text-red-500 mt-1">{errors.vehicleMake.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Camry"
                {...register('vehicleModel', { required: 'Model je obavezan' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {errors.vehicleModel && (
                <p className="text-xs text-red-500 mt-1">{errors.vehicleModel.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">VIN</label>
              <p className="text-xs text-muted-foreground mb-1.5">Opciono · 17 znakova</p>
              <input
                type="text"
                placeholder="4T1B11HK6KU234781"
                maxLength={17}
                {...register('vehicleVin')}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground font-mono"
              />
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 3: Dodjela */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              3
            </span>
            Dodjela i status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Dodijeljeni majstor <span className="text-red-500">*</span>
              </label>
              <select
                {...register('mechanic', { required: 'Majstor je obavezan' })}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {assignableMechanics.length === 0 && (
                  <option value="">Nema aktivnih majstora</option>
                )}
                {assignableMechanics.map((m) => (
                  <option key={`opt-mech-${m}`} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {errors.mechanic && (
                <p className="text-xs text-red-500 mt-1">{errors.mechanic.message}</p>
              )}
              {!isMechanicUser && assignableMechanics.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Dodajte aktivnog majstora na stranici Majstori.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Status naloga
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={`opt-status-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 4: Dijelovi */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                4
              </span>
              Dijelovi i materijal
            </h3>
            <button
              type="button"
              onClick={() =>
                appendPart({
                  id: `part-new-${Date.now()}`,
                  name: '',
                  qty: 1,
                  unitCost: 0,
                  category: 'part',
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={13} />
              Dodaj dio
            </button>
          </div>

          {/* Polje za popust */}
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <label className="text-xs font-medium text-foreground whitespace-nowrap">
              Popust za klijenta %
            </label>
            <p className="text-xs text-muted-foreground flex-1">
              Popust koji se prikazuje klijentu na fakturi
            </p>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.5}
              {...register('discountPct', {
                valueAsNumber: true,
                min: { value: 0, message: 'Min 0' },
                max: { value: 100, message: 'Max 100' },
              })}
              className="w-20 px-3 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring tabular-nums text-right"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>

          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Naziv dijela / Opis
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-20">
                    Kol.
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">
                    Jed. cijena
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">
                    Ukupno
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partFields.map((field, idx) => {
                  const qty = Number(watchedParts[idx]?.qty) || 0;
                  const unitCost = Number(watchedParts[idx]?.unitCost) || 0;
                  const lineTotal = qty * unitCost;
                  return (
                    <tr key={field.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <select
                          {...register(`parts.${idx}.category`)}
                          className="mb-1 w-full px-2 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                          aria-label="Kategorija stavke"
                        >
                          <option value="part">Dio</option>
                          <option value="oil">Ulje</option>
                        </select>
                        <input
                          type="text"
                          placeholder="npr. Filter ulja"
                          {...register(`parts.${idx}.name`, {
                            required: 'Naziv dijela je obavezan',
                          })}
                          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                        />
                        <label className="inline-flex items-center gap-1.5 mt-1 text-xs text-primary cursor-pointer">
                          Dodaj sliku dijela
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => {
                              const files = Array.from(event.target.files || []);
                              if (!files.length) return;
                              Promise.all(
                                files.map(
                                  (file) =>
                                    new Promise<string>((resolve, reject) => {
                                      const reader = new FileReader();
                                      reader.onload = () => resolve(String(reader.result));
                                      reader.onerror = reject;
                                      reader.readAsDataURL(file);
                                    })
                                )
                              ).then((newImages) => {
                                const currentImages =
                                  watchedParts[idx]?.images ||
                                  (watchedParts[idx]?.image ? [watchedParts[idx].image] : []);
                                setValue(`parts.${idx}.images`, [...currentImages, ...newImages], {
                                  shouldDirty: true,
                                });
                              });
                            }}
                          />
                        </label>
                        {(
                          watchedParts[idx]?.images ||
                          (watchedParts[idx]?.image ? [watchedParts[idx].image] : [])
                        ).map((image, imageIndex) => (
                          <span
                            key={`${field.id}-image-${imageIndex}`}
                            className="relative inline-block mt-1 mr-1"
                          >
                            <img
                              src={image}
                              alt={`Slika dijela ${watchedParts[idx]?.name || idx + 1} ${imageIndex + 1}`}
                              className="h-10 w-10 rounded object-cover border border-border"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const images = watchedParts[idx]?.images || [];
                                setValue(
                                  `parts.${idx}.images`,
                                  images.filter((_, currentIndex) => currentIndex !== imageIndex),
                                  { shouldDirty: true }
                                );
                              }}
                              className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] leading-none"
                              aria-label="Ukloni sliku"
                            >
                              x
                            </button>
                          </span>
                        ))}
                        {errors.parts?.[idx]?.name && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {errors.parts[idx]?.name?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          {...register(`parts.${idx}.qty`, {
                            valueAsNumber: true,
                            min: 1,
                          })}
                          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            KM
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.01}
                            {...register(`parts.${idx}.unitCost`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                            className="w-full pl-2 pr-8 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {lineTotal.toFixed(2)} KM
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removePart(idx)}
                          disabled={partFields.length === 1}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Ukloni dio"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t border-border">
                  <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground text-right">
                    Međuzbir dijelova
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-medium tabular-nums text-foreground">
                    {rawPartsTotal.toFixed(2)} KM
                  </td>
                  <td />
                </tr>
                {Number(watchedDiscount) > 0 && (
                  <tr className="bg-emerald-50/50 border-t border-border">
                    <td colSpan={3} className="px-3 py-2 text-xs text-emerald-700 text-right">
                      Popust ({watchedDiscount}%)
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium tabular-nums text-emerald-700">
                      −{discountAmount.toFixed(2)} KM
                    </td>
                    <td />
                  </tr>
                )}
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-xs font-semibold text-foreground text-right"
                  >
                    Ukupno dijelovi (nakon popusta)
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-foreground">
                    {partsTotal.toFixed(2)} KM
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 5: Rad */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                5
              </span>
              Stavke rada
            </h3>
            <button
              type="button"
              onClick={() =>
                appendLabor({
                  id: `labor-new-${Date.now()}`,
                  description: '',
                  hours: 1,
                  rate: 85,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={13} />
              Dodaj rad
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Opis usluge
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-24">
                    Sati
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">
                    Cijena/sat
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">
                    Međuzbir
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {laborFields.map((field, idx) => {
                  const hours = Number(watchedLabor[idx]?.hours) || 0;
                  const rate = Number(watchedLabor[idx]?.rate) || 0;
                  const subtotal = hours * rate;
                  return (
                    <tr key={field.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="npr. Zamjena sintetičkog ulja"
                          {...register(`laborEntries.${idx}.description`, {
                            required: 'Opis je obavezan',
                          })}
                          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                        />
                        {errors.laborEntries?.[idx]?.description && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {errors.laborEntries[idx]?.description?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0.25}
                          step={0.25}
                          {...register(`laborEntries.${idx}.hours`, {
                            valueAsNumber: true,
                            min: 0.25,
                          })}
                          className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            KM
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={5}
                            {...register(`laborEntries.${idx}.rate`, {
                              valueAsNumber: true,
                              min: 0,
                            })}
                            className="w-full pl-2 pr-8 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {subtotal.toFixed(2)} KM
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLabor(idx)}
                          disabled={laborFields.length === 1}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Ukloni stavku rada"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t-2 border-border">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-xs font-semibold text-foreground text-right"
                  >
                    Ukupno rad
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-foreground">
                    {laborTotal.toFixed(2)} KM
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 6: Finansijski sažetak */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calculator size={15} className="text-primary" />
            Finansijski sažetak naloga
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Ukupno dijelovi
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {partsTotal.toFixed(2)} KM
              </p>
              {Number(watchedDiscount) > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  −{discountAmount.toFixed(2)} KM pop.
                </p>
              )}
            </div>
            <div className="text-center p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Ukupno rad
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {laborTotal.toFixed(2)} KM
              </p>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-primary uppercase tracking-wide mb-1 font-medium">
                Ukupno nalog
              </p>
              <p className="text-lg font-bold tabular-nums text-primary">
                {orderTotal.toFixed(2)} KM
              </p>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* Sekcija 7: Napomene */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              6
            </span>
            Interne napomene
          </h3>
          <textarea
            rows={3}
            placeholder="Napomene o poslu — zahtjevi klijenta, naručeni dijelovi, posebne upute…"
            {...register('notes')}
            className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
          />
        </section>
      </form>
    </Modal>
  );
}
