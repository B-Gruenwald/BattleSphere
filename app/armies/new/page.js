import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ArmyCreateClient from './ArmyCreateClient';

export default async function NewArmyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <ArmyCreateClient />;
}
