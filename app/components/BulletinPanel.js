// Server component — fetches the current dispatch and renders the bulletin panel.
// The interactive footer (open drawer button) is handled by BulletinDrawer (client).

import { createClient } from '@/lib/supabase/server';
import BulletinDrawer from './BulletinDrawer';

export default async function BulletinPanel({ campaignId, campaignSlug, isOrganiser, factions, territories }) {
  const supabase = await createClient();

  // Current dispatch
  const { data: currentDispatch } = await supabase
    .from('bulletin_dispatches')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_current', true)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Previous dispatches (for accordion)
  const { data: previousDispatches } = await supabase
    .from('bulletin_dispatches')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_current', false)
    .order('issued_at', { ascending: false });

  // Build name→id maps for territory/faction link rendering
  const territoryMap = Object.fromEntries(
    (territories || []).map(t => [t.name, t.id])
  );
  const factionMap = Object.fromEntries(
    (factions || []).map(f => [f.name, f.id])
  );

  const hasDispatch = !!currentDispatch;

  return (
    <div className="bulletin-panel">

      {/* ── Fixed top band: act label + dispatch title ── */}
      <div className="bulletin-top">
        {hasDispatch ? (
          <>
            <p className="bulletin-act-label">
              {currentDispatch.act_label}
              {currentDispatch.dispatch_number
                ? ` · Dispatch No. ${currentDispatch.dispatch_number}`
                : ''}
            </p>
            <h2 className="bulletin-title">{currentDispatch.title}</h2>
          </>
        ) : (
          <>
            <p className="bulletin-act-label">Campaign Bulletin</p>
            <h2 className="bulletin-title" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '400' }}>
              No dispatch posted yet
            </h2>
          </>
        )}
      </div>

      {/* ── Scrollable (overflow hidden) body text with gradient fade ── */}
      <div className="bulletin-scroll">
        {hasDispatch && currentDispatch.body ? (
          <div className="bulletin-prose">
            {currentDispatch.body.split('\n').map((line, i) =>
              line.trim()
                ? <p key={i}>{line}</p>
                : <br key={i} />
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', padding: '1rem 0' }}>
            {isOrganiser
              ? 'Use "Post first dispatch →" below to publish your first Campaign Bulletin.'
              : 'The campaign chronicle awaits its first entry.'}
          </p>
        )}
        {/* Gradient fade — overlaps the bottom of the text */}
        <div className="bulletin-fade" />
      </div>

      {/* ── Client component handles the footer button + slide-in drawer ── */}
      <BulletinDrawer
        currentDispatch={currentDispatch ?? null}
        previousDispatches={previousDispatches ?? []}
        isOrganiser={!!isOrganiser}
        campaignSlug={campaignSlug}
        campaignId={campaignId}
        territoryMap={territoryMap}
        factionMap={factionMap}
      />
    </div>
  );
}
