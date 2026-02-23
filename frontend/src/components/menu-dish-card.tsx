// Menu dish card for grid galleries with dietary tags and availability.
import Image from 'next/image';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import type { MenuItem } from '@/lib/types';

interface MenuDishCardProps {
  item: MenuItem;
}

const fallbackImage =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';

export function MenuDishCard({ item }: MenuDishCardProps) {
  return (
    <Card className="p-0 overflow-hidden" elevated>
      <div className="relative h-44 w-full">
        <Image
          src={item.image_url || fallbackImage}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 30vw"
        />
        {!item.is_available && (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <Badge tone="accent">Sold Out</Badge>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl text-tableBrown">{item.name}</h3>
          <span className="text-sm font-semibold text-tableBrown">${Number(item.price).toFixed(2)}</span>
        </div>
        <p className="text-sm text-[#4B3A32]">{item.description}</p>
        {item.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.dietary_tags.map((tag) => (
              <Badge key={`${item.id}-${tag}`} tone="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
