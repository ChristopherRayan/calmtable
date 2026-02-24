// Members page outlining CalmTable membership benefits and loyalty access.
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

const memberBenefits = [
  {
    title: 'Priority Reservations',
    description:
      'Members get early access to peak evening slots and seasonal tasting nights before public release.',
  },
  {
    title: 'Member-only Offers',
    description:
      'Receive curated discounts on signature dishes, family platters, and selected beverages every month.',
  },
  {
    title: 'Birthday Rewards',
    description:
      'Celebrate with a complimentary dessert pairing and a personalized table setup for your birthday booking.',
  },
  {
    title: 'Faster Checkout',
    description:
      'Saved account details and order history help members reorder favorites and complete checkout in seconds.',
  },
];

export default function MembersPage() {
  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Members"
        title="CalmTable Member Lounge"
        description="Create an account and unlock premium dining perks designed for regular guests and families."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {memberBenefits.map((benefit) => (
          <Card key={benefit.title} elevated className="border border-woodAccent/25 bg-warmGray/90">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{benefit.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/85">{benefit.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
