import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRole, canAccessSection } from '@/lib/auth/roles';
import ImportationAdmin from "@/components/admin/ImportationAdmin";

export default async function ImportationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  const role = await getUserRole(user.id);
  if (!canAccessSection(role, 'importation')) redirect('/dashboard');

  return (
    <div className="p-6 pt-16 lg:pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Importation Waitlist</h1>
        <p className="text-white/60 mt-1">
          Review and approve retailer applications to connect with Chinese suppliers.
        </p>
      </div>
      <ImportationAdmin />
    </div>
  );
}
