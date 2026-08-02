export type GroupMemberRole = "owner" | "admin" | "member";

export type CommunityGroup = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  /** Distance in km from the viewer, when "near me" is used. */
  distance_km?: number | null;
};

export type GroupMember = {
  user_id: string;
  profile_id: string | null;
  role: GroupMemberRole;
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
};

export type InviteCandidate = {
  user_id: string;
  profile_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
};
