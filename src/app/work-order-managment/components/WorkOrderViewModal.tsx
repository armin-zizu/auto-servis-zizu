'use client';

import React from 'react';
import { CheckSquare, Edit2, Printer, Phone, Car, Wrench, FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { WorkOrder } from '../data/mockWorkOrders';

interface WorkOrderViewModalProps {
  open: boolean;
  onClose: () => void;
  order: WorkOrder;
  onEdit: () => void;
  onCloseOrder: () => void;
}

export default function WorkOrderViewModal({
  open,
  onClose,
  order,
  onEdit,
  onCloseOrder,
}: WorkOrderViewModalProps) {
  const [selectedPartImage, setSelectedPartImage] = React.useState<string | null>(null);

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const escapeHtml = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const money = (value: number) => `${value.toFixed(2)} KM`;
    const rawPartsTotal = order.parts.reduce((sum, part) => sum + part.qty * part.unitCost, 0);
    const customerDiscount = rawPartsTotal * (order.discountPct / 100);

    printWindow.document.write(`
      <!doctype html>
      <html lang="bs">
        <head>
          <meta charset="utf-8" />
          <title>Faktura ${escapeHtml(order.orderNum)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #172033; margin: 0; padding: 36px; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #172033; padding-bottom: 18px; margin-bottom: 24px; }
            h1 { margin: 0 0 6px; font-size: 26px; }
            h2 { margin: 24px 0 8px; font-size: 15px; border-bottom: 1px solid #d8dee8; padding-bottom: 6px; }
            p { margin: 4px 0; }
            .muted { color: #64748b; }
            .meta { text-align: right; }
            .info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .box { background: #f8fafc; padding: 12px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th:last-child, td:last-child { text-align: right; }
            .total { margin-left: auto; width: 280px; margin-top: 18px; }
            .total div { display: flex; justify-content: space-between; padding: 5px 0; }
            .grand { border-top: 2px solid #172033; font-size: 16px; font-weight: bold; margin-top: 5px; padding-top: 10px !important; }
            .discount { color: #047857; }
            .notes { margin-top: 24px; padding: 12px; background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>Auto Servis Zizu</h1><p class="muted">Faktura / radni nalog</p></div>
            <div class="meta"><strong>${escapeHtml(order.orderNum)}</strong><p class="muted">${escapeHtml(order.createdAt)}</p><p>Status: ${escapeHtml(order.status)}</p></div>
          </div>
          <div class="info">
            <div class="box"><strong>Klijent</strong><p>${escapeHtml(order.clientName)}</p><p class="muted">${escapeHtml(order.clientPhone)}</p></div>
            <div class="box"><strong>Vozilo</strong><p>${escapeHtml(order.vehicle)}</p><p class="muted">VIN: ${escapeHtml(order.vehicleVin || '-')}</p></div>
            <div class="box"><strong>Majstor</strong><p>${escapeHtml(order.mechanic)}</p></div>
          </div>
          <h2>Dijelovi i materijal</h2>
          <table><thead><tr><th>Opis</th><th>Količina</th><th>Jed. cijena</th><th>Ukupno</th></tr></thead><tbody>
            ${order.parts.map((part) => `<tr><td>${escapeHtml(part.name)}${part.category === 'oil' ? ' <span class="muted">(ulje)</span>' : ''}</td><td>${part.qty}</td><td>${money(part.unitCost)}</td><td>${money(part.qty * part.unitCost)}</td></tr>`).join('')}
          </tbody></table>
          <h2>Rad</h2>
          <table><thead><tr><th>Usluga</th><th>Sati</th><th>Cijena/sat</th><th>Međuzbir</th></tr></thead><tbody>
            ${order.laborEntries.map((entry) => `<tr><td>${escapeHtml(entry.description)}</td><td>${entry.hours}</td><td>${money(entry.rate)}</td><td>${money(entry.hours * entry.rate)}</td></tr>`).join('')}
          </tbody></table>
          <div class="total">
            <div><span>Dijelovi</span><strong>${money(order.partsTotal)}</strong></div>
            ${order.discountPct > 0 ? `<div class="discount"><span>Popust klijentu (${order.discountPct}%)</span><strong>ušteda ${money(customerDiscount)}</strong></div>` : ''}
            <div><span>Rad</span><strong>${money(order.laborTotal)}</strong></div>
            <div class="grand"><span>Ukupno</span><strong>${money(order.orderTotal)}</strong></div>
          </div>
          ${order.notes ? `<div class="notes"><strong>Napomene</strong><p>${escapeHtml(order.notes)}</p></div>` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={order.orderNum}
      subtitle={`Kreiran ${order.createdAt} · Zadnje ažuriranje ${order.updatedAt}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button onClick={handlePrintInvoice} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Printer size={15} />
            Štampaj fakturu
          </button>
          <div className="flex items-center gap-2">
            {order.status !== 'Zatvoren' && order.status !== 'Otkazan' && (
              <button
                onClick={onCloseOrder}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-all active:scale-95"
              >
                <CheckSquare size={14} />
                Zatvori nalog
              </button>
            )}
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-95"
            >
              <Edit2 size={14} />
              Uredi nalog
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status + zaglavlje */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <StatusBadge status={order.status} />
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {order.orderTotal.toFixed(2)} KM
            </p>
            <p className="text-xs text-muted-foreground">Ukupno nalog</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Klijent</p>
              <p className="text-sm font-semibold text-foreground">{order.clientName}</p>
              <p className="text-xs text-muted-foreground">{order.clientPhone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Car size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Vozilo</p>
              <p className="text-sm font-semibold text-foreground">{order.vehicle}</p>
              {order.vehicleVin && (
                <p className="text-xs text-muted-foreground font-mono">{order.vehicleVin}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wrench size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Majstor</p>
              <p className="text-sm font-semibold text-foreground">{order.mechanic}</p>
            </div>
          </div>
        </div>

        {/* Tabela dijelova */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Dijelovi i materijal</h4>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Dio
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Slika
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Kol.
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Jed. cijena
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Ukupno
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.parts.map((part) => (
                  <tr key={part.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-foreground">{part.name}{part.category === 'oil' ? ' (ulje)' : ''}</td>
                    <td className="px-4 py-2.5">
                      {(part.images?.length || part.image) ? (
                        <div className="flex gap-1.5 min-w-[120px]">
                          {(part.images || (part.image ? [part.image] : [])).map((image, imageIndex) => (
                            <button key={`${part.id}-view-image-${imageIndex}`} type="button" onClick={() => setSelectedPartImage(image)} className="block rounded focus:outline-none focus:ring-2 focus:ring-primary" title="Otvori sliku dijela">
                              <img src={image} alt={`Slika dijela ${part.name} ${imageIndex + 1}`} className="h-12 w-12 rounded object-cover border border-border" />
                            </button>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Nema slike</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {part.qty}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {part.unitCost.toFixed(2)} KM
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                      {(part.qty * part.unitCost).toFixed(2)} KM
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {order.discountPct > 0 && (
                  <tr className="border-t border-border bg-emerald-50/50">
                    <td colSpan={4} className="px-4 py-2 text-xs text-emerald-700 text-right">
                      Popust za klijenta ({order.discountPct}%)
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium text-emerald-700 tabular-nums">
                      −{(order.parts.reduce((s, p) => s + p.qty * p.unitCost, 0) * order.discountPct / 100).toFixed(2)} KM
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-right text-foreground">
                    Ukupno dijelovi
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-foreground">
                    {order.partsTotal.toFixed(2)} KM
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Tabela rada */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Rad</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Usluga
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Sati
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Cijena
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Međuzbir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.laborEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-foreground">{entry.description}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {entry.hours}h
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {entry.rate} KM/sat
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground">
                      {(entry.hours * entry.rate).toFixed(2)} KM
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-right text-foreground">
                    Ukupno rad
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-foreground">
                    {order.laborTotal.toFixed(2)} KM
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Finansijski sažetak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Dijelovi</p>
            <p className="text-base font-bold tabular-nums text-foreground">
              {order.partsTotal.toFixed(2)} KM
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Rad</p>
            <p className="text-base font-bold tabular-nums text-foreground">
              {order.laborTotal.toFixed(2)} KM
            </p>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-xs text-primary mb-1 font-medium">Ukupno nalog</p>
            <p className="text-base font-bold tabular-nums text-primary">
              {order.orderTotal.toFixed(2)} KM
            </p>
          </div>
        </div>

        {order.partsPurchaseCost !== undefined && order.serviceProfit !== undefined && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700 mb-1 font-medium">Nabavni trošak dijelova</p>
              <p className="text-base font-bold tabular-nums text-orange-900">
                {order.partsPurchaseCost.toFixed(2)} KM
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Popust dijelovi {order.supplierPartsDiscountPct ?? 0}% · ulje {order.supplierOilDiscountPct ?? 0}%
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${order.serviceProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs mb-1 font-medium ${order.serviceProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Zarada servisa
              </p>
              <p className={`text-base font-bold tabular-nums ${order.serviceProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {order.serviceProfit.toFixed(2)} KM
              </p>
              <p className={`text-xs mt-1 ${order.serviceProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Nakon nabavke i isplate majstoru
              </p>
            </div>
          </div>
        )}

        {/* Napomene */}
        {order.notes && (
          <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
            <FileText size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">{order.notes}</p>
          </div>
        )}
      </div>
    </Modal>
    <Modal open={selectedPartImage !== null} onClose={() => setSelectedPartImage(null)} title="Slika zamijenjenog dijela" size="lg">
      {selectedPartImage && <img src={selectedPartImage} alt="Uvećana slika zamijenjenog dijela" className="max-h-[65vh] w-full object-contain rounded-lg" />}
    </Modal>
    </>
  );
}