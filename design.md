# KhabarCast — Design System

**Style**: Kinetic Typography. Brutalist dark. Acid yellow accent. Everything uppercase. Nothing ever still.

---

## 1. Tokens

All tokens live in `app/globals.css` under Tailwind v4's `@theme` block. Reference them via utility classes (`text-[#DFE104]`, `border-[#3F3F46]`) or CSS vars (`var(--color-accent)`).

### Color

| Token | Value | Where it's used |
| --- | --- | --- |
| `--color-bg` | `#09090B` | Page background. Rich black — softer than pure black. |
| `--color-fg` | `#FAFAFA` | Primary text. Off-white. |
| `--color-muted` | `#27272A` | Decorative background numbers, input placeholders, low-priority surfaces. |
| `--color-muted-fg` | `#A1A1AA` | Secondary / descriptive text only. |
| `--color-border` | `#3F3F46` | Every structural line in the app. |
| `--color-accent` | `#DFE104` | Acid yellow. Hero highlight, CTAs, hover floods, stats marquee. Use sparingly and loudly. |
| `--color-accent-fg` | `#000000` | Pure black, used on top of accent for contrast. |

**Rules**:
- Never pure `#000` or `#FFF`.
- No gradients. Everything is flat.
- Borders always use `--color-border`, never `--color-fg`.
- Selection highlight = accent on black (wired in globals.css via `::selection`).

### Typography

- **Font**: Space Grotesk (loaded via `next/font/google` in `app/layout.tsx`, weights 300–700, variable `--font-space-grotesk`).
- **Single font family** — display and body. Weight carries the hierarchy, not a serif/sans split.

**Scale**:

| Role | Utility | Notes |
| --- | --- | --- |
| Hero display | `text-[clamp(3rem,14vw,14rem)]` | Fluid. Scales with viewport. |
| Section heading | `text-5xl md:text-7xl lg:text-8xl` | Also used for footer wordmark. |
| Card title | `text-3xl md:text-5xl lg:text-6xl` | Feature cards. |
| Massive number | `text-[6rem] md:text-[10rem]` | Decorative, `tabular-nums`. |
| Body / description | `text-lg md:text-xl lg:text-2xl` | Always `text-[#A1A1AA]`, left-aligned. |
| Micro / label | `text-xs md:text-sm` | Always `uppercase tracking-widest`. |

**Rules**:
- All display text, buttons, labels → `uppercase`.
- Body paragraphs stay mixed case (readability).
- Large display → `tracking-tighter leading-[0.85]` (or `0.8` — tight graphic lockups).
- Small labels → `tracking-widest`.
- Font weight: `font-bold` (700) on everything display-grade. Body inherits default 400.

### Spacing

Tailwind 4px base. Section rhythm:

- Major section padding: `py-20 md:py-32` (mobile drops to 80px so the hero breathes on small screens).
- Horizontal page padding: `px-4 md:px-8`.
- Card inner padding: `p-6 md:p-12`.
- Element gaps: `gap-8` default, `gap-px` for hairline-divided card grids.
- Max content width: pushed wide. No `max-w-7xl` caps on sections — the nav bar, hero, and marquees use the viewport width directly.

### Shape

- Border radius: `0` everywhere. No `rounded-*` utilities.
- Border width: `border-2` for structural emphasis, `border-b-2` for the single-line input underline pattern.
- No `shadow-*`. Depth is built from layered color + overlap, not drop shadows.

---

## 2. Layout Structure (`app/page.tsx`)

The landing page is one route, top-to-bottom. Each section is self-contained and can be reshuffled without state leaking.

1. **Nav** — sticky top, `border-b-2`. Wordmark + "JOIN →" button (outline → white flood on hover).
2. **Hero** — oversized three-line headline via `clamp()`. Yellow emphasis word on the third line. Grid-split body + primary CTA underneath.
3. **Stats marquee** — full-bleed yellow strip, 25s loop, big numbers + label pairs separated by `/` glyphs. Fast. Continuous motion.
4. **Features** — three articles stacked with `position: sticky` and increasing `top` offsets (`96px`, `120px`, `144px`). Each card floods yellow on hover; decorative number on the left shifts `text-[#27272A] → black`, headline translates `-2rem` on md+.
5. **Testimonials marquee** — 60s loop (slow enough to read), each card bounded by `border-r-2` for a filmstrip feel.
6. **Waitlist CTA** — huge headline + the `WaitlistForm`. Anchored as `#join`.
7. **Footer** — display-scale wordmark + tiny caps metadata.

### Sticky stack math

Feature card `i` uses `top: ${96 + i * 24}px`. Nav height (56–64px) + 32px gap = ~96px base; each subsequent card offsets 24px lower so the previous one remains partly visible as the next slides over it.

---

## 3. Components

### Button (inlined, not abstracted yet)

Two variants used today:

- **Primary** — `bg-[#DFE104] text-black font-bold uppercase tracking-tighter px-8 py-4 hover:scale-105 active:scale-95`.
- **Outline nav** — `border-2 border-[#3F3F46] hover:bg-[#FAFAFA] hover:text-black hover:border-[#FAFAFA]`.

When a second button site appears, extract to `components/Button.tsx` with a `variant` prop. Don't preemptively abstract.

### Card

Pattern used in the features section. Black card → yellow flood on hover using `group` + coordinated `group-hover:` utilities on every child color. Transition is `duration-300` — fast enough to feel brutal, slow enough to read.

### Input (`components/WaitlistForm.tsx`)

- `border-0 border-b-2 border-[#3F3F46]` — underline only.
- Focus: `focus:border-[#DFE104]` (instant flip, no ring).
- Text: `text-2xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tighter`.
- Placeholder: muted (`#27272A`) so live input dominates.
- Submit button sits beside the input on md+, stacks below on mobile.

### Marquee (CSS, no JS library)

Implemented in `globals.css`:

```css
.marquee { overflow: hidden; }
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee var(--marquee-duration, 40s) linear infinite;
  will-change: transform;
}
@keyframes marquee {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
```

Duplicate the content array at least 3–4× inside `.marquee-track` so the `-50%` translate lands on an identical frame and loops seamlessly. Tune speed per section via `--marquee-duration` inline style (25s for stats, 60s for testimonials).

No `react-fast-marquee` dependency. Keeps bundle tight and respects `prefers-reduced-motion` via a single media query.

### Noise overlay

SVG `feTurbulence` in `app/layout.tsx`, `position: fixed`, `opacity: 0.03`, `mix-blend-mode: overlay`, `z-index: 50`, `pointer-events: none`. Applies globally. `aria-hidden` + `<title>` for screen readers.

---

## 4. Motion

| Interaction | Trigger | Effect | Duration |
| --- | --- | --- | --- |
| Button primary | `:hover` | `scale-105` | 200ms |
| Button primary | `:active` | `scale-95` | 200ms |
| Nav outline button | `:hover` | BG/text/border flip to white/black | default transition |
| Feature card | `:hover` | BG flood to accent, coordinated color flip on every child | 300ms |
| Feature title | `:hover` (md+) | `translate-x-[-2rem]` | 300ms |
| Input underline | `:focus` | Border color `#3F3F46 → #DFE104` | instant |
| Stats marquee | always | translateX infinite | 25s linear |
| Testimonials marquee | always | translateX infinite | 60s linear |
| Form state swap | on submit | `.fade-in` (opacity + 4px translateY) | 300ms |

**Reduced-motion policy**: `@media (prefers-reduced-motion: reduce)` disables all marquees, fade-ins, and clamps every `transition-duration` to 0.01ms. Layout and hierarchy survive intact.

---

## 5. Accessibility

- Contrast: `#FAFAFA` on `#09090B` ≈ 15:1. `#DFE104` on `#09090B` ≈ 12:1. `#A1A1AA` on `#09090B` ≈ 6:1 (AA for large text, which is what we use it for).
- All interactive elements ≥ 44×44px (buttons default to `py-4` which clears 56px).
- Focus indicator = border color swap on inputs, scale transform on buttons. Visible without relying on the OS ring.
- Marquees wrapped in `prefers-reduced-motion` guard.
- Noise SVG is `aria-hidden`.
- Uppercase text styled with CSS `text-transform` — source JSX keeps mixed-case strings where useful for screen-reader pronunciation.

---

## 6. Adding New Pages / Components

Before writing a new component, ask:

1. **Does it need to move?** If yes, reach for a marquee or hover flip — not a new animation system.
2. **Is the type big enough?** If the biggest text on the page is under `text-5xl`, the page is wrong for this system.
3. **Is there yellow?** One element per viewport, max. Save it for the single loudest word.
4. **Are the corners sharp?** Zero `rounded-*`. Always.
5. **Is hover dramatic?** Color floods, translates, scales — not subtle opacity dips.

If all five answers are right, the component is on-brand.

### Folder conventions

- Pages → `app/`
- Reusable UI → `components/` (flat for now; nest only when a folder has 3+ siblings).
- Global styles + tokens → `app/globals.css`.
- Backend → `convex/` (do not modify for UI work).

### When to extract a token

If a color appears in 3+ files, move it from inline `#DFE104` to `var(--color-accent)` / the `@theme` block. Until then, inline hex is fine and searchable.

---

## 7. Anti-Patterns

- Drop shadows (of any kind).
- Rounded corners.
- Mid-range grays (#6B6560 style warmth — that was the previous editorial system, now retired).
- Mixed-case display text.
- Gradients on backgrounds or text.
- Gentle transitions (> 500ms) on interactive states.
- Multiple accent colors. Acid yellow only.
- Small buttons. Everything touches 44px+.
- Centered body paragraphs. Left-align for reading.
- `max-w-4xl` or narrower on full sections. Push wide, stay bold.
