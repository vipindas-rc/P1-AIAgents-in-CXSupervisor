import { ThemeProvider } from "styled-components";
import { RcThemeProvider } from "@ringcentral/juno";
import { theme } from "@ringcx/ui";

import { Filter } from "./eag/components/Filter/Filter";
import type { FilterType } from "./eag/components/Filter/types";

// The production RingCX Filter wraps @ringcx/ui's MultiSelect, whose styled
// components read `theme.colors.*` from the styled-components ThemeProvider (and
// the juno RcThemeProvider). The page layer renders this filter outside the
// AgentTablePanel that normally supplies those providers, so wrap it here — the
// wrapper lives in proto/ so all @ringcx/ui + theme imports stay out of the
// typechecked page layer (proto/ is tsc-excluded and runtime-aliased).
export function SupervisorFilter(props: FilterType) {
  return (
    <RcThemeProvider>
      <ThemeProvider theme={theme as any}>
        <Filter {...props} />
      </ThemeProvider>
    </RcThemeProvider>
  );
}
