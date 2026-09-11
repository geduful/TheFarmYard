'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = data?.role;
      if (role === 'admin') router.replace('/dashboard/admin');
      else if (role === 'buyer') router.replace('/dashboard/buyer');
      else router.replace('/dashboard/farmer');
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-farm-green/30 border-t-farm-green rounded-full animate-spin" />
    </div>
  );
}
