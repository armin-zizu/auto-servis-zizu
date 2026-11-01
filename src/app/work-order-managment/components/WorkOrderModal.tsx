'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  FileText,
  Loader2,
  Upload,
  Camera,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import Tesseract from 'tesseract.js';
import {
  ORDERS_STORAGE_KEY,
  WorkOrder,
  PartLineItem,
  LaborEntry,
  DEFAULT_SUPPLIER,
  DEFAULT_SUPPLIERS,
  SUPPLIERS_STORAGE_KEY,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { OrderStatus } from '@/components/ui/StatusBadge';
import { mechanicOptions, useMechanics } from '@/lib/mechanics';
import { defaultSession, readSession } from '@/lib/session';
import { readCache, pull, subscribe } from '@/lib/syncStore';
import { parseEstimateText } from '../../../lib/estimateParser';

async function compressEstimateImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas nije dostupan');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Slika se ne može učitati'));
      reader.readAsDataURL(file);
    });
  }
}

async function prepareEstimateOcrImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas nije dostupan za obradu OCR slike');
  }

  context.filter = 'grayscale(1) contrast(1.5)';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function prepareRegistrationOcrImages(file: File): Promise<HTMLCanvasElement[]> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2, 2400 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const images = [0, 90, 180, 270].map((degrees) => {
    const canvas = document.createElement('canvas');
    canvas.width = degrees % 180 === 0 ? width : height;
    canvas.height = degrees % 180 === 0 ? height : width;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas nije dostupan za obradu saobraćajne');
    context.filter = 'grayscale(1) contrast(1.5)';
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((degrees * Math.PI) / 180);
    context.drawImage(bitmap, -width / 2, -height / 2, width, height);
    return canvas;
  });
  bitmap.close();
  return images;
}

function findVinCandidatesInOcrText(text: string): string[] {
  const lines = text.toUpperCase().split(/\r?\n/);
  const candidates = new Set<string>();
  for (const line of lines) {
    const compact = line
      .replace(/[|]/g, '1')
      .replace(/[OQ]/g, '0')
      .replace(/[^A-Z0-9]/g, '');
    for (let index = 0; index <= compact.length - 17; index += 1) {
      const candidate = compact.slice(index, index + 17);
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(candidate)) candidates.add(candidate);
    }
  }
  return [...candidates];
}

function findVinLabelLines(page: Tesseract.Page) {
  return (page.blocks ?? [])
    .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
    .filter((line) => /^\s*[([]?\s*E\s*[)\].:]?/i.test(line.text));
}

function cropRegistrationVinRow(image: HTMLCanvasElement, y0: number, y1: number) {
  const rowHeight = Math.max(24, y1 - y0);
  const top = Math.max(0, Math.floor(y0 - rowHeight * 0.8));
  const bottom = Math.min(image.height, Math.ceil(y1 + rowHeight * 0.8));
  const crop = document.createElement('canvas');
  crop.width = image.width;
  crop.height = Math.max(1, bottom - top);
  const context = crop.getContext('2d');
  if (!context) throw new Error('Canvas nije dostupan za izdvajanje VIN reda');
  context.drawImage(image, 0, top, image.width, crop.height, 0, 0, crop.width, crop.height);
  return crop;
}

const STATUSES: OrderStatus[] = [
  'Otvoren',
  'U toku',
  'Čeka dijelove',
  'Spreman za preuzimanje',
  'Zatvoren',
  'Otkazan',
];

interface FormValues {
  workDate: string;
  clientName: string;
  clientPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVin: string;
  mechanic: string;
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
  const [estimateImage, setEstimateImage] = useState('');
  const [registrationImage, setRegistrationImage] = useState('');
  const [estimateParts, setEstimateParts] = useState<PartLineItem[]>([]);
  const [readingEstimate, setReadingEstimate] = useState(false);
  const [readingRegistration, setReadingRegistration] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [estimateMessage, setEstimateMessage] = useState('');
  const [savedClientOrders, setSavedClientOrders] = useState<WorkOrder[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [orderSupplier, setOrderSupplier] = useState(DEFAULT_SUPPLIER);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const { mechanics } = useMechanics();
  const [session, setSession] = useState(defaultSession);
  const availableMechanics = mechanicOptions(mechanics, order?.mechanic);
  const isMechanicUser = session.userRole === 'mechanic';
  const assignableMechanics = isMechanicUser
    ? Array.from(new Set([session.userName, ...(order ? [order.mechanic] : [])]))
    : availableMechanics;
  const defaultMechanicName = isMechanicUser ? session.userName : (availableMechanics[0] ?? '');

  useEffect(() => {
    const refreshClients = () =>
      setSavedClientOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
    refreshClients();
    void pull<WorkOrder[]>(ORDERS_STORAGE_KEY).then((remote) => {
      if (remote) setSavedClientOrders(remote);
    });
    return subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, refreshClients);
  }, []);

  useEffect(() => {
    const refreshSuppliers = () => {
      const storedSuppliers = readCache<string[]>(SUPPLIERS_STORAGE_KEY, DEFAULT_SUPPLIERS);
      const uniqueSuppliers = Array.from(
        new Set(storedSuppliers.map((supplier) => supplier.trim()).filter(Boolean))
      );
      setAvailableSuppliers([
        DEFAULT_SUPPLIER,
        ...uniqueSuppliers.filter(
          (supplier) => supplier.toLocaleLowerCase() !== DEFAULT_SUPPLIER.toLocaleLowerCase()
        ),
      ]);
    };
    refreshSuppliers();
    void pull<string[]>(SUPPLIERS_STORAGE_KEY).then(refreshSuppliers);
    return subscribe<string[]>(SUPPLIERS_STORAGE_KEY, refreshSuppliers);
  }, []);

  const savedClients = React.useMemo(() => {
    const clients = new Map<string, WorkOrder>();
    for (const savedOrder of [...savedClientOrders].sort((a, b) =>
      `${b.workDate || b.updatedAt || b.createdAt}`.localeCompare(
        `${a.workDate || a.updatedAt || a.createdAt}`
      )
    )) {
      const name = savedOrder.clientName?.trim();
      if (name && !clients.has(name.toLocaleLowerCase())) {
        clients.set(name.toLocaleLowerCase(), savedOrder);
      }
    }
    return [...clients.values()];
  }, [savedClientOrders]);
  const matchingClients = clientSearchTerm.trim()
    ? savedClients
        .filter((client) =>
          client.clientName
            .toLocaleLowerCase()
            .includes(clientSearchTerm.trim().toLocaleLowerCase())
        )
        .slice(0, 8)
    : [];

  const applySavedClient = (client: WorkOrder) => {
    setValue('clientName', client.clientName, { shouldDirty: true, shouldValidate: true });
    setValue('clientPhone', client.clientPhone || '', { shouldDirty: true });
    setValue('vehicleYear', client.vehicleYear || '', { shouldDirty: true, shouldValidate: true });
    setValue('vehicleMake', client.vehicleMake || '', { shouldDirty: true, shouldValidate: true });
    setValue('vehicleModel', client.vehicleModel || '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('vehicleVin', client.vehicleVin || '', { shouldDirty: true });
  };

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
      status: 'Otvoren',
      discountPct: 0,
      notes: '',
      parts: [
        {
          id: 'part-new-1',
          name: '',
          qty: 1,
          unitCost: 0,
          category: 'part',
          supplier: DEFAULT_SUPPLIER,
        },
      ],
      laborEntries: [{ id: 'labor-new-1', description: 'Ruke', hours: 1, rate: 0 }],
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

  const partFormFields = partFields.map((field, idx) => (
    <React.Fragment key={`part-form-fields-${field.id}`}>
      <input
        type="hidden"
        {...register(`parts.${idx}.name`, { required: 'Naziv dijela je obavezan' })}
      />
      <input type="hidden" {...register(`parts.${idx}.category`)} />
      <input type="hidden" {...register(`parts.${idx}.qty`, { valueAsNumber: true, min: 0.01 })} />
      <input
        type="hidden"
        {...register(`parts.${idx}.unitCost`, { valueAsNumber: true, min: 0 })}
      />
    </React.Fragment>
  ));

  useEffect(() => {
    if (open) {
      setSession(readSession());
      setEstimateImage(order?.estimateImage ?? '');
      setRegistrationImage(order?.registrationImage ?? '');
      setOrderSupplier(
        order?.supplier?.trim() ||
          order?.parts.find((part) => part.supplier?.trim())?.supplier?.trim() ||
          DEFAULT_SUPPLIER
      );
      setEstimateParts([]);
      setEstimateMessage('');
      if (order) {
        reset({
          workDate: order.workDate || order.createdAt,
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          vehicleYear: order.vehicleYear,
          vehicleMake: order.vehicleMake,
          vehicleModel: order.vehicleModel,
          vehicleVin: order.vehicleVin,
          mechanic: order.mechanic,
          status: order.status,
          discountPct: order.discountPct,
          notes: order.notes,
          parts: order.parts.map((part) => ({
            ...part,
            supplier: part.supplier?.trim() || DEFAULT_SUPPLIER,
          })),
          laborEntries: order.laborEntries.map((entry) => ({
            ...entry,
            hours: 1,
            rate: (Number(entry.hours) || 0) * (Number(entry.rate) || 0),
          })),
        });
      } else {
        reset({
          workDate: new Date().toISOString().split('T')[0],
          clientName: '',
          clientPhone: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleVin: '',
          mechanic: defaultMechanicName,
          status: 'Otvoren',
          discountPct: 0,
          notes: '',
          parts: [
            {
              id: 'part-new-1',
              name: '',
              qty: 1,
              unitCost: 0,
              category: 'part',
              supplier: DEFAULT_SUPPLIER,
            },
          ],
          laborEntries: [{ id: 'labor-new-1', description: 'Ruke', hours: 1, rate: 0 }],
        });
      }
    }
  }, [open, order, reset, defaultMechanicName]);

  const watchedParts = watch('parts');
  const vehicleYear = watch('vehicleYear');
  const vehicleMake = watch('vehicleMake');
  const vehicleModel = watch('vehicleModel');
  const watchedLabor = watch('laborEntries');
  const watchedDiscount = watch('discountPct');

  const rawPartsTotal = watchedParts.reduce(
    (s, p) => s + (Number(p.qty) || 0) * (Number(p.unitCost) || 0),
    0
  );
  const discountAmount = rawPartsTotal * ((Number(watchedDiscount) || 0) / 100);
  const partsTotal = rawPartsTotal - discountAmount;
  const laborTotal = watchedLabor.reduce((sum, entry) => sum + (Number(entry.rate) || 0), 0);
  const orderTotal = partsTotal + laborTotal;

  const handleEstimateUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEstimateMessage('Odaberite fotografiju ili sliku predračuna.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setEstimateMessage('Slika je prevelika. Maksimalna veličina je 12 MB.');
      return;
    }

    setEstimateMessage('Pripremam sliku i prepoznajem tekst…');
    setReadingEstimate(true);
    setOcrProgress(0);
    setEstimateParts([]);
    let worker: Tesseract.Worker | null = null;
    try {
      const savedImage = await compressEstimateImage(file);
      setEstimateImage(savedImage);
      const ocrImage = await prepareEstimateOcrImage(file);
      worker = await Tesseract.createWorker('bos+eng', undefined, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });
      const result = await worker.recognize(ocrImage);
      const parsed = parseEstimateText(result.data.text);
      setEstimateParts(parsed);
      setEstimateMessage(
        parsed.length
          ? `Prepoznato stavki: ${parsed.length}. Provjerite naziv, količinu i cijenu sa PDV-om prije dodavanja.`
          : 'Slika je sačuvana, ali stavke nisu jasno prepoznate. Možete ih unijeti ručno.'
      );
    } catch (error) {
      console.error('OCR predračuna nije uspio:', error);
      setEstimateMessage(
        'Slika je dodana, ali prepoznavanje nije uspjelo. Provjerite vezu i unesite stavke ručno.'
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn('OCR worker nije zatvoren:', error);
        }
      }
      setReadingEstimate(false);
    }
  };

  const handleRegistrationUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEstimateMessage('Odaberite fotografiju ili sliku saobraćajne dozvole.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setEstimateMessage('Slika je prevelika. Maksimalna veličina je 12 MB.');
      return;
    }

    setReadingRegistration(true);
    setOcrProgress(0);
    setEstimateMessage('Čuvam saobraćajnu i prepoznajem VIN…');
    let worker: Tesseract.Worker | null = null;
    try {
      const [savedImage, ocrImages] = await Promise.all([
        compressEstimateImage(file),
        prepareRegistrationOcrImages(file),
      ]);
      setRegistrationImage(savedImage);
      worker = await Tesseract.createWorker('eng', undefined, {
        logger: (message) => {
          if (message.status === 'recognizing text') {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });

      const candidateScores = new Map<string, number>();
      const addCandidates = (text: string, score: number) => {
        for (const candidate of findVinCandidatesInOcrText(text)) {
          candidateScores.set(candidate, (candidateScores.get(candidate) ?? 0) + score);
          const normalizedMake = vehicleMake.toLocaleLowerCase().replace(/[^a-z]/g, '');
          const wmiHints =
            normalizedMake === 'vw' || normalizedMake.includes('volkswagen')
              ? ['WVW', '3VW', '9BW']
              : normalizedMake.includes('volvo')
                ? ['YV1', 'YV4']
                : [];
          for (const prefix of wmiHints) {
            if (!candidate.startsWith(prefix)) {
              const hintedCandidate = `${prefix}${candidate.slice(3)}`;
              candidateScores.set(
                hintedCandidate,
                (candidateScores.get(hintedCandidate) ?? 0) + Math.max(1, score - 4)
              );
            }
          }
        }
      };
      for (let index = 0; index < ocrImages.length; index += 1) {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          tessedit_char_whitelist: '',
        });
        const result = await worker.recognize(ocrImages[index], {}, { blocks: true });
        const vinLines = findVinLabelLines(result.data);
        vinLines.forEach((line) => addCandidates(line.text, 5));
        result.data.text
          .split(/\r?\n/)
          .filter((line) => /^\s*[([]?\s*E\s*[)\].:]?/i.test(line))
          .forEach((line) => addCandidates(line, 4));
        addCandidates(result.data.text, 1);
        if (vinLines.length) {
          await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          });
          for (const line of vinLines) {
            const row = cropRegistrationVinRow(ocrImages[index], line.bbox.y0, line.bbox.y1);
            const rowResult = await worker.recognize(row, {}, { blocks: false });
            addCandidates(rowResult.data.text, 6);
          }
        }
      }
      let vin: string | null = null;
      const rankedCandidates = [...candidateScores.entries()]
        .map(([candidate, score]) => ({ vin: candidate, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      if (rankedCandidates.length) {
        try {
          const response = await fetch('/api/vin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidates: rankedCandidates,
              make: vehicleMake,
              model: vehicleModel,
              year: vehicleYear,
            }),
          });
          if (response.ok) {
            const data = (await response.json()) as {
              results?: Array<{
                vin: string;
                score: number;
                makeMatch: boolean;
                modelMatch: boolean;
              }>;
            };
            const verified = data.results
              ?.filter((item) => item.makeMatch && item.modelMatch)
              .sort((a, b) => b.score - a.score)[0];
            if (verified) vin = verified.vin;
          }
        } catch {
          // Use local OCR ranking if the online decoder is unavailable.
        }
      }
      if (!vin && rankedCandidates.length) vin = rankedCandidates[0].vin;
      if (vin) {
        setValue('vehicleVin', vin, { shouldDirty: true, shouldValidate: true });
        setEstimateMessage(
          `Prepoznat VIN: ${vin}. Provjerite ga na polju E saobraćajne; automatsko prepoznavanje može pogriješiti.`
        );
      } else {
        setEstimateMessage(
          'Saobraćajna je sačuvana, ali VIN nije jasno prepoznat. Unesite ga ručno u polje VIN.'
        );
      }
    } catch (error) {
      console.error('OCR saobraćajne nije uspio:', error);
      setEstimateMessage(
        'Saobraćajna je dodana, ali prepoznavanje VIN-a nije uspjelo. Unesite VIN ručno.'
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn('OCR worker nije zatvoren:', error);
        }
      }
      setReadingRegistration(false);
    }
  };

  const updateEstimatePart = (
    id: string,
    field: 'name' | 'qty' | 'unitCost' | 'category',
    value: string
  ) => {
    setEstimateParts((current) =>
      current.map((part) => {
        if (part.id !== id) return part;
        if (field === 'name') return { ...part, name: value };
        if (field === 'category') return { ...part, category: value as 'part' | 'oil' };
        if (field === 'qty') return { ...part, qty: Number(value) || 0 };
        return { ...part, unitCost: Number(value) || 0 };
      })
    );
  };

  const addEstimateParts = () => {
    const validParts = estimateParts.filter(
      (part) => part.name.trim() && Number(part.qty) > 0 && Number(part.unitCost) > 0
    );
    if (!validParts.length) return;
    validParts.forEach((part) =>
      appendPart({
        ...part,
        id: `estimate-${Date.now()}-${Math.random()}`,
        supplier: orderSupplier,
      })
    );
    if (
      watchedParts.length === 1 &&
      !watchedParts[0]?.name?.trim() &&
      !(Number(watchedParts[0]?.unitCost) || 0)
    ) {
      removePart(0);
    }
    setEstimateParts([]);
    setEstimateMessage(
      `Dodano ${validParts.length} stavki u nalog. Pregledajte ih prije spremanja.`
    );
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const id = order?.id ?? `order-new-${Date.now()}`;
    const orderNum = order?.orderNum ?? `WO-2026-${String(orderCounter++).padStart(4, '0')}`;
    const saved: WorkOrder = {
      id,
      orderNum,
      workDate: data.workDate || new Date().toISOString().split('T')[0],
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      vehicleYear: data.vehicleYear,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleVin: data.vehicleVin,
      vehicle: `${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}`,
      mechanic: data.mechanic,
      mechanicPayoutPct: 0,
      status: data.status,
      supplier: orderSupplier,
      parts: data.parts.map((part) => ({ ...part, supplier: orderSupplier })),
      laborEntries: data.laborEntries.map((entry) => ({
        ...entry,
        hours: 1,
        rate: (Number(entry.hours) || 0) * (Number(entry.rate) || 0),
      })),
      discountPct: Number(data.discountPct),
      partsTotal,
      laborTotal,
      orderTotal,
      mechanicPayout: 0,
      notes: data.notes,
      estimateImage,
      registrationImage,
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={13} />
                Nespremljene promjene
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-muted rounded-lg transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              form="work-order-form"
              disabled={saving}
              className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all duration-150 active:scale-95 flex items-center gap-2 min-w-0 sm:min-w-[130px] justify-center"
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
      <form
        id="work-order-form"
        onSubmit={handleSubmit(onSubmit)}
        className="min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-7"
      >
        {partFormFields}
        {/* Sekcija 1: Klijent */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              1
            </span>
            Podaci o klijentu
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Datum radnog naloga
              </label>
              <input
                type="date"
                {...register('workDate')}
                className="block w-full min-w-0 max-w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative min-w-0">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Ime klijenta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="npr. Rafael Dominguez"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={matchingClients.length > 0}
                aria-controls="saved-client-options"
                {...register('clientName', { required: 'Ime klijenta je obavezno' })}
                onChange={(event) => {
                  const name = event.currentTarget.value;
                  setClientSearchTerm(name);
                  setValue('clientName', name, { shouldDirty: true, shouldValidate: true });
                  const exactMatch = savedClients.find(
                    (client) =>
                      client.clientName.trim().toLocaleLowerCase() ===
                      name.trim().toLocaleLowerCase()
                  );
                  if (exactMatch) applySavedClient(exactMatch);
                }}
                className="block w-full min-w-0 px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {matchingClients.length > 0 && (
                <ul
                  id="saved-client-options"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
                >
                  {matchingClients.map((client) => (
                    <li key={`${client.id}-${client.clientName}`} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          applySavedClient(client);
                          setClientSearchTerm('');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {client.clientName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {client.vehicle ||
                              `${client.vehicleYear} ${client.vehicleMake} ${client.vehicleModel}`.trim()}
                          </span>
                        </span>
                        {client.clientPhone && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {client.clientPhone}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.clientName && (
                <p className="text-xs text-red-500 mt-1">{errors.clientName.message}</p>
              )}
            </div>
            <div className="min-w-0">
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
          <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              2
            </span>
            Podaci o vozilu
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
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
          <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              3
            </span>
            Dodjela i status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                4
              </span>
              Dijelovi i materijal
            </h3>
            <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
              <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                <span>Dobavljač</span>
                <select
                  value={orderSupplier}
                  onChange={(event) => setOrderSupplier(event.target.value)}
                  className="min-w-0 max-w-[190px] rounded-md border border-input bg-background px-2 py-2 text-sm"
                  aria-label="Dobavljač naloga"
                >
                  {availableSuppliers.map((supplier) => (
                    <option key={`order-supplier-${supplier}`} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  appendPart({
                    id: `part-new-${Date.now()}`,
                    name: '',
                    qty: 1,
                    unitCost: 0,
                    category: 'part',
                    supplier: orderSupplier,
                  })
                }
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={13} />
                Dodaj dio
              </button>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FileText size={19} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Predračun dijelova</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Za svaki artikal čitamo naziv/opis, količinu i cijenu sa PDV-om. Iznos reda i
                    zbir dijelova računaju se automatski.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-background px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5">
                  <Upload size={14} />
                  {estimateImage ? 'Izaberi drugu sliku' : 'Izaberi iz galerije'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={readingEstimate}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      void handleEstimateUpload(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60">
                  <Camera size={14} />
                  Slikaj saobraćajnu
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={readingRegistration}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void handleRegistrationUpload(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60">
                  <Upload size={14} />
                  Izaberi sliku
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={readingRegistration}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void handleRegistrationUpload(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {(estimateImage || registrationImage) && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                {estimateImage && (
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="mb-2 text-[11px] font-medium text-foreground sm:text-xs">
                      Predračun / faktura
                    </p>
                    <div className="relative">
                      <Image
                        src={estimateImage}
                        alt="Fotografija predračuna ili fakture"
                        width={400}
                        height={160}
                        unoptimized
                        className="h-28 w-full rounded object-contain sm:h-32"
                      />
                      <button
                        type="button"
                        onClick={() => setEstimateImage('')}
                        aria-label="Ukloni sliku predračuna ili fakture"
                        className="absolute right-2 top-2 rounded-full bg-card p-1 text-muted-foreground shadow hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {registrationImage && (
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="mb-2 text-[11px] font-medium text-foreground sm:text-xs">
                      Saobraćajna dozvola
                    </p>
                    <div className="relative">
                      <Image
                        src={registrationImage}
                        alt="Fotografija saobraćajne dozvole"
                        width={400}
                        height={160}
                        unoptimized
                        className="h-28 w-full rounded object-contain sm:h-32"
                      />
                      <button
                        type="button"
                        onClick={() => setRegistrationImage('')}
                        aria-label="Ukloni sliku saobraćajne dozvole"
                        className="absolute right-2 top-2 rounded-full bg-card p-1 text-muted-foreground shadow hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(readingEstimate || readingRegistration) && (
              <p className="mt-3 flex items-center gap-2 text-xs text-primary">
                <Loader2 size={14} className="animate-spin" />
                {readingRegistration
                  ? 'Prepoznavanje VIN-a sa saobraćajne…'
                  : 'Prepoznavanje predračuna…'}{' '}
                {ocrProgress}%
              </p>
            )}
            {estimateMessage && !readingEstimate && !readingRegistration && (
              <p className="mt-3 text-xs text-muted-foreground">{estimateMessage}</p>
            )}

            {estimateParts.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
                <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    Provjera prepoznatih stavki
                  </p>
                  <button
                    type="button"
                    onClick={addEstimateParts}
                    className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  >
                    Ubaci {estimateParts.length} stavki u nalog
                  </button>
                </div>
                <div className="space-y-2 p-2 sm:hidden">
                  {estimateParts.map((part) => (
                    <div
                      key={`mobile-${part.id}`}
                      className="min-w-0 rounded-lg border border-border bg-card p-2"
                    >
                      <div className="flex items-start gap-2">
                        <input
                          value={part.name}
                          onChange={(event) =>
                            updateEstimatePart(part.id, 'name', event.target.value)
                          }
                          className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                          aria-label="Naziv prepoznatog dijela"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEstimateParts((current) =>
                              current.filter((item) => item.id !== part.id)
                            )
                          }
                          aria-label={`Ukloni ${part.name}`}
                          className="shrink-0 rounded p-2 text-muted-foreground hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-muted-foreground">
                          Tip
                          <select
                            value={part.category || 'part'}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'category', event.target.value)
                            }
                            className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                            aria-label="Tip prepoznate stavke"
                          >
                            <option value="part">Dio</option>
                            <option value="oil">Ulje</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-muted-foreground">
                          Količina
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={part.qty}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'qty', event.target.value)
                            }
                            className="mt-1 w-full appearance-none rounded border border-input bg-background px-2 py-1.5 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Količina prepoznatog dijela"
                          />
                        </label>
                        <label className="text-[11px] text-muted-foreground">
                          Cijena sa PDV (KM)
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            value={part.unitCost}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'unitCost', event.target.value)
                            }
                            className="mt-1 w-full appearance-none rounded border border-input bg-background px-2 py-1.5 text-right text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Cijena prepoznatog dijela sa PDV-om"
                          />
                        </label>
                        <div className="text-right text-[11px] text-muted-foreground">
                          Iznos
                          <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {(part.qty * part.unitCost).toLocaleString('bs-BA', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            KM
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 px-1 py-2 text-sm font-bold">
                    <span>Ukupno dijelovi</span>
                    <span className="shrink-0 tabular-nums">
                      {estimateParts
                        .reduce((total, part) => total + part.qty * part.unitCost, 0)
                        .toLocaleString('bs-BA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                      KM
                    </span>
                  </div>
                </div>
                <table className="hidden w-full min-w-[650px] text-xs sm:table">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">Naziv / opis</th>
                      <th className="px-2 py-2 text-left">Tip</th>
                      <th className="w-20 px-2 py-2 text-right">Kol.</th>
                      <th className="w-32 px-2 py-2 text-right">Cijena sa PDV (KM)</th>
                      <th className="w-28 px-2 py-2 text-right">Iznos (KM)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {estimateParts.map((part) => (
                      <tr key={part.id}>
                        <td className="p-2">
                          <input
                            value={part.name}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'name', event.target.value)
                            }
                            className="w-full rounded border border-input bg-background px-2 py-1.5"
                            aria-label="Naziv prepoznatog dijela"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={part.category || 'part'}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'category', event.target.value)
                            }
                            className="w-full rounded border border-input bg-background px-2 py-1.5"
                            aria-label="Tip prepoznate stavke"
                          >
                            <option value="part">Dio</option>
                            <option value="oil">Ulje</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={part.qty}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'qty', event.target.value)
                            }
                            className="w-full appearance-none rounded border border-input bg-background px-2 py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Količina prepoznatog dijela"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0.01}
                            step="0.01"
                            value={part.unitCost}
                            onChange={(event) =>
                              updateEstimatePart(part.id, 'unitCost', event.target.value)
                            }
                            className="w-full appearance-none rounded border border-input bg-background px-2 py-1.5 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Cijena prepoznatog dijela sa PDV-om"
                          />
                        </td>
                        <td className="p-2 text-right font-medium tabular-nums">
                          {(part.qty * part.unitCost).toLocaleString('bs-BA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEstimateParts((current) =>
                                current.filter((item) => item.id !== part.id)
                              )
                            }
                            aria-label={`Ukloni ${part.name}`}
                            className="rounded p-1 text-muted-foreground hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/30">
                      <td colSpan={4} className="px-2 py-2 text-right font-semibold">
                        Ukupno dijelovi
                      </td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums">
                        {estimateParts
                          .reduce((total, part) => total + part.qty * part.unitCost, 0)
                          .toLocaleString('bs-BA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                        KM
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Polje za popust */}
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4 p-3 bg-muted/50 rounded-lg">
            <label className="text-xs font-medium text-foreground whitespace-normal sm:whitespace-nowrap">
              Popust za klijenta %
            </label>
            <p className="min-w-0 flex-1 basis-full text-xs text-muted-foreground sm:basis-auto">
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

          <p className="sm:hidden mb-2 text-xs text-muted-foreground">
            Unosite podatke u karticama ispod — nema povlačenja lijevo-desno.
          </p>
          <div className="space-y-3 sm:hidden">
            {partFields.map((field, idx) => {
              const qty = Number(watchedParts[idx]?.qty) || 0;
              const unitCost = Number(watchedParts[idx]?.unitCost) || 0;
              return (
                <div
                  key={`mobile-${field.id}`}
                  className="rounded-lg border border-border bg-card p-3 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={watchedParts[idx]?.category ?? 'part'}
                      onChange={(event) =>
                        setValue(`parts.${idx}.category`, event.target.value as 'part' | 'oil', {
                          shouldDirty: true,
                        })
                      }
                      className="px-2 py-2 text-sm bg-background border border-input rounded-md"
                      aria-label="Kategorija stavke"
                    >
                      <option value="part">Dio</option>
                      <option value="oil">Ulje</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removePart(idx)}
                      disabled={partFields.length === 1}
                      className="justify-self-end p-2 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Ukloni dio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Naziv dijela ili opis"
                    value={watchedParts[idx]?.name ?? ''}
                    onChange={(event) =>
                      setValue(`parts.${idx}.name`, event.target.value, { shouldDirty: true })
                    }
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md"
                  />
                  {errors.parts?.[idx]?.name && (
                    <p className="text-xs text-red-500">{errors.parts[idx]?.name?.message}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Količina</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="any"
                        value={watchedParts[idx]?.qty ?? 0}
                        onChange={(event) =>
                          setValue(`parts.${idx}.qty`, Number(event.target.value) || 0, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className="w-full appearance-none px-3 py-2 text-sm bg-background border border-input rounded-md text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Jed. cijena
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        value={watchedParts[idx]?.unitCost ?? ''}
                        onChange={(event) =>
                          setValue(`parts.${idx}.unitCost`, Number(event.target.value) || 0, {
                            shouldDirty: true,
                          })
                        }
                        className="w-full appearance-none px-3 py-2 text-sm bg-background border border-input rounded-md text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-sm">
                    <span className="text-muted-foreground">Ukupno</span>
                    <span className="font-bold tabular-nums">{(qty * unitCost).toFixed(2)} KM</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto scrollbar-thin rounded-lg border border-border">
            <table className="w-full min-w-[680px] sm:min-w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground min-w-[280px]">
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
                          value={watchedParts[idx]?.category ?? 'part'}
                          onChange={(event) =>
                            setValue(
                              `parts.${idx}.category`,
                              event.target.value as 'part' | 'oil',
                              { shouldDirty: true }
                            )
                          }
                          className="mb-1 w-full px-2 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                          aria-label="Kategorija stavke"
                        >
                          <option value="part">Dio</option>
                          <option value="oil">Ulje</option>
                        </select>
                        <input
                          type="text"
                          placeholder="npr. Filter ulja"
                          value={watchedParts[idx]?.name ?? ''}
                          onChange={(event) =>
                            setValue(`parts.${idx}.name`, event.target.value, { shouldDirty: true })
                          }
                          className="w-full min-w-[250px] px-2 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
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
                            <Image
                              src={image}
                              alt={`Slika dijela ${watchedParts[idx]?.name || idx + 1} ${imageIndex + 1}`}
                              width={40}
                              height={40}
                              unoptimized
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
                          inputMode="decimal"
                          min={0.01}
                          step="any"
                          value={watchedParts[idx]?.qty ?? 0}
                          onChange={(event) =>
                            setValue(`parts.${idx}.qty`, Number(event.target.value) || 0, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className="w-full appearance-none px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                            value={watchedParts[idx]?.unitCost ?? ''}
                            onChange={(event) =>
                              setValue(`parts.${idx}.unitCost`, Number(event.target.value) || 0, {
                                shouldDirty: true,
                              })
                            }
                            className="w-full appearance-none pl-2 pr-8 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                  description: 'Ruke',
                  hours: 1,
                  rate: 0,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={13} />
              Dodaj rad
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_104px_36px] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Opis usluge</span>
              <span className="text-right text-xs font-medium text-muted-foreground">Cijena</span>
              <span />
            </div>
            <div className="divide-y divide-border">
              {laborFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[minmax(0,1fr)_104px_36px] items-start gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <input
                      type="text"
                      placeholder="Ruke"
                      {...register(`laborEntries.${idx}.description`, {
                        required: 'Opis je obavezan',
                      })}
                      className="w-full min-w-0 px-2 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                    />
                    {errors.laborEntries?.[idx]?.description && (
                      <p className="text-xs text-red-500 mt-0.5">
                        {errors.laborEntries[idx]?.description?.message}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      KM
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      {...register(`laborEntries.${idx}.rate`, {
                        valueAsNumber: true,
                        min: 0,
                      })}
                      className="w-full min-w-0 pl-2 pr-8 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLabor(idx)}
                    disabled={laborFields.length === 1}
                    className="justify-self-center p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Ukloni stavku rada"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t-2 border-border bg-muted/50 px-3 py-2">
              <span className="text-xs font-semibold text-foreground">Ukupno rad</span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {laborTotal.toFixed(2)} KM
              </span>
            </div>
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
