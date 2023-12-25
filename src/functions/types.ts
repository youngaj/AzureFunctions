export interface LoginPayload {
  email: string;
  password: string;
  scope: string;
}

export interface LoginCredentials {
  email: string;
  uuid: string;
  isNew: boolean;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}

export interface PodCast {
  uuid: string;
  title: string;
  url: string;
  author: string;
  description: string;
  lastEpisodePublished: Date;
}

export interface PodcastListeningStats {
  timeIntroSkipping: number;
  timeListened: number;
  timeSilenceRemoval: number;
  timeSkipping: number;
  timeVariableSpeed: number;
  timesStartedAt: Date;
}

export interface Episode {
  uuid: string;
  podcastUuid: string;
  podcast?: PodCast;
  showNotes: string;
  title: string;
  url: string;
}

export interface StarredEpisode extends Episode {
  published: Date;
  size: string;
  episodeNumber: number;
  duration: number;
  podcastTitle: string;
}

export interface PocketCastQueuedEpisodeResponse {
  episodes: PocketCastQueuedEpisode[];
}

interface PocketCastQueuedEpisode {
  title: string;
  url: string;
  podcast: string;
  uuid: string;
  published: Date;
}

export interface PocketCastStarredEpisodeResponse {
  total: number;
  episodes: PocketCastStarredEpisode[];
}

interface PocketCastStarredEpisode {
  uuid: string;
  url: string;
  published: Date;
  duration: number;
  fileType: string;
  title: string;
  size: string;
  playingStatus: number;
  playedUpTo: number;
  starred: boolean;
  podcastUuid: string;
  podcastTitle: string;
  episodeType: string;
  episodeSeason: number;
  episodeNumber: number;
  isDeleted: boolean;
  author: string;
  bookmarks: any[];
}
