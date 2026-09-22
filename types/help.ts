import type { VoiceNote } from "./voice";

export type HelpAuthor = {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type HelpRequest = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  category: string;
  urgency: string;
  city: string | null;
  country: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  offer_count: number;
  author: HelpAuthor;
  /** A spoken version of the request (migration 0028). */
  voice: VoiceNote | null;
  /** "give" for a free thing on offer; everything else asks (0030). */
  kind: "ask" | "give";
  /** Signed links to a give's photos, in order (0030). */
  photo_urls: string[];
  /** Interpreter requests only (0030). */
  interpret_from: string | null;
  interpret_to: string | null;
  setting: string | null;
  meeting: string | null;
  needed_at: string | null;
};

export type HelpOffer = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: HelpAuthor;
  /** A spoken reply (migration 0028). */
  voice: VoiceNote | null;
};
