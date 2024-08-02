import { fetchVideoInfo } from './api.js';
import { generateDescriptionText } from '../discord/messages.js';
import { sendDiscordNotification } from '../discord/notification.js';
import { handleScheduleChange } from '../discord/reminderInteractions.js';
import { getVideoDataIfExists, updateExistingVideoData, updateVideoUpdatedTime } from '../database/videoData.js';
import { formatDate } from '../utils/formatDate.js';

// ビデオ情報の更新を確認し、Discordに投稿するロジック
export async function checkAndUpdatevideo_data(data, channel_icon_url, DISCORD_WEBHOOK_URL) {
  const [title, FeedPublished, FeedUpdated, video_id, channel_name, live, scheduled_start_time, actual_start_time] = data;

  const existingData = await getVideoDataIfExists(video_id);
  const rssUpdatedDate = new Date(FeedUpdated).getTime();
  const dbUpdatedDate = new Date(existingData.updated).getTime();

  if (rssUpdatedDate !== dbUpdatedDate) {
    if (live == 'none' || live == 'upcoming' || live == 'live') {
      const apiVideoInfo = await fetchVideoInfo(video_id);
      if (!apiVideoInfo) {
        console.log(`⛔️ ビデオ情報が見つかりませんでした - ビデオID: ${video_id}`);
        return;
      }

      if (apiVideoInfo.liveBroadcastContent === 'none') {
        console.log(`⛔️ 無効なビデオステータスのため処理を中断しました - ビデオID: ${video_id}`);
        return;
      }

      let description;
      let isChanged = false;

      const dbscheduled_start_time = new Date(existingData.scheduled_start_time).getTime();
      const apischeduled_start_time = new Date(apiVideoInfo.scheduled_start_time).getTime();

      if (existingData.live != apiVideoInfo.liveBroadcastContent) {
        description = generateDescriptionText(apiVideoInfo.liveBroadcastContent, apiVideoInfo.actual_start_time, apiVideoInfo.duration);
        console.log(`✅ アップデートチェック：Live状態が${existingData.live}から${apiVideoInfo.liveBroadcastContent}に変更されました。`);
        isChanged = true;

      } else if (apiVideoInfo.liveBroadcastContent == 'upcoming' && dbscheduled_start_time !== apischeduled_start_time) {
        description = generateDescriptionText(apiVideoInfo.liveBroadcastContent, apiVideoInfo.actual_start_time, apiVideoInfo.duration, `配信予定が${formatDate(apiVideoInfo.scheduled_start_time, 'MM/DD HH:mm')}に変更されました。`);
        console.log(`✅ アップデートチェック：配信予定が${dbscheduled_start_time}から${apischeduled_start_time}に変更されました。`);
        isChanged = true;

        try {
          await handleScheduleChange(video_id, apiVideoInfo.scheduled_start_time);
        } catch (error) {
          console.error(`⛔️ 配信予定時刻の変更に伴うリマインダー更新処理中にエラーが発生しました: ${error.message}`);
        }
      } else if (existingData.title !== apiVideoInfo.title) {
        if (apiVideoInfo.liveBroadcastContent === 'live') {
          description = generateDescriptionText(apiVideoInfo.liveBroadcastContent, apiVideoInfo.actual_start_time, apiVideoInfo.duration, `配信中タイトルが${apiVideoInfo.title}に更新されました。`);
          console.log(`✅ アップデートチェック：配信中タイトルが${existingData.title}から、${apiVideoInfo.title}に変更されました。`);
          isChanged = true;
        } else if (apiVideoInfo.liveBroadcastContent === 'upcoming') {
          description = generateDescriptionText(apiVideoInfo.liveBroadcastContent, apiVideoInfo.actual_start_time, apiVideoInfo.duration, `${formatDate(apiVideoInfo.scheduled_start_time, 'MM/DD HH:mm')}から配信予定のタイトルが以下に更新されました。\n${apiVideoInfo.title}`);
          console.log(`✅ アップデートチェック：${apischeduled_start_time}から配信予定タイトルが${existingData.title}から、${apiVideoInfo.title}に変更されました。`);
          isChanged = true;
        } 
      } else {
        console.log(`✅ アップデートチェック：タイトル:${apiVideoInfo.title} Video_ID:${video_id}は変更はありませんでした。`);
      }

      const updatevideo_data = {
        video_id: apiVideoInfo.videoId,
        title: apiVideoInfo.title,
        published: FeedPublished,
        updated: FeedUpdated,
        channel: channel_name,
        live: apiVideoInfo.liveBroadcastContent,
        scheduled_start_time: apiVideoInfo.scheduled_start_time,
        actual_start_time: apiVideoInfo.actual_start_time,
        duration: apiVideoInfo.duration
      };

      await updateExistingVideoData(updatevideo_data);

      if (isChanged) {
        await sendDiscordNotification({
          channel: channel_name,
          title: apiVideoInfo.title,
          video_id: apiVideoInfo.videoId,
          description_text: description
        }, channel_icon_url, DISCORD_WEBHOOK_URL);
      }
    } else {
      try {
        await updateVideoUpdatedTime(video_id, FeedUpdated);
      } catch (error) {
        console.error('⛔️ updatedカラムの更新中にエラーが発生しました:', error.message);
      }
    }
  }
}
