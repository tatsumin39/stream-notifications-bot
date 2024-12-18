import { fetchVideoInfo } from './api.js';
import { generateDescriptionText } from '../discord/messages.js';
import { sendDiscordNotification } from '../discord/notification.js';
import { handleScheduleChange } from '../discord/reminderInteractions.js';
import { getVideoDataIfExists, updateExistingVideoData, updateVideoUpdatedTime } from '../database/videoData.js';
import { formatDate } from '../utils/formatDate.js';

/**
 * 指定された動画データをチェックし、変更があれば更新および Discord に通知を送信します。
 * 
 * @async
 * @function checkAndUpdatevideo_data
 * @param {Array<any>} data - チェック対象の動画データ
 * @param {string} channel_icon_url - チャンネルのアイコン URL
 * @param {string} discord_webhook_url - Discord 通知用 Webhook URL
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
export async function checkAndUpdatevideo_data(data, channel_icon_url, discord_webhook_url) {
  const [
    title,
    FeedPublished,
    FeedUpdated,
    video_id,
    channel_name,
    channel_id,
    status,
    scheduled_start_time,
    actual_start_time,
  ] = data;

  try {
    const existingData = await getVideoDataIfExists(video_id);

    // RSS フィードの更新日時とデータベースの更新日時を比較
    const rssUpdatedDate = new Date(FeedUpdated).getTime();
    const dbUpdatedDate = new Date(existingData.updated).getTime();

    if (rssUpdatedDate === dbUpdatedDate) {
      return;
    }

    // 動画の状態に応じて処理
    if (['none', 'upcoming', 'live'].includes(status)) {
      const apiVideoInfo = await fetchVideoInfo(video_id);
      if (!apiVideoInfo) {
        console.warn(`⛔️ ビデオデータが見つかりませんでした - (Video_ID: ${video_id})`);
        return;
      }

      // 無効なステータスの場合は処理を中断
      if (apiVideoInfo.liveBroadcastContent === 'none') {
        console.warn(`⛔️ 無効なビデオステータスのため処理を中断しました - (Video_ID: ${video_id})`);
        return;
      }

      let description = '';
      let isChanged = false;

      // 配信予定時間の変更チェック
      const dbScheduledStartTime = new Date(existingData.scheduled_start_time).getTime();
      const apiScheduledStartTime = new Date(apiVideoInfo.scheduled_start_time).getTime();

      if (existingData.status !== apiVideoInfo.liveBroadcastContent) {
        description = generateDescriptionText(apiVideoInfo.liveBroadcastContent, apiVideoInfo.actual_start_time, apiVideoInfo.duration);
        console.log(`✅ ステータスが ${existingData.status} から ${apiVideoInfo.liveBroadcastContent} に変更されました。`);
        isChanged = true;

      } else if (apiVideoInfo.liveBroadcastContent === 'upcoming' && dbScheduledStartTime !== apiScheduledStartTime) {
        description = generateDescriptionText(
          apiVideoInfo.liveBroadcastContent,
          apiVideoInfo.actual_start_time,
          apiVideoInfo.duration,
          `配信予定が ${formatDate(apiVideoInfo.scheduled_start_time, 'MM/DD HH:mm')} に変更されました。`
        );
        console.log(`✅ 配信予定時間が ${dbScheduledStartTime} から ${apiScheduledStartTime} に変更されました。`);
        isChanged = true;

        try {
          await handleScheduleChange(video_id, apiVideoInfo.scheduled_start_time);
        } catch (error) {
          console.error(`⛔️ リマインダー更新処理中にエラーが発生しました: ${error.message}`);
        }

      } else if (existingData.title !== apiVideoInfo.title) {
        description = generateDescriptionText(
          apiVideoInfo.liveBroadcastContent,
          apiVideoInfo.actual_start_time,
          apiVideoInfo.duration,
          `タイトルが ${existingData.title} から ${apiVideoInfo.title} に更新されました。`
        );
        console.log(`✅ タイトルが ${existingData.title} から ${apiVideoInfo.title} に変更されました。`);
        isChanged = true;
      }

      // データベースを更新
      const updateVideoData = {
        video_id: apiVideoInfo.videoId,
        title: apiVideoInfo.title,
        published: FeedPublished,
        updated: FeedUpdated,
        channel_id,
        status: apiVideoInfo.liveBroadcastContent,
        scheduled_start_time: apiVideoInfo.scheduled_start_time,
        actual_start_time: apiVideoInfo.actual_start_time,
        actual_end_time: apiVideoInfo.actual_end_time,
        duration: apiVideoInfo.duration,
      };

      await updateExistingVideoData(updateVideoData);

      // 通知を送信
      if (isChanged) {
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
      }

    } else {
      // 更新日時のみ変更する場合
      try {
        await updateVideoUpdatedTime(video_id, FeedUpdated);
      } catch (error) {
        console.error(`⛔️ updated カラムの更新中にエラーが発生しました: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`⛔️ checkAndUpdatevideo_data 処理中にエラーが発生しました: ${error.message}`);
  }
}
