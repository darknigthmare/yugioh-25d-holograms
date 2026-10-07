# Native duel browser audit — 7 October 2026

The compiled production app passed the native duel flow at **1280 × 900** and
**390 × 844** with the actual response headers from `vercel.json`. The CSP allows
WASM compilation through `'wasm-unsafe-eval'`; JavaScript `'unsafe-eval'` remains
absent. Chromium reported no page errors, failed native asset requests, or CSP
violations.

Both viewport runs verified:

- The illustrated deck-builder library contains 390 cards, including all 339
  canonical Field Spells. The Field Spell filter displays all 339, and a new
  Field Spell's passcode returns the exact card.
- Searching the full native catalogue for `Dark World` offers Broww, Huntsman
  of Dark World (`79126789`) with a local neutral illustration. Replacing one
  starter card with Broww preserves the legal 40-card Main Deck, and reloading
  preserves every Main, Extra, and Side Deck ID exactly.
- A valid 40-card custom deck launches the local WASM/Lua engine. The first-player
  choice, normal summon, set Field Spell, Extra Deck inspection, and end-turn
  action use the rendered controls.
- The engine's opening hand differs from the registered deck's final five cards;
  the initial shuffle preserves the saved deck registration.
- The AI completes its turn, and the native engine returns to the player with
  the next draw.
- Opposing face-down cards expose no card ID, UID, card type, private front
  illustration, or private accessibility label in the rendered DOM.
- The body fits the viewport and the production build exposes no development
  `__YGO_QA__` hook.

An additional desktop flow activates Dragon Ravine (`62265044`) face up and
uses its ignition effect through the field's action menu. The native engine
discards the chosen cost card before offering the effect option and Deck
selection. Choosing Blue-Eyes White Dragon (`89631139`) sends that Dragon to the
Graveyard, leaves the paid cost intact, removes the once-per-turn action, and
displays the public Graveyard correctly.

The complete browser run used WASM SHA-256
`0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.
It was rerun against the frozen release entry `index-Bf3sQIDw.js`, SHA-256
`6de409c77e47c3853b1a554553776a13f576e265824187d6d21b809fd4c7ce33`.

HTML SHA-256: `ca7254cd1cc1b1b0c6bf9c96782429d47443c7b1a0da5febe6801762b2360ee2`.
CSS `index-WwbnQBsq.css` SHA-256: `5103d13e4c93cce8f60e430ade9bce9aace0233e3b71dfb7786e11b7bf3c58a1`.

The entry, HTML, CSS, native façade, native wrapper and WASM hashes were compared
before and after both browser audits and remained unchanged. The seven files in
the frozen release manifest also match their recorded byte counts and hashes.
This report and the [Pendulum report](artifacts/native-pendulum-ui-2026-10-07/report.json)
contain the same fingerprint fields and `immutableCompiledSnapshot: true`.

All five general-flow captures were inspected. The library and cost flow remain
readable at both widths. The desktop action labels wrap tightly when three
actions are offered; the audited controls remained usable. The mobile board
retains its explicit scrolling instructions and some zones are outside the
initial framing, while the body stays within the viewport.

The audit uses isolated browser contexts, legal custom-deck fixtures in local
storage, and a varied deterministic random stream. It reads no opposing hand
state and does not inject duel responses or alter the core's rules. Its scope is
the startup, catalogue persistence, costs, action, turn, rendering, and
confidentiality flow; it is separate from the complete Field Spell script audit
and the prompt protocol tests.

Reproduce after building:

```sh
npm run build
python scripts/audit-native-duel-ui.py
```

The script serves `dist` on an ephemeral localhost port with the production
headers. Python Playwright and Chromium are required.

Evidence: [JSON report](artifacts/native-duel-ui-2026-10-07/report.json),
[desktop duel](artifacts/native-duel-ui-2026-10-07/native-duel-1280.png),
[mobile duel](artifacts/native-duel-ui-2026-10-07/native-duel-390.png),
[desktop builder](artifacts/native-duel-ui-2026-10-07/native-builder-1280.png),
[mobile builder](artifacts/native-duel-ui-2026-10-07/native-builder-390.png), and
[Dragon Ravine cost](artifacts/native-duel-ui-2026-10-07/native-ravine-cost.png).

The decision bridge additionally passes 35 tests: all 19 non-command selection
types have typed fixtures, and a real WASM/Lua operation completes 18 distinct
prompt types without a `RETRY`, including mandatory sum materials, weighted
tributes, counters, ordering, card declarations, positions, field masks, and
rock-paper-scissors. Trigger ordering shares the card-order wire format and has
its own descriptor coverage. The real-core harness detected and verified the
vendor `SELECT_SUM` parser correction.
