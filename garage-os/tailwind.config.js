/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette — Obsidian & Amber
        obsidian: {
          950: '#050507',
          900: '#0a0a0f',
          800: '#111118',
          700: '#181820',
          600: '#1e1e28',
          500: '#252532',
        },
        amber: {
          glow: '#d4960a',
          DEFAULT: '#e8a800',
          light: '#f5c842',
          pale: '#fde68a',
        },
        chrome: {
          DEFAULT: '#c8c8d0',
          bright: '#e8e8f0',
          dim: '#888896',
          muted: '#555560',
        },
        ruby: '#c0392b',
        emerald: { fleet: '#1a6b4a' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'carbon': "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E\")",
        'grid-subtle': "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(232, 168, 0, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(232, 168, 0, 0.7)' },
        },
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'amber-glow': '0 0 20px rgba(232, 168, 0, 0.25)',
        'amber-glow-lg': '0 0 40px rgba(232, 168, 0, 0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
    },
  },
  plugins: [],
};
