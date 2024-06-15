import dotenv from 'dotenv';
dotenv.config();

import pool from '../config/dbConfig.js';  // データベース接続設定をインポート

/**
 * 指定されたチャンネルIDのチャンネルアイコンのURLを更新します。
 * @param {string} thumbnailUrl - 更新するアイコンのURL。
 * @param {number} channel_id - 更新するチャンネルのID。
 * @returns {Promise<boolean>} - 更新が成功した場合はtrue、失敗した場合はfalseを返します。
 */
export async function updateChannelIcon(thumbnailUrl, channel_id) {
  try {
    const result = await pool.query(
      'UPDATE channels SET channel_icon_url = $1 WHERE channel_id = $2',
      [thumbnailUrl, channel_id]
    );
    if (result.rowCount > 0) {
      console.log(`チャンネルID ${channel_id} のアイコンが更新されました。`);
      return true;
    } else {
      console.log(`チャンネルID ${channel_id} のアイコン更新に失敗しました。`);
      return false;
    }
  } catch (error) {
    console.error(`チャンネルID ${channel_id} のアイコン更新中にエラーが発生しました: ${error.message}`);
    return false;
  }
}
