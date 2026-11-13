---
name: Blame
description: Who actually did the group project? The repo's git history, printed as a tabloid front page.
colors:
  yellow: "#FFE41A"
  yellow-print: "#FCE015"
  yellow-deep: "#F2CF00"
  red: "#E0251F"
  ink: "#121212"
  ink-soft: "#2B2926"
  muted: "#55524B"
  paper: "#F8F5EF"
  fiber: "#FAF8F3"
  track: "#DCDAD5"
  rule: "#CFCBC2"
  field-edge: "#A9A59D"
  desk: "#D6D2C9"
  foot-black: "#1A1A19"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "min(34vw, 20svh, 172px)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "min(20vw, 86px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  deck:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "min(10.4vw, 5.2svh, 46px)"
    fontWeight: 400
    lineHeight: 1.02
  banner:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "clamp(32px, 10.4vw, 46px)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "0.005em"
  nameplate:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  button-display:
    fontFamily: "Anton, 'Arial Narrow', sans-serif"
    fontSize: "33px"
    fontWeight: 400
    lineHeight: 1
  strip:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "clamp(19px, 6.6vw, 26px)"
    fontWeight: 700
    lineHeight: 1.1
  name:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.05
  figure:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "31px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  button-condensed:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "27px"
    fontWeight: 600
  label:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.05
  input:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  bar: "8px"
  field: "9px"
  button: "10px"
  sheet: "14px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  gutter-narrow: "12px"
  md: "14px"
  gutter: "16px"
  lg: "22px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.button-display}"
    rounded: "{rounded.button}"
    padding: "6px 20px"
    height: "60px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "#FFE73A"
  button-share:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button-condensed}"
    rounded: "{rounded.button}"
    padding: "6px 20px"
    height: "64px"
    width: "100%"
  button-share-hover:
    backgroundColor: "#000000"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "54px"
  tape-headline:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "0.1em 0.16em 0.02em"
  tape-exclusive:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    typography: "{typography.banner}"
    padding: "0.06em 0.3em 0.02em"
  strip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.strip}"
    padding: "9px 18px 10px"
  measure-toggle:
    backgroundColor: "{colors.track}"
    textColor: "{colors.ink-soft}"
    padding: "0 16px 1px"
    height: "42px"
  measure-toggle-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  avatar:
    backgroundColor: "{colors.yellow-print}"
    rounded: "{rounded.circle}"
    size: "70px"
  bar-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.bar}"
    height: "15px"
  bar-fill:
    backgroundColor: "{colors.yellow}"
    rounded: "{rounded.bar}"
    height: "15px"
  deadline-box:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    padding: "15px 14px 15px 100px"
  badge:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "10px 7px 8px"
  foot:
    backgroundColor: "{colors.foot-black}"
    textColor: "{colors.rule}"
    padding: "40px 16px 20px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "18px"
    width: "min(420px, calc(100vw - 24px))"
---

# Design System: Blame

## Overview

**Creative North Star: "The Scandal Sheet"**

Blame prints a repo's git history as the front page of a cheap tabloid, and the group-project fight is the scandal. Every screen is one sheet of warm newsprint (the paper token under an SVG grain tile and a large crumple-lighting texture) in a single phone-width column, and everything on that sheet is something a sub-editor would paste down by hand: torn yellow highlighter tape behind black Anton headlines, one red EXCLUSIVE banner, black caption strips reversed out in white condensed type, faces printed as black halftone dots on yellow, hand-inked crowns and burst marks, and torn black paper at the foot. Nothing is a card, a panel or a chart.

The page has two volumes. The top of each screen is front-page loud: banner, headline tape, a halftone portrait or lineup that bleeds to the paper edge, a black strip with the jab. Underneath it goes quiet: rows of names and percentages separated by thin column rules, then the small print under a double rule in muted condensed type. The loud layer is always Anton on yellow; the quiet layer is always Barlow Condensed on bare paper. The share card (1080x1920, drawn on canvas) is the same front page re-set for a group chat, built from the same tape, banner, strip, halftone and torn foot.

The world's motion only narrates printing: tapes slam onto the page, the portrait prints top to bottom, bars fill and their numbers count up, the jab rises into place. The confirmed rejection is the category default, a GitHub-insights dashboard of cards, axes and line charts; the owner picked this tabloid board over courtroom, git-graph, report-card and receipt concepts.

**Key Characteristics:**
- One 460px paper column; on wide screens it lies on a grey desk with a soft paper shadow.
- Two faces only: Anton for anything a tabloid would print as a headline, Barlow Condensed for everything you read.
- Yellow is the single highlight and the single data colour; red appears once per screen.
- Printed matter is torn (seeded clip-path polygons); touch controls are softly rounded.
- Paper pieces tilt counter-clockwise between 1 and 4 degrees; controls stay level.
- Every face is printed at runtime as 45-degree halftone dots, never shown as a raw photo.
- Depth comes from stacked paper (fiber underlays, torn edges, tilt), not shadows.

## Colors

Two inks and a highlighter on newsprint: black does the talking, yellow marks what matters, red appears once.

### Primary
- **Highlighter Yellow** (#FFE41A): the tape behind every headline and the deck, the primary "Find out" and "See the verdict" buttons, the bar fills, the badge tiles and the deadline box. Always laid with the grain tile over it, which nets it to roughly (247, 221, 29) on screen.
- **Print Yellow** (#FCE015): the yellow the canvas prints with. It fills every avatar disc, the halo around every cut-out, the painted swash behind the verdict portrait (the raster's colour is locked to it), the share card's tapes and bars, the favicon tape and the field's 3px focus ring. It must read as the same yellow as Highlighter Yellow; it is a separate token only because canvas has no grain layer.
- **Deep Yellow** (#F2CF00): focus outlines on black surfaces only (the share button, the selected measure toggle), where the ink focus ring would vanish.

### Secondary
- **Exclusive Red** (#E0251F): the EXCLUSIVE banner tape on the page and on the share card, plus the border of a field holding a bad repo link. White Anton on it is large text only, and it is too light (about 4:1 on the paper) for small text.

### Neutral
- **Press Black** (#121212): all headline type, body type, the caption strips, the share button, the selected toggle, the 3px focus ring, scrollbar thumb and every inked doodle. The halftone printer uses a near-identical #141414 for its dots.
- **Soft Ink** (#2B2926): secondary reading text (token help, small-print caveats, badge names, measure note, unselected toggle labels).
- **Faded Caption** (#55524B): the quietest text: notes under the form, row meta ("58 commits · 2 merges"), small-print lists, the verdict caveat, and the share card's for-fun line.
- **Newsprint** (#F8F5EF): the paper. Under the grain overlay it nets to about (240, 237, 231) on screen; the share sheet sits on it too.
- **Torn Fiber White** (#FAF8F3): the ragged white paper fiber that shows around the edge of every yellow tape and the deadline box, and the white lip on the lineup's torn bottom. The halftone printer fills cut-out bodies with a matching #F4F2EC.
- **Unprinted Track** (#DCDAD5): the empty part of every bar, the progress track, the unselected measure toggle, and the share-sheet image well.
- **Column Rule** (#CFCBC2): 1px hairlines between split rows and above the token disclosure; also the footer's text colour.
- **Field Edge** (#A9A59D): the 1.5px border of the repo field, the token field and the deadline date input.
- **Desk Grey** (#D6D2C9): the desk the paper lies on at 560px and wider, with the same grain tile.
- **Back-page Black** (#1A1A19): the torn black paper at the foot of the page and of the share card.
- **Reverse White** (#FFFFFF): type reversed out of black or red (strips, banner, share button, selected toggle, footer links) and the inside of input fields.

### Named Rules
**The Highlighter Rule.** Yellow is the only colour that highlights and the only colour that measures. Headlines sit on it, bars fill with it, faces are printed on it, badges are cut from it. No second accent and no new yellows; Deep Yellow is a focus outline, never a fill.

**The One Banner Rule.** Red is the EXCLUSIVE tape, once per screen, top left, pasted over the headline tape. Its only other job is the 1.5px border of an invalid field. It never fills a button or colours a number, a link or text; error text uses a darker #A3150F so it stays readable and the banner red keeps its meaning.

**The Netted Paper Rule.** Grain darkens the paper by about eight levels, so anything drawn outside CSS that must sit flush with the page uses the on-screen value, not the token: the browser theme colour is #F0EDE7 and the share card's ground is #EEEBE5.

## Typography

**Display Font:** Anton (with 'Arial Narrow', sans-serif), self-hosted woff2, latin and latin-ext subsets
**Body Font:** Barlow Condensed 500 / 600 / 700 (with 'Arial Narrow', sans-serif), self-hosted woff2

**Character:** Anton is the tabloid's shouting headline face, set tight and big on tape; Barlow Condensed is the paper's reading face, narrow enough to keep long names, repo names and percentages on one line at phone width. The pairing is all-condensed, so the page reads as one publication.

### Hierarchy
- **Display** (Anton 400, min(34vw, 20svh, 172px), 0.9, -0.012em): the word "Blame" on the home tape only. JS then fits it to the tape's width with yellow showing either side, capped at 20% of viewport height and 172px (162px on the desk layout).
- **Headline** (Anton 400, min(20vw, 86px), 0.98, -0.01em): screen headlines on yellow tape ("The split" at min(18.5vw, 84px), never wrapping). The verdict headline is fitted in JS between 30px and 104px: one line if it can be 52px or larger, otherwise two balanced lines up to 96px, one tape per line, line-height 0.94.
- **Deck** (Anton 400, min(10.4vw, 5.2svh, 46px), 1.02): the home question under the title. The deadline number steps it down to 44px at line-height 1.
- **Banner** (Anton 400, clamp(32px, 10.4vw, 46px), 1.08, 0.005em, uppercase): EXCLUSIVE on red tape; 33px on the inner screens.
- **Nameplate** (Anton 400, 36px, 1.1): "Blame" centred in the inner-screen masthead. Anton also sets the share-sheet heading (32px) and "The small print" (26px).
- **Strip** (Barlow Condensed 700, clamp(19px, 6.6vw, 26px), 1.1): white type on the black caption strips. The verdict jab is fitted to one line at 26px down to 19px, else wraps at 22px.
- **Name** (Barlow Condensed 700, 28px, 1.05): a person's name in a split row (24px under 360px).
- **Figure** (Barlow Condensed 700, 31px, 1, tabular figures): the percentage at the right of each row (26px under 360px).
- **Label** (Barlow Condensed 700, 18px, 1.05): badge names, the measure toggle (19px), disclosure summaries.
- **Body** (Barlow Condensed 500, 18px, 1.35): default page text; secondary text runs 16 to 17px in Soft Ink or Faded Caption.
- **Caption** (Barlow Condensed 500, 16px): notes, row meta, small-print lists; the footer is 15px.
- **Buttons**: the yellow button is Anton 33px at line-height 1; the black share button is Barlow Condensed 600 at 27px. Fields use Barlow Condensed 600 at 18px.

### Named Rules
**The Two-Voice Rule.** Anton for what the front page shouts (title, headlines, deck, banner, nameplate, the deadline number, the yellow button); Barlow Condensed for everything read (names, figures, strips, body, notes, fields, the share button). No third face.

**The Fill-the-Tape Rule.** Headline type is sized to its tape, not to a fixed scale: the title and the verdict headline are measured with canvas text metrics and set as large as the column allows, and a headline never wraps inside a tape. A second line gets its own tape; only the deck wraps.

**The Tabular Figure Rule.** Percentages are bold tabular figures, right-aligned against the name, so a count-up never jitters and the column of numbers reads as a ranking.

## Layout

One column of paper, max 460px wide, centred, at least the full small-viewport height, laid out as a flex column so the torn foot always lands at the bottom. Screens pad 18px at the top (26px on home, never less than the safe-area inset), 28px at the bottom and a 16px gutter at the sides (12px under 360px). Under 560px the paper is the whole viewport; at 560px and wider the body becomes the grey desk and the paper floats on it with a 28px margin and a soft two-layer shadow, and the title and deck lock to 162px and 46px.

Spacing is a tight newsprint rhythm in small steps: 6px between toggles and badges, 10px inside rows and fields, 12px between form parts, 14px before a new block (toggle, deadline box, form), 22px before a primary action or disclosure, 26px before the small print. Headline pieces deliberately overlap: the banner pulls under the headline by about a third of its height, the deck pulls up into the title tape, and tapes hang a few pixels outside the gutter.

Pictures bleed. The home lineup and the verdict hero take a negative gutter margin to run edge to edge, sized by the viewport (lineup min(52vw, 26svh, 240px), hero min(80vw, 35svh, 360px)), so on a 390x844 phone the home screen shows banner, title, deck, lineup, field and the yellow button above the fold. Split rows are a two-column grid: a 70px halftone disc, then name, meta and figure over a full-width bar.

## Elevation & Depth

Depth is paper on paper, not light. Tapes sit on a torn white fiber layer, strips and banners overlap the tape they label, each piece tilts at its own angle, the lineup's bottom edge is torn with a white lip, and the black foot is torn along its top with a 2px white line above it. Every printed fill carries the grain tile so it reads as ink on stock. Shadows exist only where a real object lifts off the paper: the two full-width buttons, the paper on the desk, and the share sheet.

### Shadow Vocabulary
- **Button press-lift, yellow** (`box-shadow: 0 1px 0 rgb(0 0 0 / .08), 0 6px 14px -8px rgb(70 55 0 / .45)`): a warm, tight shadow under the yellow primary button.
- **Button press-lift, black** (`box-shadow: 0 8px 18px -10px rgb(0 0 0 / .6)`): under the black share button.
- **Paper on desk** (`box-shadow: 0 2px 4px rgb(0 0 0 / .12), 0 24px 60px -24px rgb(0 0 0 / .45)`): the paper column at 560px and wider.
- **Sheet** (`box-shadow: 0 30px 60px -20px rgb(0 0 0 / .55)`): the share dialog, over a 55% Press Black backdrop.

### Named Rules
**The Paper-Stack Rule.** Lift a printed piece with a fiber underlay, a torn edge, an overlap or a tilt, never with a drop shadow. Shadows are reserved for the buttons, the page on the desk and the dialog.

## Shapes

The form language splits by what a thing is. Printed matter is torn: every tape, banner, strip, badge, toggle and the deadline box is clipped to a hand-torn polygon, the lineup is torn along its bottom and the foot along its top. The polygons come from tools/make-torn.mjs (seeded, so re-running gives the same edges) and are written to torn.css as eight custom properties: three tape edges of 5 to 7px depth for headline, deck and badges, a 9px rough fiber edge, a 4px strip edge, a 3px tape edge for banners and toggles, a 16px foot edge and a 12px photo edge. Each point is a percentage along the edge and a pixel depth, so a tear keeps the same bite at any width.

Controls you type into or press as a full-width bar are soft rectangles: buttons 10px, fields 9px, the date input and data bars 8px, the dialog 14px. Faces and the back button are circles. Doodles (crown, scribble, burst, speed lines) are round-capped hand strokes of about 5 to 5.5 units; icons are solid filled glyphs drawn as SVG symbols.

### Named Rules
**The Torn-or-Rounded Rule.** If it is printed, tear it; if it is a field or a full-width button, round it (8 to 10px). Never round a tape and never tear a field.

**The Counter-Clockwise Rule.** Paper pieces tilt between -1 and -4 degrees (title -1.4, headline -1.6, verdict tapes -2.4 and -1.2, deck -3.6, banner -4, strips -1.4, deadline box -1). Only adjacent siblings may break the pattern, by at most +1 degree, to look hand-pasted. Fields, buttons and rows stay level. Ink doodles and the painted swash (-14 degrees) are freehand and exempt.

**The Constant-Bite Rule.** Edit torn edges by changing tools/make-torn.mjs and regenerating torn.css, never by hand, and reuse one of the eight edges rather than adding a ninth for a single element.

## Components

### Buttons
Big, flat, full-width bars you hit with a thumb.
- **Shape:** gently rounded rectangle (10px), full column width, 60px minimum height (64px for share).
- **Primary (yellow):** Highlighter Yellow with grain, Press Black Anton at 33px, a 30px arrow icon after the label, 14px gap. Used for "Find out" and "See the verdict".
- **Share (black):** Press Black with grain, white Barlow Condensed 600 at 27px, the share icon before the label. Used once, for "Share to the group", and in the dialog for "Copy link".
- **Hover / Focus:** on hover-capable devices yellow brightens to #FFE73A and black deepens to #000; focus is a 3px Press Black outline at 3px offset (Deep Yellow on the black button). Press drops 1px and scales to 0.995 over 120ms. While busy, the arrow nudges 5px on an 800ms loop.
- **Links:** underlined Barlow Condensed 600 in Press Black, 1.5px underline at 0.2em offset; used for every secondary action ("Try the demo team's repo", "Check another repo", "Close").

### Inputs / Fields
- **Style:** white field, 1.5px Field Edge border, 9px radius, 54px tall, 12px side padding, a 24px GitHub mark inside on the left, Barlow Condensed 600 at 18px; placeholder #6E6A63 (about 5:1 on white).
- **Focus:** the border turns Press Black and a 3px Print Yellow ring appears around the field.
- **Error / Disabled:** an invalid field takes an Exclusive Red border and the status line below turns #A3150F; disabled buttons drop to 55% opacity.
- **Deadline date input:** the same edge on a 42px, 8px-radius box, with an inked calendar glyph.

### Navigation
A newspaper masthead, not a nav bar. Inner screens open with a three-column grid: a 44px circular back button with a 26px arrow, the "Blame" nameplate centred, and an empty balancing column. Screens switch with a 280ms view-transition crossfade (skipped under reduced motion), and focus moves to the new headline.

### Headline Tape (signature)
Anton on Highlighter Yellow torn tape over a Torn Fiber White underlay that sticks out 7 to 9px, tilted counter-clockwise, hanging about 10px outside the gutter. The EXCLUSIVE banner is pasted on its top-left corner. On the split screen the tape slams in (from -6 degrees and 118% scale, 420ms, overshoot ease); on the verdict each line's tape slams in from -9 degrees and 130% scale, 460ms, 140ms apart.

### EXCLUSIVE Banner (signature)
White uppercase Anton on Exclusive Red with grain, torn on the 3px tape edge, tilted -4 degrees from its left edge, no fiber underlay. One per screen, always the same word, always above the headline. It is a fixed brand device from the chosen comp, not a pattern for labelling sections.

### Caption Strip (signature)
Black torn paper with white Barlow Condensed 700, tilted -1.4 degrees: the repo name and commit count on the split, the jab on the verdict (full width, centred, overlapping the bottom of the portrait by 14px). The jab rises 16px into place over 500ms after the portrait has printed.

### Halftone Portraits (signature)
Every face is printed at runtime by js/halftone.js as Press Black dots on a 45-degree grid, levels stretched per image so dim photos still print, dot radius up to 0.72 of the cell, never finer than 2.2 device pixels. Two forms: a disc (a GitHub avatar or demo portrait on a Print Yellow circle) and a cut-out (a transparent portrait filled paper-white with a Print Yellow halo, like a clipped photo). Cell pitch in CSS px: 1.4 for 70px row avatars, 1.7 for the home lineup (5px halo), 2.0 for the verdict cut-out (8px halo) and 2.1 for a verdict disc; on the 1080px share card, 2.3 for row avatars, 4.4 for the hero cut-out (12px halo) and 4.6 for a hero disc. People with no linked account get a printed silhouette. The verdict portrait sits on the painted yellow swash rotated -14 degrees and prints top to bottom (a clip-path wipe over 900ms).

### Split Row
A 70px halftone disc, the name in Name type with the meta line in Faded Caption beside it, the percentage in Figure type at the right, and a 15px bar beneath (Unprinted Track, 8px radius; Highlighter Yellow fill with grain and a faint inner bottom shadow). Rows are divided by 1px Column Rule hairlines. On entry each bar fills with a scaleX transform over 1100ms (160ms delay, 110ms stagger, cubic-bezier(.16, 1, .3, 1)) while its percentage counts up on the same clock with a quartic ease-out. Switching the measure re-animates from the previous widths. The leader, if they carried, gets an inked burst mark on the avatar.

### Measure Toggle
A two-option radio group printed as torn tape chips, 42px tall: unselected is Unprinted Track with Soft Ink text, selected is Press Black with white text. They tilt -1.5 and +1 degrees so they look like two scraps pasted side by side.

### Deadline Box
A Highlighter Yellow torn box on a fiber underlay, tilted -1 degree, with an inked stopwatch and speed lines on the left (100px text inset): the commit count in Anton 44px, then two lines of Barlow Condensed 600 at 20px.

### Badges
Torn Highlighter Yellow tiles in a wrapping row with 6px gaps, each with a 28px solid icon (crown, star, moon, heart), the badge name in Label type and the person's name below in Soft Ink at 15px.

### Torn Foot
Back-page Black paper torn along its top (16px), Column Rule text at 15px, white links, a 2px white line above the tear. One per page, under every screen.

### Share Sheet and Share Card
The dialog is Newsprint with grain, 14px radius, 18px padding, an Anton 32px heading, the card preview, then a yellow "Save image" and black "Copy link" side by side (52px tall). The card itself is a 1080x1920 canvas re-setting the verdict as a front page: Anton nameplate over a double rule, red banner, yellow headline tape, swash and halftone hero, black jab strip, ranked rows with black-on-yellow badge labels, the deadline tape, a for-fun line and the torn black foot carrying the repo and URL.

## Do's and Don'ts

### Do:
- **Do** set every headline in Anton on a torn Highlighter Yellow tape with the fiber underlay, tilted between -1 and -4 degrees, and fit its size to the column.
- **Do** lay the grain tile over every printed fill (tapes, strips, banner, bars, buttons, foot) so colour reads as ink on paper.
- **Do** print every face through js/halftone.js at the cell pitches above; show the plain image only as the fallback before the canvas prints.
- **Do** keep each screen's primary action a full-width Highlighter Yellow Anton button at least 60px tall; the only black button is the share action.
- **Do** keep the quiet layer quiet: notes, meta and small print in Barlow Condensed 16 to 17px in Faded Caption or Soft Ink, under 1px Column Rule hairlines or a 3px double Press Black rule.
- **Do** keep fonts and images self-hosted; the page's Content-Security-Policy allows fonts, styles and scripts from its own origin only.
- **Do** ship every generated raster with a .json provenance sidecar beside it (prompt, model, post-processing), as assets/suspects/*.webp and assets/swash.webp do.
- **Do** mirror colour changes in js/halftone.js and js/card.js, which carry literal copies of the tokens (print ink #141414, Print Yellow, cut-out fill #F4F2EC, card ground #EEEBE5).
- **Do** skip every entrance, slam, print wipe, count-up and view transition under prefers-reduced-motion, leaving the final layout static.

### Don't:
- **Don't** use Exclusive Red beyond the EXCLUSIVE banner and the invalid-field border, and don't add a second banner, kicker or small label above a headline.
- **Don't** add charts, axes, legends or dashboard cards; the only data marks are the yellow bar, the big Anton number and the tabular percentage.
- **Don't** set headlines in Barlow Condensed or reading text in Anton, and don't bring in a third face.
- **Don't** lift printed pieces with drop shadows; overlap, tear and tilt them instead.
- **Don't** round a tape, strip or badge, and don't tear a field or a full-width button.
- **Don't** tilt fields, buttons or rows, and don't tilt paper pieces clockwise beyond +1 degree.
- **Don't** hand-edit torn.css or add a one-off torn edge; regenerate from tools/make-torn.mjs.
- **Don't** show a face as a raw colour photo.
