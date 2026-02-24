// Chefs page highlighting culinary leadership and signature expertise.
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

const chefs = [
  {
    name: 'Chef Mphatso Banda',
    role: 'Executive Chef',
    bio: 'Specializes in modern Malawian fine dining, lake fish classics, and smoked signature mains.',
  },
  {
    name: 'Chef Thandiwe Phiri',
    role: 'Pastry & Beverage Chef',
    bio: 'Focuses on desserts, curated tea pairings, and premium non-alcoholic beverage craft.',
  },
  {
    name: 'Chef Blessings Zulu',
    role: 'Grill & Starch Station',
    bio: 'Leads braai, chambo preparation, and traditional starch pairings with contemporary plating.',
  },
];

export default function ChefsPage() {
  return (
    <section className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Culinary Team"
        title="Meet The CalmTable Chefs"
        description="A focused team blending local identity, premium presentation, and consistent execution."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {chefs.map((chef) => (
          <Card key={chef.name} elevated className="space-y-2">
            <p className="font-heading text-2xl text-tableBrown">{chef.name}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{chef.role}</p>
            <p className="text-sm leading-relaxed text-ink/80">{chef.bio}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
