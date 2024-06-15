// 登録済みスラッシュコマンドを削除するためのファイル
// 直接 node src/slashCommand/delete.js <commandId> を実行する

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';
dotenv.config();

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const commandId = process.argv[2]; // コマンドライン引数からコマンドIDを取得

if (!commandId) {
  console.error('削除したいスラッシュコマンドIDを指定してください');
  process.exit(1);
}

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN);

rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId))
  .then(() => console.log(`コマンドID ${commandId} が削除されました`))
  .catch(error => console.error(`コマンドID ${commandId} の削除に失敗しました:`, error.message));
