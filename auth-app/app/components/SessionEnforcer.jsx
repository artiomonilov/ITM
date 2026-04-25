'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';

export default function SessionEnforcer() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.suspended) {
      signOut({ callbackUrl: '/login?error=rejected' });
    }
  }, [session, status]);

  return null;
}
