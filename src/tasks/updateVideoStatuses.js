import pool from '../config/dbConfig.js';
import { fetchVideoInfo } from '../youtube/api.js';
import { updateExistingVideoData } from '../database/videoData.js';
import { generateDescriptionText } from '../discord/messages.js';
import { sendDiscordNotification } from '../discord/notification.js';
import { formatDate } from '../utils/formatDate.js';

/**
 * `video_data` テーブルの `upcoming` ステータスの動画をチェックし、必要に応じてステータスを更新します。
 * 
 * @async
 * @function updateVideoStatuses
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
export async function updateVideoStatuses() {
  const startTimestamp = new Date();
  const client = await pool.connect();

  try {   
    const now = new Date();

    // データベースから `upcoming` ステータスで開始時刻が過去の動画を取得
    const query = `
      SELECT 
        vd.video_id,
        vd.scheduled_start_time,
        vd.published,
        vd.updated,
        vd.channel_id,
        c.channel_name,
        c.channel_icon_url,
        dw.discord_webhook_url
      FROM 
        video_data vd
      INNER JOIN 
        channels c ON vd.channel_id = c.channel_id
      LEFT JOIN 
        discord_webhooks dw ON c.discord_channel_name = dw.discord_channel_name
      WHERE 
        vd.status = 'upcoming' 
        AND vd.scheduled_start_time <= $1;
    `;

    const result = await client.query(query, [now]);

    if (result.rows.length === 0) {
      return;
    }

    // YouTube API を並列で呼び出して動画情報を取得
    const fetchVideoInfos = await Promise.all(
      result.rows.map((video) => fetchVideoInfo(video.video_id))
    );

    for (const [index, apiVideoInfo] of fetchVideoInfos.entries()) {
      const dbVideo = result.rows[index];

      if (!apiVideoInfo) {
        console.warn(`[updateVideoStatuses] 動画情報を取得できませんでした - Video_ID: ${dbVideo.video_id}`);
        continue;
      }

      // データベースから取得した情報と YouTube API の情報を比較
      await processVideoUpdate(apiVideoInfo, dbVideo);
    }
  } catch (error) {
    console.error("[updateVideoStatuses] エラー:", error);
  } finally {
    client.release();
    const elapsedMilliseconds = new Date() - startTimestamp;
    console.info(`⏱️ upcoming ステータスチェック実行時間: ${elapsedMilliseconds / 1000}秒`);
  }
}

/**
 * 動画情報を比較し、必要に応じてデータベースを更新し、Discord に通知を送信します。
 *
 * @async
 * @function processVideoUpdate
 * @param {Object} apiVideoInfo - YouTube API から取得した動画情報
 * @param {Object} dbVideo - データベースから取得した動画情報
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
async function processVideoUpdate(apiVideoInfo, dbVideo) {
  const {
    video_id,
    scheduled_start_time: dbScheduledStartTime,
    FeedPublished,
    FeedUpdated,
    channel_id,
    channel_name,
    channel_icon_url,
    discord_webhook_url,
  } = dbVideo;

  const apiScheduledStartTime = apiVideoInfo.scheduled_start_time;

  // 更新データを準備
  const updateVideoData = {
    video_id: apiVideoInfo.videoId || video_id,
    title: apiVideoInfo.title || "Unknown Title",
    published: FeedPublished,
    updated: FeedUpdated,
    channel_id,
    status: apiVideoInfo.liveBroadcastContent,
    scheduled_start_time: apiScheduledStartTime,
    actual_start_time: apiVideoInfo.actual_start_time,
    actual_end_time: apiVideoInfo.actual_end_time,
    duration: apiVideoInfo.duration,
  };

  // ステータスが `upcoming` 以外の場合の処理
  if (apiVideoInfo.liveBroadcastContent !== "upcoming") {
    console.info(`✅ ステータス変更 - (Video_ID: ${video_id}) 新ステータス: ${apiVideoInfo.liveBroadcastContent}`);
    await updateExistingVideoData(updateVideoData);

    const description = generateDescriptionText(
      apiVideoInfo.liveBroadcastContent,
      apiVideoInfo.actual_start_time,
      apiVideoInfo.duration
    );

    if (discord_webhook_url) {
      await sendDiscordNotification(
        {
          channel: channel_name,
          title: apiVideoInfo.title,
          video_id: apiVideoInfo.videoId,
          description_text: description,
        },
        channel_icon_url,
        discord_webhook_url
      );
      console.info(`✅ Discord 通知を送信しました - Video_ID: ${apiVideoInfo.videoId}`);
    } else {
      console.warn(`⚠️ Discord Webhook URL が設定されていません - Channel Name: ${channel_name}`);
    }
  } else if (dbScheduledStartTime && apiScheduledStartTime) {
    // 配信予定時間が変更された場合の処理
    const dbTimeFormatted = formatDate(dbScheduledStartTime, "YYYY-MM-DDTHH:mm:ss");
    const apiTimeFormatted = formatDate(apiScheduledStartTime, "YYYY-MM-DDTHH:mm:ss");

    if (dbTimeFormatted !== apiTimeFormatted) {
      console.info(`✅ 配信予定時間変更 - (Video_ID: ${video_id}) 旧時間: ${dbTimeFormatted}, 新時間: ${apiTimeFormatted}`);
      await updateExistingVideoData(updateVideoData);
    }
  }
}
