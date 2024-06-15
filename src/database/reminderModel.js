import pool from '../config/dbConfig.js';  // データベース接続設定をインポート

/**
 * 指定された条件に一致するリマインダーがデータベースに存在するかどうかを確認します。
 * @param {number} userId - ユーザーのIDです。
 * @param {string} messageContent - リマインダーのメッセージ内容です。
 * @param {Date} reminderTime - リマインダーの予定時刻です。
 * @param {string} videoId - リマインダーに関連付けられたビデオのIDです。
 * @returns {Promise<boolean>} - リマインダーが存在する場合はtrue、そうでない場合はfalseを返します。
 */
async function checkReminderExists(userId, messageContent, reminderTime, videoId) {
  const query = `
    SELECT 1 FROM reminder
    WHERE user_id = $1 AND message_content = $2 AND reminder_time = $3 AND video_id = $4;
  `;
  const { rows } = await pool.query(query, [userId, messageContent, reminderTime, videoId]);
  return rows.length > 0;
}

/**
 * 既存のリマインダーが与えられた条件と一致しない場合に新しいリマインダーを登録します。
 * @param {number} userId - ユーザーのIDです。
 * @param {string} messageContent - リマインダーのメッセージ内容です。
 * @param {Date} reminderTime - リマインダーの予定時刻です。
 * @param {string} videoId - リマインダーに関連付けられたビデオのIDです。
 * @returns {Promise<number|string>} - 新しく作成されたリマインダーのID、または既に存在する場合は'exists'を返します。
 */
export async function registerReminder(userId, messageContent, reminderTime, videoId) {
  if (await checkReminderExists(userId, messageContent, reminderTime, videoId)) {
    console.log(`既に同じリマインダーが存在します。`);
    return 'exists';
  } else {
    const query = `
      INSERT INTO reminder (user_id, message_content, reminder_time, scheduled, executed, video_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    try {
      const result = await pool.query(query, [userId, messageContent, reminderTime, false, false, videoId]);
      const reminderId = result.rows[0].id;
      console.log(`リマインダーをデータベースに登録しました。${reminderId}`);
      return reminderId;
    } catch (error) {
      console.error('リマインダーのデータベース登録中にエラーが発生しました:', error);
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
      console.log(`リマインダーID ${reminderId} の${flagColumn}フラグをtrueに更新しました。`);
    } else {
      console.log(`リマインダーID ${reminderId} の${flagColumn}フラグの更新に失敗しました。`);
    }
  } catch (error) {
    console.error(`リマインダーID ${reminderId} の${flagColumn}フラグ更新中にエラーが発生しました:`, error);
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
    console.error('リマインダーの検索中にエラーが発生しました:', error);
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
    SELECT * FROM reminder
    WHERE executed = $1
  `;
  const params = [executed];

  // scheduledの条件を追加
  if (scheduled !== null) {
    query += ` AND scheduled = $${params.length + 1}`;
    params.push(scheduled);
  }

  if (userId) {
    query += ` AND user_id = $${params.length + 1}`;
    params.push(userId);
  }

  if (withinNextMinutes !== null) {
    query += ` AND reminder_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '${withinNextMinutes} minutes'`;
  }

  query += ` ORDER BY reminder_time ASC`;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('Error searching reminders:', error);
    throw error;
  }
}

/**
 * 指定されたリマインダーの通知時刻とメッセージ内容を更新します。
 * @param {number} reminderId - 更新するリマインダーのIDです。
 * @param {string} newScheduledTimeString - 新しいスケジュール時刻を表す文字列です。
 * @param {string} updatedMessageContent - 更新するメッセージ内容です。
 * @returns {Promise<void>} - 更新が成功した場合はundefinedを返し、失敗した場合はエラーをスローします。
 */
export async function updateReminderTime(reminderId, newScheduledTimeString, updatedMessageContent) {
  // 文字列形式のnewScheduledTimeStringをDateオブジェクトに変換
  const newScheduledTime = new Date(newScheduledTimeString);
  // 新しいリマインダー時刻を計算（配信予定時刻の5分前）
  const newReminderTime = new Date(newScheduledTime.getTime() - 5 * 60 * 1000);
  // リマインダー時刻とmessage_contentをデータベースで更新
  const query = `
      UPDATE reminder
      SET reminder_time = $2, message_content = $3
      WHERE id = $1
  `;
  try {
      await pool.query(query, [reminderId, newReminderTime, updatedMessageContent]);
      console.log(`リマインダーの通知時刻とメッセージを更新しました: Reminder ID ${reminderId}`);
  } catch (error) {
      console.error(`リマインダーの通知時刻とメッセージの更新に失敗しました: Reminder ID ${reminderId} - ${error}`);
      throw error;
  }
}
