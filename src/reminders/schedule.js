import schedule from "node-schedule";
import { updateReminderFlag } from "../database/reminderModel.js";
import { client } from "../discord/bot.js";

/**
 * 指定された時刻にDiscordユーザーにリマインダーを送信し、実行状態をデータベースに更新します。
 *
 * @async
 * @function scheduleReminder
 * @param {Object} reminderData - リマインダー設定に必要な情報を含むオブジェクト。
 * @param {string} reminderData.userId - リマインダーを受け取るユーザーのID。
 * @param {string} reminderData.messageContent - 送信するリマインダーのメッセージ内容。
 * @param {number} reminderData.reminderId - リマインダーの識別子（データベースID）。
 * @param {Date} reminderData.reminderTime - リマインダーを送信する日時。
 */
export async function scheduleReminder({ userId, messageContent, reminderId, reminderTime }) {
  try {
    // 指定した時刻にリマインダーをスケジュール
    schedule.scheduleJob(reminderTime, async () => {
      try {
        // Discordユーザーを取得してメッセージを送信
        const user = await client.users.fetch(userId);
        if (!user) {
          console.error(`⛔️ ユーザーが見つかりません: User ID ${userId}`);
          return;
        }
        await user.send(`🔔 5分後に配信が始まるよ！\n${messageContent}`);
        console.log(`📤 リマインダー送信成功: ${user.username} - ${messageContent}`);
      } catch (error) {
        console.error(`⛔️ リマインダー送信に失敗: User ID ${userId}, Error: ${error.message}`);
        return; // メッセージ送信に失敗した場合、フラグ更新をスキップ
      }

      try {
        // データベース内のリマインダーのフラグを更新
        await updateReminderFlag(reminderId, "executed");
        console.log(`✅ リマインダー実行フラグを更新しました: Reminder ID ${reminderId}`);
      } catch (error) {
        console.error(`⛔️ リマインダー実行状態の更新に失敗しました: Reminder ID ${reminderId}, Error: ${error.message}`);
      }
    });
  } catch (error) {
    console.error(`⛔️ リマインダーのスケジュール設定中にエラーが発生しました: ${error.message}`);
  }
}
