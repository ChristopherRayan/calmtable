// Members page outlining CalmTable membership benefits and loyalty access.
'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings } from '@/lib/services';
import type { FrontendContentPayload } from '@/lib/types';

export default function MembersPage() {
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const data = await fetchFrontendSettings();
        if (active) {
          setSettings(data);
        }
      } catch (_error) {
        // Keep fallback content.
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const membersContent = settings.members;

  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Members"
        title="CalmTable Member Lounge"
        description={membersContent.description}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {membersContent.benefits.map((benefit) => (
          <Card key={benefit.title} elevated className="border border-woodAccent/25 bg-warmGray/90">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{benefit.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/85">{benefit.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
