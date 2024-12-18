import pool from '../config/dbConfig.js'; 
import { fetchVideoInfo } from '../youtube/api.js';

/**
 * 指定されたビデオIDがデータベースに存在するかどうかを確認します。
 *
 * @async
 * @function checkVideoExists
 * @param {string} videoId - 確認するビデオのID
 * @returns {Promise<boolean>} - ビデオが存在する場合は true、存在しない場合は false を返します
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
    console.error(`⛔️ Error checking video existence (Video_ID: ${videoId}):`, error.message);
    return false;
  }
}

/**
 * 指定されたビデオIDのデータを取得します。
 * 存在しない場合は YouTube API を使用してデータを取得します。
 *
 * @async
 * @function getVideoDataIfExists
 * @param {string} videoId - 取得するビデオのID
 * @returns {Promise<Object>} - データベースまたは API から取得したビデオデータ
 */
export async function getVideoDataIfExists(videoId) {
  const query = `
    SELECT *
    FROM video_data
    WHERE video_id = $1;
  `;
  try {
    const { rows } = await pool.query(query, [videoId]);

    if (rows.length > 0) {
      return { exists: true, ...rows[0] };
    }

    // データベースに存在しない場合、YouTube API を使用して取得
    const videoInfo = await fetchVideoInfo(videoId);
    if (!videoInfo) {
      console.warn(`⛔️ Video information not found via API (Video_ID: ${videoId})`);
      return { exists: false };
    }

    return {
      exists: false,
      video_id: videoInfo.videoId,
      status: videoInfo.liveBroadcastContent,
      scheduled_start_time: videoInfo.scheduled_start_time,
      actual_start_time: videoInfo.actual_start_time,
      actual_end_time: videoInfo.actual_end_time,
      title: videoInfo.title,
      duration: videoInfo.duration,
    };
  } catch (error) {
    console.error(`⛔️ Error retrieving video data (Video_ID: ${videoId}):`, error.message);
    return { exists: false };
  }
}

/**
 * 新しいビデオデータをデータベースに挿入します。
 *
 * @async
 * @function insertNewVideoData
 * @param {Object} videoData - 挿入するビデオデータ
 * @returns {Promise<void>} - 挿入成功時は undefined を返します
 */
export async function insertNewVideoData(videoData) {
  const {
    video_id,
    title,
    published,
    updated,
    channel_id,
    status,
    scheduled_start_time,
    actual_start_time,
    actual_end_time,
    duration,
  } = videoData;

  const query = `
    INSERT INTO video_data (video_id, title, published, updated, channel_id, status, scheduled_start_time, actual_start_time, actual_end_time, duration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
  const params = [
    video_id,
    title,
    published,
    updated,
    channel_id,
    status,
    scheduled_start_time || null,
    actual_start_time || null,
    actual_end_time || null,
    duration || null,
  ];

  try {
    await pool.query(query, params);
    console.info(`🆕 新規ビデオデータを登録しました。 : Title: ${title}, Video_ID: ${video_id}`);
  } catch (error) {
    console.error(`⛔️ Error inserting video data (Video_ID: ${video_id}):`, error.message);
  }
}

/**
 * 既存のビデオデータを更新します。
 *
 * @async
 * @function updateExistingVideoData
 * @param {Object} videoData - 更新するビデオデータ
 * @returns {Promise<void>} - 更新成功時は undefined を返します
 */
export async function updateExistingVideoData(videoData) {
  const {
    video_id,
    title,
    published,
    updated,
    channel_id,
    status,
    scheduled_start_time,
    actual_start_time,
    actual_end_time,
    duration,
  } = videoData;

  const query = `
    UPDATE video_data
    SET title = $2, published = $3, updated = $4, channel_id = $5, status = $6, scheduled_start_time = $7, actual_start_time = $8, actual_end_time = $9, duration = $10
    WHERE video_id = $1
  `;
  const params = [
    video_id,
    title,
    published,
    updated,
    channel_id,
    status,
    scheduled_start_time || null,
    actual_start_time || null,
    actual_end_time || null,
    duration || null,
  ];

  try {
    const result = await pool.query(query, params);
    if (result.rowCount === 0) {
      console.warn(`⛔️ No record found to update (Video_ID: ${video_id})`);
    } else {
      console.info(`🆙 ビデオデータがアップデートされました。 Title: ${title}, (Video_ID: ${video_id})`);
    }
  } catch (error) {
    console.error(`⛔️ Error updating video data (Video_ID: ${video_id}):`, error.message);
  }
}

/**
 * 指定されたビデオの updated カラムのみを更新します。
 *
 * @async
 * @function updateVideoUpdatedTime
 * @param {string} videoId - 更新するビデオのID
 * @param {Date} updated - 新しい更新日時
 * @returns {Promise<void>} - 更新成功時は undefined を返します
 */
export async function updateVideoUpdatedTime(videoId, updated) {
  const query = `UPDATE video_data SET updated = $1 WHERE video_id = $2`;
  try {
    await pool.query(query, [updated, videoId]);
    console.info(`🆙 ビデオデータのupdated timeが更新されました。 (Video_ID: ${videoId})`);
  } catch (error) {
    console.error(`⛔️ Error updating updated time (Video_ID: ${videoId}):`, error.message);
    throw error;
  }
}

/**
 * 現在配信中のビデオデータを取得します。
 *
 * @async
 * @function getLiveData
 * @returns {Promise<Array>} - 配信中のビデオデータを含む配列
 */
export async function getLiveData() {
  const query = `
    SELECT title, video_id
    FROM video_data
    WHERE status = 'live'
    ORDER BY actual_start_time ASC
  `;
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("⛔️ Error fetching live video data:", error.message);
    return [];
  }
}

/**
 * 指定された分以内に配信予定のビデオデータを取得します。
 *
 * @async
 * @function getUpcomingData
 * @param {number} [minutes=15] - 現在時刻からの分数
 * @returns {Promise<Array>} - 配信予定のビデオデータを含む配列
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
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error(`⛔️ Error fetching upcoming video data (Next ${minutes} minutes):`, error.message);
    return [];
  }
}