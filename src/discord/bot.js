import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
} from "discord.js";
import { getLiveData, getUpcomingData } from "../database/videoData.js";
import { handleSetReminder } from "./reminderInteractions.js";
import { searchReminders } from "../database/reminderModel.js";
import { scheduleReminder } from "../reminders/schedule.js";
import { formatDate } from "../utils/formatDate.js";
import { executeQuery } from "../database/executeQuery.js";
import { formatResultsAsTable } from "../utils/formatResultsAsTable.js";
import { parseMessageToQuery } from "../database/queryParser.js";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const REMINDER_RECHECK_INTERVAL = process.env.REMINDER_RECHECK_INTERVAL || 10;
const MESSAGE_DELETE_TIMEOUT = process.env.MESSAGE_DELETE_TIMEOUT || 180000;

// Discordクライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

/**
 * Discord Botの初期化とリマインダー再スケジュールを処理します。
 */
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  try {
    const remindersToReschedule = await searchReminders({
      scheduled: true,
      executed: false,
      withinNextMinutes: REMINDER_RECHECK_INTERVAL,
    });

    for (const reminder of remindersToReschedule) {
      const user = await client.users.fetch(reminder.user_id);

      if (!user) {
        console.warn(`⚠️ User not found: ${reminder.user_id}`);
        continue;
      }

      const reminderTime = new Date(reminder.reminder_time);
      if (reminderTime <= Date.now()) {
        console.log(`⏩ Skipped past reminder time: ${reminderTime}`);
        continue;
      }

      await scheduleReminder({
        userId: reminder.user_id,
        messageContent: reminder.message_content,
        reminderId: reminder.id,
        reminderTime,
      });
      console.info(`🔄 リマインダーを再スケジュールしました。 : reminder ID: ${reminder.id}`);
    }
  } catch (error) {
    console.error("⛔️ Error rescheduling reminders:", error);
  }
});

/**
 * メッセージリアクションが追加された際にリマインダーを設定します。
 */
client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("⛔️ Failed to fetch reaction:", error);
      return;
    }
  }
  if (user.bot) return;

  if (reaction.emoji.name === "remind") {
    try {
      await handleSetReminder(user, reaction.message.content);
    } catch (error) {
      console.error("⛔️ Error handling set reminder:", error);
    }
  }
});

/**
 * スラッシュコマンドに応じてライブ情報やリマインダーリストを返します。
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    if (commandName === "live") {
      const liveVideos = await getLiveData();
      if (liveVideos.length === 0) {
        await interaction.reply({ content: "現在ライブ配信はありません。", ephemeral: true });
      } else {
        for (const video of liveVideos) {
          const url = `https://www.youtube.com/watch?v=${video.video_id}`;
          const message = `[${video.title}](${url})`;
          await interaction.followUp({ content: message, ephemeral: true });
        }
      }
    } else if (commandName === "upcoming") {
      const minutes = interaction.options.getInteger("minutes") || 15;
      const upcomingVideos = await getUpcomingData(minutes);
      if (upcomingVideos.length === 0) {
        await interaction.reply({ content: `${minutes}分以内に始まる配信はありません。`, ephemeral: true });
      } else {
        for (const video of upcomingVideos) {
          const formattedStartTime = formatDate(video.scheduled_start_time, "YYYY/MM/DD HH:mm");
          const url = `https://www.youtube.com/watch?v=${video.video_id}`;
          const message = `${formattedStartTime}から配信予定！ [${video.title}](${url})`;
          await interaction.followUp({ content: message, ephemeral: true });
        }
      }
    } else if (commandName === "reminderlist") {
      const userId = interaction.user.id;
      const reminders = await searchReminders({ executed: false, userId });
      if (reminders.length === 0) {
        await interaction.reply({ content: "設定されているリマインダーはありません。", ephemeral: true });
      } else {
        for (const reminder of reminders) {
          const formattedReminderTime = formatDate(reminder.reminder_time, "YYYY/MM/DD HH:mm");
          const message = `⏰ リマインダー時刻:${formattedReminderTime}\n${reminder.message_content}`;
          await interaction.followUp({ content: message, ephemeral: true });
        }
      }
    }
  } catch (error) {
    console.error("⛔️ Error handling interaction:", error);
    await interaction.reply({ content: "エラーが発生しました。", ephemeral: true });
  }
});

/**
 * DMメッセージの内容を解析してクエリを実行します。
 */
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.channel.type !== ChannelType.DM || message.author.id !== ADMIN_USER_ID) return;

  const { query, params } = parseMessageToQuery(message.content);

  try {
    const sentMessage = await message.author.send(`Query:\n${query}\nParams:\n${params}`);
    setTimeout(() => sentMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);

    if (query) {
      const result = await executeQuery(query, params);
      const formattedResult = formatResultsAsTable(result);
      const resultMessage = await message.author.send(`Results:\n${formattedResult}`);
      setTimeout(() => resultMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);
    }
  } catch (error) {
    console.error("⛔️ Error executing query:", error);
    const errorMessage = await message.author.send(`エラー: ${error.message}`);
    setTimeout(() => errorMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);
  }
});

// Discord Botをログイン
client.login(DISCORD_BOT_TOKEN);

// クライアントインスタンスのエクスポート
export { client };
