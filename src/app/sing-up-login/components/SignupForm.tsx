'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignupValues {
  fullName: string;
  shopName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'owner' | 'mechanic';
  agreeToTerms: boolean;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupValues>({
    defaultValues: {
      fullName: '',
      shopName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'owner',
      agreeToTerms: false,
    },
  });

  const watchedRole = watch('role');
  const watchedPassword = watch('password');

  const onSubmit = async (data: SignupValues) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    // Backend integration point: POST /api/auth/signup { fullName, shopName, email, password, role }
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push('/'), 1500);
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Nalog kreiran!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Preusmjeravamo vas na kontrolnu tablu…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Kreirajte nalog</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Postavite AutoServis za vašu radionicu
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Odabir uloge */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Ja sam…
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['owner', 'mechanic'] as const).map((r) => (
              <label
                key={`role-${r}`}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150
                  ${
                    watchedRole === r
                      ? 'border-primary bg-primary/5' :'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
              >
                <input
                  type="radio"
                  value={r}
                  {...register('role')}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {r === 'owner' ? 'Vlasnik radionice' : 'Majstor'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r === 'owner' ? 'Puni pristup + finansije' : 'Samo moji nalozi'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Puno ime */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Puno ime <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
                placeholder="npr. Armin Mujić"
            autoComplete="name"
            {...register('fullName', { required: 'Puno ime je obavezno' })}
            className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          {errors.fullName && (
            <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Naziv radionice — samo za vlasnika */}
        {watchedRole === 'owner' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Naziv radionice <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Prikazuje se na fakturama i izvještajima
            </p>
            <input
              type="text"
              placeholder="npr. Webb's Auto Repair"
              {...register('shopName', {
                required: watchedRole === 'owner' ? 'Naziv radionice je obavezan' : false,
              })}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            {errors.shopName && (
              <p className="text-xs text-red-500 mt-1">{errors.shopName.message}</p>
            )}
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Poslovni email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="vi@vasaradionica.com"
            autoComplete="email"
            {...register('email', {
              required: 'Email je obavezan',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Unesite ispravnu email adresu',
              },
            })}
            className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Lozinka */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Lozinka <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Minimum 8 znakova
          </p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password', {
                required: 'Lozinka je obavezna',
                minLength: { value: 8, message: 'Minimum 8 znakova' },
              })}
              className="w-full px-3.5 py-2.5 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
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
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Potvrda lozinke */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Potvrdite lozinku <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Molimo potvrdite lozinku',
                validate: (val) =>
                  val === watchedPassword || 'Lozinke se ne podudaraju',
              })}
              className="w-full px-3.5 py-2.5 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Sakrij lozinku' : 'Prikaži lozinku'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Uvjeti */}
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="agreeToTerms"
            {...register('agreeToTerms', {
              required: 'Morate prihvatiti uvjete da biste nastavili',
            })}
            className="rounded border-input accent-primary mt-0.5"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
            Slažem se s{' '}
            <span className="text-primary hover:underline cursor-pointer">Uvjetima korištenja</span>{' '}
            i{' '}
            <span className="text-primary hover:underline cursor-pointer">Politikom privatnosti</span>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-xs text-red-500 -mt-2">{errors.agreeToTerms.message}</p>
        )}

        {/* Kreiranje naloga */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Kreiranje naloga…
            </>
          ) : (
            'Kreiraj nalog'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Već imate nalog?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-primary font-medium hover:underline"
        >
          Prijavite se
        </button>
      </p>
    </div>
  );
}