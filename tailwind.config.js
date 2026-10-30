/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cinematic dark base
        base: '#0A0A0F',
        surface1: '#14141C',
        surface2: '#1E1E2A',
        edge: '#2A2A3A',
        // Accents
        primary: {
          DEFAULT: '#7C3AED',
          soft: 'rgba(124,58,237,0.16)',
          glow: 'rgba(124,58,237,0.40)',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          soft: 'rgba(6,182,212,0.16)',
        },
        pink: '#EC4899',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Text
        ink: '#F5F5F7',
        muted: '#8B8B9E',
        disabled: '#4A4A5A',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontWeight: {
        body: '400',
        label: '500',
        btn: '600',
        head: '700',
      },
      fontSize: {
        micro: ['11px', { lineHeight: '14px' }],
        body: ['13px', { lineHeight: '18px' }],
        btn: ['15px', { lineHeight: '20px' }],
        title: ['18px', { lineHeight: '24px' }],
        screen: ['22px', { lineHeight: '28px' }],
      },
      borderRadius: {
        card: '12px',
        sheet: '16px',
        btn: '20px',
        pill: '999px',
      },
      boxShadow: {
        float: '0 8px 32px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(124,58,237,0.40)',
        'glow-cyan': '0 0 16px rgba(6,182,212,0.45)',
        clip: '0 4px 12px rgba(0,0,0,0.45)',
        'clip-drag': '0 10px 28px rgba(0,0,0,0.6)',
      },
      backdropBlur: {
        glass: '20px',
      },
      transitionTimingFunction: {
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        'safe-t': 'var(--safe-top)',
        'safe-b': 'var(--safe-bottom)',
        touch: '44px',
        'touch-lg': '48px',
        topbar: '56px',
        playback: '48px',
        timeline: '160px',
        toolbar: '64px',
      },
      screens: {
        xs: '380px',
      },
    },
  },
  plugins: [],
}
