export const AGENT_SKILLS_ASSIGNMENT_FEATURE = 'feature:AgentSkillsAssignment';

// --- CXAIR Phase 1 scope flags ------------------------------------------------
// The 7/2 Astra sync-up narrowed CXAIR Phase 1: AI ("Air"/AirPro) agents are
// surfaced in the Interactions tab ONLY. The pieces below are built but deferred
// to a later phase, so they default to OFF and Phase 1 behavior is the default.
// Flipping a flag to `true` restores that behavior exactly, with no code rewrite.
//
//  - aiAgentsInAgentsTab     : list AI agents in the Agents tab.
//  - aiAgentStateChange      : "Change agent state" action for AI agents
//                              (Available <-> Inactive, incl. the Pending
//                              Inactive drain flow).
//  - interactionScoreColumns : Confidence + Sentiment columns in the
//                              Interactions tab (Phase 2, INIT-28002).
export const CXAIR_PHASE1_FLAGS = {
  aiAgentsInAgentsTab: false,
  aiAgentStateChange: false,
  interactionScoreColumns: false,
} as const;

export type CxairPhase1Flag = keyof typeof CXAIR_PHASE1_FLAGS;

// Single place every gate reads a Phase 1 flag, so the deferred pieces all check
// the same source rather than re-deriving the toggle in each component.
export const isCxairPhase1FeatureEnabled = (flag: CxairPhase1Flag): boolean =>
  CXAIR_PHASE1_FLAGS[flag] === true;
