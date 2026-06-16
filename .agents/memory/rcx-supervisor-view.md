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
- The "Update agent state" menu item is disabled (greyed + tooltip) only for base states
  ENGAGED/CHAT-ENGAGED/BREAK-AFTER-CALL/TRANSITION/PREVIEWING (see MoreMenu); the dialog
  pre-selects the agent's current base state when it maps to a settable option. Human vs Air
  option sets come from HUMAN_STATE_OPTIONS / AIR_STATE_OPTIONS in UpdateAgentStateModal.tsx.
