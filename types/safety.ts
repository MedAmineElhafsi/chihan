export type BlockedUser = {
  userId: string;
  profileId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};
