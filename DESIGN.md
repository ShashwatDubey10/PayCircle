---
name: PayCircle
description: A precise, engineered dark ledger for students splitting money — monospace figures on near-black, with one electric mint signal.
colors:
  bg: "#060A09"
  bgCard: "#0C1210"
  bgCardElevated: "#131A17"
  bgInput: "#0C1210"
  border: "#1C2822"
  borderLight: "#243328"
  textPrimary: "#EFF9F6"
  textSecondary: "#637870"
  textMuted: "#4A6058"
  accent: "#00E5BE"
  accent10: "rgba(0,229,190,0.10)"
  accent20: "rgba(0,229,190,0.20)"
  positive: "#00E5BE"
  negative: "#FF5055"
  warning: "#FFB020"
  white05: "rgba(239,249,246,0.05)"
typography:
  display:
    fontFamily: "monospace"
    fontSize: "32px"
    fontWeight: 700
    letterSpacing: "-1.5px"
  headline:
    fontFamily: "monospace"
    fontSize: "26px"
    fontWeight: 700
    letterSpacing: "-1px"
  figure:
    fontFamily: "monospace"
    fontSize: "18px"
    fontWeight: 600
  figureSmall:
    fontFamily: "monospace"
    fontSize: "16px"
    fontWeight: 600
  title:
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.5px"
  heading:
    fontSize: "18px"
    fontWeight: 700
  subheading:
    fontSize: "15px"
    fontWeight: 600
  body:
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 21
  caption:
    fontSize: "13px"
    lineHeight: 19
  button:
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: "0.3px"
  label:
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.4px"
  overline:
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "1.3px"
  micro:
    fontSize: "9px"
    fontWeight: 500
    letterSpacing: "0.4px"
rounded:
  xs: "3px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  2xl: "16px"
  3xl: "20px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "14px"
  2xl: "16px"
  3xl: "20px"
  4xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    height: "54px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.xl}"
    height: "52px"
  button-dialog:
    backgroundColor: "{colors.bgCardElevated}"
    textColor: "{colors.textSecondary}"
    rounded: "{rounded.lg}"
    height: "46px"
  button-destructive:
    backgroundColor: "rgba(255,80,85,0.10)"
    textColor: "{colors.negative}"
    rounded: "{rounded.lg}"
    height: "46px"
  button-pill:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  input:
    backgroundColor: "{colors.bgInput}"
    textColor: "{colors.textPrimary}"
    rounded: "{rounded.lg}"
    height: "52px"
    padding: "0 14px"
  chip:
    backgroundColor: "{colors.bgCardElevated}"
    textColor: "{colors.textMuted}"
    rounded: "{rounded.md}"
    padding: "7px 11px"
  chip-active:
    backgroundColor: "{colors.accent10}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "7px 11px"
  card:
    backgroundColor: "{colors.bgCard}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  card-hero:
    backgroundColor: "{colors.bgCard}"
    rounded: "{rounded.3xl}"
    padding: "20px"
  dialog:
    backgroundColor: "{colors.bgCard}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  toast:
    rounded: "{rounded.xl}"
    padding: "12px 14px"
  list-row:
    padding: "13px 16px"
  tab-bar:
    backgroundColor: "{colors.bgCard}"
    height: "64px"
---

# Design System: PayCircle

## Overview

**Creative North Star: "The Mint Terminal"**

PayCircle reads like a trading desk that happens to live in a student's pocket. The ground is
near-black with a faint teal warmth, the structure is drawn in hairlines rather than boxes,
and the numbers — the only thing anyone actually opens the app for — are set in monospace so
they can be read exactly rather than approximately. A single electric mint is the one voice
that rises above the dark, and it speaks only about money and action.

The system is **precise, engineered and calm**. Precise, because every figure is a claim about
what someone owes and the typography treats it that way. Engineered, because depth comes from
tonal layers and 1px rules instead of soft shadows — the construction is visible, not hidden
under blur. Calm, because the palette is almost entirely neutral: three near-black surfaces,
three greys of text, and one accent that is deliberately scarce. Nothing glows for decoration.

Density is high and deliberate. Type runs small (11–15px for nearly everything that isn't a
figure), cards sit 12px apart, and the page keeps a constant 20px gutter so content columns
never shift between screens. The effect should be an instrument panel a student trusts at a
glance, not an app that performs friendliness at them.

**Key Characteristics:**

- Near-black teal-warm ground (`#060A09`) with two tonal surface steps above it
- Monospace, negatively-tracked figures for every amount you stop and read
- One accent (`#00E5BE`) that doubles as the positive/credit colour — scarcity is the point
- Hairline borders (1px) and tonal steps instead of shadows
- Status colour as a translucent wash, never a saturated fill
- Small type, tight rhythm, constant 20px gutter

## Colors

An almost monochrome dark palette — three surfaces, three text greys, one electric accent, and
two status colours held in reserve.

### Primary

- **Signal Mint** (`accent`): The single voice of the system. It marks the primary action on a
  screen (the CTA, the settle button), live/positive money (credit, income, owed-to-you), the
  active state of a chip or tab, and inline links. Because it is also the positive colour, a
  mint figure always means money moving toward the user. Used at full strength on text, icons
  and filled controls; at 10% (`accent10`) and 20% (`accent20`) as a wash behind active states.

### Neutral

- **Terminal Ground** (`bg`): The page. Every screen and the root stack background sit on it.
  Also serves as the *on-accent* text colour — dark text on a mint fill, never white.
- **Card Surface** (`bgCard`): Every card, dialog, the tab bar, and input fields (`bgInput` is
  the same value, kept as a separate token for intent). One tonal step above the ground.
- **Elevated Surface** (`bgCardElevated`): The second step. Chips at rest, dialog secondary
  buttons, avatar wells — anything that sits *on* a card and still needs to read as a control.
- **Hairline** (`border`): The workhorse rule. Card borders, dividers, separators, progress-bar
  tracks, and the tab bar's top edge are all this one value at 1px.
- **Hairline Bright** (`borderLight`): A slightly lifted rule, reserved for dialog edges and
  secondary-button outlines where the border is doing more work.
- **Primary Text** (`textPrimary`): Off-white with a green cast. Amounts, names, titles, input
  values — anything a user reads as content.
- **Secondary Text** (`textSecondary`): Muted teal-grey. Labels, supporting copy, metadata, and
  the inactive side of a two-state pair.
- **Muted Text** (`textMuted`): Hints, timestamps, inactive chip text, inactive tab icons. At
  roughly 3.2:1 on the ground it is **below AA and must not carry body copy** — see Don'ts.

### Tertiary

- **Alert Red** (`negative`): Money owed by the user, expenses, destructive actions, form
  errors, and the over-budget state.
- **Caution Amber** (`warning`): The single middle state — budget between 70% and 90% of its
  limit. It appears nowhere else.

### Named Rules

**The One Signal Rule.** Mint is not a brand wash, it is a signal. One mint-filled control per
screen, and mint text only where it means money-toward-you, an active state, or a link. If two
mint fills compete on one screen, one of them is wrong.

**The Tinted Wash Rule.** A status colour never fills a surface at full strength. It appears as
a ~8–10% wash, a ~22–35% border of the same hue, and full-strength text or icon on top. The
inline error (`rgba(255,80,85,0.08)` fill, `rgba(255,80,85,0.22)` border, `negative` text) is the
canonical form. Saturated red or amber behind a sentence of copy is a violation.

**The Dark-On-Mint Rule.** Text and icons on a mint fill are always the ground colour, never
white. Mint is bright enough that white-on-mint fails contrast and reads as a glow.

## Typography

**Body Font:** The platform default family (Roboto on Android), addressed by numeric weight
**Figure Font:** The platform monospace (`monospace` on Android, `Courier New` on iOS)
**Label Font:** The body font at 9–11px with wide tracking and uppercase

**Character:** A tight, technical pairing. The body face is invisible by design — it is the OS
face at small sizes and real weights, doing nothing expressive. All the personality sits in the
figures: monospace, heavy, and negatively tracked so large amounts read as a single machined
block rather than a word.

> **Implementation note.** `constants/theme.js` exports a `FONTS` map (Roboto 400/500/700) and
> the root layout gates render on those fonts loading, but only one style in the app applies it
> (the tab bar label). Everything else renders in the platform family with numeric weight —
> which on Android *is* Roboto, so the shipped result is consistent. Treat the platform face as
> the body face and see Don'ts before applying `FONTS.*` to individual styles.

### Hierarchy

- **Display** (mono, 700, 32px, −1.5px tracking): The one figure a screen is about — the net
  balance on the dashboard. Never more than one per screen.
- **Headline** (mono, 700, 26px, −1px tracking): The hero figure of a secondary card, e.g. the
  budget spend-to-date. Pairs with a lighter 15px "of ₹X" suffix in `textSecondary`.
- **Figure** (mono, 600, 18px): Supporting amounts inside a card — the two halves of a balance
  split, per-member totals.
- **Figure Small** (mono, 600, 16px): Stat-card amounts in a multi-up row.
- **Title** (700, 24px, −0.5px): The user's own name in the dashboard header. The only place
  body-face type goes this large.
- **Heading** (700, 18px): Stack-screen page titles, next to the back control.
- **Subheading** (600, 15px): Section titles, card titles, empty-state headlines.
- **Body** (500, 14px, 21px line-height): Row labels, dialog messages, content copy.
- **Caption** (13px, 19px line-height): Supporting copy, hints, toast text, secondary links.
- **Button** (700, 15px, 0.3px tracking): Primary CTA labels.
- **Label** (500, 11px, 0.4px tracking, often uppercase): Card eyebrows, legend text, metadata.
- **Overline** (600, 10px, 1.3px tracking, uppercase, `textMuted`): Input field labels. The
  widest tracking in the system.
- **Micro** (500, 9px, 0.4px tracking, uppercase): Status pips inside rows, e.g. a SETTLED badge.

### Named Rules

**The Stop-And-Read Rule.** Monospace is reserved for figures a user stops and reads: the
display figure, card hero figures, supporting card amounts, and stat amounts. List-row amounts
stay in the body face so a long list doesn't become a wall of monospace — but they carry
`fontVariant: ['tabular-nums']` so the column still aligns. A row amount in full monospace, or a
card hero figure that isn't, are both wrong.

**The Negative Tracking Rule.** Figures 26px and above take negative letter-spacing (−1px at
26px, −1.5px at 32px). Monospace at display size is too airy otherwise and stops reading as one
object.

## Layout

A single-column, 20px-gutter phone layout. Every scrolling screen uses `paddingHorizontal: 20`
and a 32–40px bottom pad clearing the 64px tab bar; the auth screens are the one exception at
24px, which suits their narrower centred form. Stack screens open with a header row at the same
20px gutter, 16px top and bottom, and a 12px gap between the back control and the title.

Vertical rhythm is card-led. Cards stack with a 12px gap; a labelled section (header + content)
closes with 20px before the next. Inside a card, 20px padding for hero cards and 16px for
secondary cards, with 10–16px between internal blocks. List rows inside a card run 13px vertical
by 16px horizontal with a 1px hairline divider inset by 16px, so the divider never touches the
card edge.

The spacing scale is a 2px grid, not a 4px one: 4, 6, 8, 10, 12, 14, 16, 20, 24 are all in live
use, with **10, 12, 14, 16 and 20 carrying the overwhelming majority** of the work. Odd steps
(7, 9, 11, 13) appear inside small controls where a 2px adjustment is the difference between a
chip reading tight and reading loose.

Device targets are compact-width phones in portrait, edge-to-edge, with safe-area insets applied
at the screen level. There is no tablet or landscape layout.

### Named Rules

**The Twenty Rule.** The page gutter is 20px on every screen and is not negotiated per-screen.
A card that wants to bleed wider changes its own padding, never the page's.

## Elevation & Depth

This is a **flat system**. Depth is built from three tonal steps — ground (`bg`) → card
(`bgCard`) → elevated (`bgCardElevated`) — each separated by a 1px hairline border, and nothing
else. There is no ambient shadow vocabulary, no blur, and no gradient used to fake a light
source. A card is legible against the page because its border and its slightly lighter fill say
so, which is why the border is never optional.

Exactly three elements in the app carry a shadow, and all three genuinely leave the layer stack:
the toast, which floats over any screen, and the two floating action buttons.

### Shadow Vocabulary

- **Floating** (`shadowOffset: {0, 6}`, `shadowOpacity: 0.28`, `shadowRadius: 14`,
  `elevation: 12`): The toast. The only true overlay element.
- **Lifted** (`shadowOffset: {0, 3}`, `shadowOpacity: 0.25`, `shadowRadius: 6`, `elevation: 6`):
  A floating action button over a scrolling list. One variant tints the shadow with the accent
  (`shadowColor: PC.accent`, opacity 0.4) on the group-detail FAB.

### Named Rules

**The Leaves-The-Stack Rule.** A shadow is permitted only for an element that genuinely floats
free of the layer stack — a toast, a FAB, a true overlay. Cards, rows, inputs, chips, sheets and
headers are flat, always, and earn their separation from tone and a hairline. If something wants
a shadow to feel distinct, the fix is a tonal step or a border.

## Shapes

Soft-rectangular throughout, with radius scaling to the size of the object rather than being
picked per component. Progress-bar tracks are nearly square (3px); chips and small icon tiles
take 10px; inputs, dialog buttons and the back control take 12px; the primary CTA and the toast
take 14px; secondary cards take 16px; hero cards and dialogs take 20px. Pills (999px) are
reserved for the compact accent action button and for numeric badges.

Borders are the system's main structural device: 1px `border` almost everywhere, 1px
`borderLight` on dialogs and secondary buttons, 1.5px on the dashboard avatar well, and 4px on
the budget status ring. A 2px accent bar sits flush to the top edge of the auth form card, and
the login screen draws 44×1.5px accent rules in opposite corners at 20% opacity — an
architectural motif that frames the screen without decorating it.

Empty states are drawn with a **dashed** 1px border on an otherwise identical card. That is the
system's one shape-level state change and should be used for every "nothing here yet, add
something" surface.

### Named Rules

**The Third Rule.** A square icon tile's corner radius is about one third of its side: 30px→10,
34px→10, 38px→12, 44px→14, 58px→18. Avatars are the exception and go fully circular. Pick the
radius from the size, don't invent one.

**The Dashed-Empty Rule.** An empty container keeps its exact card geometry and switches its
border to dashed. Never substitute a different fill, a lower opacity, or an illustration.

## Components

Components are **precise and instrumental** — readouts and controls rather than ornament. Tight
padding, hairline definition, one mint control per screen carrying the action, and state shown
by a border and wash change rather than by movement.

### Buttons

- **Shape:** Soft rectangle (14px) for full-width actions, tighter (12px) for dialog actions,
  pill (999px) for the compact inline accent action.
- **Primary:** Mint fill, ground-colour label at 700/15px with 0.3px tracking, 54px tall,
  full-width. May carry a trailing circular arrow well (26px, `rgba(6,10,9,0.18)`) for forward
  motion. Disabled is the same fill at 55–60% opacity — never a grey swap.
- **Secondary:** No fill, 1px `borderLight` outline, `textPrimary` label at 500/14px, 52px tall.
- **Dialog pair:** Two 46px buttons side by side with a 10px gap. Cancel takes
  `bgCardElevated` + `border`; confirm takes either the mint fill (ground label, 700) or the
  destructive wash.
- **Destructive:** The tinted wash — `rgba(255,80,85,0.10)` fill, `rgba(255,80,85,0.35)` border,
  `negative` label at 600.
- **Compact accent (Pay via UPI):** Pill, mint fill, ground label at 600/13px, 14px × 9px
  padding, a 16px leading icon and a 6px gap, self-aligned left rather than stretched.
- **Press:** `activeOpacity` on touch, 0.8 being the system value. The codebase currently spreads
  across 0.7 / 0.75 / 0.8 / 0.85 with no pattern behind the choice; normalise to 0.8 for buttons
  and 0.85 for rows. There is no hover state and none should be added.

### Chips

- **Style:** `bgCardElevated` fill, 1px `border`, 10px radius, 11px × 7px padding, `textMuted`
  label at 12px. Laid out in a wrapping grid with an 8px gap.
- **State:** Active swaps to a mint border, `accent10` fill and `accent` label. Only the border,
  fill and text change — never the size, so the grid never reflows on selection.

### Cards / Containers

- **Corner Style:** 20px for hero cards and dialogs, 16px for secondary cards.
- **Background:** `bgCard`, always, with a 1px `border`. Dialogs use `borderLight`.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Internal Padding:** 20px hero, 16px secondary, 24px dialog. Row-bearing cards pad to 0 and
  let rows own their 13px × 16px padding, with `overflow: hidden` so rows clip to the radius.
- **Internal structure:** A 1px full-bleed `border` divider separates a card's figure block from
  its detail block; a vertical 1px × 36px rule separates two side-by-side stats with 16px either
  side.

### Inputs / Fields

- **Style:** `bgInput` fill, 1px `border`, 12px radius, 52px tall, 14px horizontal pad, optional
  leading 16px icon with a 10px gap. The value is `textPrimary` at 15px.
- **Label:** Overline above the field — 10px/600, 1.3px tracking, uppercase, `textMuted`, 8px gap.
- **Focus:** Border becomes mint and the fill shifts to `rgba(0,229,190,0.04)`. No ring, no glow,
  no size change.
- **Error:** Border becomes `negative`, and the inline error block appears below.
- **Amount fields** prefix a ₹ glyph at 18px/700 in `textPrimary` with an 8px gap.

### Navigation

- **Bottom tab bar:** `bgCard` fill, 1px `border` top edge, 64px tall, 8px top / 10px bottom pad.
  Four destinations with outline Ionicons. Active is `accent`, inactive is `textMuted`. Labels at
  11px in Roboto Medium — the one place `FONTS` is actually applied. The Split tab carries a
  numeric badge for pending requests.
- **Stack header:** Not the native header (`headerShown: false`). A hand-built row: a 38px square
  back control (`bgCard`, 1px `border`, 12px radius) + an 18px/700 title, with optional trailing
  badge.

### Budget Status Ring

The system's signature readout. A 76px circle with a 4px border in the status colour, holding the
percentage at 17px/700 in that same colour over a 9px "used" label. It is a **status** ring, not a
progress arc — the full circle is always drawn and the colour carries the meaning (mint healthy,
amber 70–90%, red 90%+ and over). Paired with a linear bar — a `border`-coloured track at 3–6px
radius with a status-coloured fill — which carries the actual proportion.

### Toast

Floating status strip, inset 20px from both edges, 14px radius, 14px × 12px padding, a 30px
rounded icon well (10px radius) and a 10px gap, text at 13px/500 with a 19px line-height. Fill
and border follow the tinted-wash pattern for its status. Carries the system's only true shadow.

### Inline Error

A 10px-radius block in the negative wash with a 3px solid `negative` left bar running the full
height, a 15px alert icon, and `negative` text at 13px/18px. Always sits directly below the field
or above the action it blocks, with 14px of clearance beneath.

## Do's and Don'ts

### Do:

- **Do** take every colour from the `PC` object in `constants/theme.js`. It is the normative
  source; this document describes it rather than replacing it.
- **Do** hold the 20px page gutter on every screen, and change a card's own padding when
  something needs to sit wider.
- **Do** set figures a user stops and reads in monospace at 700/600 with negative tracking at
  26px and above, and give list-row amounts `fontVariant: ['tabular-nums']` instead.
- **Do** build depth from the `bg` → `bgCard` → `bgCardElevated` steps plus a 1px border.
- **Do** express every status surface as the tinted wash: ~10% fill, ~25% border, full-strength
  text.
- **Do** put dark ground-coloured text on a mint fill.
- **Do** keep an empty state on the same card geometry with a dashed border.
- **Do** size an icon tile's radius at roughly a third of its side.
- **Do** give every interactive control a 48dp minimum touch target, per the accessibility
  standard recorded in PRODUCT.md. The 38px stack back control and the 11×7-padded chips are
  below it today; expand the hit area rather than the visual box.

### Don't:

- **Don't** hardcode `#060A09` as the on-accent text colour. It appears literally in several
  files; it is `PC.bg` and should be referenced as such.
- **Don't** add a shadow to a card, row, sheet, input or header. Shadows belong only to elements
  that leave the layer stack.
- **Don't** fill a surface with saturated `negative` or `warning` — especially behind copy.
- **Don't** introduce a second accent. Mint is the only voice, and it also means positive money;
  a second hue would break that reading.
- **Don't** use `textMuted` (`#4A6058`, ~3.2:1) for body copy or any text a user must read. It is
  for hints and inactive states only, and it already fails the AA bar set in PRODUCT.md.
- **Don't** apply `FONTS.*` to isolated styles. Mixing a named Roboto family with the numeric
  `fontWeight` used everywhere else produces inconsistent weight rendering on Android — either
  convert a whole surface or leave the platform face alone.
- **Don't** use white text on mint, and don't put mint text on `bgCardElevated` at small sizes
  without checking it.
- **Don't** change a chip's or control's dimensions on state change. Only fill, border and text
  colour move, so nothing reflows.
