import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios, { AxiosStatic } from "axios";
import {
  LoginPayload,
  LoginCredentials,
  PodCast,
  StarredEpisode,
  Episode,
  PodcastListeningStats,
  PocketCastStarredEpisodeResponse,
  PocketCastQueuedEpisodeResponse,
} from "./types";

/**
 * Main function to return podcast data.
 */
export async function PodcastInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  await verifyAuthorization(axios);

  const podcasts = await getPodcasts();

  const starredPromise = getStarredPodcasts(podcasts);

  const queuePromise = getQueuedEpisodes(podcasts);

  let statsPromise = getPodcastStats();
  const [starred, queue, stats] = await Promise.all([starredPromise, queuePromise, statsPromise]);

  const response = {
    queue: queue,
    starred: starred,
    podcasts: podcasts,
    stats: stats,
  };

  return { jsonBody: response };
}

async function getPodcasts(): Promise<PodCast[]> {
  const podcastResponse = await axios.post("https://api.pocketcasts.com/user/podcast/list");
  const podcasts = podcastResponse.data.podcasts;
  return podcasts;
}

async function getPodcastStats(): Promise<PodcastListeningStats | null> {
  let stats: PodcastListeningStats | null = null;
  try {
    const statsResponse = await axios.post("https://api.pocketcasts.com/user/stats/summary");
    stats = statsResponse.data;
  } catch (error) {
    console.log(`Error retrieving podcast listening stats`, error);
  }
  return stats;
}

async function getQueuedEpisodes(podcasts: PodCast[]) {
  const queueResponse = await axios.post<PocketCastQueuedEpisodeResponse>("https://api.pocketcasts.com/up_next/list", {
    version: 2,
    model: "webplayer",
    serverModified: 0,
  });

  const episodes = queueResponse.data.episodes.map(async (pocketCastQueuedEpisode) => {
    const episode: Episode = {
      ...pocketCastQueuedEpisode,
      podcast: undefined,
      podcastUuid: pocketCastQueuedEpisode.podcast,
      showNotes: "",
    };
    try {
      episode.showNotes = await getShowNotes(episode.podcastUuid);
    } catch (error) {
      console.error(`Error trying to retrieve showNotes for queued episode ${pocketCastQueuedEpisode.uuid}`, error);
    }
    episode.podcast = findPodcastByUUID(episode.podcastUuid, podcasts);
    return pocketCastQueuedEpisode;
  });

  //-- Add show notes to episodes
  const queue = await Promise.all(episodes);
  return queue;
}

async function getStarredPodcasts(podcasts: PodCast[]): Promise<StarredEpisode[]> {
  const starredResponse = await axios.post<PocketCastStarredEpisodeResponse>("https://api.pocketcasts.com/user/starred", {});
  const episodes = starredResponse.data.episodes.map(async (pocketCastStarredEpisode) => {
    const starredEpisode: StarredEpisode = {
      ...pocketCastStarredEpisode,
      showNotes: "",
    };
    try {
      starredEpisode.showNotes = await getShowNotes(pocketCastStarredEpisode.uuid);
    } catch (error) {
      console.error(`Error trying to retrieve showNotes for starred episode ${pocketCastStarredEpisode.uuid}`, error);
    }
    starredEpisode.podcast = findPodcastByUUID(pocketCastStarredEpisode.podcastUuid, podcasts);
    return starredEpisode;
  });

  const starred = await Promise.all(episodes);
  return starred;
}

function findPodcastByUUID(podcastUuid: string, podcasts: PodCast[]) {
  const podcast = podcasts.find((x) => x.uuid === podcastUuid);
  return podcast;
}

//-- function to add show notes
async function getShowNotes(episodeUUID: string) {
  let showNotes: string = "";
  const url = `https://podcast-api.pocketcasts.com/episode/show_notes/${episodeUUID}`;
  try {
    const response = await axios.get(url);
    showNotes = response.data.show_notes;
  } catch (error) {
    console.error(error.response.statusText, episodeUUID);
  }
  return showNotes;
}

async function getCredentials() {
  const payload: LoginPayload = {
    email: process.env["email"],
    password: process.env["password"],
    scope: "webplayer",
  };
  const response = await axios.post<LoginCredentials>("https://api.pocketcasts.com/user/login_pocket_casts", payload);
  const credentials = response.data;
  return credentials;
}

async function verifyAuthorization(axios: AxiosStatic) {
  axios.defaults.headers.common["Authorization"] = process.env["pocketCastsAuthorizationToken"];
  try {
    await axios.get("https://api.pocketcasts.com/subscription/status");
  } catch (error) {
    const credentials = await getCredentials();
    const authorization = `${credentials.tokenType} ${credentials.accessToken}`;
    axios.defaults.headers.common["Authorization"] = authorization;
    process.env["pocketCastsAuthorizationToken"] = authorization;
  }
  return axios;
}

app.http("PodcastInfo", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: PodcastInfo,
});
