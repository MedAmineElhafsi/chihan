import {
  Landmark,
  Scale,
  Scissors,
  ShoppingBasket,
  Stethoscope,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  restaurant: Utensils,
  doctor: Stethoscope,
  grocery: ShoppingBasket,
  lawyer: Scale,
  hairdresser: Scissors,
  community: Landmark,
  other: Store,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Store;
  return <Icon className={className} />;
}
