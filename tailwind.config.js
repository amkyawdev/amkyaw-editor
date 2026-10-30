/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#12141a',
        panelAlt: '#191c24',
        edge: '#262a34',
        accent: '#5b8cff',
        accentSoft: '#2b3a63',
        danger: '#ff5d5d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      spacing: {
        'safe-t': 'var(--safe-top)',
        'safe-b': 'var(--safe-bottom)',
        'safe-l': 'var(--safe-left)',
        'safe-r': 'var(--safe-right)',
        touch: '44px',
      },
      screens: {
        xs: '380px',
        coarse: { raw: '(pointer: coarse)' },
      },
      transitionTimingFunction: {
        sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}
