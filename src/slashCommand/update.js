// 登録済みスラッシュコマンドを更新するためのファイル
// 直接 node src/slashCommand/update.js path/to/updateConfig.json を実行する

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

let config;
try {
  config = JSON.parse(fs.readFileSync(pathToConfig, 'utf-8'));
} catch (error) {
  console.error('設定ファイルの読み込みに失敗しました:', error.message);
  process.exit(1);
}

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN);

const validateCommand = (command) => {
  const nameRegex = /^[a-z0-9_-]{1,32}$/;
  if (!nameRegex.test(command.name)) {
    throw new Error(`コマンド名が無効です: ${command.name}`);
  }
  if (command.description.length < 1 || command.description.length > 100) {
    throw new Error(`コマンドの説明が無効です: ${command.description}`);
  }
  if (command.options) {
    command.options.forEach((option) => {
      if (option.name.length < 1 || option.name.length > 32) {
        throw new Error(`オプション名が無効です: ${option.name}`);
      }
      if (option.description.length < 1 || option.description.length > 100) {
        throw new Error(`オプションの説明が無効です: ${option.description}`);
      }
    });
  }
};

const updateCommand = async (command) => {
  const { commandId, ...commandData } = command;
  if (!commandId) {
    console.error('コマンドIDが指定されていません');
    return;
  }

  try {
    validateCommand(commandData);
    await rest.patch(
      Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId),
      { body: commandData }
    );
    console.log(`コマンドを更新しました: ${commandData.name}`);
  } catch (error) {
    console.error('コマンドの更新に失敗しました:', error.message);
  }
};

config.forEach(updateCommand);
