import pool from '../config/dbConfig.js';  // データベース接続設定をインポート
import { formatDate } from '../utils/formatDate.js';

/**
 * 指定された条件に一致するリマインダーがデータベースに存在するかどうかを確認します。
 * @param {number} userId - ユーザーのIDです。
 * @param {Date} reminderTime - リマインダーの予定時刻です。
 * @param {string} videoId - リマインダーに関連付けられたビデオのIDです。
 * @returns {Promise<boolean>} - リマインダーが存在する場合はtrue、そうでない場合はfalseを返します。
 */
async function checkReminderExists(userId, videoId) {
  const query = `
    SELECT 1 FROM reminder
    WHERE user_id = $1 AND video_id = $2;
  `;
  const { rows } = await pool.query(query, [userId, videoId]);
  return rows.length > 0;
}

/**
 * 既存のリマインダーが与えられた条件と一致しない場合に新しいリマインダーを登録します。
 * @param {number} userId - ユーザーのIDです。
 * @param {Date} reminderTime - リマインダーの予定時刻です。
 * @param {string} videoId - リマインダーに関連付けられたビデオのIDです。
 * @returns {Promise<number|string>} - 新しく作成されたリマインダーのID、または既に存在する場合は'exists'を返します。
 */
export async function registerReminder(userId, videoId) {
  if (await checkReminderExists(userId, videoId)) {
    console.log(`⛔️ 既に同じリマインダーが存在します。`);
    return 'exists';
  } else {
    const query = `
      INSERT INTO reminder (user_id, scheduled, executed, video_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    try {
      const result = await pool.query(query, [userId, false, false, videoId]);
      const reminderId = result.rows[0].id;
      console.log(`✅ リマインダーをデータベースに登録しました。${reminderId}`);
      return reminderId;
    } catch (error) {
      console.error('⛔️ リマインダーのデータベース登録中にエラーが発生しました:', error);
      throw error;
    }
  }
}

/**
 * データベース内のリマインダーのフラグを更新します。
 * @param {number} reminderId - 更新するリマインダーのIDです。
 * @param {string} flagType - 更新するフラグの種類です（'executed' または 'scheduled'）。
 * @returns {Promise<void>} - 更新が成功した場合はundefinedを返し、失敗した場合はエラーをスローします。
 */
export async function updateReminderFlag(reminderId, flagType) {
  const flagColumn = flagType === 'executed' ? 'executed' : 'scheduled';
  const query = `
    UPDATE reminder
    SET ${flagColumn} = true
    WHERE id = $1
  `;
  try {
    const result = await pool.query(query, [reminderId]);
    if (result.rowCount > 0) {
      console.log(`✅ リマインダーID:${reminderId} の${flagColumn}フラグをtrueに更新しました。`);
    } else {
      console.log(`⛔️ リマインダーID:${reminderId} の${flagColumn}フラグの更新に失敗しました。`);
    }
  } catch (error) {
    console.error(`⛔️ リマインダーID:${reminderId} の${flagColumn}フラグ更新中にエラーが発生しました:`, error);
    throw error;
  }
}

// この関数を使用して、scheduled または executed フラグを更新
export const updateReminderScheduled = (reminderId) => updateReminderFlag(reminderId, 'scheduled');
export const updateReminderExecuted = (reminderId) => updateReminderFlag(reminderId, 'executed');

/**
 * 特定のvideoIdを持つ未実行のリマインダーを検索します。
 * @param {string} videoId - 検索するリマインダーのビデオIDです。
 * @returns {Promise<Array>} - 該当するリマインダーの配列を返します。何も見つからない場合は空の配列を返します。
 */
export async function searchRemindersByvideoId(videoId) {
  const query = `
    SELECT * FROM reminder
    WHERE video_id = $1 AND executed = false
  `;
  const params = [videoId];

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('⛔️ リマインダーの検索中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * 複数の条件を用いてリマインダーを検索します。
 * @param {Object} options - 検索オプションを指定するオブジェクトです。
 * @param {boolean|null} options.scheduled - スケジュールされたリマインダーのみを対象にするかどうかです。
 * @param {boolean} options.executed - 実行済みのリマインダーを対象にするかどうかです。
 * @param {number|null} options.userId - ユーザーIDによるフィルタリングです。
 * @param {number|null} options.withinNextMinutes - 現在時刻から指定した分数以内に設定されたリマインダーを検索します。
 * @returns {Promise<Array>} - 条件に一致するリマインダーの配列を返します。何も見つからない場合は空の配列を返します。
 */
export async function searchReminders({ scheduled = null, executed = false, userId = null, withinNextMinutes = null }) {
  let query = `
    SELECT r.*, vd.scheduled_start_time
    FROM reminder r
    JOIN video_data vd ON r.video_id = vd.video_id
    WHERE r.executed = $1
  `;
  const params = [executed];

  // scheduledの条件を追加
  if (scheduled !== null) {
    query += ` AND r.scheduled = $${params.length + 1}`;
    params.push(scheduled);
  }

  if (userId) {
    query += ` AND r.user_id = $${params.length + 1}`;
    params.push(userId);
  }

  if (withinNextMinutes !== null) {
    query += ` AND vd.scheduled_start_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '${withinNextMinutes} minutes'`;
  }

  query += ` ORDER BY vd.scheduled_start_time ASC`;

  try {
    const { rows } = await pool.query(query, params);

    // reminder_timeをscheduled_start_timeの5分前に設定し、message_contentを生成
    const reminders = rows.map(row => {
      const reminderTime = new Date(new Date(row.scheduled_start_time).getTime() - 5 * 60 * 1000);
      const formattedScheduledStartTime = formatDate(row.scheduled_start_time, 'MM/DD HH:mm');
      const messageContent = `[${formattedScheduledStartTime}から配信予定！](https://www.youtube.com/watch?v=${row.video_id})`;

      return {
        ...row,
        reminder_time: reminderTime,
        message_content: messageContent
      };
    });

    return reminders;
  } catch (error) {
    console.error('⛔️ リマインダーの検索中にエラーが発生しました:', error);
    throw error;
  }
}
