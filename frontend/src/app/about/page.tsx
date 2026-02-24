// About page describing CalmTable identity, atmosphere, and service philosophy.
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

export default function AboutPage() {
  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="About Us"
        title="The CalmTable Experience"
        description="Near Simso Filling Station in Luwinga, we serve premium dishes in a warm family-restaurant setting."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card elevated>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Vision</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/85">
            Build a modern Malawian dining brand where consistency, comfort, and quality define every table.
          </p>
        </Card>
        <Card elevated>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Cuisine</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/85">
            Local favorites and signature mains from chambo to goat dishes, with curated snacks and beverages.
          </p>
        </Card>
        <Card elevated>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Service</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/85">
            Fast reservations, smooth checkout, and attentive hosting for both casual and formal dining moments.
          </p>
        </Card>
      </div>
    </section>
  );
}
