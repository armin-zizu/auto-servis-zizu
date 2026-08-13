'use client';

import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit2,
  Trash2,
  Eye,
  CheckSquare,
} from 'lucide-react';
import StatusBadge, { OrderStatus } from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import WorkOrderModal from './WorkOrderModal';
import WorkOrderViewModal from './WorkOrderViewModal';
import CompleteWorkOrderModal from './CompleteWorkOrderModal';
import { toast } from 'sonner';
import {
  ORDERS_STORAGE_KEY,
  WorkOrder,
  mockWorkOrders,
} from '@/app/work-order-managment/data/mockWorkOrders';
import { activeMechanicNames, useMechanics } from '@/lib/mechanics';
import { readCache, writeCache, subscribe, push } from '@/lib/syncStore';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const ALL_STATUSES: OrderStatus[] = [
  'Otvoren',
  'U toku',
  'Čeka dijelove',
  'Spreman za preuzimanje',
  'Zatvoren',
  'Otkazan',
];

type SortKey = keyof WorkOrder | '';
type SortDir = 'asc' | 'desc';

function normalizeOrders(orders: WorkOrder[]): WorkOrder[] {
  return orders.map((order) => ({
    ...order,
    createdBy: order.createdBy ?? '',
    createdByRole: order.createdByRole ?? 'owner',
  }));
}

function readStoredOrders(): WorkOrder[] {
  if (typeof window === 'undefined') return mockWorkOrders;
  return normalizeOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, mockWorkOrders));
}

export default function WorkOrdersClient() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'Svi'>('Svi');
  const [mechanicFilter, setMechanicFilter] = useState<string>('Svi');
  const [sortKey, setSortKey] = useState<SortKey>('orderNum');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [viewOrder, setViewOrder] = useState<WorkOrder | null>(null);
  const [completingOrder, setCompletingOrder] = useState<WorkOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const searchParams = useSearchParams();
  const { mechanics } = useMechanics();

useEffect(() => {
    let active = true;
    // Never push defaults before the shared copy has been read. Otherwise a
    // new phone can overwrite saved orders with its empty/demo state.
    void import('@/lib/syncStore').then(async ({ pull }) => {
      const cached = normalizeOrders(readCache<WorkOrder[]>(ORDERS_STORAGE_KEY, []));
      const remote = await pull<WorkOrder[]>(ORDERS_STORAGE_KEY);
      if (!active) return;
      setOrders(normalizeOrders(remote ?? cached));
      setStorageLoaded(true);
    });
    // Subscribe to realtime changes from other devices.
    const unsub = subscribe<WorkOrder[]>(ORDERS_STORAGE_KEY, () => {
      setOrders(readStoredOrders());
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

useEffect(() => {
    if (!storageLoaded) return;
    writeCache(ORDERS_STORAGE_KEY, orders);
    // Push to shared storage so other devices see it.
    void push(ORDERS_STORAGE_KEY, orders);
  }, [orders, storageLoaded]);

  useEffect(() => {
    const status = searchParams.get('status');
    setActiveOnly(status === 'active');
    if (status && status !== 'active' && ALL_STATUSES.includes(status as OrderStatus)) {
      setStatusFilter(status as OrderStatus);
    } else if (status === 'active') {
      setStatusFilter('Svi');
    }
  }, [searchParams]);

  useEffect(() => {
    const orderId = searchParams.get('order');
    if (!orderId) return;
    const order = orders.find((item) => item.id === orderId);
    if (order) setViewOrder(order);
  }, [orders, searchParams]);

  const mechanicFilterOptions = useMemo(
    () => ['Svi', ...activeMechanicNames(mechanics)],
    [mechanics]
  );

  const filtered = useMemo(() => {
    let result = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNum.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.vehicle.toLowerCase().includes(q) ||
          o.mechanic.toLowerCase().includes(q) ||
          (o.createdBy || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'Svi') {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (activeOnly) {
      result = result.filter((o) => o.status !== 'Zatvoren' && o.status !== 'Otkazan');
    }
    if (mechanicFilter !== 'Svi') {
      result = result.filter((o) => o.mechanic === mechanicFilter);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey as keyof WorkOrder];
        const bv = b[sortKey as keyof WorkOrder];
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return result;
  }, [orders, search, statusFilter, activeOnly, mechanicFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const validPage = Math.max(1, totalPages);
    if (page > validPage) setPage(validPage);
  }, [page, totalPages]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={13} className="text-primary" />
    ) : (
      <ChevronDown size={13} className="text-primary" />
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((o) => o.id)));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setOrders((prev) => prev.filter((o) => o.id !== deleteId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteId);
      return next;
    });
    setDeleteLoading(false);
    setDeleteId(null);
    toast.success('Radni nalog uspješno obrisan');
  };

  const handleBulkDelete = async () => {
    setOrders((prev) => prev.filter((o) => !selectedIds.has(o.id)));
    toast.success(`${selectedIds.size} naloga obrisano`);
    setSelectedIds(new Set());
  };

  const handleSaveOrder = (order: WorkOrder) => {
    if (orders.find((o) => o.id === order.id)) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      toast.success(`Radni nalog ${order.orderNum} ažuriran`);
    } else {
      setOrders((prev) => [order, ...prev]);
      toast.success(`Radni nalog ${order.orderNum} kreiran`);
    }
    setCreateOpen(false);
    setEditOrder(null);
  };

  const handleStatusChange = (id: string, newStatus: OrderStatus) => {
    const order = orders.find((item) => item.id === id);
    if (newStatus === 'Zatvoren' && order) {
      setCompletingOrder(order);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    toast.success(`Status ažuriran na "${newStatus}"`);
  };

  const handleCompleteOrder = (partsDiscountPct: number, oilDiscountPct: number) => {
    if (!completingOrder) return;
    const partsPurchaseCost = completingOrder.parts.reduce((total, part) => {
      const lineTotal = part.qty * part.unitCost;
      const discountPct = part.category === 'oil' ? oilDiscountPct : partsDiscountPct;
      return total + lineTotal * (1 - discountPct / 100);
    }, 0);
    const serviceProfit =
      completingOrder.orderTotal - partsPurchaseCost - completingOrder.mechanicPayout;
    const updatedOrder: WorkOrder = {
      ...completingOrder,
      status: 'Zatvoren',
      supplierPartsDiscountPct: partsDiscountPct,
      supplierOilDiscountPct: oilDiscountPct,
      partsPurchaseCost,
      serviceProfit,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    setCompletingOrder(null);
    toast.success(`Nalog ${updatedOrder.orderNum} završen i obračunat`);
  };

  return (
    <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto">
      {/* Zaglavlje */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Radni nalozi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} naloga ·{' '}
            {orders.filter((o) => o.status !== 'Zatvoren' && o.status !== 'Otkazan').length}{' '}
            aktivnih
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-card"
        >
          <Plus size={16} />
          Novi radni nalog
        </button>
      </div>

      {/* Traka filtera */}
      <div className="bg-card border border-border rounded-xl shadow-card mb-4">
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          {/* Pretraga */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Pretraži po broju naloga, klijentu, vozilu, majstoru…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Filter statusa */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['Svi', ...ALL_STATUSES] as const).map((s) => (
              <button
                key={`filter-status-${s}`}
                onClick={() => {
                  setStatusFilter(s as OrderStatus | 'Svi');
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 whitespace-nowrap
                  ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Filter majstora */}
          <select
            value={mechanicFilter}
            onChange={(e) => {
              setMechanicFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
          >
            {mechanicFilterOptions.map((m) => (
              <option key={`mech-filter-${m}`} value={m}>
                {m === 'Svi' ? 'Svi majstori' : m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Traka za grupne akcije */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between slide-up">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-primary" />
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} nalog{selectedIds.size > 1 ? 'a' : ''} odabrano
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Poništi odabir
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Obriši odabrane
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.size === paginated.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border accent-primary"
                    aria-label="Odaberi sve"
                  />
                </th>
                {(
                  [
                    { key: 'orderNum', label: 'Nalog #' },
                    { key: 'clientName', label: 'Klijent' },
                    { key: 'vehicle', label: 'Vozilo' },
                    { key: 'mechanic', label: 'Majstor' },
                    { key: 'createdBy', label: 'Kreirao' },
                    { key: 'status', label: 'Status' },
                    { key: 'partsTotal', label: 'Dijelovi' },
                    { key: 'laborTotal', label: 'Rad' },
                    { key: 'discountPct', label: 'Pop %' },
                    { key: 'orderTotal', label: 'Ukupno' },
                  ] as { key: SortKey; label: string }[]
                ).map((col) => (
                  <th
                    key={`col-${String(col.key)}`}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Search size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        Nema pronađenih radnih naloga
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Pokušajte prilagoditi pretragu ili filtere, ili kreirajte novi radni nalog.
                      </p>
                      <button
                        onClick={() => setCreateOpen(true)}
                        className="mt-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Kreiraj radni nalog
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((order) => (
                  <WorkOrderRow
                    key={order.id}
                    order={order}
                    selected={selectedIds.has(order.id)}
                    onSelect={() => toggleSelect(order.id)}
                    onEdit={() => setEditOrder(order)}
                    onView={() => setViewOrder(order)}
                    onDelete={() => setDeleteId(order.id)}
                    onStatusChange={(s) => handleStatusChange(order.id, s)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacija */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Prikaži</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={`page-size-${s}`} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>od {filtered.length} naloga</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              Preth.
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded transition-all duration-100
                    ${
                      page === p
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              Sljed.
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Modali */}
      <WorkOrderModal
        open={createOpen || editOrder !== null}
        onClose={() => {
          setCreateOpen(false);
          setEditOrder(null);
        }}
        order={editOrder}
        onSave={handleSaveOrder}
      />

      {viewOrder && (
        <WorkOrderViewModal
          open={viewOrder !== null}
          onClose={() => setViewOrder(null)}
          order={viewOrder}
          onEdit={() => {
            setEditOrder(viewOrder);
            setViewOrder(null);
          }}
          onCloseOrder={() => {
            setViewOrder(null);
            handleStatusChange(viewOrder.id, 'Zatvoren');
          }}
        />
      )}

      <CompleteWorkOrderModal
        open={completingOrder !== null}
        order={completingOrder}
        onClose={() => setCompletingOrder(null)}
        onConfirm={handleCompleteOrder}
      />

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Obriši radni nalog"
        description="Ovo će trajno obrisati ovaj radni nalog uključujući sve dijelove, stavke rada i finansijske zapise. Ova akcija se ne može poništiti."
        confirmLabel="Obriši radni nalog"
      />
    </div>
  );
}

// Komponenta reda s inline dropdown za status
interface RowProps {
  order: WorkOrder;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onStatusChange: (s: OrderStatus) => void;
}

function WorkOrderRow({
  order,
  selected,
  onSelect,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
}: RowProps) {
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <tr
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onView();
      }}
      tabIndex={0}
      className={`group transition-colors duration-100 ${
        selected ? 'bg-primary/5' : 'hover:bg-muted/40'
      } cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40`}
    >
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-border accent-primary"
          aria-label={`Odaberi ${order.orderNum}`}
        />
      </td>
      <td className="px-4 py-3">
        <span className="font-mono-data text-xs font-medium text-primary whitespace-nowrap">
          {order.orderNum}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground text-sm leading-tight whitespace-nowrap">
          {order.clientName}
        </p>
        <p className="text-xs text-muted-foreground">{order.clientPhone}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{order.vehicle}</td>
      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{order.mechanic}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {order.createdBy || '—'}
      </td>
      <td className="px-4 py-3 relative" onClick={(event) => event.stopPropagation()}>
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className="focus:outline-none"
          aria-label="Promijeni status"
        >
          <StatusBadge status={order.status} size="sm" />
        </button>
        {statusOpen && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-modal py-1 min-w-[180px] scale-in">
            {ALL_STATUSES.map((s) => (
              <button
                key={`status-opt-${s}-${order.id}`}
                onClick={() => {
                  onStatusChange(s);
                  setStatusOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                  order.status === s ? 'font-semibold text-primary' : 'text-foreground'
                }`}
              >
                <StatusBadge status={s} size="sm" />
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-foreground whitespace-nowrap">
        {order.partsTotal.toFixed(2)} KM
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-foreground whitespace-nowrap">
        {order.laborTotal.toFixed(2)} KM
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
        {order.discountPct}%
      </td>
      <td className="px-4 py-3 text-sm tabular-nums font-semibold text-foreground whitespace-nowrap">
        {order.orderTotal.toFixed(2)} KM
      </td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onView}
            title="Pregledaj detalje radnog naloga"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={onEdit}
            title="Uredi radni nalog"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 size={15} />
          </button>
          {order.status !== 'Zatvoren' && order.status !== 'Otkazan' && (
            <button
              onClick={() => onStatusChange('Zatvoren')}
              title="Zatvori radni nalog i unesi popuste dobavljača"
              className="p-1.5 rounded-md hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
            >
              <CheckSquare size={15} />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Obriši radni nalog — ovo se ne može poništiti"
            className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
