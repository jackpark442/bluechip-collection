'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

// Floating particle
function Particle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: 'rgba(232, 168, 0, 0.15)',
      }}
      animate={{
        y: [-20, 20, -20],
        opacity: [0.1, 0.4, 0.1],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

const PARTICLES = [
  { x: 10, y: 20, size: 4, duration: 6, delay: 0 },
  { x: 85, y: 15, size: 6, duration: 8, delay: 1 },
  { x: 20, y: 75, size: 3, duration: 7, delay: 2 },
  { x: 75, y: 80, size: 5, duration: 9, delay: 0.5 },
  { x: 50, y: 10, size: 4, duration: 6.5, delay: 1.5 },
  { x: 90, y: 50, size: 3, duration: 7.5, delay: 3 },
  { x: 5, y: 50, size: 5, duration: 8.5, delay: 2.5 },
  { x: 60, y: 90, size: 4, duration: 6, delay: 4 },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Login failed');
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-obsidian-900">

      {/* Video backdrop — three vertical videos side by side */}
      <div className="absolute inset-0 flex">
        {['car1', 'car2', 'car3'].map((name, i) => (
          <motion.div
            key={name}
            className="flex-1 relative overflow-hidden"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: i * 0.2, ease: 'easeOut' }}
          >
            <video
              src={`/videos/${name}.mp4`}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ animationPlayState: 'running' }}
              ref={el => {
                if (el && name === 'car1') el.playbackRate = 0.6;
              }}
            />
            {/* Per-video dark vignette */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to bottom, rgba(5,5,7,0.5) 0%, rgba(5,5,7,0.1) 40%, rgba(5,5,7,0.1) 60%, rgba(5,5,7,0.5) 100%)'
            }} />
            {/* Divider line between videos */}
            {i < 2 && (
              <div className="absolute right-0 top-0 w-px h-full"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,168,0,0.2), transparent)' }} />
            )}
          </motion.div>
        ))}
      </div>

      {/* Global dark overlay so form is readable */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, rgba(5,5,7,0.55) 0%, rgba(5,5,7,0.35) 50%, rgba(5,5,7,0.55) 100%)'
      }} />

      {/* Floating particles */}
      {mounted && PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Decorative side lines */}
      <motion.div
        className="absolute left-0 top-0 w-px h-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,168,0,0.4), transparent)' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 top-0 w-px h-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,168,0,0.4), transparent)' }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <div className="relative z-10 w-full max-w-md px-6">

        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Shield className="w-8 h-8 text-obsidian-900" />
          </motion.div>

          <motion.h1
            className="font-display text-3xl font-bold text-chrome-bright tracking-[0.15em]"
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.15em' }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            BLUECHIP
          </motion.h1>

          <motion.p
            className="text-chrome-dim mt-2 text-sm tracking-[0.08em] uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            Fleet Command Centre
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="glass-card rounded-2xl p-8"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="font-display text-xl text-chrome-bright mb-1">Welcome back</h2>
            <p className="text-sm text-chrome-dim mb-6">Sign in to your collection</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-5"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <label className="block text-xs font-semibold text-chrome-dim mb-2 tracking-[0.08em] uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-dark w-full rounded-lg px-4 py-3 text-sm transition-all focus:ring-1 focus:ring-amber-DEFAULT/50"
                placeholder="you@example.com"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
            >
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <motion.button
                type="submit"
                disabled={loading}
                className="btn-amber w-full rounded-lg py-3 px-4 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-obsidian-900/30 border-t-obsidian-900 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <span>Access Fleet</span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          <motion.div
            className="mt-6 pt-6 border-t border-white/5 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <Link href="/auth/register" className="text-sm text-chrome-dim hover:text-amber-DEFAULT transition-colors">
              No account? <span className="text-amber-DEFAULT">Create one</span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          className="text-center text-xs text-chrome-muted mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          Protected · Private Collection Management
        </motion.p>
      </div>
    </div>
  );
}
