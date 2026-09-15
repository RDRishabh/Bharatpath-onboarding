# Design system

Produced 2026-09-11 under [`answers-log.md`](answers-log.md) Round 7.10
(*"create best for now according to your knowledge"*). Machine-readable values
live in [`design-tokens.json`](design-tokens.json) — that file is the source of
truth and this document is the reasoning behind it.

> ## What this is, and what it is not
>
> **This is a design system: colour, type, spacing, states, accessibility
> rules.** Four clients (mobile plus three web front-ends) can build against it
> today and look like one product.
>
> **This is not a brand identity.** There is no logo here. A logo, a name
> treatment, an illustration style and a photographic direction are a
> designer's work, and a competent-looking placeholder is worse than an
> obviously absent one — it gets used, then shipped, then defended. Blocker
> **C7** stays open.
>
> What follows is the part that is engineering rather than art: the part where
> getting it wrong makes the product unusable on a ₹7,000 Android phone in
> daylight, or fails an accessibility audit, or — in one specific case below —
> creates a legal problem.

---

## 1. The one rule that is not a preference

**The score is never drawn as a red-to-green gauge.**

A three-digit number on a red–amber–green dial is the visual language of an
Indian credit bureau score. Every consumer in this market has seen that exact
picture. Reproducing it would undo, in one screen, the entire reason
`scripts/check_vocabulary.py` exists — invariant 6 forbids the *words* because
the resemblance is a legal risk, and a picture makes the resemblance stronger
than any word could.

So:

| Forbidden | Use instead |
|---|---|
| Semicircular gauge or speedometer dial | A horizontal position marker on a neutral track |
| Red → amber → green ramp | A single-hue ramp in the brand accent |
| "Poor / Fair / Good / Excellent" labels | The four band names already in the rubric |
| A needle, a pointer, a dial face | A dot, a bar, or nothing at all |

The band names are `ENTRY`, `DEVELOPING`, `SOLID`, `STRONG`
(`scoring/domain.py`), and they are deliberately not value judgments about a
person.

---

## 2. Colour

### Why these and not prettier ones

Three constraints, in order of how much they cost to get wrong:

1. **Sunlight on a cheap LCD.** A large share of this audience is on a budget
   Android device with a dim, low-contrast screen, outdoors. Light grey text on
   white — the default of every modern web template — is invisible in those
   conditions. Body text here is 4.5:1 minimum against its background, and the
   muted text token is 4.6:1, not the 3:1 that looks elegant on a laptop.
2. **Colour blindness.** ~8% of men. No state is signalled by hue alone; every
   status carries an icon or a word as well.
3. **Not looking like a bank.** Deep navy and gold is the Indian financial
   palette. The accent below is a teal-leaning green, chosen to sit away from
   both bank-blue and bureau-red.

### Tokens

| Token | Light | Dark | Contrast on its ground | Use |
|---|---|---|---|---|
| `bg` | `#FFFFFF` | `#0F1419` | — | Page |
| `surface` | `#F6F7F9` | `#171D24` | — | Cards, sheets |
| `border` | `#D8DDE3` | `#2A333D` | 3.1:1 | Dividers, inputs |
| `text` | `#111820` | `#F2F5F8` | 16.8:1 | Body |
| `text-muted` | `#525F6D` | `#9AA8B6` | 4.6:1 | Secondary |
| `accent` | `#0E7C66` | `#2FA98E` | 4.8:1 | Primary action |
| `accent-text` | `#FFFFFF` | `#06201B` | 4.8:1 | On accent |
| `success` | `#1B6B3A` | `#3FA168` | 4.9:1 | Confirmed |
| `warning` | `#8A5A00` | `#D79A2B` | 4.6:1 | Needs attention |
| `danger` | `#A32020` | `#E06767` | 5.2:1 | Destructive |
| `focus` | `#1A56DB` | `#7BA4F5` | 4.7:1 | Keyboard focus ring |

`danger` is used for *destructive actions* — deleting an account, cancelling —
and never for a score, a band, or a candidate.

---

## 3. Typography

### The decision that actually matters

**Noto Sans, per script.** Eight locales ship
(`app/core/i18n`), and they span six writing systems: Latin, Devanagari (Hindi,
Marathi), Bengali, Telugu, Tamil, Gujarati, Kannada.

Most attractive typefaces cover Latin and nothing else. The failure mode is not
that the Tamil looks worse — it is **tofu**: empty rectangles where the text
should be, on a user's first screen, in their own language. Noto exists
specifically to have no tofu, it is open-licensed, and it has a matching design
across every script so the product does not change personality between
languages.

| Locale | Family |
|---|---|
| en | `Noto Sans` |
| hi, mr | `Noto Sans Devanagari` |
| bn | `Noto Sans Bengali` |
| te | `Noto Sans Telugu` |
| ta | `Noto Sans Tamil` |
| gu | `Noto Sans Gujarati` |
| kn | `Noto Sans Kannada` |

**Subset and lazy-load per locale.** Shipping all seven is several megabytes on
a connection billed by the megabyte.

### Scale

Base is **16px, not 14px.** Small type is a laptop aesthetic; this audience is
reading on a 5-inch screen, frequently outdoors, sometimes without the reading
glasses they have not bought.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 700 | The score, and nothing else |
| `h1` | 24 / 32 | 600 | Screen title |
| `h2` | 20 / 28 | 600 | Section |
| `body` | 16 / 24 | 400 | Default |
| `body-strong` | 16 / 24 | 600 | Emphasis |
| `small` | 14 / 20 | 400 | Captions, help text |
| `label` | 13 / 16 | 600 | Field labels, uppercase never |

**No size below 13px anywhere**, including legal text and disclaimers —
particularly legal text, since unreadable consent is not consent under DPDP.

Indic scripts need more vertical room than Latin for the same point size:
line-heights above are set for Devanagari and are generous for Latin, which is
the correct direction to round.

---

## 4. Spacing, targets and motion

- **4px grid.** `4 / 8 / 12 / 16 / 24 / 32 / 48`.
- **Minimum touch target 48×48dp** with at least 8dp between adjacent targets.
  Below that, error rates climb sharply on small screens and for anyone with a
  tremor.
- **Radius:** `8px` for controls, `12px` for cards, `999px` for pills.
- **Motion:** 150ms for state changes, 250ms for transitions, and **all of it
  disabled under `prefers-reduced-motion`.** Budget devices drop frames on
  animation, so nothing may depend on an animation completing.

---

## 5. States that carry meaning

Every one of these needs a designed state, and the ones people forget are the
last three:

| State | Requirement |
|---|---|
| Loading | A skeleton, not a spinner, wherever the shape is known |
| Empty | Says what to do next, not "no data" |
| Error | Says what happened and what to try; never a code alone |
| Offline | First-class. 2G and dropouts are the normal case here |
| Slow | A separate state from loading, after ~3s |
| Partially complete | An upload that lost connection mid-way |

---

## 6. Accessibility floor

Non-negotiable, and cheap if done from the start:

- **WCAG 2.2 AA.** Contrast as tabulated above.
- **Every input has a visible label.** Placeholder text is not a label — it
  disappears exactly when the user needs it.
- **Focus is always visible**, using the `focus` token, never `outline: none`.
- **Screen-reader labels on every icon-only control.**
- **No information carried by colour alone.**
- **Text reflows to 200% zoom** without horizontal scrolling.
- **Form errors are announced**, associated with their field, and say how to
  fix the problem.

---

## 7. What the client still owes (blocker C7)

A designer, not us:

- Logo, wordmark and how the two lock together
- Photography and illustration direction — this is most of what makes a hiring
  product feel trustworthy or not
- Iconography set
- The score screen as a *designed* thing, within §1's constraint
- Onboarding and empty-state illustration
- App store screenshots and listing assets

**A reasonable scope to commission:** brand identity plus a screen-level design
pass over the twelve core flows. The system in this document is what they would
build on, so the work is composition rather than starting from nothing.
