# Design — Wollie

A locked design system for the Wollie marketing site and authenticated workspace.

## Genre

Modern-minimal with warm editorial character.

## Macrostructure family

- Marketing pages: illustrated product story with one interactive proof surface.
- App pages: Workbench — persistent navigation, compact page header, data-first content.
- Content pages: quiet long document with the same typography and paper palette.

## Theme

- Canvas: `--color-brand-cream`
- Raised surface: `--color-brand-paper`
- Primary ink/navigation: `--color-brand-blue-deep`
- Active/action accent: `--color-brand-orange`
- Healthy progress: `--color-brand-sage`
- Dividers: `--color-brand-rule`
- Focus: `--color-brand-focus`

All source values live in `tokens.css`; page CSS consumes token names only.

### Semantic colour roles

| Role | Token | Meaning |
| --- | --- | --- |
| Primary | `--color-semantic-primary` | Headings, primary buttons, navigation and actual spending |
| Active | `--color-semantic-active` | The currently selected navigation or control only |
| Positive | `--color-semantic-positive` | Available, funded, saved, contributed or successfully completed |
| Negative | `--color-semantic-negative` | Overspending, errors and destructive actions |
| Neutral | `--color-semantic-neutral` | Informational, pending, missing funding and sandbox states |

Orange never means warning. A near-limit state stays neutral and uses explicit
text. It becomes red only after the user is genuinely over a limit. Green never
acts as a decorative accent; it always describes healthy money or a successful
result.

## Typography

- Display: Bricolage Grotesque, weight 700–800, normal style.
- Body: Manrope, weight 400–700.
- Mono: system mono, for code or machine identifiers only.
- App titles stay compact; large marketing display type does not enter the workspace.

## Spacing

Use the existing 4-point named scale in `tokens.css`. App pages use compact `--space-sm` through `--space-xl` rhythm.

## Motion

- UI state changes animate opacity or transform only.
- No automatic carousels in the workspace.
- Reduced motion collapses to an opacity-only transition of 150 ms or less.

## Microinteractions stance

- Silent success when the result is already visible.
- Focus rings are immediate and high contrast.
- Active navigation uses surface and colour, not movement.
- No decorative hover scaling inside the workspace.

## CTA voice

- Primary: deep-blue fill, cream text, softly rounded, direct verb-first copy.
- Secondary: paper fill, warm rule border, deep-blue text.
- Destructive: reserved red text/border; never uses the brand orange.

## Per-page allowances

- Marketing pages may use the couple illustrations.
- App pages use no decorative illustration; product data is the visual.
- Empty states may use a small functional icon, never an ornamental scene.

## What pages MUST share

- Wollie wordmark, palette, Bricolage + Manrope pairing, page-header rhythm, navigation treatment, card/input radius, and focus style.
- Cream workspace canvas, paper content surfaces, deep-blue primary action, orange active accent, sage healthy progress.

## What pages MAY differ on

- Density and grid layout based on the task.
- Page-specific toolbar controls and table/list patterns.
- Metric emphasis when a page genuinely has a primary number.

## Exports

### tokens.css

`tokens.css` is the source of truth and already contains the complete Wollie token set.

### Tailwind v4 `@theme`

```css
@theme {
  --color-wollie-canvas: var(--color-brand-cream);
  --color-wollie-surface: var(--color-brand-paper);
  --color-wollie-ink: var(--color-brand-ink);
  --color-wollie-navy: var(--color-brand-blue-deep);
  --color-wollie-orange: var(--color-brand-orange);
  --color-wollie-sage: var(--color-brand-sage);
  --font-wollie-display: var(--font-brand-display);
  --font-wollie-body: var(--font-brand-body);
}
```

### DTCG tokens

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "canvas": { "$value": "oklch(97% 0.018 78)", "$type": "color" },
    "surface": { "$value": "oklch(99% 0.010 78)", "$type": "color" },
    "ink": { "$value": "oklch(20% 0.052 250)", "$type": "color" },
    "navy": { "$value": "oklch(23% 0.085 250)", "$type": "color" },
    "orange": { "$value": "oklch(68% 0.160 43)", "$type": "color" },
    "sage": { "$value": "oklch(65% 0.080 142)", "$type": "color" }
  },
  "font": {
    "display": {
      "$value": "Bricolage Grotesque, Arial Narrow, sans-serif",
      "$type": "fontFamily"
    },
    "body": { "$value": "Manrope, Segoe UI, sans-serif", "$type": "fontFamily" }
  }
}
```

### shadcn/ui roles

```css
:root {
  --background: var(--color-brand-cream);
  --foreground: var(--color-brand-ink);
  --card: var(--color-brand-paper);
  --card-foreground: var(--color-brand-ink);
  --primary: var(--color-brand-blue-deep);
  --primary-foreground: var(--color-brand-on-blue);
  --secondary: var(--color-brand-orange-soft);
  --secondary-foreground: var(--color-brand-on-orange);
  --muted: var(--color-brand-cream-deep);
  --muted-foreground: var(--color-brand-ink-soft);
  --border: var(--color-brand-rule);
  --input: var(--color-brand-rule);
  --ring: var(--color-brand-focus);
  --radius: var(--radius-brand-sm);
}
```

## Phone app (below 64rem)

The phone app is calm and flat. Source: the "Phone shape system" and "Minimal phone layout" blocks at the end of `src/press.css`.

### Shapes

| Element | Shape |
| --- | --- |
| Buttons, inputs, selects, chips, badges, segmented controls, progress bars | Full pill (`--shape-pill`) |
| Setup panels, notes, forms that keep a surface | Soft sheet, 20px (`--shape-sheet`), paper fill, no border |
| Pop-up menus | 20px, rows 12px (`--shape-row`) |
| Dialogs | 24px |
| Bottom menu | Floating glass pill |

No square corners on phones.

### Glass material

Fields, secondary buttons, the Plan switch, sheets, and the bottom menu share one frosted glass look: `--glass-fill`, `--glass-edge`, `--glass-blur`. The selected item in any switch is a bright glass lens (`--lens-fill`, `--lens-edge`) that slides with `--glass-ease`. Primary buttons stay solid deep blue.

### Layout

- No top bar. The page title is the first thing on screen.
- Four tabs: Home, Activity, Plan, Bills. The profile button on Home opens settings, bank accounts, household, and sign out.
- Lists and summaries sit on the canvas without card frames or divider lines.
- Helper paragraphs, legends, and explainers are hidden on phones.
- Pages are as tall as their content, so short pages do not scroll.

### Motion

- Tab change: the glass lens glides (420ms, ease-out, no overshoot) and stretches slightly.
- Page change: a 320ms fade and 6px rise.
- Reduced motion turns both off.

### Phone theme: Glass

The phone app uses its own theme, set in the "Phone theme: Glass" block of `src/press.css`. It remaps the brand tokens only on phone app pages. Desktop and marketing keep the warm Wollie theme.

- Font: Apple system font (SF Pro). Money numbers use SF Pro Rounded.
- Canvas: cool light grey with a fixed soft aurora (blue, violet, cyan) behind glass.
- Ink: near-black. Quiet text: ink at 50%.
- Accent: electric blue, for the active tab, links, and money still available.
- Primary buttons: near-black pills. Positive green and negative red keep their meaning.
- Type: title 34px bold, hero number 60px rounded, section titles 13px semibold quiet, rows 16px.
