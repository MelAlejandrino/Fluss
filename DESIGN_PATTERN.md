# Design Pattern

> This file documents the systematic layout and interaction patterns used across the single-page site. Colors, typefaces, and spacing tokens are defined in `DESIGN.md` and referenced here by semantic token name.

## 1. Philosophy

The pattern follows **Technical Minimalism**: a desktop-centric, precision-engineered aesthetic with structural clarity, hard-edge alignment, and zero ornamental decoration. Elevation is expressed through tonal layering and thin outlines rather than drop shadows. The overall rhythm is calculated, calm, and utilitarian.

## 2. Page Structure

A single-page site is composed of sequentially stacked `<section>` elements wrapped in a `<main>` tag.

```tsx
<main>
  <Hero />
  <SectionA />
  <SectionB />
  ...
</main>
```

Sections are ordered by narrative priority (hero → features → details → limitations → process → FAQ → footer).

## 3. Section Anatomy

Every content section follows the same internal structure:

1. **Section wrapper** — padded container with a top border separator
2. **Intro block** — heading, optional description
3. **Content block** — the primary layout (grid, list, etc.)

### 3.1 Section Wrapper

```tsx
<section className="py-24 px-6 border-t border-outline-variant">
  <div className="max-w-5xl mx-auto">
    ...
  </div>
</section>
```

- `py-24` — vertical rhythm (96px)
- `px-6` — page gutter (24px)
- `border-t border-outline-variant` — subtle section separator
- Inner container: `max-w-5xl mx-auto` — centered content column

**Exception — Hero section:** Uses `min-h-screen flex items-center justify-center` instead of `py-24` to fill the viewport.

**Exception — Alternate surface section:** Occasionally a section swaps in `bg-surface-container-low` for tonal differentiation while keeping the same border and padding.

### 3.2 Intro Block

Every section (except Hero and Footer) begins with an animated intro block containing a heading and optional description.

```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
  className="mb-12"
>
  <h2 className="text-3xl md:text-4xl font-semibold text-on-surface font-fraunces mb-3">
    {title}
  </h2>
  <p className="text-on-surface-variant max-w-xl">{description}</p>
</motion.div>
```

- Heading: responsive size (`text-3xl md:text-4xl`), semantic text color
- Description: constrained to `max-w-xl` to preserve readability
- Spacing below intro: `mb-12` on desktop sections, `mb-10` on denser sections

### 3.3 Footer Section

The footer uses a horizontal layout on desktop and stacks on mobile:

```tsx
<footer className="py-12 px-6 border-t border-outline-variant">
  <motion.div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-on-surface-variant">
    ...
  </motion.div>
</footer>
```

- Reduced vertical padding (`py-12`)
- `flex-col md:flex-row` with `items-center justify-between`

## 4. Content Width System

Three width tiers govern content density:

| Tier | Class | Usage |
|------|-------|-------|
| Full content | `max-w-5xl` | Sections, grids, general content |
| Dense list | `max-w-3xl` | Feature rows, FAQ, limitations |
| Reading measure | `max-w-xl` | Descriptions, body copy |

The outer page padding is `px-6` (24px). All content containers are centered with `mx-auto`.

## 5. Spacing Rhythm

Spacing follows a strict 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| Page gutter | `px-6` (24px) | All section side padding |
| Section vertical | `py-24` (96px) | Standard section padding |
| Footer vertical | `py-12` (48px) | Footer padding |
| Intro bottom | `mb-12` (48px) / `mb-10` (40px) | Space after heading block |
| Card internal | `gap-3` (12px) | Between icon, title, description |
| Grid gap | `gap-4` (16px) / `gap-8` (32px) | Between grid children |
| List row | `py-5` (20px) | Vertical padding inside rows |
| List divider | `border-b` | Between rows, `last:border-b-0` to remove final line |

## 6. Typography Scale

Reference `DESIGN.md` for exact token values. The patterns below describe usage, not definitions.

### 6.1 Headings

- **Section heading (H2):** `text-3xl md:text-4xl font-semibold text-on-surface font-fraunces mb-3`
- **Card / item heading (H3):** `text-base font-semibold text-on-surface`
- **Large step heading:** `text-lg font-semibold text-on-surface`

### 6.2 Body Text

- **Description / lead:** `text-on-surface-variant max-w-xl`
- **Card / row description:** `text-sm text-on-surface-variant leading-relaxed`
- **Body copy:** `text-base text-on-surface-variant leading-relaxed`

### 6.3 Labels & Metadata

- **Button / input label:** `text-sm font-medium`
- **Small tag / badge:** `text-xs font-medium tracking-widest uppercase`
- **Version badge:** `text-[11px] font-mono`

### 6.4 Font Family Assignment

- **Display / headings:** Fraunces (serif, editorial)
- **UI / body / labels:** Geist (sans, technical)
- **Mono / badges:** Geist Mono

## 7. Grid Systems

Two primary grid layouts are used for content sections.

### 7.1 Two-Column Card Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {items.map(item => <Card key={item.title} {...item} />)}
</div>
```

- Used for: feature highlights, symmetric content
- Gap: `gap-4` (16px)

### 7.2 Three-Column Step Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {steps.map((step, idx) => <Step key={step.number} {...step} index={idx} />)}
</div>
```

- Used for: sequential processes, numbered steps
- Gap: `gap-8` (32px)

## 8. Component Patterns

### 8.1 Feature Card

Used inside two-column grids. Each card is a self-contained block with icon, title, and description.

```tsx
<div className="flex flex-col gap-3 p-6 bg-surface-container-low border border-outline-variant rounded-sm transition-colors hover:border-outline">
  <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-surface-container-high text-primary">
    {icon}
  </div>
  <h3 className="text-base font-semibold text-on-surface">{title}</h3>
  <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
</div>
```

- Padding: `p-6`
- Background: `bg-surface-container-low`
- Border: `border border-outline-variant` (hover: `hover:border-outline`)
- Radius: `rounded-sm`
- Icon container: `w-10 h-10 rounded-sm bg-surface-container-high text-primary`

### 8.2 Feature Row / List Item

Used for dense, sequential lists (advanced features, limitations). Rows are separated by thin borders.

```tsx
<div className="flex items-start gap-4 py-5 border-b border-outline-variant last:border-b-0">
  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-sm bg-surface-container-high text-primary">
    {icon}
  </div>
  <div className="flex flex-col gap-1">
    <h3 className="text-base font-semibold text-on-surface">{title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
  </div>
</div>
```

- Vertical padding: `py-5`
- Icon wrapper: `flex-shrink-0` to prevent compression
- Title/desc stack: `flex flex-col gap-1`

### 8.3 Primary Button

```tsx
<button className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary text-on-primary rounded text-sm font-medium transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
  {label}
</button>
```

- Padding: `px-5 py-2`
- Radius: `rounded` (4px)
- States: `hover:bg-primary/90`, `active:scale-[0.98]`
- Disabled: `disabled:opacity-60 disabled:cursor-not-allowed`

### 8.4 Version Badge

```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-[11px] font-mono text-on-surface-variant border border-outline-variant">
  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
  {version}
</span>
```

- Radius: `rounded-full`
- Background: `bg-surface-container-high`
- Pulsing dot: `w-1.5 h-1.5 rounded-full bg-primary animate-pulse`

### 8.5 Floating Action Button (Back to Top)

```tsx
<button className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-10 h-10 bg-primary text-on-primary rounded-sm shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-colors" aria-label="Back to top">
  {icon}
</button>
```

- Positioning: `fixed bottom-6 right-6 z-50`
- Size: `w-10 h-10`
- Radius: `rounded-sm`
- Shadow: `shadow-sm` (only floating elements use shadow)

## 9. Motion & Animation System

All animations use Framer Motion with a consistent easing curve and reduced-motion support.

### 9.1 Easing

```ts
ease: [0.4, 0, 0.2, 1] // CircOut — snappy, mechanical
```

### 9.2 Reduced Motion Guard

Every animated component imports `useReducedMotion()` and conditionally applies animations:

```tsx
const shouldReduceMotion = useReducedMotion();

<motion.div
  initial={shouldReduceMotion ? false : "hidden"}
  animate={shouldReduceMotion ? false : "show"}
  ...
/>
```

When reduced motion is preferred, `initial` and `animate` are set to `false`, rendering the element immediately without transition.

### 9.3 Stagger Variants

List-based sections use a parent container variant that staggers children:

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};
```

- Stagger interval: `0.08s`
- Initial delay before first child: `0.1s`
- Item duration: `0.5s`

### 9.4 Viewport Trigger

Scroll-triggered sections use `whileInView` with once-only behavior:

```tsx
<motion.div
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
>
```

- `once: true` — animation plays only on first entry
- `margin: "-80px"` — triggers slightly before element enters viewport
- Intro animations use `duration: 0.6`; list items use `duration: 0.5`

### 9.5 Step Delays

For numbered steps, delay is calculated per item:

```tsx
transition={{
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
  delay: index * 0.1,
}}
```

## 10. Dividers & Borders

Horizontal separation between sections and list items uses thin outline borders:

- **Section separator:** `border-t border-outline-variant`
- **List item separator:** `border-b border-outline-variant`
- **Last item:** `last:border-b-0` to remove the trailing line
- **Card border:** `border border-outline-variant` (hover: `hover:border-outline`)

Borders replace shadows as the primary depth mechanism.

## 11. Icon System

- **Style:** Monochrome SVG with `stroke="currentColor"` and `strokeWidth="2"`
- **Size:** 20px–24px for content icons, 16px for inline UI icons
- **Container:** Icons live inside a `w-10 h-10 rounded-sm bg-surface-container-high text-primary` wrapper
- **Constraint:** No multi-color illustrative icons; all icons inherit `text-primary` or `text-on-surface`

## 12. Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Single column grids, reduced heading sizes (`text-3xl`), stacked footer |
| Desktop (`md:`) | Two/three column grids, full heading sizes (`text-4xl`), horizontal footer |

Tailwind responsive prefixes (`md:`) are used exclusively. No custom breakpoints.

## 13. Accessibility

- `useReducedMotion()` is checked on every animated element
- Icon-only buttons include `aria-label`
- Semantic HTML: `<section>`, `<main>`, `<footer>`, `<h1>`–`<h3>` in logical order
- Focus states rely on native browser focus rings (styled via `focus:` utilities where needed)

## 14. Shape Language

- **Default radius:** `rounded-sm` (4px) for cards, buttons, icon containers
- **Pills / badges:** `rounded-full`
- **Inputs:** `rounded` (4px)
- **No border-radius extremes** — the system avoids `rounded-lg` and larger to maintain the technical, sharp aesthetic

## 15. Implementation Checklist

When porting this pattern to a new project:

1. Copy this file as the layout guide
2. Copy `DESIGN.md` as the visual token source (colors, type scale, spacing values)
3. Use the section wrapper, intro block, and content width patterns verbatim
4. Apply the motion variants and reduced-motion guard to all scroll-triggered content
5. Use the card and row component patterns for list-based content
6. Maintain the 4px base unit for all spacing decisions
