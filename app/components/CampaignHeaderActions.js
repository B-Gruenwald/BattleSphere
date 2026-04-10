'use client';

import Link from 'next/link';
import ChooseFactionButton from './ChooseFactionButton';

// Renders the campaign dashboard header buttons.
// On desktop they sit inline with the campaign title.
// On mobile the parent container's flexWrap:wrap naturally drops them
// to a new row below the title — no hamburger needed here.
export default function CampaignHeaderActions({
  campaignId,
  campaignSlug,
  publicSlug,
  factions,
  showFactionChooser,
  currentFactionId,
  isOrganiser,
}) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {showFactionChooser && (
        <ChooseFactionButton
          campaignId={campaignId}
          factions={factions}
          currentFactionId={currentFactionId}
        />
      )}
      <Link href={`/campaign/${publicSlug}`} target="_blank" style={{ textDecoration: 'none' }}>
        <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.6rem' }}>
          Share Public Page ↗
        </button>
      </Link>
      {isOrganiser && (
        <Link href={`/c/${campaignSlug}/admin`}>
          <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Admin</button>
        </Link>
      )}
    </div>
  );
}
