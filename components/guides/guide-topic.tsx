import {
  Baby,
  BookOpen,
  Briefcase,
  ClipboardCheck,
  HeartPulse,
  House,
  IdCard,
  Landmark,
  Languages,
  School,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  registration: ClipboardCheck,
  health_insurance: HeartPulse,
  schools: School,
  residence: IdCard,
  work: Briefcase,
  housing: House,
  language: Languages,
  money: Landmark,
  family: Baby,
  other: BookOpen,
};

export function GuideTopicIcon({
  topic,
  className,
}: {
  topic: string;
  className?: string;
}) {
  const Icon = ICONS[topic] ?? BookOpen;
  return <Icon aria-hidden="true" className={cn("size-4", className)} />;
}
