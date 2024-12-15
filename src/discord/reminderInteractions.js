import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import {
  registerReminder,
  searchRemindersByvideoId,
  updateReminderTime,
} from "../database/reminderModel.js";
import { client } from "../discord/bot.js";

// Day.js にプラグインを適用
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ユーザーのリアクションに基づき、リマインダーを設定します。
 *
 * @async
 * @param {Object} user - Discordユーザーオブジェクト
 * @param {string} messageContent - リアクションが付けられたメッセージの内容
 * @returns {Promise<void>}
 */
export async function handleSetReminder(user, messageContent) {
  try {
    // メッセージから配信予定日時を抽出
    const dateTimePattern = /(\d{2})\/(\d{2}) (\d{2}):(\d{2})/;
    const matches = messageContent.match(dateTimePattern);
    if (!matches) throw new Error("リマインダーの時刻を解析できませんでした。");

    // メッセージからビデオIDを抽出
    const videoIdPattern = /(?:https:\/\/www\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/;
    const videoIdMatch = messageContent.match(videoIdPattern);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (!videoId) throw new Error("ビデオIDを抽出できませんでした。");

    // 配信予定時刻を作成 (5分前)
    const reminderTime = dayjs(
      `${new Date().getFullYear()}-${matches[1]}-${matches[2]} ${matches[3]}:${matches[4]}`,
      "YYYY-MM-DD HH:mm"
    )
      .tz("Asia/Tokyo")
      .subtract(5, "minute");
    const now = dayjs().tz("Asia/Tokyo");

    if (!reminderTime.isAfter(now)) {
      console.log("⛔️ 5分以内または過去の時刻のため、リマインダーを登録しませんでした。");
      return;
    }

    // リマインダーを登録
    const reminderId = await registerReminder(user.id, messageContent, reminderTime.toDate(), videoId);
    if (!reminderId || reminderId === "exists") {
      console.log("⛔️ リマインダーの登録に失敗するか、既に登録済みです。");
      return;
    }

    console.log(`✅ リマインダーが登録されました: ID ${reminderId}`);
  } catch (error) {
    console.error("⛔️ リマインダー設定中にエラーが発生しました:", error.message);
  }
}

/**
 * 配信予定時刻の変更に基づき、リマインダーを更新します。
 *
 * @async
 * @param {string} videoId - 対象のビデオID
 * @param {Date} newScheduledTimeUTC - 新しい配信予定時刻（UTC）
 * @returns {Promise<void>}
 */
export async function handleScheduleChange(videoId, newScheduledTimeUTC) {
  try {
    const reminders = await searchRemindersByvideoId(videoId);
    if (reminders.length === 0) {
      console.log(`⛔️ ビデオID ${videoId} に関連するリマインダーが見つかりません。`);
      return;
    }

    const newScheduledTimeJST = dayjs(newScheduledTimeUTC).tz("Asia/Tokyo").format("MM/DD HH:mm");

    for (const reminder of reminders) {
      try {
        // メッセージ内容の更新
        const updatedMessageContent = reminder.message_content.replace(
          /\[\d{2}\/\d{2} \d{2}:\d{2}から配信予定！\]/,
          `[${newScheduledTimeJST}から配信予定！]`
        );

        await updateReminderTime(reminder.id, newScheduledTimeUTC, updatedMessageContent);
        console.log(`✅ リマインダーID ${reminder.id} を更新しました。新しい時刻: ${newScheduledTimeUTC}`);

        // ユーザーへの通知
        const user = await client.users.fetch(reminder.user_id);
        await user.send(
          `🆙 リマインダー更新通知: 登録された配信予定時刻が変更されました。\n新しい時刻: ${updatedMessageContent}\n配信開始の5分前にリマインダーを送ります。`
        );
      } catch (error) {
        console.error(`⛔️ リマインダーID ${reminder.id} の更新中にエラーが発生しました:`, error.message);
      }
    }
  } catch (error) {
    console.error(`⛔️ 配信予定時刻の変更処理中にエラーが発生しました:`, error.message);
  }
}
