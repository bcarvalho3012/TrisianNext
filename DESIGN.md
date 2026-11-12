# design/v2: the redesign brief

**Branch:** `design/v2`. Main is untouched. Copy is frozen: `node tools/copycheck.mjs` compares every
reader-facing string on every page with main and the pre-commit hook blocks any change.
Markup, classes, CSS, JS and the order of sections may change. Words, titles, meta tags, alt text and JSON-LD may not.

## Direction

Reference: cyberlinkasp.com, for its structure and warmth, not its skin. Borrowed: a left-aligned hero with a visual
tile on the right, a dark band with white stat cards overlapping its edge, cards with a soft tinted shadow, pill
buttons, a tab row over an image block for the sectors, a gradient call-to-action band, a dark multi-column footer,
and a calmer 60 to 90px section rhythm.

Kept from Trisian: Graphik (licensed, ours), Archivo Condensed Black for the one word "advance", the indigo, navy,
cobalt and bright-blue palette, the isometric icon set, the scene illustrations, and the copy's density.

Deliberately different from the reference: indigo (not violet) as the action colour, no stock photography of people,
illustrations where they use photos, a single-row nav, and the editorial "answered in advance" opener.

## Decisions

1. Gradients (navy to bright) are allowed in exactly two places: the hero tile and the call-to-action band.
2. Imagery is limited to what the repo already holds: five photos, the icon set and the scene SVGs.
3. The six animated scenes are shown as static illustrations (their end frames). `css/scenes.css` is retired.
   Scroll reveals, hovers and the two stat counters remain. Parallax, depth, cursor lean, marquee and loops are gone.
4. The purple reserved for the framework row stays reserved; the framework row is now a static chip strip.
5. "PHOTO PENDING" placeholders become quiet gradient tiles with their staging label as a small caption.

## Tokens

See the top of `css/styles.css`. Shadows are indigo-tinted; cards are 16px, panels 24px, pills 999px.
