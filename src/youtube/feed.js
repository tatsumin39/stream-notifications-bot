import fetch from "node-fetch";
import xml2js from "xml2js";
import { checkAndUpdatevideo_data } from "./checkAndUpdate.js";
import { getVideoDataIfExists, insertNewVideoData } from "../database/videoData.js";
import { generateDescriptionText } from "../discord/messages.js";
import { sendDiscordNotification } from "../discord/notification.js";
import { formatDate } from "../utils/formatDate.js";
import { isUrlAccessible } from "../utils/isUrlAccessible.js";
import { fetchChannelInfo } from "./api.js";

/**
 * 指定されたチャンネルの YouTube RSS フィードから動画データを取得し、データベースに保存後、
 * 必要に応じて Discord に通知を送信します。
 * 
 * @async
 * @function fetchAndStoreVideoData
 * @param {string} channel_id - YouTube チャンネル ID
 * @param {string} channel_name - チャンネルの名前
 * @param {string} channel_icon_url - チャンネルのアイコン URL
 * @param {string} discord_webhook_url - Discord 通知用 Webhook URL
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
export async function fetchAndStoreVideoData(
  channel_id,
  channel_name,
  channel_icon_url,
  discord_webhook_url
) {
  // チャンネルアイコン URL の有効性を確認
  if (!(await isUrlAccessible(channel_icon_url))) {
    console.log(
      `⛔️ チャンネル名: ${channel_name} のアイコンURL ${channel_icon_url} が無効です。`
    );
    channel_icon_url = await fetchChannelInfo(channel_id); // チャンネル情報を取得してアイコンを更新
  }

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

  try {
    const feedResponse = await fetch(feedUrl);
    if (!feedResponse.ok) {
      console.error(
        `⛔️ フィード取得エラー: チャンネル名 ${channel_name}、ステータスコード ${feedResponse.status}`
      );
      return;
    }

    const feedText = await feedResponse.text();
    if (!feedText) {
      console.error(`⛔️ フィードが空です: チャンネル名 ${channel_name}`);
      return;
    }

    // RSSフィードをパース
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

    // フィードエントリを整形
    const parsedEntries = entries.map((entry) => ({
      FeedVideoId: entry["yt:videoId"],
      FeedTitle: entry.title,
      FeedPublished: entry.published,
      FeedUpdated: entry.updated,
    }));

    // エントリごとにデータを処理
    for (const {
      FeedVideoId,
      FeedTitle,
      FeedPublished,
      FeedUpdated,
    } of parsedEntries) {
      const video_data = await getVideoDataIfExists(FeedVideoId);

      // 新しい動画データの処理
      if (video_data && !video_data.exists) {
        const {
          status,
          scheduled_start_time,
          actual_start_time,
          actual_end_time,
          duration: convertedDuration,
        } = video_data;

        // フォーマットされた開始時刻と実際の開始時刻を生成
        let formattedscheduled_start_time = scheduled_start_time
          ? formatDate(scheduled_start_time)
          : null;
        let formattedactual_start_time = actual_start_time
          ? formatDate(actual_start_time)
          : null;

        const newVideoData = {
          video_id: FeedVideoId,
          title: FeedTitle,
          published: FeedPublished,
          updated: FeedUpdated,
          channel_id: channel_id,
          status,
          scheduled_start_time: scheduled_start_time,
          actual_start_time: actual_start_time,
          actual_end_time: actual_end_time,
          duration: convertedDuration,
        };

        await insertNewVideoData(newVideoData);

        const descriptionText = generateDescriptionText(
          status,
          formattedactual_start_time || formattedscheduled_start_time,
          convertedDuration
        );

        await sendDiscordNotification(
          { channel: channel_name, title: FeedTitle, video_id: FeedVideoId, description_text: descriptionText },
          channel_icon_url,
          discord_webhook_url
        );
      } else {
        // 既存動画データの処理
        await checkAndUpdatevideo_data(
          [
            FeedTitle,
            FeedPublished,
            FeedUpdated,
            FeedVideoId,
            channel_name,
            channel_id,
            video_data.status,
            video_data.scheduled_start_time || "",
          ],
          channel_icon_url,
          discord_webhook_url
        );
      }
    }
  } catch (error) {
    console.error(
      `⛔️ フィード取得中にエラー発生: チャンネル名 ${channel_name}、エラー ${error.message}`
    );
  }
}
