/* PROTOTYPE STUB — replaces the real i18n loader (no @ringcx/shared, no language
 * JSON files). `translate(key, opts)` humanizes the last key segment so the
 * vendored components render readable labels. */
import i18next from 'i18next';
import { Trans } from 'react-i18next';

const humanize = (key: string, opts?: { count?: number }): string => {
  if (!key) return '';
  let last = key.split('.').pop() || key;
  last = last.replace(/_plural$/i, '');
  let s = last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  if (opts && typeof opts.count === 'number') {
    s = `${opts.count} ${s}`;
  }
  return s;
};

// Real product copy for the few user-facing keys whose humanized key name would
// otherwise leak into the UI (e.g. "No Agents Msg"). Everything else falls back
// to the humanized last key segment.
const OVERRIDES: Record<string, string> = {
  'DASHBOARD.AGENTS.GRID.NO_AGENTS_MSG': 'No agents to display',
  'DASHBOARD.AGENTS.GRID.NO_MATCH_FOUND': 'No results match your filters',
  'CHAT.NO_CHATS.NO_INTERACTION_DG': 'No interactions to display',
};

const translate = (key: string, opts?: { count?: number }): string =>
  OVERRIDES[key] ?? humanize(key, opts);

export default translate;
export { Trans, i18next, };
export const userLocale = 'en';
