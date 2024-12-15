import fetch from "node-fetch";

const DEFAULT_ICON_URL = "https://www.youtube.com/s/desktop/28b0985e/img/favicon_144x144.png";
const YOUTUBE_BASE_URL = "https://www.youtube.com/watch?v=";

/**
 * Discord Webhook を使用して通知を送信します。
 *
 * @async
 * @function sendDiscordNotification
 * @param {Object} data - 通知データを含むオブジェクト
 * @param {string} data.channel - 通知元のチャンネル名
 * @param {string} data.video_id - 通知対象の動画 ID
 * @param {string} data.description_text - メッセージの説明テキスト
 * @param {string} channelIcon - チャンネルのアイコン URL (オプション)
 * @param {string} discord_webhook_url - Discord Webhook の URL
 * @returns {Promise<boolean>} - メッセージが送信された場合は `true`、エラーが発生した場合は `false`
 */
export async function sendDiscordNotification(data, channelIcon, discord_webhook_url) {
  const message = {
    username: data.channel,
    avatar_url: channelIcon || DEFAULT_ICON_URL,
    tts: false,
    wait: true,
    content: `[${data.description_text}](${YOUTUBE_BASE_URL}${data.video_id})`,
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  };

  try {
    const response = await fetch(discord_webhook_url, options);

    // ステータスコードのチェック
    if (!response.ok) {
      throw new Error(`Failed to send message: HTTP status ${response.status}`);
    }

    console.info("📤 Discord にメッセージを送信しました。");
    return true;
  } catch (error) {
    console.error("⛔️ Discord 通知送信中にエラーが発生しました:", error.message);
    return false;
  }
}
