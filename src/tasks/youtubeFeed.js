import { fetchAndStoreVideoData } from '../youtube/feed.js';

/**
 * YouTubeデータを取得して保存する関数を呼び出し、その処理の実行時間を計測します。
 * @param {string} webhookUrl - YouTubeデータ取得に使用するWebhook URL
 */
export async function startYoutubeFeed(DISCORD_CHANNEL_NAME, DISCORD_WEBHOOK_URL) {
  const startTimestamp = new Date(); // 開始時刻のタイムスタンプ

  try {
      await fetchAndStoreVideoData(DISCORD_CHANNEL_NAME, DISCORD_WEBHOOK_URL);
  } catch (error) {
      console.error('⛔️ YouTubeデータの取得中にエラーが発生しました:', error.message);
  }

  const endTimestamp = new Date(); // 終了時刻のタイムスタンプ

  const elapsedMilliseconds = endTimestamp - startTimestamp;
  const elapsedSeconds = elapsedMilliseconds / 1000;

  console.log(`YouTubeデータ検索と通知実行時間 ${DISCORD_CHANNEL_NAME}: ${elapsedSeconds}秒`);
}
