import axios from "axios";
import httpStatus from "http-status";
import dotenv from "dotenv";

dotenv.config();

import {
  InfoQuery,
  SearchQ,
  RecommendationsQuery,
  TrendingQuery,
  PopularQuery,
} from "../model/aniquery.js";

const FetchAnilist = axios.create({
  baseURL: "https://graphql.anilist.co",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const FetchMalSyncData = async (malid) => {
  const data = axios
    .get(
      `https://raw.githubusercontent.com/bal-mackup/mal-backup/master/anilist/anime/${malid}.json`
    )
    .catch(
      (err) => httpStatus[`${err.response.status}_MESSAGE`] || err.message
    );
  return data;
};

const getIDeachProvider = async (json) => {
  let idGogo = '""';
  let idZoro = '""';
  let id9anime = '""';
  let idPahe = '""';

  if (json.data.Sites.Gogoanime) {
    idGogo =
      JSON.stringify(json.data.Sites.Gogoanime)
        .match(/"identifier":"(.*?)"/)[1]
        .match(/(.*)/)[0] || "";
  }
  if (json.data.Sites.Zoro) {
    idZoro =
      JSON.stringify(json.data.Sites.Zoro)
        .match(/"url":"(.*?)"/)[1]
        .match(/(.*)/)[0]
        .replace("https://aniwatch.to/", "") || "";
  }
  if (json.data.Sites["9anime"]) {
    id9anime = JSON.stringify(json.data.Sites["9anime"])
      .match(/"url":"(.*?)"/)[1]
      .match(/(.*)/)[0]
      .replace(
        JSON.stringify(json.data.Sites["9anime"]).includes(
          "https://aniwave.to/watch/"
        )
          ? "https://aniwave.to/watch/"
          : "https://9anime.pl/watch/",
        "" || ""
      );
  }
  if (json.data.Sites.animepahe) {
    idPahe =
      JSON.stringify(json.data.Sites.animepahe)
        .match(/"identifier":"(.*?)"/)[1]
        .match(/(.*)/)[0] || "";
  }

  return {
    idGogo,
    idZoro,
    id9anime,
    idPahe,
  };
};

const AnimeInfo = async (id) => {
  const query = InfoQuery(id);
  try {
    const { data } = await FetchAnilist.post("", {
      query,
    });
    const masdata = await FetchMalSyncData(data.data.Media.id);

    let idprovider;
    let isDub = false;
    if (!masdata || !masdata.data || !masdata.data.Sites) {
      idprovider = null;
    } else {
      idprovider = await getIDeachProvider(masdata);
      if (masdata.data.Sites.Gogoanime) {
        if (JSON.stringify(masdata.data.Sites.Gogoanime).includes("dub")) {
          isDub = true;
        }
      }
    }

    return {
      id: data.data.Media.id,
      idMal: data.data.Media.idMal,
      id_provider: idprovider,
      title: data.data.Media.title,
      dub: isDub,
      description: data.data.Media.description,
      coverImage: data.data.Media.coverImage,
      bannerImage: data.data.Media.bannerImage,
      genres: data.data.Media.genres,
      tags: data.data.Media.tags,
      status: data.data.Media.status,
      format: data.data.Media.format,
      episodes: data.data.Media.episodes,
      year: data.data.Media.seasonYear,
      season: data.data.Media.season,
      duration: data.data.Media.duration,
      startIn: data.data.Media.startDate,
      endIn: data.data.Media.endDate,
      nextair: data.data.Media.nextAiringEpisode,
      score: {
        averageScore: data.data.Media.averageScore,
        decimalScore: data.data.Media.averageScore / 10,
      },
      popularity: data.data.Media.popularity,
      siteUrl: data.data.Media.siteUrl,
      trailer: data.data.Media.trailer,
      studios: data.data.Media.studios.nodes,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const AnimeSearch = async (query, page, limit) => {
  const querys = SearchQ();
  try {
    const data = await FetchAnilist.post("", {
      query: querys,
      variables: {
        search: query,
        page: page,
        size: limit,
        type: "ANIME",
      },
    });
    return {
      pageInfo: data.data.data.Page.pageInfo,
      results: data.data.data.Page.media,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const AnimeAdvancedSearch = async (req_data) => {
  const querys = SearchQ();
  try {
    const data = await FetchAnilist.post("", {
      query: querys,
      variables: req_data,
    });
    return {
      pageInfo: data.data.data.Page.pageInfo,
      results: data.data.data.Page.media,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const AnimeRecommendations = async (id, page = 1, limit = 12) => {
  const query = RecommendationsQuery(id, page, limit);
  try {
    const Recndtdata = await FetchAnilist.post("", {
      query,
    });
    const data = Recndtdata.data.data.Media;
    const recommendations =
      Recndtdata.data.data.Media.recommendations.nodes.map((node) => {
        return node.mediaRecommendation;
      });
    return {
      info: {
        id: data.id,
        idMal: data.idMal,
        title: data.title,
      },
      results: recommendations,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    console.log(err);
    throw err;
  }
};

const AnimeAiringSchedule = async ({
  page = 1,
  perPage = 12,
  w_start,
  w_end,
  notYetAired,
}) => {
  try {
    const query = `
      {
        Page(page: ${page}, perPage: ${perPage}) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          airingSchedules(notYetAired: ${notYetAired}, airingAt_greater: ${w_start}, airingAt_lesser: ${w_end}) {
            airingAt
            episode
            media {
              id
              description
              idMal
              title {
                romaji
                english
                userPreferred
                native
              }
              countryOfOrigin
              description
              popularity
              bannerImage
              coverImage {
                extraLarge
                large
                medium
                color
              }
              genres
              averageScore
              seasonYear
              format
            }
          }
        }
      }
    `;
    const data = await axios.post("https://graphql.anilist.co", {
      query,
    });
    const res = {
      pageInfo: data.data.data.Page.pageInfo,
      results: data.data.data.Page.airingSchedules.map((item) => ({
        id: item.media.id.toString(),
        malId: item.media.idMal,
        episode: item.episode,
        airingAt: item.airingAt,
        title: {
          romaji: item.media.title.romaji,
          english: item.media.title.english,
          native: item.media.title.native,
          userPreferred: item.media.title.userPreferred,
        },
        country: item.media.countryOfOrigin,
        coverImage: item.media.coverImage,
        description: item.media.description,
        bannerImage: item.media.bannerImage,
        genres: item.media.genres,
        color: item.media.coverImage?.color,
        rating: item.media.averageScore,
        releaseDate: item.media.seasonYear,
        type: item.media.format,
      })),
    };
    return res;
  } catch (err) {
    throw new Error(err.message);
  }
};

const AniSkipData = async (id, ep_id) => {
  try {
    const url = "https://api.aniskip.com/v2";
    const ani_id = await AnimeInfo(id);
    const { data } = await axios.get(
      `${url}/skip-times/${ani_id.idMal}/${ep_id}?types[]=ed&types[]=mixed-ed&types[]=mixed-op&types[]=op&types[]=recap&episodeLength=`
    );
    return data;
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const AniTrendingData = async (page, limit) => {
  try {
    const data = await FetchAnilist.post("", {
      query: TrendingQuery(page, limit),
    });
    return {
      pageInfo: data.data.data.Page.pageInfo,
      results: data.data.data.Page.media,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const AniPopularData = async (page, limit) => {
  try {
    const data = await FetchAnilist.post("", {
      query: PopularQuery(page, limit),
    });
    console.log(data);
    return {
      pageInfo: data.data.data.Page.pageInfo,
      results: data.data.data.Page.media,
    };
  } catch (err) {
    if (err.response) {
      return {
        code: err.response.status,
        message: httpStatus[`${err.response.status}_MESSAGE`] || err.message,
      };
    }
    throw err;
  }
};

const RandoAni = async (time = 1) => {
  try {
    const { data } = await axios.get(
      "https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt"
    );
    const ids = data.split("\n");
    const result = [];

    for (let i = 0; i < time; i++) {
      const randomIndex = Math.floor(Math.random() * ids.length);
      result.push(ids[randomIndex]);
    }
    return result
  } catch (error) {
    throw error;
  }
};

export default {
  AnimeInfo,
  AnimeSearch,
  AnimeRecommendations,
  AnimeAdvancedSearch,
  AnimeAiringSchedule,
  AniSkipData,
  AniTrendingData,
  AniPopularData,
  RandoAni,
};
