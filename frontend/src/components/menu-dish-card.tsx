// Menu dish card for grid galleries with dietary tags and availability.
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StarRatingDisplay } from '@/components/star-rating';
import { formatKwacha } from '@/lib/currency';
import { shouldSkipImageOptimization } from '@/lib/image';
import type { MenuItem } from '@/lib/types';

interface MenuDishCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
}

export function MenuDishCard({ item, onAddToCart }: MenuDishCardProps) {
  const hasImage = Boolean(item.image_url);

  return (
    <Card className="p-0 overflow-hidden" elevated>
      <div className="relative h-44 w-full">
        {hasImage ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 30vw"
            unoptimized={shouldSkipImageOptimization(item.image_url)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-warmGray via-cream to-tableBrown/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tableBrown/80">
              Image managed in admin
            </p>
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 grid place-items-center bg-black/50">
            <Badge tone="accent">Sold Out</Badge>
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl text-tableBrown">{item.name}</h3>
          <span className="text-sm font-semibold text-tableBrown">{formatKwacha(item.price)}</span>
        </div>
        {typeof item.average_rating === 'number' ? (
          <StarRatingDisplay rating={item.average_rating} />
        ) : (
          <p className="text-xs text-tableBrown/70">No reviews yet</p>
        )}
        <p className="text-sm text-muted">{item.description}</p>
        {item.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.dietary_tags.map((tag) => (
              <Badge key={`${item.id}-${tag}`} tone="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <Button
          className="w-full"
          size="sm"
          onClick={() => onAddToCart?.(item)}
          disabled={!item.is_available}
          aria-label={`Add ${item.name} to cart`}
        >
          <ShoppingBag size={14} />
          {item.is_available ? 'Add to Cart' : 'Unavailable'}
        </Button>
      </div>
    </Card>
  );
}
