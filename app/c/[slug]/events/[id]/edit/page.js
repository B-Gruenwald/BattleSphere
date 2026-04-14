import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/app/components/EventForm';

export default async function EditEventPage({ params }) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();
  if (!campaign) notFound();

  // Only organisers may edit events
  if (campaign.organiser_id !== user.id) redirect(`/c/${slug}/events/${id}`);

  const { data: ev } = await supabase
    .from('campaign_events')
    .select('*')
    .eq('id', id)
    .eq('campaign_id', campaign.id)
    .single();
  if (!ev) notFound();

  const { data: factions } = await supabase
    .from('factions')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('name');

  const { data: territories } = await supabase
    .from('territories')
    .select('id, name, type, depth, parent_id')
    .eq('campaign_id', campaign.id)
    .order('depth')
    .order('name');

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '900px', margin: '0 auto' }}>

      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.5rem' }}>
          Campaign Events · {campaign.name}
        </p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '900', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Edit Event
        </h1>
      </div>

      <EventForm campaign={campaign} factions={factions ?? []} territories={territories ?? []} existingEvent={ev} />
    </div>
  );
}
