export type YoutubeVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  duration: string;
  liveBroadcastContent: "none" | "live" | "upcoming";
  embeddable: boolean;
  privacyStatus: "public" | "unlisted" | "private";
  regionRestriction: { allowed?: string[]; blocked?: string[] } | null;
};

export type IngestChannelKind = "artist" | "label" | "topic";

export type IngestChannel = {
  kind: IngestChannelKind;
  name: string;
  defaultArtist: string | null;
};

export type VideoKind = "mv" | "audio" | "lyric" | "live" | "unknown";

export type ParsedSong = {
  title: string;
  titleAlt: string | null;
  artist: string | null;
  videoKind: VideoKind;
  isMedley: boolean;
  confident: boolean;
};

export type FilterReason =
  | "invalid_duration"
  | "short"
  | "live_broadcast"
  | "too_long"
  | "keyword"
  | "not_embeddable"
  | "not_public"
  | "region_blocked"
  | "no_hangul";

export type FilterResult =
  | { pass: true }
  | { pass: false; reason: FilterReason; detail?: string };

export type ExistingSong = { id: string; title: string; artist: string };

export type DuplicateMatch =
  | { kind: "duplicate"; songId: string }
  | { kind: "possibleDuplicate"; songId: string }
  | { kind: "new" };
