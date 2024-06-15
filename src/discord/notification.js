import fetch from 'node-fetch';

/**
 * 指定されたデータを使ってDiscordチャンネルに通知を送信します。
 * @param {Object} data - 通知に必要なデータを含むオブジェクトです。
 * @param {string} channelIcon - 通知に使用するチャンネルのアイコンURLです。
 * @param {string} DISCORD_WEBHOOK_URL - 通知を送信するDiscordチャンネルのIDです。
 * @returns {Promise<boolean>} - 通知が成功した場合はtrue、失敗した場合はfalseを返します。
 */
export async function sendDiscordNotification(data, channelIcon, DISCORD_WEBHOOK_URL) {
  
  const youtube_url = 'https://www.youtube.com/watch?v='

  const message = {
    username: data.channel,
    avatar_url: channelIcon || "https://www.youtube.com/s/desktop/28b0985e/img/favicon_144x144.png",
    tts: false,
    wait: true,
    content: `[${data.description_text}](${youtube_url}${data.video_id})`,
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`📤  Discordにメッセージを送信しました。`);
    return true;
  } catch (error) {
    console.error(`エラーが発生しました - エラーメッセージ: ${error.message}`);
    return false;
  }
}
