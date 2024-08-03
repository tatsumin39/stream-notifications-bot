import pool from '../config/dbConfig.js'; 
import { fetchVideoInfo } from '../youtube/api.js';

/**
 * 指定されたビデオIDがデータベースに存在するかどうかを確認します。
 * @param {string} videoId - 確認するビデオのID。
 * @returns {Promise<boolean>} - ビデオが存在する場合はtrue、存在しない場合はfalseを返します。
 */
export async function checkVideoExists(videoId) {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM video_data WHERE video_id = $1
    )`;
  try {
    const { rows } = await pool.query(query, [videoId]);
    return rows[0].exists;
  } catch (error) {
    console.error(`⛔️ ビデオID ${videoId} の存在確認中にエラーが発生しました: ${error.message}`);
    return false;
  }
}

/**
 * ビデオIDに基づいてデータベースからビデオデータを取得します。存在しない場合はYouTube APIから取得して返します。
 * @param {string} videoId - 取得するビデオのID。
 * @returns {Promise<Object>} - ビデオデータが含まれるオブジェクト、または存在しない場合はnull。
 */
export async function getVideoDataIfExists(videoId) {
  const query = `
    SELECT *
    FROM video_data
    WHERE video_id = $1;
  `;
  const { rows } = await pool.query(query, [videoId]);
  
  if (rows.length > 0) {
    // データベースにビデオIDが存在する場合、そのレコードを返す
    const video_data = rows[0];
    return { exists: true, ...video_data };
  } else {
    try {
      // データベースにビデオIDが存在しない場合、YouTube Data APIから情報を取得
      const videoInfo = await fetchVideoInfo(videoId);

      if (!videoInfo) {
        console.log(`⛔️ ビデオ情報が見つかりませんでした - ビデオID: ${videoId}`);
        return { exists: false };
      }

      // APIから取得した情報を返す
      return {
        exists: false,
        video_id: videoInfo.videoId,
        status: videoInfo.liveBroadcastContent,
        scheduled_start_time: videoInfo.scheduled_start_time,
        actual_start_time: videoInfo.actual_start_time,
        actual_end_time: videoInfo.actual_end_time,
        title: videoInfo.title,
        duration: videoInfo.duration
      };
    } catch (error) {
      console.error(`Error fetching video info for video ID: ${videoId}`, error.message);
      return { exists: false };
    }
  }
}

/**
 * 新しいビデオデータをデータベースに挿入します。
 * @param {Object} videoData - 挿入するビデオデータを含むオブジェクト。
 * @returns {Promise<void>} - 挿入成功時にはundefinedを返し、エラー発生時にはエラーをスローします。
 */
export async function insertNewVideoData({ video_id, title, published, updated, channel, status, scheduledStartTime, actual_start_time, actual_end_time, duration }) {
  const params = [
    video_id,
    title,
    published,
    updated,
    channel,
    status,
    scheduledStartTime || null,
    actual_start_time || null,
    actual_end_time || null,
    duration || null
  ];
  const query = `
  INSERT INTO video_data (video_id, title, published, updated, channel, status, scheduled_start_time, actual_start_time, actual_end_time, duration)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8,  $9, $10)`;
  try {
    await pool.query(query, params);
    console.log(`🆕  新規データ挿入が成功しました。 タイトル:${title} Video_ID:${video_id}`);
  } catch (error) {
    console.error(`⛔️ 新規データ挿入中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * 既存のビデオデータを更新します。
 * @param {Object} videoData - 更新するビデオデータを含むオブジェクト。
 * @returns {Promise<void>} - 更新成功時にはundefinedを返し、エラー発生時にはエラーをスローします。
 */
export async function updateExistingVideoData({ video_id, title, published, updated, channel, status, scheduled_start_time, actual_start_time, actual_end_time, duration }) {
  const query = `
    UPDATE video_data
    SET title = $2, published = $3::timestamp with time zone, updated = $4::timestamp with time zone, channel = $5, status = $6, scheduled_start_time = $7::timestamp with time zone, actual_start_time = $8::timestamp with time zone, actual_end_time = $9::timestamp with time zone, duration = $10
    WHERE video_id = $1`;
  const params = [
    video_id,
    title,
    published,
    updated,
    channel,
    status,
    scheduled_start_time || null,
    actual_start_time || null,
    actual_end_time || null,
    duration || null,
  ];
  try {
    const result = await pool.query(query, params);
    if (result.rowCount === 0) {
      console.log(`⛔️ 更新対象が見つかりませんでした: ${video_id}`);
    } else {
      console.log(`🆙  既存データの更新が成功しました。 タイトル:${title} Video_ID:${video_id}`);
    }
  } catch (error) {
    console.error('⛔️ 既存データ更新中にエラーが発生しました:', error.message);
  }
}

/**
 * 特定のビデオIDのupdatedカラムのみを更新します。
 * @param {string} videoId - 更新するビデオのID。
 * @param {Date} updated - 新しい更新日時。
 * @returns {Promise<void>} - 更新成功時にはundefinedを返し、エラー発生時にはエラーをスローします。
 */
export async function updateVideoUpdatedTime(video_id, updated) {
  // SQLクエリを使用して、特定のvideo_idに対する`updated`カラムのみを更新
  const query = `UPDATE video_data SET updated = $1 WHERE video_id = $2`;
  try {
    const result = await pool.query(query, [updated, video_id]);
  } catch (error) {
    console.error(`⛔️ Error updating 'updated' time for video_id: ${video_id}:`, error);
    throw error;
  }
}

/**
 * 現在配信中のビデオデータを取得します。
 * @returns {Promise<Array>} - 配信中のビデオデータを含む配列を返します。
 */
export async function getLiveData() {
    const query = "SELECT title, video_id FROM video_data WHERE status = 'live' ORDER BY actual_start_time ASC";
    const { rows } = await pool.query(query);
    return rows;
}

/**
 * 近くに配信予定のビデオデータを取得します。
 * @param {number} minutes - 現在時刻から検索する分数。
 * @returns {Promise<Array>} - 配信予定のビデオデータを含む配列を返します。
 */
export async function getUpcomingData(minutes = 15) {
    const query = `
        SELECT title, video_id, scheduled_start_time 
        FROM video_data 
        WHERE status = 'upcoming' 
        AND scheduled_start_time > NOW() 
        AND scheduled_start_time <= NOW() + INTERVAL '${minutes} minutes' 
        ORDER BY scheduled_start_time ASC
    `;
    const { rows } = await pool.query(query);
    return rows;
}
