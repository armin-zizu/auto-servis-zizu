'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, DollarSign, Package, TrendingUp, Users, Wrench } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useFinanceSummary } from '@/lib/financeData';

const formatKm = (value: number) => `${value.toLocaleString('bs-BA', { maximumFractionDigits: 2 })} KM`;

export default function FinancePage() {
  const finance = useFinanceSummary();
  const sections = [
    { href: '/finansije/prihodi', label: 'Prihodi', value: formatKm(finance.revenue), description: `${finance.closedOrders} zatvorenih naloga ovaj mjesec`, icon: DollarSign, className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { href: '/finansije/troskovi', label: 'Troškovi dijelova', value: formatKm(finance.partsCost), description: 'Nabavna cijena kod dobavljača', icon: Package, className: 'bg-amber-50 border-amber-200 text-amber-700' },
    { href: '/finansije/prihodi', label: 'Naplata rada', value: formatKm(finance.laborRevenue - finance.mechanicEarnings), description: 'Naplaćene ruke nakon 10% za majstore', icon: Wrench, className: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
    { href: '/majstori/isplate', label: 'Isplate majstorima', value: formatKm(finance.unpaidPayouts), description: 'Neisplaćene obaveze ovog mjeseca', icon: Users, className: 'bg-blue-50 border-blue-200 text-blue-700' },
    { href: '/finansije/troskovi', label: 'Dobit', value: formatKm(finance.operatingProfit), description: 'Nakon dijelova i 10% za majstore', icon: TrendingUp, className: 'bg-violet-50 border-violet-200 text-violet-700' },
  ];
  return <AppLayout userRole="owner" userName="Armin Mujić" userEmail="armin@autoservis.com"><div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6"><div><Link href="/" className="text-xs text-primary hover:underline">Dashboard</Link><h1 className="text-2xl font-semibold text-foreground mt-2">Finansije</h1><p className="text-sm text-muted-foreground mt-1">Podaci se računaju iz zatvorenih naloga i evidentiranih isplata.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{sections.map((section) => { const Icon = section.icon; return <Link key={section.href} href={section.href} className={`rounded-xl border p-5 shadow-card hover:shadow-card-hover transition-shadow ${section.className}`}><div className="flex items-start justify-between"><Icon size={22} /><ArrowRight size={17} /></div><p className="text-xs font-medium uppercase tracking-wide mt-6">{section.label}</p><p className="text-2xl font-bold text-foreground tabular-nums mt-1">{section.value}</p><p className="text-xs mt-1 opacity-80">{section.description}</p></Link>; })}</div></div></AppLayout>;
}
