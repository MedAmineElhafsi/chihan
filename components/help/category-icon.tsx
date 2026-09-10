import {
  Briefcase,
  Car,
  Circle,
  FileText,
  GraduationCap,
  House,
  MessagesSquare,
  Scale,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

import { HELP_CATEGORY_STYLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  House,
  FileText,
  Briefcase,
  MessagesSquare,
  Stethoscope,
  GraduationCap,
  Users,
  Scale,
  Car,
  Circle,
};

/** The mark for a help category, in the icon set the rest of the app uses. */
export function HelpCategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const style = HELP_CATEGORY_STYLE[category] ?? HELP_CATEGORY_STYLE.other;
  const Icon = ICONS[style.icon] ?? Circle;
  return <Icon aria-hidden="true" className={cn("size-3.5", className)} />;
}
