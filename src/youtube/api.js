import dotenv from 'dotenv';
dotenv.config();

import { google } from "googleapis";
import { convertDuration } from "../utils/convertDuration.js";
import { isShort } from "../utils/isShort.js";
import { updateChannelIcon } from "../database/updateChannelIcon.js";

// YouTube API 初期化
const apiKey = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({
  version: "v3",
  auth: apiKey,
});

/**
 * チャンネル情報を取得し、アイコンURLを更新します。
 *
 * @async
 * @function fetchChannelInfo
 * @param {string} channel_id - YouTube チャンネル ID
 * @returns {Promise<string|null>} - 新しいチャンネルアイコン URL、または null
 */
export async function fetchChannelInfo(channel_id) {
  try {
    const response = await youtube.channels.list({
      part: "snippet",
      id: channel_id,
      maxResults: 1,
    });

    console.log(`🤖 YouTube.Channels.list API 実行: チャンネル ID - ${channel_id}`);

    // チャンネル情報の存在を確認
    if (
      !response ||
      !response.data ||
      !response.data.items ||
      response.data.items.length === 0
    ) {
      console.warn(`⛔️ チャンネル情報が見つかりません - チャンネル ID: ${channel_id}`);
      return null;
    }

    const channelSnippet = response.data.items[0].snippet;

    // サムネイル URL の存在を確認
    if (channelSnippet.thumbnails?.default?.url) {
    // if (channelSnippet.thumbnails && channelSnippet.thumbnails.default) {
      const thumbnailUrl = channelSnippet.thumbnails.default.url;
      console.log(
        `🆙 チャンネル名: ${channelSnippet.title} の新しいアイコン URL: ${thumbnailUrl}`
      );
      
      // データベースを更新
      await updateChannelIcon(thumbnailUrl, channel_id);

      return thumbnailUrl; // 新しいアイコンURLを返す
    } else {
      console.warn(`⛔️ サムネイルが見つかりません - チャンネル ID: ${channel_id}`);
      return null;
    }
  } catch (error) {
    console.error(
      `⛔️ fetchChannelInfo API 呼び出し中にエラーが発生しました - チャンネル ID: ${channel_id}, エラー: ${error.message}`
    );
    return null;
  }
}

/**
 * YouTube の動画情報を取得します。
 *
 * @async
 * @function fetchVideoInfo
 * @param {string} videoId - YouTube 動画 ID
 * @returns {Promise<Object|null>} - 動画情報のオブジェクト、または null
 */
export async function fetchVideoInfo(videoId) {
  try {
    const response = await youtube.videos.list({
      part: ['id', 'snippet', 'liveStreamingDetails', 'contentDetails'],
      id: [videoId],
      fields:
        "items(id, snippet(liveBroadcastContent, title), liveStreamingDetails(scheduledStartTime, actualStartTime, actualEndTime), contentDetails(duration))",
    });

    // 動画情報の存在を確認
    if (!response.data.items || response.data.items.length === 0) {
      console.warn(`⛔️ 動画情報が見つかりません - Video_ID: ${videoId}`);
      return null;
    }

    const apiVideoInfo = response.data.items[0];
    console.log(
      `🤖 YouTube.Videos.list API 実行: タイトル - ${apiVideoInfo.snippet.title}, Video_ID: ${videoId}`
    );

    // ステータスを判定
    let liveBroadcastContent = "none";

    if (!apiVideoInfo.liveStreamingDetails) {
      liveBroadcastContent = await isShort(videoId) ? "short" : "video";
    } else if (apiVideoInfo.snippet.liveBroadcastContent === "upcoming") {
      liveBroadcastContent = "upcoming";
    } else if (apiVideoInfo.snippet.liveBroadcastContent === "live") {
      liveBroadcastContent = "live";
    } else if (
      apiVideoInfo.snippet.liveBroadcastContent === "none" &&
      apiVideoInfo.liveStreamingDetails.actualEndTime
    ) {
      liveBroadcastContent = "archive";
    }

    // 不明なステータスの場合エラーをスロー
    if (liveBroadcastContent === "none") {
      throw new Error("動画のステータスが不明です。");
    }

    return {
      videoId: apiVideoInfo.id,
      liveBroadcastContent,
      title: apiVideoInfo.snippet.title,
      scheduled_start_time:
        apiVideoInfo.liveStreamingDetails?.scheduledStartTime || null,
      actual_start_time:
        apiVideoInfo.liveStreamingDetails?.actualStartTime || null,
      actual_end_time:
        apiVideoInfo.liveStreamingDetails?.actualEndTime || null,
      duration:apiVideoInfo.contentDetails?.duration
        ? convertDuration(apiVideoInfo.contentDetails.duration) 
        : "00:00:00",
    };
  } catch (error) {
    console.error(
      `⛔️ fetchVideoInfo でエラーが発生しました - Video_ID: ${videoId}, エラー: ${error.message}`
    );
    return null; // 不完全なデータの場合は null を返す
  }
}
