import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import ArmyEditClient from './ArmyEditClient';

export default async function ArmyEditPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', id)
    .limit(1);
  const army = armyRows?.[0] ?? null;
  if (!army) notFound();

  // Only owner may edit
  if (army.player_id !== user.id) notFound();

  // Fetch units
  const { data: units } = await admin
    .from('army_units')
    .select('*')
    .eq('army_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Fetch all unit photos in one query
  const unitIds = (units || []).map(u => u.id);
  const { data: allPhotos } = unitIds.length > 0
    ? await admin
        .from('army_unit_photos')
        .select('*')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  // Attach photos to each unit
  const photosByUnit = {};
  for (const photo of allPhotos || []) {
    if (!photosByUnit[photo.unit_id]) photosByUnit[photo.unit_id] = [];
    photosByUnit[photo.unit_id].push(photo);
  }
  const unitsWithPhotos = (units || []).map(u => ({
    ...u,
    photos: photosByUnit[u.id] || [],
  }));

  return (
    <ArmyEditClient
      army={army}
      initialUnits={unitsWithPhotos}
      userId={user.id}
    />
  );
}
