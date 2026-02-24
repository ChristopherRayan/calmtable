// About page describing CalmTable identity, atmosphere, and service philosophy.
'use client';

import { useEffect, useState } from 'react';

import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings } from '@/lib/services';
import type { FrontendContentPayload } from '@/lib/types';

export default function AboutPage() {
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

  const aboutContent = settings.about;

  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="About Us"
        title="The CalmTable Experience"
        description={aboutContent.description}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {aboutContent.cards.slice(0, 3).map((card) => (
          <Card key={card.title} elevated>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{card.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/85">{card.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
