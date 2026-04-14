import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/app/components/EventForm';

export default async function NewEventPage({ params }) {
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

  // Only organisers may post events
  if (campaign.organiser_id !== user.id) redirect(`/c/${slug}/events`);

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('name');

  const { data: territories } = await supabase
    .from('territories')
    .select('id, name, type, depth')
    .eq('campaign_id', campaign.id)
    .order('sort_order', { ascending: true });

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Campaign Events · {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Post New Event
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.75rem', maxWidth: '540px', lineHeight: 1.6 }}>
          Events are narrative dispatches from the organiser — announcements, rule changes, special missions, or story developments that shape the campaign.
        </p>
      </div>

      <EventForm campaign={campaign} factions={factions ?? []} territories={territories ?? []} userId={user.id} />
    </div>
  );
}
