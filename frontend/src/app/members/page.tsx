// Members page outlining CalmTable membership benefits and loyalty access.
'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings, fetchPublicMembers } from '@/lib/services';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import type { FrontendContentPayload, MembersResponseItem } from '@/lib/types';

export default function MembersPage() {
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);
  const [staffMembers, setStaffMembers] = useState<MembersResponseItem[]>([]);

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

  useEffect(() => {
    let active = true;
    async function loadMembers() {
      try {
        const data = await fetchPublicMembers();
        if (active) {
          setStaffMembers(data);
        }
      } catch (_error) {
        if (active) {
          setStaffMembers([]);
        }
      }
    }

    void loadMembers();
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

      <div className="mt-12">
        <SectionHeading
          eyebrow="Team"
          title="Meet Our Staff"
          description="Managed directly from admin and displayed publicly when enabled."
        />
      </div>

      {staffMembers.length === 0 ? (
        <Card elevated className="mt-6 text-center text-sm text-tableBrown/80">
          Staff profiles will appear here once published by admin.
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((member) => {
            const imageSrc = normalizeImageSource(member.photo ?? '');
            const initials = member.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('');
            return (
              <Card key={member.id} elevated className="border border-woodAccent/25 bg-warmGray/90">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-woodAccent/40 bg-cream">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized={shouldSkipImageOptimization(imageSrc)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-tableBrown">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tableBrown">{member.name}</p>
                    <p className="text-xs uppercase tracking-[0.08em] text-muted">{member.role}</p>
                  </div>
                </div>
                {member.bio ? <p className="mt-3 text-sm text-ink/80">{member.bio}</p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
