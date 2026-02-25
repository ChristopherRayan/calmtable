// Featured dish card used in horizontal carousel sections.
import Image from 'next/image';

import { Badge } from '@/components/badge';
import { Card } from '@/components/card';
import { formatKwacha } from '@/lib/currency';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import type { MenuItem } from '@/lib/types';

interface FeaturedDishCardProps {
  item: MenuItem;
}

export function FeaturedDishCard({ item }: FeaturedDishCardProps) {
  const imageSrc = normalizeImageSource(item.image_url);
  const hasImage = Boolean(imageSrc);

  return (
    <Card className="min-w-[280px] max-w-[320px] p-0 overflow-hidden" elevated>
      <div className="relative h-44 w-full">
        {hasImage ? (
          <Image
            src={imageSrc}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 280px, 320px"
            unoptimized={shouldSkipImageOptimization(imageSrc)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-warmGray via-cream to-tableBrown/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tableBrown/80">
              Add photo in admin
            </p>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl text-tableBrown">{item.name}</h3>
          <Badge tone="accent">{formatKwacha(item.price)}</Badge>
        </div>
        {item.ordered_count > 0 && (
          <p className="text-xs font-semibold uppercase tracking-wide text-tableBrown/70">
            Ordered {item.ordered_count} times
          </p>
        )}
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
      </div>
    </Card>
  );
}
