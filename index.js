import dotenv from 'dotenv';
dotenv.config();

import './src/discord/bot.js'; // Discord Botを起動

import { startYoutubeFeed } from './src/tasks/youtubeFeed.js';
import { searchAndScheduleReminders } from './src/tasks/reminderScheduler.js';
import schedule from 'node-schedule';

// スケジュール間隔の定数
const ONE_MINUTE_SCHEDULE = '0 * * * * *'; // 1分ごと
const TEN_MINUTE_SCHEDULE = '0 */10 * * * *'; // 10分ごと

// 1分ごとに実行するスケジュール
schedule.scheduleJob(ONE_MINUTE_SCHEDULE, function() {
  console.log(`-`.repeat(50));
  try {
    startYoutubeFeed(process.env.DISCORD_LIVE_CHANNEL_NAME, process.env.DISCORD_LIVE_WEBHOOK_URL);
    searchAndScheduleReminders();
  } catch (error) {
    console.error(`Error during task execution: ${error.message}`);
  }
});

// 10分ごとに実行するスケジュール
schedule.scheduleJob(TEN_MINUTE_SCHEDULE, function() {
  try {
    startYoutubeFeed(process.env.DISCORD_VIDEO_CHANNEL_NAME, process.env.DISCORD_VIDEO_WEBHOOK_URL);
  } catch (error) {
    console.error(`Error during task execution: ${error.message}`);
  }
});
