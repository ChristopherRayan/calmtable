// STEP 5 landing scaffold showing theme and reusable component usage.
import { Clock3, MapPin, UtensilsCrossed } from 'lucide-react';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid min-h-[74vh] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <Badge tone="outline" className="mb-4">
            Calm Ambiance, Elevated Dining
          </Badge>
          <h1 className="font-heading text-4xl leading-tight text-tableBrown sm:text-5xl">
            A premium restaurant experience crafted around comfort and flavor.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#4B3A32] sm:text-lg">
            Step into Calm Table for seasonal dishes, warm hospitality, and a smooth digital booking journey.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button aria-label="Book your table now">Book a Table</Button>
            <Button variant="secondary" aria-label="Explore menu">
              Explore Menu
            </Button>
          </div>
        </div>

        <Card elevated className="space-y-4 bg-[#efe3d6]">
          <h2 className="font-heading text-2xl text-tableBrown">Visit Calm Table</h2>
          <ul className="space-y-3 text-sm text-[#4B3A32] sm:text-base">
            <li className="flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-tableBrown" />
              Fine dining menu with seasonal ingredients
            </li>
            <li className="flex items-center gap-2">
              <Clock3 size={18} className="text-tableBrown" />
              Open daily from 5:00 PM to 10:00 PM
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={18} className="text-tableBrown" />
              24 Willow Avenue, Downtown District
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
