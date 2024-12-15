import { formatDate } from "../utils/formatDate.js";

/**
 * APIの放送内容に基づいて、Discord用の説明テキストを生成します。
 *
 * @param {string} apiLiveBroadcastContent - 放送の種類 ('upcoming', 'live', 'archive', 'video', 'short')。
 * @param {Date|string} time - 放送の日時。
 * @param {string} convertedDuration - 放送の持続時間（例: '00:15:00'）。
 * @param {string} [specialMessage=''] - 特別な状況で使用するカスタムメッセージ（省略可能）。
 * @returns {string} - 生成された説明テキスト。
 */
export function generateDescriptionText(apiLiveBroadcastContent, time, convertedDuration, specialMessage = '') {
  // 特別なメッセージが提供されている場合はそれを優先的に返す
  if (specialMessage) {
    console.info(`Special message provided: ${specialMessage}`);
    return specialMessage;
  }

  // 放送タイプに応じてメッセージを生成
  switch (apiLiveBroadcastContent) {
    case "upcoming":
      return `${formatDate(time, "MM/DD HH:mm")}から配信予定！`;
    case "live":
      return `${formatDate(time, "HH:mm")}から配信中！`;
    case "archive":
      return `アーカイブはこちら\n配信時間: ${convertedDuration}`;
    case "video":
      return `動画が投稿されました\n動画時間: ${convertedDuration}`;
    case "short":
      return `ショート動画が投稿されました\n動画時間: ${convertedDuration}`;
    default:
      console.warn(`⚠️ Unknown broadcast content type: ${apiLiveBroadcastContent}`);
      return "新しいコンテンツが投稿されました！";
  }
}
