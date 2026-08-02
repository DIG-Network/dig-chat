import { FormattedMessage } from 'react-intl';

import { ExportSection } from './ExportSection';
import { HistoryDangerZone } from './HistoryDangerZone';
import { ImportSection } from './ImportSection';
import { RetentionSection } from './RetentionSection';

/**
 * The history settings surface: export, import, automatic clean-up, and delete.
 *
 * This is only composition — each concern is its own small, single-purpose section that owns its state
 * and its four async states. Keeping them apart is what keeps any one of them readable in isolation and
 * keeps this file a table of contents rather than a God-component.
 */
export function HistorySettingsScreen(): JSX.Element {
  return (
    <section className="screen" aria-labelledby="settings-heading">
      <h1 id="settings-heading">
        <FormattedMessage id="settings.heading" />
      </h1>
      <ExportSection />
      <ImportSection />
      <RetentionSection />
      <HistoryDangerZone />
    </section>
  );
}
