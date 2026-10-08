export type CandidateStatus =
  | "new"
  | "needs_video"
  | "parsed"
  | "tagged"
  | "approved"
  | "rejected"
  | "duplicate"
  | "unavailable";

export type TagGroup = "themes" | "situations" | "moods";

export type CandidateTags = Record<TagGroup, string[]>;

export type AdminActionResult =
  | { ok: true; message?: string; candidateId?: string }
  | { ok: false; message: string; candidateId?: string };

export type TagCatalog = Record<TagGroup, string[]>;

export type CandidateListItem = {
  id: string;
  status: CandidateStatus;
  title: string | null;
  artist: string | null;
  rawTitle: string | null;
  videoKind: string | null;
  channelName: string | null;
  aiAttempts: number;
  hasPossibleDuplicate: boolean;
  previouslyRejected: boolean;
  rejectReason: string | null;
  createdAt: string;
};

export type LinkedSong = {
  id: string;
  title: string;
  artist: string;
  youtubeVideoId: string | null;
  isActive: boolean;
};

export type SiblingCandidate = {
  id: string;
  status: CandidateStatus;
  videoKind: string | null;
  youtubeVideoId: string | null;
  embeddable: boolean | null;
  channelName: string | null;
  songId: string | null;
};

export type CandidateDetail = {
  id: string;
  status: CandidateStatus;
  source: "youtube" | "manual";
  youtubeVideoId: string | null;
  channelName: string | null;
  rawTitle: string | null;
  embeddable: boolean | null;
  videoKind: string | null;
  title: string | null;
  artist: string | null;
  tags: CandidateTags;
  adminMemo: string | null;
  aiAttempts: number;
  lastError: string | null;
  rejectReason: string | null;
  reviewed: boolean;
  possibleDuplicate: LinkedSong | null;
  linkedSong: LinkedSong | null;
  siblings: SiblingCandidate[];
  previouslyRejected: boolean;
};

export type ChannelListItem = {
  id: string;
  youtubeChannelId: string;
  name: string;
  kind: "artist" | "label" | "topic";
  defaultArtist: string | null;
  status: "tracking" | "ignored";
  lastCheckedLabel: string;
  failCount: number;
  lastError: string | null;
  candidateCount: number;
  approvedCount: number;
};
