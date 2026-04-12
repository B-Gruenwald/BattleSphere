import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NotificationPreferencesForm from './NotificationPreferencesForm';

export const metadata = {
  title: 'Notification Preferences · BattleSphere',
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/profile/notifications');

  // Fetch profile + campaign memberships with campaign names
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1);

  const profile = profileRows?.[0] ?? null;

  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('user_id', user.id);

  const campaignIds = (memberships || []).map(m => m.campaign_id);
  const { data: campaigns } = campaignIds.length > 0
    ? await supabase.from('campaigns').select('*').in('id', campaignIds)
    : { data: [] };

  // Merge campaign names into memberships
  const campaignMap = Object.fromEntries((campaigns || []).map(c => [c.id, c]));
  const membershipsWithCampaigns = (memberships || []).map(m => ({
    ...m,
    campaign: campaignMap[m.campaign_id] ?? null,
  })).filter(m => m.campaign); // exclude orphaned rows

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '620px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          marginBottom: '0.5rem',
        }}>
          Account
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.06em' }}>
          Notification Preferences
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginTop: '0.75rem' }}>
          Choose what BattleSphere sends you and how often. You can change these at any time.
        </p>
      </div>

      <NotificationPreferencesForm
        profile={profile}
        memberships={membershipsWithCampaigns}
      />
    </div>
  );
}
