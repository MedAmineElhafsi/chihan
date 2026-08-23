"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Full-bleed, app-like routes (the immersive globe home, Explore, chat) own the
 * whole viewport — a marketing footer under them would break the immersion and
 * introduce a stray scrollbar.
 */
const IMMERSIVE = ["/", "/explore", "/messages"];

export function ShellFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = IMMERSIVE.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  );
  if (immersive) return null;
  return <>{children}</>;
}
