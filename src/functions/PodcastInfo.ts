import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import axios, { AxiosStatic } from "axios";
import { LoginPayload, LoginCredentials } from "./types";

export async function PodcastInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  axios.defaults.headers.common["Authorization"] = process.env["pocketCastsAuthorizationToken"];
  await verifyCredentials(axios);

  const podcastResponse = await axios.post("https://api.pocketcasts.com/user/podcast/list");

  const queueResponse = await axios.post("https://api.pocketcasts.com/up_next/list", {
    version: 2,
    model: "webplayer",
    serverModified: 0,
  });

  const starredResponse = await axios.post("https://api.pocketcasts.com/user/starred", {});

  let stats = null;

  //-- function to add show notes
  const addShowNotes = async (episode) => {
    const url = `https://podcast-api.pocketcasts.com/episode/show_notes/${episode.uuid}`;
    try {
      const response = await axios.get(url);
      episode.showNotes = response.data.show_notes;
    } catch (error) {
      console.error(error.response.statusText, episode);
    }
    return episode;
  };

  const _getPodcast = (podcastUuid, podcasts) => {
    const podcast = podcasts.find((x) => x.uuid === podcastUuid);
    return podcast;
  };

  const podcasts = podcastResponse.data.podcasts;
  //-- Add show notes to episodes
  const queue = await Promise.all(
    queueResponse.data.episodes.map(async (episode) => {
      try {
        await addShowNotes(episode);
      } catch (error) {}
      episode.podcast = _getPodcast(episode.podcastUuid, podcasts);
      return episode;
    })
  );

  const starred = await Promise.all(
    starredResponse.data.episodes.map(async (episode) => {
      try {
        await addShowNotes(episode);
      } catch (error) {}
      episode.podcast = _getPodcast(episode.podcast, podcasts);
      return episode;
    })
  );

  try {
    const statsResponse = await axios.post("https://api.pocketcasts.com/user/stats/summary");
    stats = statsResponse.data;
  } catch (error) {}

  context.log("Axios response is", queueResponse.data);
  const response = {
    queue: queue,
    starred: starred,
    podcasts: podcasts,
    stats: stats,
  };

  return { jsonBody: response };
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

async function verifyCredentials(axios: AxiosStatic) {
  try {
    await axios.get("https://api.pocketcasts.com/subscription/status");
  } catch (error) {
    const credentials = await getCredentials();
    axios.defaults.headers.common["Authorization"] = `${credentials.tokenType} ${credentials.accessToken}`;
  }
  return axios;
}

app.http("PodcastInfo", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: PodcastInfo,
});
