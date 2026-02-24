// Redirect helper that forwards /register to the premium auth hub.
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=register');
  }, [router]);

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Account"
        title="Redirecting"
        description="Taking you to the premium sign-in and registration experience."
      />
      <Card elevated className="mt-6 text-sm text-tableBrown/85">
        If you are not redirected automatically, open <code>/login?mode=register</code>.
      </Card>
    </div>
  );
}
