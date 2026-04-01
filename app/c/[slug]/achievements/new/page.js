import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AchievementForm from '@/app/components/AchievementForm';

export default async function NewAchievementPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();
  if (!campaign) notFound();

  // Organisers only
  if (campaign.organiser_id !== user.id) redirect(`/c/${slug}/achievements`);

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('name');

  const { data: members } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaign.id);

  const memberIds = (members || []).map(m => m.user_id);
  const { data: memberProfiles } = memberIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', memberIds).order('username')
    : { data: [] };

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Achievements · {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Award Achievement
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.75rem', maxWidth: '540px', lineHeight: 1.6 }}>
          Recognise outstanding play, memorable moments, or campaign milestones. Choose from the preset list or create a bespoke honour.
        </p>
      </div>

      <AchievementForm
        campaign={campaign}
        factions={factions ?? []}
        members={members ?? []}
        memberProfiles={memberProfiles ?? []}
      />
    </div>
  );
}
