"use client";

import type { ComponentType } from "react";

import { usePathname } from "@/i18n/navigation";
import {
  DirectoryLoading,
  ExploreLoading,
  FeedLoading,
  HelpLoading,
  LandingLoading,
  MessagesLoading,
  ProfileLoading,
  ReelsLoading,
  SearchLoading,
  SpinnerLoading,
} from "./section-skeletons";

/*
 * Only a section's front page has a skeleton. Anything deeper — a request, a
 * listing, a thread, sign-in — keeps the spinner rather than borrow a shape
 * that is not its own.
 */
const SKELETONS: Record<string, ComponentType> = {
  "/": LandingLoading,
  "/explore": ExploreLoading,
  "/feed": FeedLoading,
  "/reels": ReelsLoading,
  "/profile": ProfileLoading,
  "/help": HelpLoading,
  "/directory": DirectoryLoading,
  "/messages": MessagesLoading,
  "/search": SearchLoading,
};

/**
 * The app's one loading state, drawn in the shape of wherever you are going.
 *
 * It sits at the locale root on purpose. A `loading.tsx` inside a section
 * would also stand in for that section's filter links and sub-pages: tapping
 * a help category would blank the board into a skeleton, and a request's own
 * page would load under the board's shape. Up here it shows only when you
 * move between sections — when there is nothing of the destination on screen
 * yet — and a filter change keeps the page you are looking at.
 *
 * The pathname is the destination's: by the time this renders, the router
 * has already moved to the new URL.
 */
export function RouteLoading() {
  const pathname = usePathname();
  const Loading = SKELETONS[pathname] ?? SpinnerLoading;
  return <Loading />;
}
