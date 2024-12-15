import pool from '../config/dbConfig.js';

/**
 * 古い動画データをクリーンアップします。
 * 
 * クリーンアップ対象:
 * - 'upcoming' ステータス: `scheduled_start_time` が 13 時間以上経過している動画
 * - 'live' ステータス: `actual_start_time` が 13 時間以上経過している動画
 *
 * @async
 * @function cleanUpVideoData
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
export async function cleanUpVideoData() {
  const startTimestamp = new Date(); 
  const thirteenHoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();

  try {
    const client = await pool.connect();

    try {
      // トランザクション開始
      await client.query("BEGIN");

      // クリーンアップ対象の動画を取得
      const upcomingVideos = await fetchOldVideos(client, "upcoming", thirteenHoursAgo, "scheduled_start_time");
      const liveVideos = await fetchOldVideos(client, "live", thirteenHoursAgo, "actual_start_time");

      // クリーンアップ対象をログ出力
      logOldVideos("upcoming", upcomingVideos);
      logOldVideos("live", liveVideos);

      // 古い動画データを削除
      await deleteOldVideos(client, "upcoming", thirteenHoursAgo, "scheduled_start_time");
      await deleteOldVideos(client, "live", thirteenHoursAgo, "actual_start_time");

      // トランザクションコミット
      await client.query("COMMIT");
    } catch (err) {
      // エラー発生時にロールバック
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("⛔️ 古い動画データのクリーンアップ中にエラーが発生しました:", err);
  }

  const elapsedSeconds = (Date.now() - startTimestamp) / 1000;
  console.log(`🕒 video_dataテーブルのクリーンアップ実行時間: ${elapsedSeconds}秒`);
}

/**
 * 古い動画データを取得します。
 *
 * @async
 * @function fetchOldVideos
 * @param {Object} client - データベースクライアント
 * @param {string} status - 動画のステータス ('upcoming' または 'live')
 * @param {string} cutoffTime - クリーンアップ対象となる時間の閾値 (ISO 8601 形式)
 * @param {string} timeColumn - 時間を基にクリーンアップする対象のカラム名
 * @returns {Promise<Array>} - クリーンアップ対象の動画データ配列
 */
async function fetchOldVideos(client, status, cutoffTime, timeColumn) {
  const query = `
    SELECT video_id, title
    FROM video_data
    WHERE status = $1
    AND ${timeColumn} < $2
  `;
  const { rows } = await client.query(query, [status, cutoffTime]);
  return rows;
}

/**
 * 古い動画データを削除します。
 *
 * @async
 * @function deleteOldVideos
 * @param {Object} client - データベースクライアント
 * @param {string} status - 動画のステータス ('upcoming' または 'live')
 * @param {string} cutoffTime - クリーンアップ対象となる時間の閾値 (ISO 8601 形式)
 * @param {string} timeColumn - 時間を基に削除する対象のカラム名
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
async function deleteOldVideos(client, status, cutoffTime, timeColumn) {
  const query = `
    DELETE FROM video_data
    WHERE status = $1
    AND ${timeColumn} < $2
  `;
  await client.query(query, [status, cutoffTime]);
}

/**
 * クリーンアップ対象の動画をログ出力します。
 *
 * @function logOldVideos
 * @param {string} status - 動画のステータス ('upcoming' または 'live')
 * @param {Array} videos - クリーンアップ対象の動画データ配列
 */
function logOldVideos(status, videos) {
  if (videos.length > 0) {
    console.log(`🗑️ ${videos.length}件の削除対象の ${status} ステータスの動画:`);
    videos.forEach(({ title, video_id }) => {
      console.log(`  - タイトル: ${title}, Video_ID: ${video_id}`);
    });
  }
}
