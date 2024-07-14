// 必要なモジュールのインポート
import pool from '../config/dbConfig.js';  // データベース設定

/**
 * 'channels'テーブルから情報を取得する関数
 * @param {string} [DISCORD_CHANNEL_NAME] - オプションのWebhook URLでフィルタリング
 * @returns {Promise<Array>} - 取得したチャンネルデータの配列
 */
export const getChannelsData = async (DISCORD_CHANNEL_NAME) => {
  let query = `SELECT * FROM channels`;
  const params = [];

  if (DISCORD_CHANNEL_NAME) {
    query += ` WHERE discord_channel_name = $1`;
    params.push(DISCORD_CHANNEL_NAME);
  }

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error(`⛔️ Error getting channels data: ${error.message}`);
    return [];
  }
};
