export type StoryAuthor = {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Story = {
  id: string;
  author_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  author: StoryAuthor;
};

export type AuthorStories = {
  author: StoryAuthor;
  stories: Story[];
};
