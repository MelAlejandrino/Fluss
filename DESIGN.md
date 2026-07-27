---
name: WINDRUNNER
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#434843'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#737873'
  outline-variant: '#c3c8c1'
  surface-tint: '#526255'
  primary: '#2e3e32'
  on-primary: '#ffffff'
  primary-container: '#455548'
  on-primary-container: '#b7c9b8'
  inverse-primary: '#b9cbbb'
  secondary: '#5f5e5a'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfda'
  on-secondary-container: '#63635f'
  tertiary: '#4b3437'
  on-tertiary: '#ffffff'
  tertiary-container: '#644a4e'
  on-tertiary-container: '#debbc0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e7d6'
  primary-fixed-dim: '#b9cbbb'
  on-primary-fixed: '#101f14'
  on-primary-fixed-variant: '#3b4b3e'
  secondary-fixed: '#e5e2dd'
  secondary-fixed-dim: '#c9c6c1'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#fedade'
  tertiary-fixed-dim: '#e1bec2'
  on-tertiary-fixed: '#2a161a'
  on-tertiary-fixed-variant: '#594044'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Fraunces
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-technical:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 1px
  margin-sm: 12px
  margin-md: 24px
  panel-padding: 16px
  stack-gap: 8px
---

## Brand & Style

This design system is built for products that balance technical precision with editorial elegance. The brand personality is that of a "specialized instrument"—reliable, calm, and highly focused.

The aesthetic identity is defined by **Technical Minimalism** and **Subtle Brutalism**. It rejects soft shadows and decorative flourishes in favor of structural integrity, hard-edge alignment, and tonal layering. The experience should feel like working with high-end archival equipment: tactile through contrast and layout rather than physical metaphor. It suits users who value a high-density, distraction-free environment that prioritizes content and data over chrome.

## Colors

The palette is rooted in an "Archival Paper" base, providing a warm, low-fatigue background that distinguishes the product from typical cold-gray software.

- **Primary & Accent:** A Muted Forest Green (#455548) is used sparingly for primary actions, success states, and active selection markers.
- **Surface Hierarchy:** Depth is communicated through a stepped series of parchment-toned neutrals. As elements move "closer" to the user, they transition from the background color to progressively cooler, darker neutral tones (#F6F3EE down to #E5E2DD).
- **Typography & Borders:** Text is anchored by a near-black ink color (#1C1C19). Borders use a structural gray-green (#C3C8C1) to define the workspace without creating visual noise.

## Typography

The typography system creates a "Technical Editorial" feel by pairing a high-contrast serif with precise, modern sans-serifs.

- **Display (Fraunces):** Reserved for high-level headers, titles, and branding moments. It adds a layer of sophisticated authority.
- **UI (Geist):** Used for the majority of the interface, including body text and navigational elements. Its technical, clean structure ensures legibility at small sizes.
- **Technical (Geist Mono):** Essential for any fixed-width or numeric data—IDs, timestamps, file paths, code, and metadata. The monospaced nature ensures that columns of data remain perfectly aligned, reinforcing the "specialized instrument" feel.

## Layout & Spacing

This design system utilizes a **Fixed Panel Grid** model. The interface is composed of resizable rectangular modules separated by 1px borders rather than floating, free-form content.

- **The 4px Rule:** All internal spacing (padding, gaps) must be a multiple of 4px to maintain a rigid, calculated rhythm.
- **Panel Logic:** Instead of floating cards, the layout relies on docked panels. Each panel has a consistent internal padding of 16px.
- **Tight Density:** Information density should be high but organized. Use a 1px "structural border" rather than negative space to separate distinct functional zones.

## Elevation & Depth

In this design system, depth is purely structural and tonal. **Shadows are strictly prohibited.**

1.  **Tonal Layering:** The primary method of showing hierarchy. A "Level 1" surface sits on the background; a "Level 2" surface appears as an inset or an overlay.
2.  **Thin Outlines:** All interactive elements and panels are defined by a 1px solid border (#C3C8C1).
3.  **Active States:** Selection is indicated by a shift to the Primary Accent color or a 2px interior stroke, never by a lift or drop shadow.
4.  **Glass Effects:** Modals may use a very subtle backdrop blur, but the container itself must remain opaque and bordered to maintain the "Subtle Brutalist" aesthetic.

## Shapes

The shape language is disciplined and sharp.

- **Radius:** A universal 4px radius is applied to buttons, input fields, and small containers. This provides just enough softness to feel modern while maintaining the rigid, "instrument" aesthetic.
- **Hard Edges:** Large layout panels and the main application window should have 0px or 2px radii to emphasize the structural grid.
- **Consistency:** Avoid pill-shaped buttons; all interactive targets should be rectangular with the standard 4px corner.

## Iconography

- Icons should be 1px stroke weight, geometric, and non-rounded, matching the structural line weight of borders.
- Prefer outline icons over filled; reserve fills for active/selected states, mirroring the accent-color logic.
- Keep icons on a consistent square grid so they align with the 4px spacing rhythm.

## Components

### Buttons
- **Primary:** Solid #455548 background, #FCF9F4 text, 4px radius. No gradient.
- **Secondary:** Transparent background, 1px border (#C3C8C1), #1C1C19 text.
- **Ghost:** No border or background unless hovered; uses Geist Mono for a more technical feel in utility/toolbars.

### Input Fields
- **Text Inputs:** #F6F3EE background, 1px border. On focus, the border thickens to 2px #455548. Use Geist Mono for technical or numeric data inputs.
- **Checkboxes:** Square with 2px radius. When checked, uses a solid #455548 fill with a white checkmark.

### Data Tables & Lists
- Use Geist Mono for all values, IDs, and numeric fields so columns stay aligned.
- Use `label-caps` for column headers and section labels.
- Alternating row stripes (zebra striping) using Surface Level 1 and Background for high-density data legibility.

### Cards & Panels
- Panels are never floating. They are "docked" units with 1px #C3C8C1 borders.
- Header bars for panels use Surface Level 2 (#F0EDE8) to differentiate from the content area.

### Numeric & Status Readouts
- Any live value, counter, coordinate, or status display uses Geist Mono at `body-md` size, housed in a Surface Level 2 container.
- Keep readouts fixed-width where possible so values don't shift the layout as they update.

## Applying the System to Domain-Specific UI

When a project introduces components not covered above (specialized controls, viewers, editors, dashboards, or any bespoke widget), derive them from the same principles rather than inventing new visual language:

- **Structure over decoration:** define regions with 1px #C3C8C1 borders and tonal surface steps, never shadows or floating cards.
- **Mono for machine data:** any technical, numeric, or fixed-format value uses Geist Mono; prose and labels use Geist; only headline moments use Fraunces.
- **Accent sparingly:** #455548 marks the primary action, active selection, or success—nothing else competes for it.
- **4px rhythm:** every offset, gap, and padding value resolves to a multiple of 4px.
- **Sharp, tactile controls:** 1px geometric icons, rectangular targets, 4px radius, and state changes expressed through color and stroke weight rather than motion or elevation.
