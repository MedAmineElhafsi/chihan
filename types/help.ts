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
};

export type HelpOffer = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: HelpAuthor;
};
