# Fluss — Design System

The single reference for how Fluss looks and behaves. Tokens live in
`src/index.css`; primitives live in `src/components/ui/`. Nothing in the app
should introduce a colour, radius, size, or duration that isn't here.

`DESIGN_PATTERN.md` covers page composition and layout rules. This file covers
the system those pages are built from.

---

## 1. The premise

Fluss is a **glanceable background utility**. It sits beside a browser, often
minimised to the tray, and is checked rather than read: *is it done yet?*

Everything below follows from that one sentence.

- **The window recedes.** Neutral surfaces, hairline edges, no decoration
  competing for attention.
- **One colour carries state.** Accent green appears only where something is
  flowing or finished. If there is green on screen, something happened.
- **Numbers don't twitch.** Every value that updates live is mono and tabular.
- **Motion reports, never performs.** 120–260ms, ease-out, no bounce.

### What it is not

Not a dark hacker tool with a neon accent — that's the first reflex for
anything wrapping a CLI. Not warm cream editorial with a display serif —
that's the second reflex, and it's what Fluss used to be. The answer here is a
quiet, near-neutral shell tinted toward the brand's own hue, with green
demoted from *chrome* to *signal*.

---

## 2. Colour

OKLCH throughout, so the neutral ramp is perceptually even and the accent keeps
the same apparent weight in both themes. Light is the `@theme` default; dark
overrides the same custom properties under `:root[data-theme="dark"]`.

### Surfaces

Named by **role**, not by lightness — the stack inverts between themes (light
elevates by getting brighter, dark by getting lighter-than-the-window) and
role names survive that.

| Token | Job |
|---|---|
| `app` | Window background. The caption bar and rail sit directly on it. |
| `panel` | The floating content sheet. The only raised plane in the shell. |
| `card` | Widgets on the sheet. |
| `inset` | Recessed: inputs, wells, tracks, thumbnail frames. |

Depth comes from this ramp plus a gap, not from shadows. There are exactly two
planes in the shell: the window frame and the sheet.

### Interaction washes

`hover` and `pressed` are **translucent** so they compose over any surface
without needing a second variant per layer.

### Text

Three steps. Every one is verified ≥4.5:1 against `card`, the least contrasty
surface it is allowed to land on.

| Token | Job | Light | Dark |
|---|---|---|---|
| `ink` | Titles, values, anything you read first | L 0.22 | L 0.955 |
| `ink-2` | Secondary body, labels | L 0.40 | L 0.80 |
| `ink-3` | Metadata, hints, placeholders, resting icons | L 0.47 | L 0.685 |

`ink-3` is the **floor**, not a licence to go lighter. Placeholder text uses it
too — placeholders are content, and the usual "muted grey" placeholder fails
contrast everywhere.

### Accent — the signal

Green, inherited from the mark. Used for exactly four things:

1. Progress fill
2. Status dots and success
3. Selection (the tinted icon on the active nav row, the focus ring)
4. Accent text (`accent-ink`)

**Never a text-bearing fill.** There is deliberately no `on-accent` token —
if you're about to put a label on a green rectangle, you want `solid` instead.
That rule is what keeps the palette Restrained: a running download is the
greenest thing on screen, always.

### Solid

`solid` / `on-solid` is the primary-action fill: **ink, not accent**. Near-black
in light, near-white in dark. A filled button therefore never competes with a
progress bar, and the CTA reads as the most committed thing on the page without
using colour to do it.

### Status

Each has the same three-part shape: `-` (fill), `-ink` (readable text),
`-soft` (wash).

- **accent** — success doubles as the accent; a finished download is the same green as a running one
- **warn** — required-but-not-yet-wrong (e.g. no folder chosen)
- **danger** — failed, destructive. Plus `danger-solid` / `on-danger` for the one destructive button; it's darker than `danger` in light mode so the label clears 4.5:1.

Status is **never carried by colour alone** — every chip has a word.

### One error surface

Anything reporting a problem — the inline analyse error, a failed download's
block, an error toast, the destructive dialog — uses the same shape:

> **neutral surface + a small tinted icon plate + a hairline in the status hue.**

Not a filled `-soft` block. A `danger-soft` wash over a 600px-wide region makes
a field of pink the loudest thing on a page whose whole palette is otherwise
restrained, and it produced two different-looking errors in one app. The tint
belongs in the 24–28px plate, where it marks the message without flooding it.

The one exception is a control whose *own state* is the message — an unset
download folder — where the field itself carries a `warn` wash because there
is nothing else to tint.

---

## 3. Typography

**One family.** Geist carries headings, buttons, labels, body, and data. The
old display serif is gone: a display face in UI labels is a product-design
anti-pattern, and product UI doesn't need a pairing.

**Geist Mono is functional only** — URLs, file paths, byte counts, speeds,
versions, counts. Things that are data, or that must not reflow as they update.
Pair `font-mono` with `tabular-nums` for anything live.

Fixed rem scale, ~1.15 through the dense band and a wider jump at the top.
Nothing is fluid: users view at a consistent DPI, and a clamp-sized heading that
shrinks inside a panel looks worse, not better.

| Token | px | Used for |
|---|---|---|
| `text-2xs` | 11 | Badges, dense metadata, `kbd` |
| `text-xs` | 12 | Captions, stat rows, hints |
| `text-sm` | 13 | Dense UI, field labels, table rows |
| `text-base` | 14 | Body and every control — the default |
| `text-md` | 16 | Card and section titles |
| `text-lg` | 18 | Preview titles |
| `text-xl` | 22 | Dialog titles |
| `text-2xl` | 32 | Page titles (h1) |

Weights: **400** body, **500** labels and controls, **600** titles. Nothing
heavier. Emphasis is weight, not size.

Tracking tightens as size grows: `-0.022em` on page titles, `-0.015em` at 18–22,
`-0.01em` at 16, none below.

### Banned

Tiny uppercase letter-spaced eyebrows (`text-[11px] font-bold uppercase
tracking-widest`). It was on every label in the old UI. At 11px with wide
tracking it is the least legible text on screen, and it reads as decoration
rather than as a label. Field labels are 13px medium sentence-case.

---

## 4. Shape

Radius hierarchy is load-bearing: the bigger the container, the rounder it is,
so nesting reads as depth. Values are tuned to the heights they actually wrap —
a 40px control at 16px radius is a lozenge, so controls stop at 12.

| Token | px | Used for |
|---|---|---|
| `rounded-xs` | 6 | Progress tracks, tiny chips |
| `rounded-sm` | 8 | Nested elements, skeleton bars |
| `rounded-md` | 10 | Icon buttons, compact controls, menu items |
| `rounded-lg` | 12 | Buttons, inputs, thumbnails, wells |
| `rounded-xl` | 16 | Cards, widgets, list containers |
| `rounded-2xl` | 20 | Dialogs, empty states |
| `rounded-3xl` | 24 | The content sheet |
| `rounded-full` | — | Badges, switches, progress fills, dots |

**Cards never nest.** Content inside a card that needs its own container gets a
`Well` (`bg-inset`), which reads as recessed rather than as another card.

---

## 5. Depth and edges

Shadows are two-layer and nearly invisible. They exist to stop a floating thing
sitting flat, not to make it hover.

`shadow-card` → `shadow-panel` → `shadow-pop` (menus, toasts) → `shadow-modal`.

Borders are 1px `line` (~9% ink) with `line-strong` (~17%) for hover and
dividers. Most separation is spacing; a border is a last resort.

---

## 6. Spacing

8px rhythm with 4px half-steps. In practice: `2 3 4 5 6 8 10 12 16` on
Tailwind's 4px scale.

- Page padding: `px-10 py-12`
- Card padding: `p-5`
- Gap between cards: `5` (20px)
- Gap between page sections: `10` (40px)
- Control gaps: `2`–`3`

---

## 7. Motion

Tokens in `src/lib/motion.ts` mirror the easings in `index.css`.

- **Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). No bounce, no elastic — overshoot in a tool reads as lag.
- **Durations**: fast 120ms, base 180ms, slow 260ms.
- **Selection indicators** (nav pill, segmented control) use a shared `layoutId` and a stiff spring, so the change reads as one element moving rather than two repaints.
- **Press**: `active:scale-[0.98]` on buttons, `0.95` on icon buttons.
- **Lists** stagger at 40ms — short enough that the last row lands before the eye reaches it.

**Reduced motion is not optional.** The global media query flattens every
duration. Two things keep moving because stilling them would read as frozen:
the skeleton (falls back to a static fill) and the indeterminate bar (becomes a
full-width 50%-opacity track). Nothing is *revealed* by a transition, so
suppressing motion never hides content.

---

## 8. Stacking

Semantic scale in `:root`, referenced as `z-[var(--z-modal)]`. Never arbitrary
numbers.

`dropdown 20 → sticky 30 → resize 35 → scrim 40 → modal 50 → menu 60 → toast 70 → tooltip 80`

---

## 9. Component library

`src/components/ui/` — every screen is composed from these.

| Primitive | Notes |
|---|---|
| `Button` | `primary` (ink fill) · `secondary` · `ghost` · `danger`; `sm/md/lg`; `loading`, `iconOnly`. Filled variants drop to a neutral wash when disabled instead of fading. |
| `IconButton` | Row/toolbar actions. Resting state is muted, never hidden — hover-only affordances are invisible to keyboard and touch. |
| `Input` | Soft field. Focus is a ring on the **shell**, never a border-width change. Optional leading icon and trailing control (the trailing slot lives inside the focus ring). |
| `Field` / `Row` | Label+hint above a control; label+hint with the control hard right. |
| `Card` / `CardHeader` / `Well` | The widget, its first line, and the recessed container. |
| `Badge` | Pill. `neutral/accent/danger/warn`, optional dot, optional mono. |
| `SegmentedControl` | Every exclusive choice. `radio` for settings, `tab` when it swaps a view. Sliding indicator. |
| `Switch` | 44×24 with an 8px invisible halo so the real target clears 40px. |
| `Progress` | Determinate + indeterminate. Track is an ink wash so contrast holds on any surface. |
| `Skeleton` | Region loading. Travelling highlight, not a pulse. |
| `Spinner` | Only inside a working button or beside a one-line status. |
| `Dialog` | The one modal shell. |
| `Tooltip` | CSS-only, for controls whose label is hidden (the collapsed rail). |
| `EmptyState` | Icon plate, title, teaching copy, and the action that resolves it. |
| `PageHeader` | One h1 per page, plus the page's own control. |

The brand mark is `public/FLUSS_LOGO.png`, rendered with a plain `<img>` in the
caption bar. It is the product's identity and not a design-system component —
don't redraw it, recolour it, or replace it with an icon.

### Interaction states

Every interactive primitive ships **default, hover, focus-visible, active,
disabled**, plus `loading` and `error` where they apply. Half a set is a bug.

Focus is one treatment app-wide: a 2px accent outline at 2px offset, declared
in `@layer base` so a utility can still turn it off. Composite controls suppress
the inner element's ring and show focus on the shell — there is never more than
one ring on screen.

---

## 10. Icons

Lucide, `strokeWidth={1.75}`, sized by context (`size-3.5` in `sm` controls,
`size-4` standard, `size-4.5` in the nav rail). Buttons set icon size via
`[&_svg]:size-*` so every icon in a given control matches without callers
thinking about it.

---

## 11. Accessibility floor

- Body text ≥4.5:1; verified per token against the least contrasty surface it can land on.
- Status is text + colour, never colour alone.
- Every icon-only control has an accessible name (`IconButton` requires `label`).
- Pointer targets ≥32px, with invisible halos where the visible control is smaller.
- One h1 per page; section headings are h2.
- `prefers-reduced-motion` honoured globally.
- Native `<details>` for progressive disclosure; raw engine output is never the first thing anyone reads.
