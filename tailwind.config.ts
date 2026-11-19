import type { Config } from 'tailwindcss';

/**
 * WAQTI Tailwind configuration.
 * Semantic colors resolve to CSS variables defined in src/styles/tokens.css,
 * so light/dark themes are swapped by toggling the `.dark` class on <html>.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        brand: {
          emerald: '#102B26',
          'emerald-2': '#176B56',
          gold: '#D1AD70',
          cream: '#F5F2EA',
          night: '#111816',
        },
        canvas: token('canvas'),
        'canvas-subtle': token('canvas-subtle'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        sunken: token('sunken'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-muted': token('ink-muted'),
        'ink-subtle': token('ink-subtle'),
        primary: {
          DEFAULT: token('primary'),
          fg: token('primary-fg'),
          strong: token('primary-strong'),
          soft: token('primary-soft'),
        },
        accent: {
          DEFAULT: token('accent'),
          fg: token('accent-fg'),
          strong: token('accent-strong'),
          soft: token('accent-soft'),
        },
        hero: {
          DEFAULT: token('hero'),
          fg: token('hero-fg'),
          muted: token('hero-muted'),
          line: token('hero-line'),
        },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
        ring: token('ring'),
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(var(--shadow) / 0.05)',
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 6px 20px -8px rgb(var(--shadow) / 0.10)',
        raised: '0 2px 4px rgb(var(--shadow) / 0.06), 0 16px 40px -12px rgb(var(--shadow) / 0.22)',
        focus: '0 0 0 3px rgb(var(--ring) / 0.28)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
