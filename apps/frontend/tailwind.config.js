/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Wise palette ────────────────────────────────────────────
        // Legacy token names (`bg`, `tx`, `pr`, …) are preserved so the
        // existing utility classes (`bg-bg`, `text-tx`, `bg-pr`, …)
        // keep working; only their values are remapped to Wise.

        // Surface
        bg: '#e8ebe6',          // canvas-soft — sage page background
        w: '#ffffff',           // canvas
        bd: '#d1d3cf',          // hairline border (sage-tinted neutral)

        // Brand — Wise lime green
        pr: '#9fe870',          // primary
        'pr-hov': '#cdffad',    // primary-active
        pl: '#e2f6d5',          // primary-pale

        // Text
        tx: '#0e0f0c',          // ink
        'tx-2': '#163300',      // ink-deep
        su: '#454745',          // body
        'su-2': '#454745',
        dis: '#868685',         // mute

        // Semantic — kept compatible with existing red / amber / green
        // tokens but pulled toward Wise hues. Invoice-status colours are
        // pinned separately in components and are NOT remapped to Wise
        // green (per design system: brand CTA ≠ success state).
        re: '#d03238',          // negative
        're-hov': '#a72027',
        're-bg': '#fdecea',
        am: '#b86700',          // warning-deep
        'am-bg': '#fef7d6',
        gr: '#2ead4b',          // positive (kept distinct from brand lime)
        'gr-bg': '#e2f6d5',
        info: '#38c8ff',        // accent-cyan
        'info-bg': '#e5f6ff',
        plus: '#92174d',
        luxe: '#460479',
        accent: '#ffc091',      // accent-orange

        // Wise-named aliases for clarity in new code.
        canvas:       '#ffffff',
        'canvas-soft':'#e8ebe6',
        ink:          '#0e0f0c',
        'ink-deep':   '#163300',
        body:         '#454745',
        mute:         '#868685',
      },
      fontFamily: {
        // Inter is the brand's second face — used for sub-displays,
        // body, labels. Noto Sans Khmer covers Khmer-script glyphs via
        // per-glyph fallback so mixed-script labels render correctly.
        sans:    ['Inter', '"Noto Sans Khmer"', '-apple-system', 'system-ui', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
        // Manrope at weight 900 stands in for proprietary Wise Sans on
        // hero displays. Reach for `font-display` on `display-mega` /
        // `display-xl` / `display-md` headlines.
        display: ['Manrope', 'Inter', '"Noto Sans Khmer"', '-apple-system', 'system-ui', 'sans-serif'],
        khmer:   ['"Noto Sans Khmer"', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '430px',
      },
      borderRadius: {
        // Wise canonical card + button radius is 24px. Tailwind's
        // `rounded-3xl` already maps to 24px, so we keep that. The
        // legacy `xl2` / `xl3` tokens stay for callsites that still use
        // them — `wise` is the new semantic alias.
        xl2:  '14px',
        xl3:  '20px',
        wise: '24px',
      },
      boxShadow: {
        elev: 'rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0',
        lift: 'rgba(0, 0, 0, 0.08) 0 4px 12px',
        search: 'rgba(0, 0, 0, 0.04) 0 2px 6px 0',
        focus: '0 0 0 2px #222222',
        ringW: '0 0 0 4px rgb(255, 255, 255)',
      },
      letterSpacing: {
        tight2: '-0.18px',
        tight3: '-0.44px',
      },
    },
  },
  plugins: [],
}
