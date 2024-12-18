import dotenv from "dotenv";
dotenv.config();

import pool from "../config/dbConfig.js"; // データベース接続設定をインポート

/**
 * 指定されたチャンネルIDのチャンネルアイコンURLを更新します。
 *
 * @async
 * @function updateChannelIcon
 * @param {string} thumbnailUrl - 更新するアイコンのURL
 * @param {number} channel_id - 更新対象のチャンネルID
 * @returns {Promise<boolean>} - 更新が成功した場合は `true`、失敗した場合は `false`
 * @throws {Error} - データベースクエリ中にエラーが発生した場合
 */
export async function updateChannelIcon(thumbnailUrl, channel_id) {
  const query = `
    UPDATE channels 
    SET channel_icon_url = $1 
    WHERE channel_id = $2
  `;
  const params = [thumbnailUrl, channel_id];

  try {
    const { rowCount } = await pool.query(query, params);

    if (rowCount > 0) {
      console.info(`✅ チャンネルアイコンがアップデートされました。 channel ID: ${channel_id}`);
      return true;
    } else {
      console.warn(`⚠️ No channel found to update for channel ID: ${channel_id}`);
      return false;
    }
  } catch (error) {
    console.error(`⛔️ Error updating channel icon for channel ID: ${channel_id}:`, error.message);
    throw new Error(`Failed to update channel icon: ${error.message}`);
  }
}
