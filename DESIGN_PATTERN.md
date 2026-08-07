# Fluss — Layout & Composition Patterns

How screens are put together. The system those screens draw from — colour,
type, radius, motion tokens, the primitive library — is in `DESIGN.md`.

---

## 1. The shell

```
┌──────────────────────────────────────────────────────────┐
│  ◟ Fluss                                    ─   □   ✕    │  caption bar, transparent
├────────────┬─────────────────────────────────────────────┤
│ + New      │  ╭───────────────────────────────────────╮  │
│            │  │                                       │  │
│  Home      │  │   content sheet                       │  │
│  Downloads │  │   bg-panel · rounded-3xl · scrolls    │  │
│  History   │  │                                       │  │
│            │  ╰───────────────────────────────────────╯  │
│  Settings  │                                             │
└────────────┴─────────────────────────────────────────────┘
   rail sits on the window bg          12px gutter right + bottom
```

**Two planes, not two columns.** The caption bar and the rail sit directly on
`app`; one raised sheet holds the page. The gap between them is the only
separator — no divider rules, no bordered sidebar. That's where the app's depth
comes from at a 1px budget.

- Caption bar: 44px, `data-tauri-drag-region`. Window controls keep the
  platform's full-bleed rectangle so "close" stays hittable at the screen corner
  when maximised.
- The mark and wordmark sit on the rail's text column, so the app name and the
  nav labels share one left edge.
- The sheet owns the scroll, with `scrollbar-gutter: stable` so switching
  between a short page and a tall one never nudges the layout sideways.
  `scrollbar-gutter` is applied **per container**, never globally —
  `overflow: hidden` boxes are scroll containers too and would each reserve a
  dead 12px strip.

### Rail

236px, collapsing to a 76px icon rail below `lg`. Labels stay reachable as
tooltips and as accessible names.

Selection is a **single pill that slides** between rows (shared `layoutId`),
plus a tinted icon. Deliberately quiet: no filled bar, no saturated background,
no side stripe. You should be able to find your place without the rail shouting.

The Downloads row carries a count of everything running or waiting; collapsed,
it degrades to a dot on the icon.

---

## 2. Page skeleton

Every page is the same three parts:

```tsx
<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-10 py-12">
  <PageHeader title=… description=… actions=… />
  …content…
</div>
```

- `max-w-4xl` for list/queue pages, `max-w-2xl` for Settings (a settings column
  wants a reading measure, not a table's width).
- `flex-1`, not `min-h-full` — the page needs a definite content box to
  distribute, and a percentage min-height against an auto-height parent doesn't
  resolve.
- **One h1 per page**, always from `PageHeader`. Section headings are h2 at
  `text-md`.
- Page-level controls go in `PageHeader`'s `actions` slot, never floating.

---

## 3. Composition rules

**Asymmetry where it means something.** Options rows are
`lg:grid-cols-[minmax(0,1fr)_310px]` — the choices get the room, the
destination-and-commit column is fixed. Header is title-left / control-right.
The content column itself is centred in the sheet; that's a reading measure,
not timidity.

**Widgets, not sections.** Grouped information is a `Card`: its own surface,
16px radius, hairline, `p-5`, and a `CardHeader` whose first line has the same
weight and spacing everywhere. Gaps between cards replace section rules.

**Lists over card walls.** Items with something to read or act on get full
cards (running, finished). Items that are just waiting get compact rows inside
one rounded container — fifteen identical cards is a wall, and none of them have
anything to say yet.

**Full-bleed artwork.** Thumbnails in a preview run to the card's own edge and
are clipped by its radius. Floating an image inside padding makes it look like
an attachment.

> Flex trap: a stretched flex child overrides `aspect-ratio`. Any row holding a
> 16:9 thumbnail beside taller content needs `items-start`, or the artwork
> silently turns portrait.

> Overflow trap: focus rings are box-shadows and outlines, so they paint
> *outside* the border box and get sheared off by any ancestor that clips.
> A scroll container holding focusable rows needs padding on **every** edge its
> content touches — cancelled by matching negative margin so nothing moves.
> `BulkUrlList` is the worked example (`-my-1.5 -mr-2 … py-1.5 pr-2`): without
> the vertical pair, focusing the first field showed a ring cut flat along the
> top. 6px clears both the 3px input ring and the 4px icon-button outline.

---

## 4. State patterns

**Empty** — `EmptyState`: icon in a soft plate, title, copy that says what will
appear here and what puts it there, and the action that resolves it. Never
"nothing here".

**Loading** — `Skeleton` shaped like what's coming, so the layout is already
correct when data lands. Spinners only inside a working button or beside a
one-line status. A spinner in the middle of a region tells you nothing about
how much is about to appear.

**Idle-with-one-job** — Home has nothing to show until a link is analysed, so
its composition sits on the optical centre of the sheet (`justify-center pb-28`)
instead of pinned to the top above 600px of nothing. The moment there's a
result it snaps to top-aligned and behaves like a normal document.

**Error** — plain-language reason first, raw engine output behind a closed
`<details>` in mono. Nobody should have to read a yt-dlp traceback to learn a
video is private, but it has to be one click away for the times it's the only
explanation.

**Required-but-not-yet-wrong** — warn (amber), not danger. An unchosen download
folder isn't a failure; it's the one thing still needed.

---

## 5. Responsive

Structural, never fluid type.

| Breakpoint | Change |
|---|---|
| `< lg` (1024) | Rail collapses to icons; page padding `px-7`; preview thumbnail narrows |
| `< md` (768) | Preview stacks image over text; options grid goes single-column |
| `< sm` (640) | Card thumbnails shrink to `w-28` |

Test heading copy at every width — the viewport is part of the design.

---

## 6. Motion in layout

- **Page swap**: opacity only. A slide inside the scroll sheet flashes the gutter.
- **Mode swap** (Home single↔bulk): keyed container, one short rise — the whole workspace changes at once rather than cross-fading two half-similar layouts.
- **Selection**: shared-`layoutId` pill, stiff spring.
- **Lists**: 40ms stagger, once, on mount.
- **Toasts**: enter from below, exit sideways — different directions so a dismissal never reads as another arrival. The stack is layout-animated so removing one slides the rest down.

---

## 7. Copy

Sentence case everywhere except proper nouns. No title case in labels.

Say what happens, not what the thing is called: "Anything you queue shows up
here with live progress" beats "Your downloads". Hints explain consequences
("Keep Fluss running in the background when you close the window"), not
mechanics.

Numbers and units are mono; prose is not.
