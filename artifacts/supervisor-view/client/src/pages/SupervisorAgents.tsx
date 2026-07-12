import { useCallback, useState } from "react";
import AgentTablePanel, {
  agentColumnMeta,
  interactionColumnMeta,
  agentStateOptions,
  agentFilterOptions,
  interactionFacetsByType,
  isCxairPhase1FeatureEnabled,
  Filter,
} from "@proto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListFilter,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ExternalLink,
  Menu as DragHandleIcon,
} from "lucide-react";

// The header/tabs/Filters blue, reused in the table settings dialogs so the
// whole page shares one accent color.
const RC_BLUE = "#066fac";

// Mirrors CATEGORIES_MAP in client/src/proto/eag/helpers/injector. The id is
// what the interactions table filters on (categoryIds), the label is shown.
const CATEGORY_OPTIONS = [
  { id: "1", label: "Billing" },
  { id: "2", label: "Refund" },
  { id: "3", label: "Technical" },
  { id: "4", label: "VIP" },
  { id: "5", label: "Escalation" },
  { id: "6", label: "Feedback" },
];

// Shared agent-type options, used on both the Agents and Interactions tabs.
const AGENT_TYPE_OPTIONS = [
  { value: "Air", label: "AirPro agents" },
  { value: "Human", label: "Human agents" },
];

const CHANNEL_OPTIONS = [
  "Web Chat",
  "Support Inbox",
  "Twitter",
  "Facebook",
  "Instagram",
  "WhatsApp",
  "SMS",
  "Voice",
];

// Shape the page's option sources into the RingCX Filter's IMenuItem contract
// (id + displayName). One helper for {value,label} option lists, one for the
// plain string lists (channels/states) where the value is its own label.
const toFilterItems = (
  opts: { value: string; label: string }[],
): { id: string; displayName: string }[] =>
  opts.map((o) => ({ id: o.value, displayName: o.label }));

const toFilterItemsFromStrings = (
  opts: string[],
): { id: string; displayName: string }[] =>
  opts.map((o) => ({ id: o, displayName: o }));

const topTabs = [
  "Active calls",
  "Active messages",
  "All messages",
  "History",
  "Callbacks",
  "Scripts",
  "Stats",
  "Supervisor",
];

const supervisorFilters = ["Agents", "Interactions"];

const sidePrimaryNav = [
  {
    label: "Message",
    icon: "/figmaAssets/icon-bubble-lines-border.svg",
    active: false,
    badge: "6",
  },
  {
    label: "Video",
    icon: "/figmaAssets/icon-videocam-border.svg",
    active: false,
  },
  {
    label: "Phone",
    icon: "/figmaAssets/icon-phone-border.svg",
    active: false,
  },
  {
    label: "Agent",
    icon: "/figmaAssets/icon-engage-border-1.svg",
    active: true,
  },
  {
    label: "Contacts",
    icon: "/figmaAssets/phone-inbox-border-1.svg",
    active: false,
  },
  {
    label: "More",
    icon: "/figmaAssets/icon-more-horiz.svg",
    active: false,
  },
];

const sideSecondaryNav = [
  {
    label: "Apps",
    icon: "/figmaAssets/icon-default-integration-border.svg",
  },
  {
    label: "Settings",
    icon: "/figmaAssets/icon-settings-border.svg",
  },
  {
    label: "Help",
    icon: "/figmaAssets/icon-help-border.svg",
  },
];

export const SupervisorAgents = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<"Agents" | "Interactions">(
    "Agents",
  );
  const isInteractions = activeTab === "Interactions";

  // The filter row is closed by default; the "Filters" button toggles it open.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters (and search) are kept PER TAB so a selection on one tab never leaks
  // into the other — an Interactions filter must not silently empty the Agents
  // list. Each array is a multi-select id list; empty means "no filter" (the old
  // "All" default). States are Agents-only; agents/categories are Interactions-only.
  const [agentsSearch, setAgentsSearch] = useState("");
  const [agentsChannels, setAgentsChannels] = useState<string[]>([]);
  const [agentsStates, setAgentsStates] = useState<string[]>([]);
  const [agentsTypes, setAgentsTypes] = useState<string[]>([]);

  const [intSearch, setIntSearch] = useState("");
  const [intTypes, setIntTypes] = useState<string[]>([]);
  const [intAgentIds, setIntAgentIds] = useState<string[]>([]);
  const [intChannels, setIntChannels] = useState<string[]>([]);
  const [intCategories, setIntCategories] = useState<string[]>([]);

  // The search box sits above the tabs but is scoped to the active tab.
  const searchQuery = isInteractions ? intSearch : agentsSearch;
  const setSearchQuery = isInteractions ? setIntSearch : setAgentsSearch;

  // Only the active tab's selections feed the table, so the other tab's filters
  // can never apply.
  const activeChannels = isInteractions ? intChannels : agentsChannels;
  const activeStates = isInteractions ? [] : agentsStates;
  const activeAgentIds = isInteractions ? intAgentIds : [];
  const activeCategories = isInteractions ? intCategories : [];
  const activeTypes = isInteractions ? intTypes : agentsTypes;

  // The table's Agent type pre-filter is single-valued ("All" | "Air" | "Human"),
  // derived from the active tab's multi-select: exactly one type selected narrows
  // to it, none or both selected means "All".
  const agentTypeFilter: "All" | "Air" | "Human" =
    activeTypes.length === 1 ? (activeTypes[0] as "Air" | "Human") : "All";

  // CXAIR Phase 1: AI agents don't appear in the Agents tab, so the "AirPro
  // agents" agent-type filter option is dropped there (offering it would only
  // yield an empty list). The Interactions tab keeps both options.
  const agentsTabTypeOptions = isCxairPhase1FeatureEnabled("aiAgentsInAgentsTab")
    ? AGENT_TYPE_OPTIONS
    : AGENT_TYPE_OPTIONS.filter((o) => o.value !== "Air");

  // When the supervisor clicks an agent's "Active interactions" icons we jump to
  // the Interactions tab and blink that agent's rows. The nonce re-triggers the
  // blink animation even if the same agent is clicked again.
  const [highlightAgentId, setHighlightAgentId] = useState<string | null>(null);
  const [highlightNonce, setHighlightNonce] = useState(0);

  const handleActiveInteractionsClick = useCallback((agentId: string) => {
    setActiveTab("Interactions");
    setHighlightAgentId(agentId);
    setHighlightNonce((n) => n + 1);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "Agents" | "Interactions");
    // Manually changing tabs clears any agent-driven row highlight. Filters are
    // per-tab, so each tab keeps its own selections across switches.
    setHighlightAgentId(null);
  }, []);

  // The Agents-tab State filter offers exactly the states present for the agents
  // tab's selected agent type (human states for Human, AirPro states for AirPro).
  // CXAIR Phase 1: when AI agents are hidden, the "All" view shows only Human
  // agents, so offer Human states only — otherwise Air-only states (e.g. Inactive
  // / Pending Inactive) linger as dead options that always resolve to an empty list.
  const agentsTypeFilter: "All" | "Air" | "Human" =
    agentsTypes.length === 1 ? (agentsTypes[0] as "Air" | "Human") : "All";
  const stateOptionsForType =
    !isCxairPhase1FeatureEnabled("aiAgentsInAgentsTab") &&
    agentsTypeFilter === "All"
      ? agentStateOptions.Human
      : agentStateOptions[agentsTypeFilter] ?? [];

  // Interactions-tab "All agents" options depend on the selected Agent type(s):
  // pick a type and the picker narrows to just those agents (empty selection =
  // every agent). Built from the same production-derived agentFilterOptions.
  const agentOptionsForType =
    intTypes.length > 0
      ? agentFilterOptions.filter((o) => intTypes.includes(o.agentType))
      : agentFilterOptions;

  // Channel + Category pickers also depend on the selected Agent type(s): show
  // only the channels / categories that actually appear in the interaction data
  // for the chosen type(s). No type selected = every option.
  const channelsForType = (types: string[]): string[] => {
    const allowed = new Set<string>();
    types.forEach((t) =>
      interactionFacetsByType[t]?.channels.forEach((c) => allowed.add(c)),
    );
    return CHANNEL_OPTIONS.filter((c) => allowed.has(c));
  };
  const categoryIdsForType = (types: string[]): Set<string> => {
    const allowed = new Set<string>();
    types.forEach((t) =>
      interactionFacetsByType[t]?.categoryIds.forEach((id) => allowed.add(id)),
    );
    return allowed;
  };
  const channelOptionsForType =
    intTypes.length > 0 ? channelsForType(intTypes) : CHANNEL_OPTIONS;
  const categoryOptionsForType =
    intTypes.length > 0
      ? CATEGORY_OPTIONS.filter((c) => categoryIdsForType(intTypes).has(c.id))
      : CATEGORY_OPTIONS;

  // Interactions-tab Agent type change: clamp the Interactions agents, channels,
  // and categories to values that still occur for the newly selected type(s).
  const handleIntAgentTypeChange = useCallback((next: string[]) => {
    setIntTypes(next);
    setIntAgentIds((prev) =>
      next.length === 0
        ? prev
        : prev.filter((id) => {
            const opt = agentFilterOptions.find((o) => o.value === id);
            return opt ? next.includes(opt.agentType) : false;
          }),
    );
    setIntChannels((prev) => {
      if (next.length === 0) return prev;
      const allowed = channelsForType(next);
      return prev.filter((c) => allowed.includes(c));
    });
    setIntCategories((prev) => {
      if (next.length === 0) return prev;
      const allowed = categoryIdsForType(next);
      return prev.filter((id) => allowed.has(id));
    });
  }, []);

  // Agents-tab Agent type change (only shown when the aiAgentsInAgentsTab flag is
  // on): clamp the Agents-tab State selection to the states valid for the new type.
  const handleAgentsAgentTypeChange = useCallback((next: string[]) => {
    setAgentsTypes(next);
    const derived: "All" | "Air" | "Human" =
      next.length === 1 ? (next[0] as "Air" | "Human") : "All";
    const validStates = agentStateOptions[derived] ?? [];
    setAgentsStates((prev) => prev.filter((s) => validStates.includes(s)));
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(agentColumnMeta.map((c) => [c.id, true])),
  );
  const [visibleInteractionCols, setVisibleInteractionCols] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(interactionColumnMeta.map((c) => [c.id, true])));
  const [colOrder, setColOrder] = useState<string[]>(() =>
    agentColumnMeta.map((c) => c.id),
  );
  const [draftCols, setDraftCols] = useState<Record<string, boolean>>(
    visibleCols,
  );
  const [draftOrder, setDraftOrder] = useState<string[]>(colOrder);
  const [dragId, setDragId] = useState<string | null>(null);

  const lockedColId = isInteractions ? "sourceName" : "fullName";
  const activeVisibleCols = isInteractions ? visibleInteractionCols : visibleCols;

  const colLabelById = Object.fromEntries(
    agentColumnMeta.map((c) => [c.id, c.label]),
  );

  const openSettings = (open: boolean) => {
    if (open) {
      setDraftCols(activeVisibleCols);
      setDraftOrder(colOrder);
    }
    setSettingsOpen(open);
  };

  // Reorders draftOrder by moving fromId to the slot occupied by toId. The locked
  // Agent (fullName) column stays pinned first and cannot be dragged or displaced.
  const moveColumn = (fromId: string, toId: string) => {
    if (fromId === toId || fromId === "fullName" || toId === "fullName") return;
    setDraftOrder((prev) => {
      const next = [...prev];
      const from = next.indexOf(fromId);
      const to = next.indexOf(toId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, fromId);
      return next;
    });
  };

  // Order matters: columns render in the saved drag order, Agent column first.
  const visibleColumnIds = colOrder.filter(
    (id) => id === "fullName" || visibleCols[id],
  );
  const visibleInteractionColumnIds = interactionColumnMeta
    .filter((c) => c.id === "sourceName" || visibleInteractionCols[c.id])
    .map((c) => c.id);

  // The settings dialog lists agent columns in their draggable saved order and
  // interaction columns in their fixed order (drag-reorder is agent-only).
  const dialogColumnOrder = isInteractions
    ? interactionColumnMeta.map((c) => c.id)
    : draftOrder;
  const dialogLabelById = isInteractions
    ? Object.fromEntries(interactionColumnMeta.map((c) => [c.id, c.label]))
    : colLabelById;
  const dragEnabled = !isInteractions;

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-white">
      <header className="flex h-14 w-full shrink-0 items-center border-b border-[#0000001f] bg-white">
        <div className="relative flex h-full w-full items-center bg-[url('/figmaAssets/appbar-bg.svg')] bg-cover bg-center px-4 pl-5">
          <div className="flex items-center gap-4">
            <button type="button" className="relative">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white">
                <img
                  className="h-full w-full object-cover"
                  alt="Image"
                  src="/figmaAssets/image-1-1.png"
                />
              </div>
              <img
                className="absolute bottom-0 right-0 h-3.5 w-3.5"
                alt="Presence"
                src="/figmaAssets/presence.svg"
              />
            </button>
            <h1 className="font-headline-2 text-[length:var(--headline-2-font-size)] font-[number:var(--headline-2-font-weight)] leading-[var(--headline-2-line-height)] tracking-[var(--headline-2-letter-spacing)] text-headertext [font-style:var(--headline-2-font-style)]">
              RingCentral, Inc.
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 w-8 rounded-full bg-[#ffffff29] p-0 hover:bg-[#ffffff40]"
              >
                <img
                  className="h-4 w-4"
                  alt="Icon chevron left"
                  src="/figmaAssets/icon-chevron-left.svg"
                />
              </Button>
              <Button
                variant="ghost"
                className="h-8 w-8 rounded-full bg-[#ffffff14] p-0 hover:bg-[#ffffff29]"
              >
                <img
                  className="h-4 w-4"
                  alt="Icon chevron right"
                  src="/figmaAssets/icon-chevron-right.svg"
                />
              </Button>
            </div>
          </div>
          <div className="flex flex-1 px-2 pl-3 pr-3">
            <div className="relative w-full max-w-[468px]">
              <div className="pointer-events-none absolute inset-0 rounded-full bg-[#ffffff29]" />
              <div className="relative flex h-8 items-center gap-2 px-3">
                <img
                  className="h-4 w-4"
                  alt="Icon search nav"
                  src="/figmaAssets/icon-search-nav.svg"
                />
                <span className="font-button text-[length:var(--button-font-size)] font-[number:var(--button-font-weight)] leading-[var(--button-line-height)] tracking-[var(--button-letter-spacing)] text-headertexthint [font-style:var(--button-font-style)]">
                  Search
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 w-[164px] items-center gap-1 rounded-2xl bg-white px-3"
            >
              <img
                className="h-3.5 w-3.5"
                alt="Presence"
                src="/figmaAssets/presence.svg"
              />
              <img
                className="h-4 w-4"
                alt="Icon engage border"
                src="/figmaAssets/icon-engage-border.svg"
              />
              <div className="flex flex-1 items-center justify-between gap-1">
                <span className="font-caption-1 text-[length:var(--caption-1-font-size)] font-[number:var(--caption-1-font-weight)] leading-[var(--caption-1-line-height)] tracking-[var(--caption-1-letter-spacing)] text-[#121212] [font-style:var(--caption-1-font-style)]">
                  Available
                </span>
                <span className="whitespace-nowrap font-caption-1 text-[length:var(--caption-1-font-size)] font-[number:var(--caption-1-font-weight)] leading-[var(--caption-1-line-height)] tracking-[var(--caption-1-letter-spacing)] text-[#121212] [font-style:var(--caption-1-font-style)]">
                  21:01
                </span>
              </div>
              <img
                className="h-4 w-4"
                alt="Icon arrow down"
                src="/figmaAssets/icon-arrow-down.svg"
              />
            </button>
            <Button
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white p-0 shadow-none hover:bg-white"
            >
              <img
                className="h-4 w-4"
                alt="Icon dialer s"
                src="/figmaAssets/icon-dialer-s.svg"
              />
            </Button>
            <Button
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white p-0 shadow-none hover:bg-white"
            >
              <img
                className="h-4 w-4"
                alt="Icon call add"
                src="/figmaAssets/icon-call-add.svg"
              />
            </Button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-20 shrink-0 flex-col justify-between border-r border-neutral-200 bg-navb-02 py-4">
          <nav className="flex flex-col">
            {sidePrimaryNav.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`relative flex min-h-10 w-20 flex-col items-center justify-center px-0 py-[5px] ${
                  item.active ? "bg-[#066fac1f]" : ""
                }`}
              >
                <img className="relative" alt={item.label} src={item.icon} />
                <span
                  className={`mt-0.5 flex h-4 items-center justify-center self-stretch text-center font-caption-2 text-[length:var(--caption-2-font-size)] font-[number:var(--caption-2-font-weight)] leading-[var(--caption-2-line-height)] tracking-[var(--caption-2-letter-spacing)] [font-style:var(--caption-2-font-style)] ${
                    item.active ? "text-[#066fac]" : "text-[#121212]"
                  }`}
                >
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="absolute right-[22px] top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-[#ff8800] font-caption-1 text-[length:var(--caption-1-font-size)] font-[number:var(--caption-1-font-weight)] leading-[var(--caption-1-line-height)] tracking-[var(--caption-1-letter-spacing)] text-white [font-style:var(--caption-1-font-style)]">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <nav className="flex flex-col">
            {sideSecondaryNav.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex min-h-10 w-20 flex-col items-center justify-center px-0 py-[5px]"
              >
                <img className="relative" alt={item.label} src={item.icon} />
                <span
                  className={`mt-0.5 flex h-4 items-center justify-center self-stretch text-center ${
                    item.label === "Help"
                      ? "[font-family:'Lato',Helvetica] text-xs font-bold leading-4 tracking-[0]"
                      : "font-caption-2 text-[length:var(--caption-2-font-size)] font-[number:var(--caption-2-font-weight)] leading-[var(--caption-2-line-height)] tracking-[var(--caption-2-letter-spacing)] [font-style:var(--caption-2-font-style)]"
                  } text-[#121212]`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-neutral-200 bg-white">
            <div className="flex h-[60px] items-center px-3 py-0.5">
              <div className="flex flex-1 items-center gap-2 pr-3">
                <span className="font-descriptor-mini text-[length:var(--descriptor-mini-font-size)] font-[number:var(--descriptor-mini-font-weight)] leading-[var(--descriptor-mini-line-height)] tracking-[var(--descriptor-mini-letter-spacing)] text-neutralf-06 [font-style:var(--descriptor-mini-font-style)]">
                  RingCX Agent
                </span>
              </div>
              <Button
                variant="ghost"
                className="h-8 rounded-2xl px-3 shadow-none hover:bg-[#66666614]"
              >
                <img
                  className="mr-1 h-4 w-4"
                  alt="Icon"
                  src="/figmaAssets/--icon.svg"
                />
                <span className="font-descriptor-mini text-[length:var(--descriptor-mini-font-size)] font-[number:var(--descriptor-mini-font-weight)] leading-[var(--descriptor-mini-line-height)] tracking-[var(--descriptor-mini-letter-spacing)] text-[#666666] [font-style:var(--descriptor-mini-font-style)]">
                  Session info
                </span>
              </Button>
              <Separator
                orientation="vertical"
                className="ml-3 mr-2 h-4 bg-neutral-200"
              />
              <Button variant="ghost" className="h-8 w-8 p-0 shadow-none">
                <img
                  className="h-4 w-4"
                  alt="Icon help border"
                  src="/figmaAssets/icon-help-border.svg"
                />
              </Button>
            </div>
            <Tabs defaultValue="Supervisor" className="w-full">
              <TabsList className="h-auto justify-start rounded-none border-0 bg-transparent p-0">
                {topTabs.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-none border-b-2 border-transparent px-3 py-1.5 font-descriptor-mini text-[length:var(--descriptor-mini-font-size)] font-[number:var(--descriptor-mini-font-weight)] leading-[var(--descriptor-mini-line-height)] tracking-[var(--descriptor-mini-letter-spacing)] text-[#121212] shadow-none ring-offset-0 [font-style:var(--descriptor-mini-font-style)] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-[#066fac] data-[state=active]:bg-transparent data-[state=active]:text-[#066fac] data-[state=active]:shadow-none"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="relative flex shrink-0 items-center border-b border-[#0000001a] px-5 py-3">
            <h2 className="shrink-0 font-subtitle-mini text-[15px] font-semibold leading-[var(--subtitle-mini-line-height)] text-[#121212]">
              Supervisor
            </h2>
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-auto"
              >
                <TabsList className="h-10 items-stretch gap-0 rounded-[4px] bg-[#f9f9f9] p-1">
                  {supervisorFilters.map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="h-full w-[148px] rounded-[4px] px-6 font-['Roboto',sans-serif] text-[14px] tracking-[0.15px] text-[#212121] shadow-none ring-offset-0 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:text-[#212121] data-[state=active]:shadow-[0px_2px_3px_0px_rgba(173,173,173,0.2)] data-[state=inactive]:bg-transparent data-[state=inactive]:font-normal data-[state=inactive]:text-[#212121]"
                      data-testid={`tab-supervisor-${tab.toLowerCase()}`}
                    >
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative w-[500px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a1a1a1]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-[4px] border-[#e0e0e0] pl-11 pr-[96px] font-['Roboto',sans-serif] text-[14px] tracking-[0.25px] text-[#212121] placeholder:text-[#a1a1a1]"
                  placeholder={
                    isInteractions ? "Search interactions" : "Search agents"
                  }
                  data-testid="input-search"
                />
                <button
                  type="button"
                  onClick={() => setFiltersOpen((o) => !o)}
                  aria-pressed={filtersOpen}
                  className={`absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 font-['Roboto',sans-serif] text-[14px] font-medium tracking-[0.15px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:underline ${filtersOpen ? "text-[#066fac]" : "text-[#666666]"}`}
                  data-testid="button-filters"
                >
                  <ListFilter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>
            <Button
              variant="ghost"
              aria-label="Table settings"
              onClick={() => openSettings(true)}
              className="ml-auto h-10 w-10 rounded-full p-0 text-[#666666] shadow-none hover:bg-[#66666614]"
              data-testid="button-settings"
            >
              <SettingsIcon className="h-6 w-6" />
            </Button>
          </div>
          {filtersOpen && (
            <div
              className="flex shrink-0 items-center gap-3 border-b border-[#0000001a] bg-white px-5 py-3"
              data-testid="filter-row"
            >
              {/* Agents tab: Channel + State dropdowns. CXAIR Phase 1 hides the
                  Agent type dropdown (every row is a Human agent, so it's a no-op);
                  the aiAgentsInAgentsTab flag restores it. State options track the
                  selected Agent type when the type dropdown is shown. */}
              {!isInteractions && (
                <div className="contents" data-testid="select-channel">
                  <Filter
                    disabled={false}
                    ariaLabel="Filter by channel"
                    closedPlaceholder="All channels"
                    openPlaceholder="All channels"
                    selectedFilters={agentsChannels}
                    allItems={toFilterItemsFromStrings(CHANNEL_OPTIONS)}
                    onChange={setAgentsChannels}
                  />
                  {isCxairPhase1FeatureEnabled("aiAgentsInAgentsTab") && (
                    <span className="contents" data-testid="select-agent-type">
                      <Filter
                        disabled={false}
                        ariaLabel="Filter by agent type"
                        closedPlaceholder="All agent types"
                        openPlaceholder="All agent types"
                        selectedFilters={agentsTypes}
                        allItems={toFilterItems(agentsTabTypeOptions)}
                        onChange={handleAgentsAgentTypeChange}
                      />
                    </span>
                  )}
                  <span className="contents" data-testid="select-state">
                    <Filter
                      disabled={false}
                      ariaLabel="Filter by state"
                      closedPlaceholder="All states"
                      openPlaceholder="All states"
                      selectedFilters={agentsStates}
                      allItems={toFilterItemsFromStrings(stateOptionsForType)}
                      onChange={setAgentsStates}
                    />
                  </span>
                </div>
              )}
              {/* Interactions tab: Agent type leads so it can drive the "All
                  agents" picker (choosing a type narrows the agents list), then
                  All agents, All channels, All categories. */}
              {isInteractions && (
                <div className="contents">
                  <span className="contents" data-testid="select-agent-type">
                    <Filter
                      disabled={false}
                      ariaLabel="Filter by agent type"
                      closedPlaceholder="All agent types"
                      openPlaceholder="All agent types"
                      selectedFilters={intTypes}
                      allItems={toFilterItems(AGENT_TYPE_OPTIONS)}
                      onChange={handleIntAgentTypeChange}
                    />
                  </span>
                  <span className="contents" data-testid="select-agent">
                    <Filter
                      disabled={false}
                      ariaLabel="Filter by agent"
                      closedPlaceholder="All agents"
                      openPlaceholder="All agents"
                      selectedFilters={intAgentIds}
                      allItems={toFilterItems(agentOptionsForType)}
                      onChange={setIntAgentIds}
                    />
                  </span>
                  <span className="contents" data-testid="select-channel">
                    <Filter
                      disabled={false}
                      ariaLabel="Filter by channel"
                      closedPlaceholder="All channels"
                      openPlaceholder="All channels"
                      selectedFilters={intChannels}
                      allItems={toFilterItemsFromStrings(channelOptionsForType)}
                      onChange={setIntChannels}
                    />
                  </span>
                  <span className="contents" data-testid="select-category">
                    <Filter
                      disabled={false}
                      ariaLabel="Filter by category"
                      closedPlaceholder="All categories"
                      openPlaceholder="All categories"
                      selectedFilters={intCategories}
                      allItems={categoryOptionsForType.map((c) => ({
                        id: c.id,
                        displayName: c.label,
                      }))}
                      onChange={setIntCategories}
                    />
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <AgentTablePanel
              activeTab={activeTab}
              searchValue={searchQuery}
              selectedStates={activeStates}
              selectedChannels={activeChannels}
              agentTypeFilter={agentTypeFilter}
              visibleColumnIds={visibleColumnIds}
              selectedAgentIds={activeAgentIds}
              selectedCategories={activeCategories}
              visibleInteractionColumnIds={visibleInteractionColumnIds}
              onActiveInteractionsClick={handleActiveInteractionsClick}
              highlightAgentId={highlightAgentId}
              highlightNonce={highlightNonce}
            />
          </div>

          <Dialog open={settingsOpen} onOpenChange={openSettings}>
            <DialogContent
              className="max-w-3xl gap-0 p-0"
              data-testid="dialog-settings"
            >
              <DialogHeader className="px-8 pt-7">
                <DialogTitle
                  className="text-2xl font-semibold"
                  style={{ color: RC_BLUE }}
                >
                  {isInteractions
                    ? "Interactions table settings"
                    : "Agent table settings"}
                </DialogTitle>
              </DialogHeader>
              <div className="px-8 pb-2 pt-4">
                <p className="mb-5 text-[15px] text-[#121212]">
                  For more information visit{" "}
                  <a
                    href="https://support.ringcentral.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: RC_BLUE }}
                    data-testid="link-support"
                  >
                    RingCentral Support
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </p>
                {!isInteractions && (
                  <p className="mb-3 text-[13px] text-[#666666]">
                    Drag the handle to reorder columns. Changes apply to the
                    table when you save.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {dialogColumnOrder.map((colId) => {
                    const locked = colId === lockedColId;
                    const checked = locked ? true : !!draftCols[colId];
                    const dragging = dragId === colId;
                    return (
                      <label
                        key={colId}
                        htmlFor={`col-${colId}`}
                        draggable={dragEnabled && !locked}
                        onDragStart={() => {
                          if (dragEnabled && !locked) setDragId(colId);
                        }}
                        onDragOver={(e) => {
                          if (dragEnabled && !locked && dragId) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragId) moveColumn(dragId, colId);
                          setDragId(null);
                        }}
                        onDragEnd={() => setDragId(null)}
                        className={`flex items-center justify-between gap-2 rounded-md bg-[#f4f5f7] px-3 py-2.5 text-[15px] transition-opacity ${
                          locked
                            ? "cursor-default text-[#9aa0a6]"
                            : "cursor-pointer text-[#121212]"
                        } ${dragging ? "opacity-40 ring-2 ring-[#066fac]" : ""}`}
                        data-testid={`col-row-${colId}`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Checkbox
                            id={`col-${colId}`}
                            checked={checked}
                            disabled={locked}
                            onCheckedChange={(value) =>
                              setDraftCols((prev) => ({
                                ...prev,
                                [colId]: value === true,
                              }))
                            }
                            className={`h-5 w-5 rounded border-[#c4c8cd] disabled:opacity-100 ${
                              locked
                                ? "data-[state=checked]:border-[#aeb3ba] data-[state=checked]:bg-[#aeb3ba]"
                                : "data-[state=checked]:border-[#066fac] data-[state=checked]:bg-[#066fac]"
                            }`}
                            data-testid={`checkbox-col-${colId}`}
                          />
                          <span className="truncate">
                            {dialogLabelById[colId]}
                          </span>
                        </span>
                        {dragEnabled && (
                          <DragHandleIcon
                            className={`h-4 w-4 shrink-0 text-[#9aa0a6] ${
                              locked ? "" : "cursor-grab active:cursor-grabbing"
                            }`}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="px-8 pb-7 pt-6 sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => openSettings(false)}
                  className="font-semibold hover:bg-transparent"
                  style={{ color: RC_BLUE }}
                  data-testid="button-settings-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (isInteractions) {
                      setVisibleInteractionCols(draftCols);
                    } else {
                      setVisibleCols(draftCols);
                      setColOrder(draftOrder);
                    }
                    setSettingsOpen(false);
                  }}
                  className="font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: RC_BLUE }}
                  data-testid="button-settings-save"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
};
