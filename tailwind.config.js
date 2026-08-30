/** @type {import('tailwindcss').Config} */

// Colours live as raw RGB channels in src/index.css so both themes and
// Tailwind's opacity modifiers (bg-amber/15) work off the same tokens.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: token('ground'),
        panel: token('panel'),
        raise: token('raise'),
        hairline: token('hairline'),
        ink: {
          DEFAULT: token('ink'),
          dim: token('ink-dim'),
          mute: token('ink-mute'),
        },
        amber: token('amber'),
        rust: token('rust'),

        // Aliases kept so any older component (or a patch pushed from the VPS)
        // still resolves to the new palette instead of rendering colourless.
        background: token('ground'),
        surface: token('panel'),
        'surface-hover': token('raise'),
        border: token('hairline'),
        'text-primary': token('ink'),
        'text-secondary': token('ink-dim'),
        'text-muted': token('ink-mute'),
        atlas: {
          300: token('amber'),
          400: token('amber'),
          500: token('amber'),
          600: token('rust'),
          700: token('rust'),
          900: token('raise'),
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        ident: '0.22em',
        eyebrow: '0.16em',
      },
      maxWidth: {
        reading: '38rem',
        shell: '76rem',
      },
      boxShadow: {
        lift: '0 18px 50px -24px rgb(0 0 0 / 0.65)',
        dial: '0 0 22px -4px rgb(var(--amber) / 0.45)',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease both',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
