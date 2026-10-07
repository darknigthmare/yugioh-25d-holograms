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
It was rerun against the frozen release entry `index-CkdHwDWv.js`, SHA-256
`7173898cef8206cb9f0e12525376ad03e857a22e40fca40ea97c0623e0fdb9fd`.

HTML SHA-256: `9092b61cae2f9f267fc6f35c4f90594220bc123ff9681d9b251e5973b1c1c06f`.
CSS `index-BbUkbKmn.css` SHA-256: `71afb732ab7152dc319dfb6b72812913e23121c24f251ef80e0b69c61e0e749e`.

The entry, HTML, CSS, native façade, native wrapper and WASM hashes were compared
before and after the final chain, general and Pendulum browser audits and remained
unchanged. The eight monitored files also include the serialized CDB and Lua
archive. This report, the [Pendulum report](artifacts/native-pendulum-ui-2026-10-07/report.json)
and the [Trap Monster report](artifacts/native-chain-ui-2026-10-07/report.json)
contain the same fingerprints, byte counts and `immutableCompiledSnapshot: true`.
The final native façade is `NativeDuelGame-ZSLU0meg.js`, SHA-256
`292967a9fa2eab1eed43a2f0ce172a3e1364eeb86f1c66d1a63e55fb49777980`.

The general runner discovers the entry and CSS in the served HTML, then the
façade and wrapper in the served JavaScript. It hashes all eight actual HTTP
response bodies before and after the complete browser flow. These response
hashes and byte counts exactly match the independent local snapshots; the JSON
preserves both sets under `servedResponseFingerprintsBefore` and
`servedResponseFingerprintsAfter`.

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
