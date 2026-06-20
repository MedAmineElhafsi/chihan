export type NewsArticle = {
  id: string;
  title: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  image_url: string | null;
  country: string | null;
  category: string | null;
  published_at: string;
};
