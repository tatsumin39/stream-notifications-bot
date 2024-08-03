import fetch from "node-fetch";
import xml2js from "xml2js";
import { checkAndUpdatevideo_data } from "./checkAndUpdate.js";
import { getChannelsData } from "../database/getChannelsData.js";
import {
  getVideoDataIfExists,
  insertNewVideoData,
} from "../database/videoData.js";
import { generateDescriptionText } from "../discord/messages.js";
import { sendDiscordNotification } from "../discord/notification.js";
import { formatDate } from "../utils/formatDate.js";
import { isUrlAccessible } from "../utils/isUrlAccessible.js";
import { fetchChannelInfo } from "./api.js";

/**
 * YouTubeのRSSフィードからビデオデータを取得し、データベースに保存後、Discordに通知します。
 */
export async function fetchAndStoreVideoData(
  DISCORD_CHANNEL_NAME,
  DISCORD_WEBHOOK_URL
) {
  const channels = await getChannelsData(DISCORD_CHANNEL_NAME);
  for (const { channel_id, channel_name, channel_icon_url } of channels) {
    // console.log(`▶️ 処理を開始: チャンネル名 ${channel_name}`);

    if (!(await isUrlAccessible(channel_icon_url))) {
      console.log(
        `⛔️ チャンネル名: ${channel_name} のアイコンURL ${channel_icon_url} が無効です。`
      );
      await fetchChannelInfo(channel_id);
    }

    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;
    try {
      const feedResponse = await fetch(feedUrl);
      if (!feedResponse.ok) {
        console.error(
          `⛔️ フィード取得エラー: チャンネル名 ${channel_name}、ステータスコード ${feedResponse.status}`
        );
        continue;
      }
      const feedText = await feedResponse.text();
      if (!feedText) {
        console.error(`⛔️ フィードが空です: チャンネル名 ${channel_name}`);
        continue;
      }
      const parsedFeed = await xml2js.parseStringPromise(feedText, {
        explicitArray: false,
        mergeAttrs: true,
      });

      let entries = parsedFeed.feed.entry;
      if (!Array.isArray(entries)) {
        entries = [entries];
      }

      // 最初の5件のみを取得
      entries = entries.slice(0, 5);

      const parsedEntries = entries.map((entry) => ({
        FeedVideoId: entry["yt:videoId"],
        FeedTitle: entry.title,
        FeedPublished: entry.published,
        FeedUpdated: entry.updated,
      }));

      for (const {
        FeedVideoId,
        FeedTitle,
        FeedPublished,
        FeedUpdated,
      } of parsedEntries) {
        const video_data = await getVideoDataIfExists(FeedVideoId);

        if (video_data && !video_data.exists) {
          const {
            status,
            scheduled_start_time,
            actual_start_time,
            actual_end_time,
            duration: convertedDuration,
            video_id,
            title,
          } = video_data;

          let formattedscheduled_start_time = scheduled_start_time
            ? formatDate(scheduled_start_time)
            : null;
          let formattedactual_start_time = actual_start_time
            ? formatDate(actual_start_time)
            : null;
          let formattedactual_end_time = actual_end_time
          ? formatDate(actual_end_time)
          : null;

          const newvideo_data = {
            video_id: FeedVideoId,
            title: FeedTitle,
            published: FeedPublished,
            updated: FeedUpdated,
            channel: channel_name,
            status,
            scheduledStartTime: scheduled_start_time,
            actual_start_time: actual_start_time,
            actual_end_time: actual_end_time,
            duration: convertedDuration,
          };

          await insertNewVideoData(newvideo_data);

          await sendDiscordNotification(
            {
              channel: channel_name,
              title,
              video_id,
              description_text: generateDescriptionText(
                status,
                formattedactual_start_time || formattedscheduled_start_time,
                formattedactual_end_time || formattedactual_end_time,
                convertedDuration
              ),
            },
            channel_icon_url,
            DISCORD_WEBHOOK_URL
          );
        } else {
          const {
            status,
            scheduled_start_time,
            actual_start_time,
            duration: convertedDuration,
            video_id,
            title,
          } = video_data;
          const data = [
            title,
            FeedPublished,
            FeedUpdated,
            video_id,
            channel_name,
            status,
            scheduled_start_time ? scheduled_start_time : "",
          ];
          await checkAndUpdatevideo_data(
            data,
            channel_icon_url,
            DISCORD_WEBHOOK_URL
          );
        }
      }
    } catch (error) {
      console.error(
        `⛔️ フィード取得中にエラー発生: チャンネル名 ${channel_name}、エラー ${error.message}`
      );
    }
  }
}
