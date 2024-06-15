// 登録済みスラッシュコマンドを確認するためのファイル
// 直接 node src/slashCommand/show.jsを実行する

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

// .envファイルから環境変数を読み込む設定
import dotenv from 'dotenv';
dotenv.config();

const { DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN);

// スラッシュコマンドを一覧表示する
rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID))
  .then((commands) => {
    console.log('登録されているスラッシュコマンド:');
    console.log(commands);
  })
  .catch(error => console.error('スラッシュコマンドの取得に失敗しました:', error.message));
