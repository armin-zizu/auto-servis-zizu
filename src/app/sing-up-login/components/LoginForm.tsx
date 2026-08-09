'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Copy, CheckCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoginValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface DemoCredential {
  role: string;
  email: string;
  password: string;
  description: string;
}

interface StoredMechanicAccount {
  fullName: string;
  email: string;
  password: string;
  role: 'mechanic';
}

const demoCredentials: DemoCredential[] = [
  {
    role: 'Vlasnik / Menadžer',
    email: 'armin@autoservis.shop',
    password: 'ShopOwner2026!',
    description: 'Puni pristup — svi nalozi, finansije, izvještaji o isplatama',
  },
  {
    role: 'Majstor',
    email: 'derek.hollis@autoservis.shop',
    password: 'Mechanic2026!',
    description: 'Samo vlastiti nalozi — evidentiranje rada, pregled dodijeljenih poslova',
  },
];

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const autofill = (cred: DemoCredential) => {
    setValue('email', cred.email, { shouldValidate: true });
    const currentPassword = cred.role === 'Vlasnik / Menadžer'
      ? window.localStorage.getItem('autoservis-owner-password') || cred.password
      : cred.password;
    setValue('password', currentPassword, { shouldValidate: true });
    setAuthError('');
  };

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    setAuthError('');
    await new Promise((r) => setTimeout(r, 900));

    // Backend integration point: POST /api/auth/login { email, password }
    const storedAccounts = JSON.parse(
      window.localStorage.getItem('autoservis-mechanic-accounts') || '[]'
    ) as StoredMechanicAccount[];
    const ownerPassword = window.localStorage.getItem('autoservis-owner-password') || 'ShopOwner2026!';
    const valid = demoCredentials.find((c) => (
      c.email === data.email
      && (c.role === 'Vlasnik / Menadžer' ? ownerPassword : c.password) === data.password
    ));
    const storedAccount = storedAccounts.find(
      (account) => account.email === data.email && account.password === data.password
    );

    if (!valid && !storedAccount) {
      setLoading(false);
      setAuthError(
        'Invalid credentials — use the demo accounts below to sign in.'
      );
      return;
    }

    const session = {
      userRole: valid?.role === 'Vlasnik / Menadžer' ? 'owner' : 'mechanic',
      userName: valid?.role === 'Vlasnik / Menadžer' ? 'Armin Mujić' : storedAccount?.fullName || 'Derek Hollis',
      userEmail: valid?.email || storedAccount?.email || data.email,
    } as const;
    window.localStorage.removeItem('autoservis-session');
    window.sessionStorage.removeItem('autoservis-session');
    const storage = data.rememberMe ? window.localStorage : window.sessionStorage;
    storage.setItem('autoservis-session', JSON.stringify(session));
    setLoading(false);
    router.push('/');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Dobrodošli nazad</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Prijavite se na vaš AutoServis nalog
        </p>
      </div>

      {/* Greška pri autentifikaciji */}
      {authError && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email adresa
          </label>
          <input
            type="email"
            placeholder="vi@autoservis.shop"
            autoComplete="email"
            {...register('email', {
              required: 'Email je obavezan',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Unesite ispravnu email adresu',
              },
            })}
            className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-colors"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
          )}
        </div>

        {/* Lozinka */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              Lozinka
            </label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
            >
              Zaboravili ste lozinku?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: 'Lozinka je obavezna' })}
              className="w-full px-3.5 py-2.5 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
          )}
        </div>

        {/* Zapamti me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            {...register('rememberMe')}
            className="rounded border-input accent-primary"
          />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
            Ostani prijavljen 30 dana
          </label>
        </div>

        {/* Prijava */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Prijavljivanje…
            </>
          ) : (
            'Prijavi se'
          )}
        </button>
      </form>

      {/* Demo kredencijali */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Demo nalozi
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kliknite na red za automatsko popunjavanje
          </p>
        </div>
        <div className="divide-y divide-border">
          {demoCredentials.map((cred) => (
            <div
              key={`demo-${cred.role}`}
              onClick={() => autofill(cred)}
              className="px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">
                  {cred.role}
                </span>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Klikni za popunjavanje →
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{cred.description}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono-data text-xs text-foreground">
                    {cred.email}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(cred.email, `email-${cred.role}`);
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy email"
                  >
                    {copiedField === `email-${cred.role}` ? (
                      <CheckCheck size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-data text-xs text-muted-foreground">
                    {cred.password}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(cred.password, `pw-${cred.role}`);
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy password"
                  >
                    {copiedField === `pw-${cred.role}` ? (
                      <CheckCheck size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}