// スラッシュコマンドを登録するためのファイル
// 直接 node src/slashCommand/create.js path/to/createConfig.json を実行する

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const pathToConfig = process.argv[2];

if (!pathToConfig) {
  console.error('設定ファイルへのパスを指定してください');
  process.exit(1);
}

if (!fs.existsSync(pathToConfig)) {
  console.error('指定された設定ファイルが存在しません:', pathToConfig);
  process.exit(1);
}

let commands;
try {
  commands = JSON.parse(fs.readFileSync(pathToConfig, 'utf-8'));
} catch (error) {
  console.error('設定ファイルの読み込みに失敗しました:', error.message);
  process.exit(1);
}

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN);

const createCommands = async () => {
  try {
    console.log(`スラッシュコマンドを登録中...`);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(`スラッシュコマンドの登録が完了しました。`);
  } catch (error) {
    console.error('スラッシュコマンドの登録に失敗しました:', error.message);
  }
};

createCommands();
