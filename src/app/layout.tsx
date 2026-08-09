import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import PwaRegister from '@/components/PwaRegister';
import '../styles/index.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AutoServis — Auto Repair Shop Management',
  description:
    'AutoServis helps auto repair shops track work orders, parts costs, labor revenue, and mechanic payouts from one dashboard.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Auto Servis Zizu',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Auto Servis Zizu',
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bs" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className={dmSans.className}>
      <PwaRegister />
        {children}
        <Toaster position="bottom-right" richColors closeButton />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fautoservis6229back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}