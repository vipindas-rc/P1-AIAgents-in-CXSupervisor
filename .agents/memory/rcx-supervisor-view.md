---
name: RingCX Supervisor View app
description: Durable conventions/pitfalls of the vendored RingCX supervisor prototype at artifacts/supervisor-view.
---

# RingCX Supervisor View (artifacts/supervisor-view)

Imported from public repo `vipindas-rc/RCX-AI-Agents-in-CX-Supervisor-View` (repo name
`rest-express`). It's a **pure client-side mock** — the Express server has no real API
routes; all data is generated under `client/src/proto/`.

## Durable conventions / pitfalls
- **`client/src/proto/` is excluded from tsconfig AND from the `react()` vite plugin.** A
  custom `stubEagAngular` vite plugin strips generic JSX type-args and stubs out AngularJS
  `common/services|directives` + `@ringcentral/web-modules-core`. Consequence: edits inside
  `proto/` are not typechecked and unused symbols there won't fail build — but the flip side
  is that broken proto code fails only at runtime, not at typecheck.
- **Interactions-tab columns are single-sourced** from `interactionColumns`. The column-meta,
  the settings dialog, visible-col defaults, and the per-cell render are all derived/gated off
  it — edit that one list and the change cascades.
- **Two distinct row highlights coexist** in the interaction row: a cross-tab "jump & blink"
  nav cue (keyed off a highlighted agent id) vs. a score-severity row tint computed from
  confidence/sentiment. They look similar but are independent — don't conflate them.
- Tab switching (Agents/Interactions) is React `useState`, not URL-routed, so you can't
  deep-link to the Interactions tab for a screenshot.
- **E2e-testing the Agents tab row actions:** the per-row "more" (⋮) button only appears on
  hover and its menu portals to `body`, so targeting a specific row by hover is flaky (a
  test can easily open an adjacent row's menu). Isolate one agent via the "Search agents"
  box first (filters by name substring), then there's only one row/menu to act on.
- **`@proto` types come from a hand-written barrel `client/src/proto-module.d.ts`** (`declare
  module "@proto"`), NOT from the real `proto/AgentTablePanel.tsx` (proto is tsc-excluded). The
  vite alias points `@proto` at that .tsx for runtime, but tsc only sees the .d.ts. So any NEW
  symbol you export from AgentTablePanel and import in a typechecked file (e.g. pages/) must ALSO
  be declared in proto-module.d.ts or tsc fails with TS2614 "no exported member".
- **CXAIR Phase 1 scope flags** live in `proto/eag/constants/features.ts` (`CXAIR_PHASE1_FLAGS`
  + `isCxairPhase1FeatureEnabled`), default OFF. They gate 3 deferred pieces (AI/"Air" agents in
  Agents tab, AI agent state-change action, Confidence+Sentiment interaction columns). Flipping a
  flag ON restores pre-Phase-1 behavior; the underlying code (modal, ScoreIndicator, renderers)
  is intact behind the gate, never deleted. The `aiAgentsInAgentsTab` flag ALSO drives the
  Agents-tab knock-on cleanup: it drops the "Agent type" column (gated in the `columns` array in
  supervisorMock.ts, cascades via agentColumnMeta to table + settings dialog), hides the Agent
  type filter dropdown entirely (Agents tab shows only Channel + State), and narrows the State
  filter to Human states only (SupervisorAgents `stateOptionsForType`) so no AI-only state lingers
  as a dead option. Interactions-tab agentType column + agent-type dropdown are separate and kept.
- **Vendored `@ringcx/ui` components (MultiSelect/DropDown, and the `Filter` that wraps it)
  crash if rendered outside a styled-components `ThemeProvider theme={theme}` (+ juno
  `RcThemeProvider`)** — their styled parts read `theme.colors.*` and throw "Cannot read
  properties of undefined (reading 'background')". `AgentTablePanel` supplies those providers
  internally, but the page's filter row is a separate render tree, so any `@ringcx/ui` widget
  used at the page level must be wrapped in its own themed shell (see `proto/SupervisorFilter.tsx`,
  re-exported via @proto). Keep the `@ringcx/ui`/`theme` imports inside proto/ (tsc-excluded).
- **Filter state must be PER TAB, not shared.** The Agents and Interactions tabs share the same
  `SupervisorAgents` page render; using one set of filter/search state for both means an Interactions
  selection (e.g. agent type "Air", an agent id, a category) silently applies to the Agents list and
  empties it. Worse, the Agents tab renders no agent-type control (flag off), so a leaked type filter
  is invisible AND unclearable there. Keep separate `agents*` vs `int*` state groups and feed only the
  active tab's values to `AgentTablePanel` via `active*` aliases. Each tab needs its own agent-type
  change handler to clamp its own dependent selections.
- **Empty-state / label copy comes through the `proto/eag/helpers/translate.ts` stub**, which by default
  just humanizes the last i18n key segment → ugly UI text like "No Agents Msg". There are no locale
  files. Add real strings to the `OVERRIDES` map in that stub (keyed by full i18n key) rather than
  editing each component. Empty-state copy follows rc-content-companion: sentence case, noun phrase, no
  trailing period.
- The "Update agent state" menu item is disabled (greyed + tooltip) only for base states
  ENGAGED/CHAT-ENGAGED/BREAK-AFTER-CALL/TRANSITION/PREVIEWING (see MoreMenu); the dialog
  pre-selects the agent's current base state when it maps to a settable option. Human vs Air
  option sets come from HUMAN_STATE_OPTIONS / AIR_STATE_OPTIONS in UpdateAgentStateModal.tsx.
