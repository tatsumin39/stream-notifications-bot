import { formatDate } from '../utils/formatDate.js';

/**
 * APIの放送内容に基づいて、Discordへの投稿テキストを生成します。
 * 特定のメッセージが提供された場合、そのメッセージを返します。
 * @param {string} apiLiveBroadcastContent - APIからの放送の種類('upcoming', 'live', 'archive', 'video')。
 * @param {Date|string} time - 放送の日時。
 * @param {string} convertedDuration - 放送の持続時間を示す文字列。
 * @param {string} [specialMessage=''] - 特別な状況で使用するカスタムメッセージ。
 * @returns {string} - 生成された説明テキスト。
 */
export function generateDescriptionText(apiLiveBroadcastContent, time, convertedDuration, specialMessage = '') {
  if (specialMessage) {
    console.log(specialMessage);
    return specialMessage;
  }

  switch (apiLiveBroadcastContent) {
    case 'upcoming':
      return `${formatDate(time, 'MM/DD HH:mm')}から配信予定！`;
    case 'live':
      return `${formatDate(time, 'HH:mm')}から配信中！`;
    case 'archive':
      return `アーカイブはこちら\n配信時間 ${convertedDuration}`;
    case 'video':
      return `動画が投稿されました\n動画時間 ${convertedDuration}`;
    default:
      console.warn(`Unknown broadcast content type: ${apiLiveBroadcastContent}`);
      return '新しいコンテンツが投稿されました！';
  }
}
