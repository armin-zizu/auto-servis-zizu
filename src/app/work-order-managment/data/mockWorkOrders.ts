import { OrderStatus } from '@/components/ui/StatusBadge';

export const ORDERS_STORAGE_KEY = 'autoservis-work-orders';

export interface PartLineItem {
  id: string;
  name: string;
  qty: number;
  unitCost: number;
  category?: 'part' | 'oil';
  image?: string;
  images?: string[];
}

export interface LaborEntry {
  id: string;
  description: string;
  hours: number;
  rate: number;
}

export interface WorkOrder {
  id: string;
  orderNum: string;
  clientName: string;
  clientPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVin: string;
  vehicle: string;
  mechanic: string;
  mechanicPayoutPct: number;
  status: OrderStatus;
  parts: PartLineItem[];
  laborEntries: LaborEntry[];
  discountPct: number;
  partsTotal: number;
  laborTotal: number;
  orderTotal: number;
  mechanicPayout: number;
  notes: string;
  createdBy: string;
  createdByRole: 'owner' | 'mechanic';
  workDate?: string;
  createdAt: string;
  updatedAt: string;
  supplierPartsDiscountPct?: number;
  supplierOilDiscountPct?: number;
  partsPurchaseCost?: number;
  serviceProfit?: number;
}

function calcOrder(
  parts: PartLineItem[],
  laborEntries: LaborEntry[],
  discountPct: number,
  mechanicPayoutPct: number
) {
  const rawParts = parts.reduce((s, p) => s + p.qty * p.unitCost, 0);
  const partsTotal = rawParts * (1 - discountPct / 100);
  const laborTotal = laborEntries.reduce((s, l) => s + l.hours * l.rate, 0);
  const orderTotal = partsTotal + laborTotal;
  const mechanicPayout = laborTotal * (mechanicPayoutPct / 100);
  return { partsTotal, laborTotal, orderTotal, mechanicPayout };
}

const orders: Omit<
  WorkOrder,
  | 'partsTotal'
  | 'laborTotal'
  | 'orderTotal'
  | 'mechanicPayout'
  | 'vehicle'
  | 'createdBy'
  | 'createdByRole'
>[] = [
  {
    id: 'order-001',
    orderNum: 'WO-2026-0089',
    clientName: 'Rafael Dominguez',
    clientPhone: '(512) 883-4201',
    vehicleYear: '2019',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleVin: '4T1B11HK6KU234781',
    mechanic: 'Derek Hollis',
    mechanicPayoutPct: 35,
    status: 'U toku',
    parts: [
      { id: 'part-001-1', name: 'Filter ulja', qty: 1, unitCost: 12.5 },
      { id: 'part-001-2', name: 'Sintetičko motorno ulje 5W-30 (5qt)', qty: 1, unitCost: 38.0 },
      { id: 'part-001-3', name: 'Filter zraka', qty: 1, unitCost: 24.0 },
    ],
    laborEntries: [
      { id: 'labor-001-1', description: 'Zamjena sintetičkog ulja', hours: 0.5, rate: 95 },
      { id: 'labor-001-2', description: 'Višetočkasti pregled', hours: 0.75, rate: 85 },
    ],
    discountPct: 10,
    notes: 'Klijent tražio sintetičko ulje. Provjeri pritisak u gumama.',
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-002',
    orderNum: 'WO-2026-0088',
    clientName: 'Priya Nair',
    clientPhone: '(737) 412-9930',
    vehicleYear: '2021',
    vehicleMake: 'Honda',
    vehicleModel: 'CR-V',
    vehicleVin: '5J6RW2H51MA007432',
    mechanic: 'Tomas Reyes',
    mechanicPayoutPct: 32,
    status: 'Čeka dijelove',
    parts: [
      { id: 'part-002-1', name: 'Prednje kočione pločice (set)', qty: 1, unitCost: 68.0 },
      { id: 'part-002-2', name: 'Prednji kočioni diskovi (par)', qty: 1, unitCost: 142.0 },
      { id: 'part-002-3', name: 'Kit kliznih pina kočionog kliješta', qty: 2, unitCost: 18.5 },
    ],
    laborEntries: [
      {
        id: 'labor-002-1',
        description: 'Zamjena prednjih kočionih pločica i diskova',
        hours: 2.5,
        rate: 95,
      },
      { id: 'labor-002-2', description: 'Ispiranje kočione tečnosti', hours: 0.5, rate: 85 },
    ],
    discountPct: 0,
    notes: 'Čekamo OEM diskove. Procijenjeno za 2 dana.',
    createdAt: '2026-08-04',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-003',
    orderNum: 'WO-2026-0087',
    clientName: 'Sandra Kowalski',
    clientPhone: '(210) 554-7823',
    vehicleYear: '2017',
    vehicleMake: 'Ford',
    vehicleModel: 'F-150',
    vehicleVin: '1FTEW1EP8HFB12345',
    mechanic: 'Derek Hollis',
    mechanicPayoutPct: 35,
    status: 'Spreman za preuzimanje',
    parts: [
      { id: 'part-003-1', name: 'Klinasti remen', qty: 1, unitCost: 45.0 },
      { id: 'part-003-2', name: 'Zatezač remena', qty: 1, unitCost: 78.0 },
      { id: 'part-003-3', name: 'Slobodni kotur', qty: 1, unitCost: 42.0 },
    ],
    laborEntries: [
      { id: 'labor-003-1', description: 'Zamjena klinastog remena', hours: 1.5, rate: 95 },
      {
        id: 'labor-003-2',
        description: 'Zamjena zatezača i slobodnog kotura',
        hours: 1.0,
        rate: 95,
      },
    ],
    discountPct: 5,
    notes: 'Remen škripio. Sve zamijenjeno. Spreman za preuzimanje.',
    createdAt: '2026-08-03',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-004',
    orderNum: 'WO-2026-0086',
    clientName: 'James Okonkwo',
    clientPhone: '(469) 228-6140',
    vehicleYear: '2020',
    vehicleMake: 'Chevrolet',
    vehicleModel: 'Silverado 1500',
    vehicleVin: '1GCRYDED0LZ123456',
    mechanic: 'Mei-Ling Park',
    mechanicPayoutPct: 30,
    status: 'Otvoren',
    parts: [{ id: 'part-004-1', name: 'Filter kabine', qty: 1, unitCost: 22.0 }],
    laborEntries: [
      { id: 'labor-004-1', description: 'Dijagnostičko skeniranje', hours: 1.0, rate: 95 },
    ],
    discountPct: 0,
    notes: 'Upaljeno kontrolno svjetlo motora. Kod P0420.',
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-005',
    orderNum: 'WO-2026-0085',
    clientName: 'Alicia Ferreira',
    clientPhone: '(832) 774-3391',
    vehicleYear: '2022',
    vehicleMake: 'BMW',
    vehicleModel: '330i',
    vehicleVin: 'WBA5R1C57NAK12345',
    mechanic: 'Tomas Reyes',
    mechanicPayoutPct: 32,
    status: 'Zatvoren',
    parts: [
      { id: 'part-005-1', name: 'BMW OEM svjećice (set od 4)', qty: 1, unitCost: 96.0 },
      { id: 'part-005-2', name: 'Bobine paljenja (set od 4)', qty: 1, unitCost: 220.0 },
      { id: 'part-005-3', name: 'Sredstvo za čišćenje leptira gasa', qty: 2, unitCost: 12.0 },
      { id: 'part-005-4', name: 'BMW brtva kućišta filtera ulja', qty: 1, unitCost: 34.0 },
    ],
    laborEntries: [
      { id: 'labor-005-1', description: 'Zamjena svjećica', hours: 2.0, rate: 115 },
      { id: 'labor-005-2', description: 'Zamjena bobina paljenja', hours: 1.5, rate: 115 },
      { id: 'labor-005-3', description: 'Čišćenje leptira gasa', hours: 0.75, rate: 95 },
    ],
    discountPct: 0,
    notes: 'Preskakanje na cilindrima 2 i 3. Sve bobine zamijenjene kao set.',
    createdAt: '2026-08-04',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-006',
    orderNum: 'WO-2026-0084',
    clientName: 'Kevin Strauss',
    clientPhone: '(214) 901-5528',
    vehicleYear: '2018',
    vehicleMake: 'Nissan',
    vehicleModel: 'Altima',
    vehicleVin: '1N4BL4BV9JC123456',
    mechanic: 'Mei-Ling Park',
    mechanicPayoutPct: 30,
    status: 'Zatvoren',
    parts: [
      { id: 'part-006-1', name: 'Sintetičko ulje 0W-20 (5qt)', qty: 1, unitCost: 42.0 },
      { id: 'part-006-2', name: 'Filter ulja', qty: 1, unitCost: 11.5 },
      { id: 'part-006-3', name: 'Brisači (par)', qty: 1, unitCost: 28.0 },
    ],
    laborEntries: [
      { id: 'labor-006-1', description: 'Zamjena ulja i filtera', hours: 0.5, rate: 85 },
      { id: 'labor-006-2', description: 'Ugradnja brisača', hours: 0.25, rate: 65 },
    ],
    discountPct: 10,
    notes: 'Stalni klijent. Primjenjen 10% popust na dijelove.',
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-007',
    orderNum: 'WO-2026-0083',
    clientName: 'Yolanda Prescott',
    clientPhone: '(713) 440-8812',
    vehicleYear: '2016',
    vehicleMake: 'Jeep',
    vehicleModel: 'Grand Cherokee',
    vehicleVin: '1C4RJFBG2GC123456',
    mechanic: 'Antoine Briggs',
    mechanicPayoutPct: 30,
    status: 'Zatvoren',
    parts: [
      { id: 'part-007-1', name: 'Zadnji amortizeri (par)', qty: 1, unitCost: 184.0 },
      { id: 'part-007-2', name: 'Kit nosača amortizera', qty: 2, unitCost: 24.0 },
    ],
    laborEntries: [
      { id: 'labor-007-1', description: 'Zamjena zadnjih amortizera', hours: 3.0, rate: 95 },
    ],
    discountPct: 0,
    notes: '',
    createdAt: '2026-08-02',
    updatedAt: '2026-08-03',
  },
  {
    id: 'order-008',
    orderNum: 'WO-2026-0082',
    clientName: 'Brian Nguyen',
    clientPhone: '(281) 663-4490',
    vehicleYear: '2023',
    vehicleMake: 'Hyundai',
    vehicleModel: 'Tucson',
    vehicleVin: '5NMP3DJF4PH123456',
    mechanic: 'Derek Hollis',
    mechanicPayoutPct: 35,
    status: 'U toku',
    parts: [
      { id: 'part-008-1', name: 'Kit lanca razvoda', qty: 1, unitCost: 320.0 },
      { id: 'part-008-2', name: 'Solenoid varijabilnog razvoda (VVT)', qty: 2, unitCost: 65.0 },
      { id: 'part-008-3', name: 'Set brtvi motora', qty: 1, unitCost: 88.0 },
    ],
    laborEntries: [
      { id: 'labor-008-1', description: 'Zamjena lanca razvoda', hours: 6.0, rate: 115 },
      { id: 'labor-008-2', description: 'Zamjena VVT solenoida', hours: 1.5, rate: 115 },
    ],
    discountPct: 0,
    notes: 'Motor zvecka pri hladnom startu. Veliki posao.',
    createdAt: '2026-08-03',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-009',
    orderNum: 'WO-2026-0081',
    clientName: 'Lorena Castillo',
    clientPhone: '(956) 312-7741',
    vehicleYear: '2015',
    vehicleMake: 'Volkswagen',
    vehicleModel: 'Jetta',
    vehicleVin: '3VW267AJ8FM123456',
    mechanic: 'Tomas Reyes',
    mechanicPayoutPct: 32,
    status: 'Otkazan',
    parts: [{ id: 'part-009-1', name: 'Kit filtera DSG mjenjača', qty: 1, unitCost: 78.0 }],
    laborEntries: [{ id: 'labor-009-1', description: 'Servis DSG tečnosti', hours: 1.5, rate: 95 }],
    discountPct: 0,
    notes: 'Klijent otkazao — odlučio prodati vozilo.',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-02',
  },
  {
    id: 'order-010',
    orderNum: 'WO-2026-0080',
    clientName: 'Marcus Webb',
    clientPhone: '(512) 234-9900',
    vehicleYear: '2020',
    vehicleMake: 'Ford',
    vehicleModel: 'Explorer',
    vehicleVin: '1FM5K8D87LGA12345',
    mechanic: 'Antoine Briggs',
    mechanicPayoutPct: 30,
    status: 'Zatvoren',
    parts: [
      { id: 'part-010-1', name: 'Tečnost mjenjača (6qt)', qty: 1, unitCost: 72.0 },
      { id: 'part-010-2', name: 'Filter mjenjača', qty: 1, unitCost: 38.0 },
      { id: 'part-010-3', name: 'Brtva posude mjenjača', qty: 1, unitCost: 22.0 },
    ],
    laborEntries: [
      {
        id: 'labor-010-1',
        description: 'Ispiranje tečnosti i zamjena filtera mjenjača',
        hours: 2.0,
        rate: 95,
      },
    ],
    discountPct: 15,
    notes: 'Vozilo vlasnika. Primjenjen popust za zaposlenika.',
    createdAt: '2026-07-30',
    updatedAt: '2026-07-31',
  },
  {
    id: 'order-011',
    orderNum: 'WO-2026-0079',
    clientName: 'Denise Hartman',
    clientPhone: '(817) 556-2233',
    vehicleYear: '2019',
    vehicleMake: 'Subaru',
    vehicleModel: 'Outback',
    vehicleVin: '4S4BSANC7K3123456',
    mechanic: 'Mei-Ling Park',
    mechanicPayoutPct: 30,
    status: 'Otvoren',
    parts: [
      {
        id: 'part-011-1',
        name: 'Set brtvi glave motora (lijevo + desno)',
        qty: 1,
        unitCost: 420.0,
      },
      { id: 'part-011-2', name: 'Vijci glave motora', qty: 1, unitCost: 55.0 },
      { id: 'part-011-3', name: 'Termostat i kućište', qty: 1, unitCost: 48.0 },
    ],
    laborEntries: [
      {
        id: 'labor-011-1',
        description: 'Zamjena brtvi glave motora (obje strane)',
        hours: 12.0,
        rate: 115,
      },
      { id: 'labor-011-2', description: 'Ispiranje sistema hlađenja', hours: 1.0, rate: 85 },
    ],
    discountPct: 0,
    notes: 'Poznati problem Subaru EJ motora. Klijent odobrio cijeli posao.',
    createdAt: '2026-08-04',
    updatedAt: '2026-08-05',
  },
  {
    id: 'order-012',
    orderNum: 'WO-2026-0078',
    clientName: 'Carlos Mendez',
    clientPhone: '(210) 788-4455',
    vehicleYear: '2014',
    vehicleMake: 'Dodge',
    vehicleModel: 'Ram 1500',
    vehicleVin: '1C6RR7LT4ES123456',
    mechanic: 'Derek Hollis',
    mechanicPayoutPct: 35,
    status: 'Zatvoren',
    parts: [
      { id: 'part-012-1', name: 'Alternator (OEM reman)', qty: 1, unitCost: 185.0 },
      { id: 'part-012-2', name: 'Klinasti remen', qty: 1, unitCost: 38.0 },
      { id: 'part-012-3', name: 'Zaštitnici priključaka baterije', qty: 1, unitCost: 8.5 },
    ],
    laborEntries: [{ id: 'labor-012-1', description: 'Zamjena alternatora', hours: 2.5, rate: 95 }],
    discountPct: 5,
    notes: 'Baterija se praznila preko noći. Alternator bio neispravan.',
    createdAt: '2026-07-28',
    updatedAt: '2026-07-29',
  },
];

export const mockWorkOrders: WorkOrder[] = orders.map((o) => {
  const calcs = calcOrder(o.parts, o.laborEntries, o.discountPct, o.mechanicPayoutPct);
  return {
    ...o,
    vehicle: `${o.vehicleYear} ${o.vehicleMake} ${o.vehicleModel}`,
    createdBy: 'Armin Mujić',
    createdByRole: 'owner',
    ...calcs,
  };
});
