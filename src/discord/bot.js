import { Client, GatewayIntentBits, Partials, ChannelType } from 'discord.js';
import { getLiveData, getUpcomingData } from '../database/videoData.js';
import { handleSetReminder } from './reminderInteractions.js';
import { searchReminders } from '../database/reminderModel.js';
import { scheduleReminder } from '../reminders/schedule.js';
import { formatDate } from '../utils/formatDate.js';
import { executeQuery } from '../database/executeQuery.js';
import { formatResultsAsTable } from '../utils/formatResultsAsTable.js';
import { parseMessageToQuery } from '../database/queryParser.js';

import dotenv from 'dotenv';
dotenv.config();

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
 * Discord Botの初期化とイベントハンドラの設定を行います。
 */
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  try {
    // ボット起動時に10分以内のリマインダーを再スケジュールする
    const remindersToReschedule = await searchReminders({
      scheduled: true,
      executed: false,
      userId: null,
      withinNextMinutes: REMINDER_RECHECK_INTERVAL
    });

    // 各リマインダーの再スケジュール処理
    for (const reminder of remindersToReschedule) {
      const user = await client.users.fetch(reminder.user_id);

      if (!user) {
        console.error(`ユーザーが見つかりません: ${reminder.user_id}`);
        continue; // 次のリマインダーへ
      }

      const reminderTime = new Date(reminder.reminder_time);
      const now = new Date();
      if (reminderTime <= now) {
        console.log(`スキップ（過去の時刻）: ${reminderTime}`);
        continue; // 過去の時刻の場合はスキップ
      }

      const reminderData = {
        userId: reminder.user_id,
        messageContent: reminder.message_content,
        reminderId: reminder.id,
        reminderTime
      };
      await scheduleReminder(reminderData);
      console.log(`リマインダーを再スケジュールしました: ${reminder.id}`);
    }
  } catch (error) {
    console.error('リマインダーの再スケジュール中にエラーが発生しました:', error);
  }
});

/**
 * メッセージにリアクションが追加されたときのイベント処理を行います。
 */
client.on('messageReactionAdd', async (reaction, user) => {
  // リアクションがパーシャル（部分的）な場合、完全な情報を取得する
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Reaction fetch failed:', error);
      return;
    }
  }
  if (user.bot) return; // ボットのリアクションは無視

  // リアクションが 'remind' の場合、リマインダーを設定
  if (reaction.emoji.name === 'remind') {
    try {
      await handleSetReminder(user, reaction.message.content);
    } catch (error) {
      console.error('リマインダー設定中にエラーが発生しました:', error);
    }
  }
  console.log(`Reaction received: ${reaction.emoji.name} from ${user.username} ${user.id} on message: ${reaction.message.content}`);
});

/**
 * スラッシュコマンドに応じたイベント処理を行います。
 */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'live') {
      const liveVideos = await getLiveData();
      if (liveVideos.length === 0) {
        await interaction.reply({ content: "現在ライブ配信はありません。", ephemeral: true });
      } else {
        await interaction.reply({ content: "現在配信中はこちら！", ephemeral: true });
        for (const video of liveVideos) {
          const url = `https://www.youtube.com/watch?v=${video.video_id}`;
          const message = `[${video.title}](${url})`;
          await interaction.followUp({ content: message, ephemeral: true });
        }
      }
    } else if (commandName === 'upcoming') {
      const minutes = interaction.options.getInteger('minutes') || 15;
      const upcomingVideos = await getUpcomingData(minutes);
      if (upcomingVideos.length === 0) {
        await interaction.reply({ content: `${minutes}分以内に始まる配信はありません。`, ephemeral: true });
      } else {
        await interaction.reply({ content: `${minutes}分以内に始まる配信はこちら！`, ephemeral: true });
        for (const video of upcomingVideos) {
          const formattedStartTime = formatDate(video.scheduled_start_time, 'YYYY/MM/DD HH:mm');
          const url = `https://www.youtube.com/watch?v=${video.video_id}`;
          const message = `${formattedStartTime}から配信予定！ [${video.title}](${url})`;
          await interaction.followUp({ content: message, ephemeral: true });
        }
      }
    } else if (commandName === 'reminderlist') {
      const userId = interaction.user.id;
      const reminders = await searchReminders({ executed: false, userId });
      if (reminders.length === 0) {
        await interaction.reply({ content: "設定されているリマインダーはありません。", ephemeral: true });
      } else {
        await interaction.reply({ content: `現在登録されている有効なリマインダーは${reminders.length}件です。`, ephemeral: true });
        for (const reminder of reminders) {
          const formattedReminderTime = formatDate(reminder.reminder_time, 'YYYY/MM/DD HH:mm');
          const reminderMessage = `⏰ リマインダーID: ${reminder.id}\nリマインダー時刻: ${formattedReminderTime}\n${reminder.message_content}`;
          await interaction.followUp({ content: reminderMessage, ephemeral: true });
        }
      }
    }
  } catch (error) {
    console.error(`スラッシュコマンド処理中にエラーが発生しました: ${error}`);
    await interaction.reply({ content: "コマンドの処理中にエラーが発生しました。", ephemeral: true });
  }
});

/**
 * DMを受信した際のイベント処理を行います。
 */
client.on('messageCreate', async (message) => {

  if (message.author.bot || message.channel.type !== ChannelType.DM || message.author.id !== ADMIN_USER_ID) return;

  const messageText = message.content;
  const { query, params } = parseMessageToQuery(messageText);

  try {
    // メッセージの内容とクエリをユーザーに送信
    const sentMessage = await message.author.send(`メッセージ:\n${messageText}\nクエリ文:\n${query}\nparams文:\n${params}`);
    setTimeout(() => sentMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);

    if (query) {
      const result = await executeQuery(query, params);
      const formattedResult = formatResultsAsTable(result);
      const resultMessage = await message.author.send(`クエリの実行結果:\n${formattedResult}`);
      setTimeout(() => resultMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);
    }
  } catch (error) {
    console.error(`クエリの実行中にエラーが発生しました: ${error}`);
    const errorMessage = await message.author.send(`エラーが発生しました: ${error.message}`);
    setTimeout(() => errorMessage.delete().catch(console.error), MESSAGE_DELETE_TIMEOUT);
  }
});

// Discord Botをログイン
client.login(DISCORD_BOT_TOKEN);

// クライアントインスタンスのエクスポート
export { client };
