'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #050507 0%, #0a0a0f 100%)' }}>
        <div className="glass-card rounded-2xl p-10 max-w-md w-full mx-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="font-display text-2xl text-chrome-bright mb-2">Account Created</h2>
          <p className="text-chrome-dim mb-6">Check your email for a verification link, then sign in to access your fleet.</p>
          <Link href="/auth/login" className="btn-amber inline-flex items-center gap-2 rounded-lg py-3 px-6 text-sm">
            Go to Sign In <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050507 0%, #0a0a0f 50%, #111118 100%)' }}>
      <div className="absolute inset-0 carbon-bg opacity-50" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-amber-glow"
            style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}>
            <Shield className="w-8 h-8 text-obsidian-900" />
          </div>
          <h1 className="font-display text-3xl font-bold text-chrome-bright">BLUECHIP</h1>
          <p className="text-chrome-dim mt-2 text-sm tracking-[0.08em] uppercase">Create Your Fleet</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-display text-xl text-chrome-bright mb-1">Create account</h2>
          <p className="text-sm text-chrome-dim mb-6">Set up your collection management</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input-dark w-full rounded-lg px-4 py-3 text-sm" placeholder="Your name" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark w-full rounded-lg px-4 py-3 text-sm" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-dark w-full rounded-lg px-4 py-3 pr-11 text-sm" placeholder="••••••••••" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-chrome-muted hover:text-chrome-dim">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-amber w-full rounded-lg py-3 px-4 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
              {loading ? <div className="w-4 h-4 border-2 border-obsidian-900/30 border-t-obsidian-900 rounded-full animate-spin" /> : (<><span>Create Account</span><ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <Link href="/auth/login" className="text-sm text-chrome-dim hover:text-amber-DEFAULT transition-colors">
              Already have an account? <span className="text-amber-DEFAULT">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
