// Featured dish card used in horizontal carousel sections.
import Image from 'next/image';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import type { MenuItem } from '@/lib/types';

interface FeaturedDishCardProps {
  item: MenuItem;
}

const fallbackImage =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80';

export function FeaturedDishCard({ item }: FeaturedDishCardProps) {
  return (
    <Card className="min-w-[280px] max-w-[320px] p-0 overflow-hidden" elevated>
      <div className="relative h-44 w-full">
        <Image
          src={item.image_url || fallbackImage}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 280px, 320px"
        />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl text-tableBrown">{item.name}</h3>
          <Badge tone="accent">${Number(item.price).toFixed(2)}</Badge>
        </div>
        <p className="line-clamp-2 text-sm text-[#4B3A32]">{item.description}</p>
      </div>
    </Card>
  );
}
