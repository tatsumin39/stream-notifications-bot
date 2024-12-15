import pool from '../config/dbConfig.js';

/**
 * アクティブなチャンネル情報を 'channels' テーブルから取得します。
 * 
 * 条件:
 * - `is_active` が `true` のチャンネル
 * - `interval_minutes` が設定されており、値が 0 より大きい
 * 
 * 結果:
 * - チャンネル情報に対応する Discord Webhook URL も取得します。
 *
 * @async
 * @function getChannelsData
 * @returns {Promise<Array<Object>>} - アクティブなチャンネルデータの配列
 * @throws {Error} - データベースクエリでエラーが発生した場合
 */
export const getChannelsData = async () => {
  const query = `
    SELECT 
      c.channel_id, 
      c.channel_name, 
      c.channel_icon_url, 
      c.interval_minutes, 
      dw.discord_webhook_url
    FROM 
      channels c
    INNER JOIN 
      discord_webhooks dw
    ON 
      c.discord_channel_name = dw.discord_channel_name
    WHERE 
      c.is_active = true 
      AND c.interval_minutes IS NOT NULL 
      AND c.interval_minutes > 0
    ORDER BY 
      c.sort_order ASC
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    logDatabaseError(error, "fetching channels data");
    throw new Error("Failed to fetch channels data. Please try again later.");
  }
};

/**
 * データベースクエリのエラーをロギングします。
 *
 * @function logDatabaseError
 * @param {Error} error - データベースクエリで発生したエラー
 * @param {string} context - エラーが発生した操作の文脈 (例: "fetching channels data")
 */
function logDatabaseError(error, context) {
  console.error(`⛔️ Database Error (${context}): ${error.message}`);
}
