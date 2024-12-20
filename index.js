// 環境変数の読み込み
import dotenv from "dotenv";
dotenv.config();

/**
 * Discord Bot を起動します。
 * ボットは Discord サーバーと接続して必要なタスクを実行します。
 */
import "./src/discord/bot.js";

/**
 * タスクのインポート
 * - `searchAndScheduleReminders`：リマインダーの検索とスケジュール設定を行います。
 * - `updateVideoStatuses`：動画データのステータスを更新します。
 * - `cleanUpVideoData`：古い動画データを削除します。
 * - `fetchAndStoreVideoData`：YouTubeデータを取得し、データベースに保存します。
 * - `getChannelsData`：チャンネルデータをデータベースから取得します。
 */
import { searchAndScheduleReminders } from "./src/tasks/reminderScheduler.js";
import { updateVideoStatuses } from "./src/tasks/updateVideoStatuses.js"; 
import { cleanUpVideoData } from "./src/tasks/cleanUpVideoData.js";
import { fetchAndStoreVideoData } from "./src/youtube/feed.js";
import { getChannelsData } from "./src/database/getChannelsData.js";
import schedule from "node-schedule";

/**
 * スケジュール間隔の定数
 * - `ONE_MINUTE_SCHEDULE`: 1分間隔で実行するスケジュール（リマインダーのスケジュール設定）
 * - `FIVE_MINUTE_SCHEDULE`: 5分間隔で実行するスケジュール（データのクリーンアップ）
 */
const ONE_MINUTE_SCHEDULE = "0 * * * * *"; // 1分ごと
const FIVE_MINUTE_SCHEDULE = "0 */5 * * * *"; // 5分ごと

/**
 * 1分ごとにリマインダーの検索と動画ステータスの更新を実行します。
 */
schedule.scheduleJob(ONE_MINUTE_SCHEDULE, function () {
  console.log(`-`.repeat(50));
  try {
    searchAndScheduleReminders();
    updateVideoStatuses();
  } catch (error) {
    console.error(`⛔️ Error during task execution: ${error.message}`);
  }
});

/**
 * 5分ごとに動画データをクリーンアップします。
 */
schedule.scheduleJob(FIVE_MINUTE_SCHEDULE, function () {
  try {
    cleanUpVideoData();
  } catch (error) {
    console.error(`⛔️ Error during task execution: ${error.message}`);
  }
});

/**
 * 現在のスケジュールジョブを保存します。
 * @type {Map<string, schedule.Job>} - CRON式とスケジュールジョブのマップ
 */
const activeSchedules = new Map();

/**
 * チャンネルテーブルの `interval_minutes` を基にスケジュールジョブを設定します。
 * - チャンネルデータを取得して、間隔ごとにグループ化します。
 * - グループごとにジョブを設定し、YouTubeデータを取得します。
 *
 * @async
 * @function setupSchedules
 * @returns {Promise<void>} - スケジュールの設定が完了すると解決されるPromise
 */
export async function setupSchedules() {
  try {
    // チャンネルデータを取得
    const channels = await getChannelsData();

    // 既存のスケジュールをクリア
    activeSchedules.forEach((job, cronExpression) => {
      job.cancel();
      activeSchedules.delete(cronExpression);
    });

    // interval_minutesごとにチャンネルをグループ化
    const groupedChannels = channels.reduce((acc, channel) => {
      const { interval_minutes } = channel;
      if (!acc[interval_minutes]) {
        acc[interval_minutes] = [];
      }
      acc[interval_minutes].push(channel);
      return acc;
    }, {});

    // グループごとにスケジュールを設定
    Object.entries(groupedChannels).forEach(([interval, channels]) => {
      const cronExpression = `*/${interval} * * * *`;
    
      const job = schedule.scheduleJob(cronExpression, async () => {
        const groupStartTimestamp = new Date();
    
        for (const channel of channels) {
          const { channel_id, channel_name, channel_icon_url, discord_webhook_url } = channel;

          try {
            // YouTubeデータを取得してデータベースに保存
            await fetchAndStoreVideoData(channel_id, channel_name, channel_icon_url, discord_webhook_url);
          } catch (error) {
            console.error(`⛔️ Error in fetchAndStoreVideoData for channel: ${channel_name}: ${error.message}`);
          }
        }
        // グループ全体の終了時刻と実行時間測定
        const groupElapsedMilliseconds = new Date() - groupStartTimestamp;
        console.log(`⏱️ YouTubeデータ検索と通知実行時間 更新間隔${interval}分グループ: ${groupElapsedMilliseconds / 1000}秒`);
      });
    
      activeSchedules.set(cronExpression, job);
    });    

    console.log(`✅ 取得グループを初期化しました。現在の取得グループ数: ${activeSchedules.size}`);
  } catch (error) {
    console.error(`⛔️ Error setting up schedules: ${error.message}`);
  }
}

/**
 * 初期スケジュール設定
 * - チャンネルデータを基に初期ジョブを登録します。
 */
setupSchedules();

/**
 * 1時間ごとにスケジュール設定をリロードします。
 * - データベースのチャンネル情報を再取得し、ジョブを更新します。
 */
schedule.scheduleJob("0 * * * *", setupSchedules);
