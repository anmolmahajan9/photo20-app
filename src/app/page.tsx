
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  useEffect(() => {
    redirect('/home');
  }, []);

  // Return null or a loading spinner while the redirect is happening
  return null;
}
