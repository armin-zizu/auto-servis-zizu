# TODO: Supabase Sync — dijeljenje podataka između uređaja

## Zadatak
Povezati aplikaciju sa Supabase bazom kako bi se podaci (radni nalozi, majstori, isplate, plate, korisnici, postavke) sinkronizirali između mobitela i laptopa.

## Koraci
1. [x] Analiza koda — pronađeni svi localStorage/sessionStorage pozivi
2. [x] Instalacija `@supabase/supabase-js`
3. [x] Kreiranje `src/lib/supabaseClient.ts`
4. [x] Kreiranje `src/lib/syncStore.ts` (centralna sinkronizacija)
5. [x] Kreiranje `.env.local` sa Supabase URL + anon ključ
6. [x] Kreiranje `.env.example` dokumentacije
7. [x] Ažuriranje `src/lib/mechanics.ts`
8. [x] Ažuriranje `src/lib/accounts.ts`
9. [x] Ažuriranje `src/app/work-order-managment/components/WorkOrdersClient.tsx`
10. [x] Ažuriranje `src/app/majstori/isplate/page.tsx`
11. [x] Ažuriranje `src/app/majstori/page.tsx`
12. [x] Ažuriranje `src/app/klijenti/page.tsx`
13. [x] Ažuriranje `src/app/components/MetricsBentoGrid.tsx`
14. [x] Ažuriranje `src/app/components/MechanicPayoutList.tsx`
15. [x] Ažuriranje `src/app/postavke/page.tsx`
16. [x] Kreiranje SQL skripte za Supabase (`supabase/schema.sql`)
17. [x] Type-check i build provjera
18. [x] README upute za deploy na Vercel
19. [ ] Pokrenuti `supabase/schema.sql` u Supabase SQL Editoru
20. [ ] Deploy na Vercel (automatski preko gita) — podaci će se dijeliti između uređaja
