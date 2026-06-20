export type PostType = "post" | "event";

export type FeedAuthor = {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FeedItem = {
  id: string;
  author_id: string;
  type: PostType;
  body: string | null;
  media: string[];
  event_title: string | null;
  event_at: string | null;
  event_location: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  author: FeedAuthor;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
};
