'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050507 0%, #0a0a0f 50%, #111118 100%)' }}>

      {/* Background details */}
      <div className="absolute inset-0 carbon-bg opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(232, 168, 0, 0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Decorative lines */}
      <div className="absolute left-0 top-0 w-px h-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,168,0,0.3), transparent)' }} />
      <div className="absolute right-0 top-0 w-px h-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,168,0,0.3), transparent)' }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-amber-glow"
            style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}>
            <Shield className="w-8 h-8 text-obsidian-900" />
          </div>
          <h1 className="font-display text-3xl font-bold text-chrome-bright tracking-wide">GARAGE OS</h1>
          <p className="text-chrome-dim mt-2 text-sm tracking-[0.08em] uppercase">Fleet Command Centre</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-display text-xl text-chrome-bright mb-1">Welcome back</h2>
          <p className="text-sm text-chrome-dim mb-6">Sign in to your collection</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-dark w-full rounded-lg px-4 py-3 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-dark w-full rounded-lg px-4 py-3 pr-11 text-sm"
                  placeholder="••••••••••"
                  required
                />
                <button type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-chrome-muted hover:text-chrome-dim transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full rounded-lg py-3 px-4 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <div className="w-4 h-4 border-2 border-obsidian-900/30 border-t-obsidian-900 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Access Fleet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <Link href="/auth/register" className="text-sm text-chrome-dim hover:text-amber-DEFAULT transition-colors">
              No account? <span className="text-amber-DEFAULT">Create one</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-chrome-muted mt-8">
          Protected · Private Collection Management
        </p>
      </div>
    </div>
  );
}
