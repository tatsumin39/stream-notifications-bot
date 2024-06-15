import { searchReminders, updateReminderFlag } from '../database/reminderModel.js';
import { scheduleReminder } from '../reminders/schedule.js';

const REMINDER_SEARCH_INTERVAL = process.env.REMINDER_SEARCH_INTERVAL || 10; // リマインダー検索の間隔（分）

/**
 * 指定されたリマインダー情報をスケジュールし、データベースの状態を更新します。
 * @param {Object} reminder - リマインダーの詳細情報を含むオブジェクト
 */
async function processReminder(reminder) {
  const reminderData = {
      userId: reminder.user_id,
      messageContent: reminder.message_content,
      reminderId: reminder.id,
      reminderTime: new Date(reminder.reminder_time)
  };
  await scheduleReminder(reminderData);  // リマインダーをスケジュールに登録します。
  await updateReminderFlag(reminder.id, 'scheduled'); // リマインダーの登録状態を「成功」に更新します。
  console.log(`リマインダーID ${reminder.id} をJob登録しました。`);
}

/**
 * スケジュールされていない、実行されていないリマインダーを検索し、それらをスケジュールに登録します。操作の所要時間を計測し、ログに記録します。
 */
export async function searchAndScheduleReminders() {
  const startTimestamp = new Date(); // 開始時刻のタイムスタンプ
  const reminders = await searchReminders({ scheduled: false, executed: false, userId: null, withinNextMinutes: REMINDER_SEARCH_INTERVAL });

  try {
      for (const reminder of reminders) {
          await processReminder(reminder);
      }
  } catch (error) {
    console.error('Failed to schedule reminders:', error);
  }

  const endTimestamp = new Date(); // 終了時刻のタイムスタンプ
  console.log(`${endTimestamp.toLocaleString()}: searchAndScheduleReminders終了！`);

  const elapsedMilliseconds = endTimestamp - startTimestamp;
  const elapsedSeconds = elapsedMilliseconds / 1000;

  console.log(`リマインダーの検索とスケジュール実行時間: ${elapsedSeconds}秒\n`);
}
