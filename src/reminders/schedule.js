import schedule from 'node-schedule';
import { updateReminderFlag } from '../database/reminderModel.js';
import { client } from '../discord/bot.js';

/**
 * 指定された時刻にユーザーにリマインダーを送信し、その後リマインダーの実行状態を更新します。
 * @param {Object} param0 - リマインダー設定に必要な情報を含むオブジェクト。
 * @param {string} param0.userId - リマインダーを受け取るユーザーのID。
 * @param {string} param0.messageContent - 送信するリマインダーメッセージの内容。
 * @param {string} param0.reminderId - リマインダーの識別子。
 * @param {Date} param0.reminderTime - リマインダーを送信する日時。
 */
export async function scheduleReminder({ userId, messageContent, reminderId, reminderTime }) {
  schedule.scheduleJob(reminderTime, async () => {
    try {
      const user = await client.users.fetch(userId);
      await user.send(`リマインダー: 5分後に配信が始まるよ！\n${messageContent}`);
      console.log(`リマインダーを送信しました: ${user.username} - ${messageContent}`);
    } catch (error) {
      console.error(`リマインダー送信に失敗しました: User ID ${userId} - ${error.message}`);
      return;
    }

    try {
      await updateReminderFlag(reminderId, 'executed');
    } catch (error) {
      console.error(`リマインダー実行状態の更新に失敗しました: Reminder ID ${reminderId} - ${error.message}`);
    }
  });
}
