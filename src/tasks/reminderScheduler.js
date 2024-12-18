import { searchReminders, updateReminderFlag } from "../database/reminderModel.js";
import { scheduleReminder } from "../reminders/schedule.js";

// リマインダー検索の間隔（分）。デフォルトは 10 分。
const REMINDER_SEARCH_INTERVAL = process.env.REMINDER_SEARCH_INTERVAL || 10;

/**
 * リマインダーをスケジュールし、データベースの状態を更新します。
 *
 * @async
 * @function processReminder
 * @param {Object} reminder - スケジュール対象のリマインダーオブジェクト
 * @param {number} reminder.id - リマインダーの一意の識別子
 * @param {string} reminder.user_id - リマインダーを作成したユーザーの ID
 * @param {string} reminder.message_content - リマインダーのメッセージ内容
 * @param {string} reminder.reminder_time - リマインダーの実行予定時刻（ISO 8601 形式）
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
async function processReminder(reminder) {
  try {
    const reminderData = {
      userId: reminder.user_id,
      messageContent: reminder.message_content,
      reminderId: reminder.id,
      reminderTime: new Date(reminder.reminder_time),
    };

    // リマインダーをスケジュール
    await scheduleReminder(reminderData);

    // データベースのリマインダー状態を更新
    await updateReminderFlag(reminder.id, "scheduled");

    console.log(`✅ リマインダーID ${reminder.id} をスケジュールに登録しました。`);
  } catch (error) {
    console.error(`⛔️ リマインダーID ${reminder.id} の処理中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * スケジュールされていない、かつ実行されていないリマインダーを検索し、スケジュールに登録します。
 * 検索とスケジュール処理の所要時間を計測し、ログに記録します。
 *
 * @async
 * @function searchAndScheduleReminders
 * @returns {Promise<void>} - 処理が完了すると解決される Promise
 */
export async function searchAndScheduleReminders() {
  const startTimestamp = new Date();

  try {
    // データベースからスケジュール対象のリマインダーを検索
    const reminders = await searchReminders({
      scheduled: false,
      executed: false,
      userId: null,
      withinNextMinutes: REMINDER_SEARCH_INTERVAL,
    });

    if (reminders.length === 0) {
      return;
    }

    // リマインダーごとにスケジュール処理を実行
    for (const reminder of reminders) {
      await processReminder(reminder);
    }
  } catch (error) {
    console.error("⛔️ リマインダーの検索およびスケジュール中にエラーが発生しました:", error);
  } finally {
    // 実行時間を計測してログに記録
    const endTimestamp = new Date();
    const elapsedMilliseconds = endTimestamp - startTimestamp;
    const elapsedSeconds = elapsedMilliseconds / 1000;

    console.log(`⏱️ リマインダーの検索とスケジュール実行時間: ${elapsedSeconds}秒`);
  }
}
