'use client';

import React from 'react';
import LoginForm from './components/LoginForm';
import AppLogo from '@/components/ui/AppLogo';
import { ShieldCheck, Wrench, BarChart3, ClipboardList } from 'lucide-react';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-primary flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute top-1/2 -right-32 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 left-1/4 w-48 h-48 rounded-full bg-white/5" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <AppLogo size={40} />
          <span className="text-white text-xl font-semibold tracking-tight">
            AutoServis
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">
              Obračunska knjiga vaše radionice
            </h1>
            <p className="mt-3 text-primary-foreground/70 text-base leading-relaxed">
              Pratite svaki radni nalog, dio, trošak rada i isplatu majstoru — sve na jednom mjestu.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: <ClipboardList size={16} />, text: 'Kreirajte i upravljajte radnim nalozima od početka do kraja' },
              { icon: <Wrench size={16} />, text: 'Automatski izračun isplata majstorima iz prihoda od rada' },
              { icon: <BarChart3 size={16} />, text: 'Kontrolna tabla uživo — prihodi, troškovi, marže' },
              { icon: <ShieldCheck size={16} />, text: 'Pristup prema ulozi za vlasnike i majstore' },
            ]?.map((item, i) => (
              <div key={`feature-${i}`} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 text-white">
                  {item?.icon}
                </div>
                <span className="text-primary-foreground/80 text-sm">{item?.text}</span>
              </div>
            ))}
          </div>

          {/* Statistike radionice */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { value: '89', label: 'Naloga ovaj mjesec' },
              { value: '24.8k KM', label: 'Prihod MTD' },
              { value: '4', label: 'Aktivnih majstora' },
            ]?.map((stat) => (
              <div key={`stat-${stat?.label}`} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-bold tabular-nums">{stat?.value}</p>
                <p className="text-primary-foreground/60 text-xs mt-0.5">{stat?.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-primary-foreground/40 text-xs">
          © 2026 AutoServis · Napravljeno za auto servise
        </p>
      </div>
      {/* Desni panel s formom */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-background">
        {/* Mobilni logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <AppLogo size={32} />
          <span className="text-foreground text-lg font-semibold">AutoServis</span>
        </div>

        <div className="w-full max-w-md">
          {/* Prebacivanje načina */}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}