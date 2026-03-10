// Members page — premium member benefits and sleek staff team section.
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Crown, Zap, Gift, Clock, ChefHat, Briefcase, Coffee, Shield, Truck, Star } from 'lucide-react';

import { SectionHeading } from '@/components/section-heading';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings, fetchPublicMembers } from '@/lib/services';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import type { FrontendContentPayload, MembersResponseItem } from '@/lib/types';

const benefitIcons = [Crown, Zap, Gift, Clock];

const roleIconMap: Record<string, typeof ChefHat> = {
  chef: ChefHat,
  manager: Briefcase,
  waiter: Coffee,
  waitress: Coffee,
  cashier: Star,
  cleaner: Shield,
  security: Shield,
  delivery: Truck,
  other: Star,
};

const roleColorMap: Record<string, { badge: string; glow: string }> = {
  chef: { badge: 'from-orange-600/80 to-amber-500/80', glow: 'shadow-orange-500/20' },
  manager: { badge: 'from-violet-600/80 to-purple-500/80', glow: 'shadow-purple-500/20' },
  waiter: { badge: 'from-emerald-600/80 to-teal-500/80', glow: 'shadow-emerald-500/20' },
  cashier: { badge: 'from-sky-600/80 to-blue-500/80', glow: 'shadow-sky-500/20' },
  security: { badge: 'from-red-600/80 to-rose-500/80', glow: 'shadow-red-500/20' },
  delivery: { badge: 'from-lime-600/80 to-green-500/80', glow: 'shadow-lime-500/20' },
  other: { badge: 'from-gray-600/80 to-gray-500/80', glow: 'shadow-gray-500/20' },
};

function getRoleStyle(role: string) {
  const key = role.toLowerCase().split(' ')[0];
  return roleColorMap[key] ?? roleColorMap.other;
}

function getRoleIcon(role: string) {
  const key = role.toLowerCase().split(' ')[0];
  return roleIconMap[key] ?? Star;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function MembersPage() {
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);
  const [staffMembers, setStaffMembers] = useState<MembersResponseItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [settingsData, staffData] = await Promise.all([
          fetchFrontendSettings(),
          fetchPublicMembers(),
        ]);
        if (active) {
          setSettings(settingsData);
          setStaffMembers(staffData);
        }
      } catch (_) {
        // keep fallback
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const membersContent = settings.members;

  return (
    <div className="min-h-screen">
      {/* ─── Hero Banner ──────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2a1810] via-[#3d2318] to-[#1a0f08] py-24 text-center">
        {/* decorative rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] rounded-full border border-amber-500/10" />
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[400px] rounded-full border border-amber-500/15" />
        </div>
        {/* glowing orbs */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-48 w-48 translate-x-1/2 translate-y-1/2 rounded-full bg-orange-600/15 blur-3xl" />

        <div className="relative page-shell">
          <span className="inline-block rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
            Premium Membership
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">CalmTable</span> Lounge
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            {membersContent.description}
          </p>
        </div>
      </div>

      {/* ─── Benefits ─────────────────────────────────────── */}
      <section className="page-shell py-16">
        <SectionHeading
          eyebrow="Member Benefits"
          title="Why Join Our Circle"
          description="Exclusive privileges crafted for those who appreciate dining at its finest."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {membersContent.benefits.map((benefit, i) => {
            const Icon = benefitIcons[i % benefitIcons.length];
            return (
              <div
                key={benefit.title}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#2a1810]/60 to-[#1a0f08]/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-900/20"
              >
                {/* shimmer */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-400 ring-1 ring-amber-500/25">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-400">{benefit.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/65">{benefit.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Staff Team ───────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#16100a]/50 to-transparent py-16">
        <div className="page-shell">
          <SectionHeading
            eyebrow="Our Team"
            title="Meet The People Behind Every Plate"
            description="Dedicated professionals who bring warmth, skill, and passion to every single guest."
          />

          {!loaded ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/40">
              Staff profiles will appear here once published by admin.
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {staffMembers.map((member) => {
                const imageSrc = normalizeImageSource(member.photo ?? '');
                const src = imageSrc || '/images/avatar-placeholder.svg';
                const initials = getInitials(member.name);
                const { badge, glow } = getRoleStyle(member.role);
                const RoleIcon = getRoleIcon(member.role);

                return (
                  <div
                    key={member.id}
                    className={`group relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#2a1810]/70 to-[#1a0f08]/50 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/30 hover:shadow-2xl ${glow}`}
                  >
                    {/* decorative background glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(140,92,41,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    {/* avatar container */}
                    <div className="relative mb-6">
                      <div className="relative h-48 w-48 overflow-hidden rounded-3xl border-2 border-white/20 bg-[#2a1810] shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-amber-500/40">
                        <Image
                          src={src}
                          alt={imageSrc ? member.name : `${initials} avatar`}
                          fill
                          className="object-cover"
                          sizes="192px"
                          unoptimized={shouldSkipImageOptimization(src)}
                        />
                        {!imageSrc && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#8c5c29]/60 to-[#3d2318]/80 text-3xl font-bold text-white">
                            {initials}
                          </div>
                        )}
                      </div>
                      {/* floating role icon */}
                      <div className={`absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${badge} shadow-lg ring-4 ring-[#1a0f08]`}>
                        <RoleIcon size={18} className="text-white" />
                      </div>
                    </div>

                    {/* identity section */}
                    <div className="relative z-10 space-y-2">
                      <h3 className="font-heading text-2xl font-bold text-white transition-colors group-hover:text-amber-400">{member.name}</h3>
                      <div className={`inline-block rounded-full bg-gradient-to-r ${badge} px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md`}>
                        {member.role}
                      </div>
                    </div>

                    {/* description bubble (partially rounded as requested) */}
                    {member.bio ? (
                      <div className="relative mt-8 group/bubble">
                        <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/10 bg-[#1a0f08]/60 backdrop-blur-md" />
                        <div className="relative rounded-xl border border-white/10 bg-[#1a0f08]/60 p-5 backdrop-blur-md transition-colors group-hover:border-amber-500/20">
                          <p className="text-xs leading-relaxed text-white/60 italic">
                            "{member.bio}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-8 text-[10px] uppercase tracking-[0.2em] text-white/20">
                        CalmTable Family
                      </div>
                    )}

                    {/* bottom footer decor */}
                    <div className="mt-8 flex w-full items-center justify-center gap-3">
                      <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/10" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-500/40">Est. 2024</span>
                      <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/10" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="page-shell pb-20 pt-8 text-center">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 to-orange-700 p-10 shadow-2xl shadow-orange-900/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
          <Crown size={36} className="mx-auto mb-3 text-white/80" />
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Ready to Join?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/75">
            Create a free account and instantly unlock member-only dining perks, faster checkout, and priority reservations.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-orange-700 shadow-lg transition hover:bg-orange-50 hover:shadow-xl"
          >
            <Crown size={14} />
            Become a Member
          </a>
        </div>
      </section>
    </div>
  );
}
