import dayjs from 'dayjs';
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { registerReminder, searchRemindersByvideoId, updateReminderTime } from '../database/reminderModel.js';
import { client } from '../discord/bot.js';

// Day.js にプラグインを適用
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ユーザーからのリアクションに基づいてリマインダーを設定する関数
 * @param {string} userId - リマインダーを設定するユーザーのID
 * @param {string} messageContent - リアクションが付けられたメッセージの内容
 */
export async function handleSetReminder(user, messageContent) {
  
  const dateTimePattern = /(\d{2})\/(\d{2}) (\d{2}):(\d{2})/;
  const matches = messageContent.match(dateTimePattern);

  if (!matches) {
    console.error('⛔️ リマインダーの時刻を解析できませんでした。');
    return;
  }

  const videoIdPattern = /(?:https:\/\/www\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/;
  const videoIdMatch = messageContent.match(videoIdPattern);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  if (!videoId) {
    console.error('⛔️ ビデオIDを抽出できませんでした。');
    return;
  }  

  const utcTime = dayjs().utc();
  const jstTime = utcTime.tz('Asia/Tokyo');
  
  let reminderTime = dayjs(`${new Date().getFullYear()}-${matches[1]}-${matches[2]} ${matches[3]}:${matches[4]}`, 'YYYY-MM-DD HH:mm').tz('Asia/Tokyo').subtract(5, 'minute');
  const now = dayjs().tz('Asia/Tokyo');

  if (!reminderTime.isAfter(now)) {
    console.log("⛔️ 5分よりも短いか過去の予定のためリマインダー登録はされませんでした。");
    return;
  }

  const reminderId = await registerReminder(user.id, messageContent, reminderTime.toDate(), videoId);

  if (!reminderId) {
    console.error('⛔️ リマインダーの登録に失敗しました。');
    return;
  }

  if (reminderId === 'exists') {
    console.log(`⛔️ 既にリマインダーが設定されています。`);
    return;
  }
}

/**
 * 配信予定時刻の変更に基づいてリマインダーを更新する関数
 * @param {string} videoId - 変更があったビデオのID
 * @param {Date} newScheduledTime - 新しい配信予定時刻
 */
export async function handleScheduleChange(videoId, newScheduledTimeUTC) {
  const reminders = await searchRemindersByvideoId(videoId);
  const newScheduledTimeJST = dayjs(newScheduledTimeUTC).tz('Asia/Tokyo').format('MM/DD HH:mm');

  if (reminders.length > 0) {
    for (const reminder of reminders) {
      try {
        let { message_content } = reminder;
        const updatedMessageContent = message_content.replace(/\[\d{2}\/\d{2} \d{2}:\d{2}から配信予定！\]/, `[${newScheduledTimeJST}から配信予定！]`);

        await updateReminderTime(reminder.id, newScheduledTimeUTC, updatedMessageContent);
        console.log(`🆙 リマインダーID ${reminder.id} を新しい時刻 ${newScheduledTimeUTC} で更新しました。新しい内容: ${updatedMessageContent}`);
        const user = await client.users.fetch(reminder.user_id);
        await user.send(`🆙 リマインダー更新通知: 登録された配信予定時刻に変更がありました。\n新しい配信予定時刻: ${updatedMessageContent}\n配信開始の5分前に再度リマインダーを送ります。`);
      } catch (error) {
        console.error(`⛔️ リマインダーID ${reminder.id} の更新中にエラーが発生しました:`, error);
      }
    }
  } else {
    console.log(`⛔️ ビデオID ${videoId} に関連するリマインダーは見つかりませんでした。`);
  } 
}
