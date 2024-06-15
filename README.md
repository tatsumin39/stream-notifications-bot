# Stream Notifications Bot

[English Version](#english-version)

## 目次

1. [概要](#概要)
2. [機能一覧](#機能一覧)
3. [前提条件](#前提条件)
4. [プロジェクトのディレクトリ構造](#プロジェクトのディレクトリ構造)
5. [環境変数](#環境変数)
6. [セットアップ](#セットアップ)
7. [利用方法](#利用方法)
8. [管理者向け機能](#管理者向け機能)
9. [注意事項](#注意事項)
10. [ライセンス](#ライセンス)

## 概要
このプロジェクトは、Discordボットを使用してYouTubeのライブ配信や動画の通知を行うものです。指定されたチャンネルのRSSフィードを監視し、新しい動画が投稿されたり、ライブ配信が開始されたりした際に、Discordチャンネルに通知を送信します。

## 機能一覧

- **最新動画情報の取得**: YouTubeチャンネルのRSSフィードから最新の動画情報を定期的に取得します。
- **データベース保存**: 取得した動画情報をPostgreSQLデータベースに保存します。
- **新動画通知**: 新しい動画が投稿された場合、指定されたDiscordチャンネルに通知を送信します。
  - **複数チャンネル対応**: 複数のDiscordチャンネルへの通知が可能です。
  - **更新頻度設定**: 各チャンネル毎に更新頻度を設定できます。
- **スラッシュコマンド**: Discordのスラッシュコマンドを使用して、現在配信中の動画や配信予定の動画情報を表示します。
  - **`/live`コマンド**: 現在配信中の動画情報を表示します。
  - **`/upcoming`コマンド**: 直近の配信予定の動画情報を表示します。
  - **`/reminderlist`コマンド**: 登録されているリマインダーのリストを表示します。
- **リマインダー通知**: 絵文字リアクションを使用して、配信5分前にリマインダー通知を送信します。
- **データベース操作（管理者向け）**: 管理者はDiscord DMを介してデータベースのメンテナンスを行うことができます。
  - **SQLクエリの送信**: 管理者はSQLクエリを送信してデータベースを操作できます。
  - **自動削除**: 実行結果は設定した時間後に自動的に削除されます。

## 前提条件

このプロジェクトを実行する前に、以下のものが必要です。

- Node.js（バージョン12以上推奨）
- npm (Node.jsに付属)
- PostgreSQL
- 有効なDiscord Botトークン
- YouTube Data APIのキー

## プロジェクトのディレクトリ構造

```
.
├── .env.example
├── LICENSE
├── README.md
├── index.js
├── package-lock.json
├── package.json
└── src
    ├── config
    │   ├── dbConfig.example.js
    │   └── dbConfig.js
    ├── database
    │   ├── executeQuery.js
    │   ├── getChannelsData.js
    │   ├── queryParser.js
    │   ├── reminderModel.js
    │   ├── updateChannelIcon.js
    │   └── videoData.js
    ├── discord
    │   ├── bot.js
    │   ├── messages.js
    │   ├── notification.js
    │   └── reminderInteractions.js
    ├── reminders
    │   └── schedule.js
    ├── slashCommand
    │   ├── create.js
    │   ├── createConfig.json
    │   ├── delete.js
    │   ├── show.js
    │   ├── update.js
    │   └── updateConfig.json
    ├── tasks
    │   ├── reminderScheduler.js
    │   └── youtubeFeed.js
    ├── utils
    │   ├── convertDuration.js
    │   ├── formatDate.js
    │   ├── formatResultsAsTable.js
    │   └── isUrlAccessible.js
    └── youtube
        ├── api.js
        ├── checkAndUpdate.js
        └── feed.js
```

## 環境変数

このプロジェクトには `.env.example` ファイルが含まれており、これを参考にして `.env` ファイルを作成してください。

### 環境変数の一覧


このプロジェクトには `.env.example` ファイルが含まれており、これを参考にして `.env` ファイルを作成してください。

| 環境変数名                  | 説明                                        |
|-----------------------------|---------------------------------------------|
| YOUTUBE_API_KEY             | YouTube Data APIのキー                      |
| DISCORD_BOT_TOKEN           | Discord Botのトークン                       |
| CLIENT_ID                   | Discord クライアントID                      |
| GUILD_ID                    | Discord ギルド(サーバー)ID                  |
| DISCORD_LIVE_CHANNEL_NAME   | 通知先Discordチャンネル名（ライブ配信用）   |
| DISCORD_LIVE_WEBHOOK_URL    | 通知先DiscordチャンネルのWebhook URL（ライブ配信用） |
| DISCORD_VIDEO_CHANNEL_NAME  | 通知先Discordチャンネル名（動画配信用）     |
| DISCORD_VIDEO_WEBHOOK_URL   | 通知先DiscordチャンネルのWebhook URL（動画配信用） |
| ADMIN_USER_ID               | 管理者のDiscordユーザーID                  |
| DB_HOST                     | データベースのホスト名                      |
| DB_NAME                     | データベース名                              |
| DB_USER                     | データベースユーザー名                      |
| DB_PASSWORD                 | データベースのパスワード                    |
| DB_PORT                     | データベースのポート番号                    |
| REMINDER_SEARCH_INTERVAL    | リマインダー検索の間隔（分）                |
| REMINDER_RECHECK_INTERVAL   | リマインダー再検索の間隔（分）              |
| MESSAGE_DELETE_TIMEOUT      | DM自動削除の間隔（秒）                      |


Fly.ioやHerokuなどのサービスを使用する場合は、接続文字列として`DATABASE_URL`を使用してください。


## セットアップ

### YouTube Data APIのキーの発行

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスします。
2. プロジェクトを選択または新しいプロジェクトを作成します。
3. クイック アクセスから「APIとサービス」→「ライブラリ」を選択します。
4. 「YouTube Data API v3」を検索し、有効にします。
5. 左側のメニューから「認証情報」を選択し、「認証情報を作成」→「APIキー」をクリックします。
6. 作成されたAPIキーをコピーし、`.env` ファイルの `YOUTUBE_API_KEY` に設定します。

### Discord Botの作成

#### DISCORD_BOT_TOKEN の取得方法

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセスし、[New Application]をクリックします。
2. アプリケーション名を入力し、「Create」をクリックします。
3. 左側のメニューから「Bot」を選択し、以下の手順で進みます。
   - 「Reset Token」をクリックします。
   - 「Yes, do it!」の順番にクリックします。
   - 表示されたボットのトークンをコピーします。
4. Authorization Flowのセクションで以下を有効にし、「Save Changes」をクリックします。
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT `
5. コピーしたトークンを `.env` ファイルの `DISCORD_BOT_TOKEN` に設定します。

#### CLIENT_ID の取得方法

1. 左側のメニューから「OAuth2」を選択し、「Client ID」をコピーします。
2. コピーしたIDを`.env` ファイルの `CLIENT_ID` に設定します。

### OAuth2 設定

1. 「OAuth2」から「OAuth2 URL Generator」に進みます。
2. 「scopes」で以下を有効します。
   - `bot`
   - `applications.commands`
3. BOT PERMISSIONSセクションで以下を有効にします。
- `Send Messages`
- `Read Message History`
- `Use Slash Commands`
4. 生成されたURLをコピーしてブラウザで開き、ボットをサーバーに追加します。

#### GUILD_ID の取得方法

1. Discordの「ユーザー設定」の「詳細設定」から`開発者モード`を有効にします。
2. Discordアプリケーションで対象のサーバー名を右クリックし、「サーバーIDをコピー」を選択します。
4. コピーしたIDを `.env` ファイルの `GUILD_ID` に設定します。


### Discordチャンネルのwebhook URLの取得

1. Discordチャンネルを右クリックし、チャンネルの編集をクリックします。
2. 「連携サービス」セクションに移動し、ウェブフックを作成をクリックします。
3. 作成されたウェブフックをクリックし、「ウェブフックURLをコピー」をクリックします。
4. コピーしたURLを`.env` ファイルに追加します。

### 管理者のDiscordユーザーIDの取得

1. Discordを開き、対象のユーザー名を右クリックします。
2. 「ユーザーIDをコピー」をクリックします。
3. コピーしたIDを `.env` ファイルの `ADMIN_USER_ID` に設定します。

### データベースのセットアップ

#### 1. PostgreSQLをインストールし、起動します。

#### 2. 以下のコマンドを実行してデータベースとユーザーを作成します。
   ```sql
   CREATE DATABASE your_database_name;
   CREATE USER your_database_user WITH PASSWORD 'your_database_password';
   GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_database_user;
   ```

#### 3. .env ファイルにデータベースの接続情報を設定します。

#### 4. dbConfig.js の設定
データベース接続の設定は `dbConfig.js` ファイルで行います。サンプルファイルとして `dbConfig.example.js` が含まれているので、環境に合わせて設定を変更し、`dbConfig.js` として保存してください。



### データベース設計

このプロジェクトでは、アプリケーションのデータを管理するために3つの主要なテーブルを持つデータベースを使用します。以下に各テーブルの概要とスキーマを説明します。

#### 1. `channels` テーブル

チャンネルの基本情報とそれに関連するDiscordの通知設定を保持します。

| 列名                  | 型           | 説明                     |
|----------------------|--------------|-------------------------|
| channel_id           | VARCHAR(255) | YouTubeチャンネルID      |
| channel_name         | VARCHAR(255) | YouTubeチャンネル名      |
| channel_icon_url     | VARCHAR(255) | チャンネルのアイコンのURL  |
| discord_channel_name | VARCHAR(255) | 通知先Discordチャンネル名 |

#### 2. `video_data` テーブル

YouTubeからのビデオ情報とその配信ステータスを管理します。

| 列名                  | 型                       | 説明                        |
|----------------------|--------------------------|----------------------------|
| video_id             | VARCHAR(255)             | 動画の一意識別子              |
| title                | VARCHAR(255)             | 動画のタイトル                |
| published            | TIMESTAMP                | 動画が公開された日時           |
| updated              | TIMESTAMP                | 動画情報が最後に更新された日時   |
| channel              | VARCHAR(255)             | 動画が属するYouTubeチャンネル名 |
| live                 | VARCHAR(50)              | 動画のライブ配信ステータス      |
| scheduled_start_time | TIMESTAMP WITH TIME ZONE | 配信予定開始時刻              |
| actual_start_time    | TIMESTAMP WITH TIME ZONE | 実際の配信開始時刻             |
| duration             | VARCHAR(50)              | 動画の長さ（HH:MM:SS形式）     |

#### 3. `reminder` テーブル

ユーザー設定に基づくリマインダー情報とその通知状態を追跡します。

| 列名           | 型                        | 説明                         |
|----------------|--------------------------|-----------------------------|
| id             | INTEGER                  | 主キー、自動インクリメント      |
| user_id        | BIGINT                   | リマインダーを設定したユーザーID |
| message_content| TEXT                     | リマインダーのメッセージ内容     |
| reminder_time  | TIMESTAMP WITH TIME ZONE | リマインダーの設定時刻          |
| scheduled      | BOOLEAN                  | スケジュール登録状況　　        |
| executed       | BOOLEAN                  | リマインダー実行状況            |
| video_id       | VARCHAR(255)             | YouTubeのビデオID             |

### データベースのテーブル作成

以下のSQLを実行して、データベースのテーブルを作成します。

```sql
CREATE TABLE channels (
    channel_id VARCHAR(255) PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    channel_icon_url VARCHAR(255),
    discord_channel_name VARCHAR(255) NOT NULL
);

CREATE TABLE video_data (
    video_id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    published TIMESTAMP NOT NULL,
    updated TIMESTAMP NOT NULL,
    channel VARCHAR(255) NOT NULL,
    live VARCHAR(50),
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    duration VARCHAR(50)
);

CREATE TABLE reminder (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message_content TEXT NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    video_id VARCHAR(255),
    FOREIGN KEY (video_id) REFERENCES video_data(video_id)
);
```

### channels テーブルへのデータ登録

1.	`channels` テーブルにデータを登録します。以下は、例として登録するSQL文です。

```sql
INSERT INTO channels (channel_id, channel_name, discord_channel_name)
VALUES ('UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Google Developers', '配信者更新通知');
```

必要に応じて、channel_id, channel_name, discord_channel_name を適切な値に置き換えてください。

### アプリケーションのインストール
リポジトリをクローンします。

```bash
git clone https://github.com/tatsumin39/stream-notifications-bot.git
cd stream-notifications-bot
```

必要なパッケージをインストールします。

```bash
npm install
```

アプリケーションの起動
以下のコマンドでアプリケーションを起動します。

```bash
node index.js
```


### Discordスラッシュコマンドの登録

スラッシュコマンドを登録するには、以下のコマンドを実行します。

  ```bash
  node src/slashCommand/create.js src/slashCommand/createConfig.json
  ```

### スラッシュコマンドの更新

登録済みのスラッシュコマンドを更新するには、次の手順に従います。

1.	登録済みスラッシュコマンドのIDを確認します。
node src/slashCommand/showSlashCommands.js

2.	更新するスラッシュコマンドの定義をスラッシュコマンドのIDを指定してJSONファイル (updateConfig.json) として保存します。

3.	JSONファイルを指定して、次のコマンドを実行します。

  ```bash
  node src/slashCommand/update.js src/slashCommand/updateConfig.json
  ```

### スラッシュコマンドの削除

登録済みのスラッシュコマンドを削除するには、次の手順に従います。

1.	登録済みスラッシュコマンドのIDを確認します。
node src/slashCommand/showSlashCommands.js

2.	削除したいスラッシュコマンドのIDを指定して、次のコマンドを実行します。

  ```bash
  node src/slashCommand/delete.js <commandId>
  ```


### 利用方法

#### リマインダーの登録

1. リマインダー用の絵文字 :remind: を事前に登録します。
2. ライブ配信予定の投稿に対して絵文字 :remind: でリアクションを実施します。
3. ライブ配信予定の5分前にDiscord BotからDMにて通知が届きます。
4. ライブ配信予定が変更になった場合は新しい配信予定時刻に基づきリマインダー設定が更新されます。

#### スラッシュコマンドの利用

- **liveコマンド**
  - Discord Botが参加しているチャンネルで `/live` コマンドを実行すると、現在ライブ配信中の情報が表示されます。

- **upcomingコマンド**
  - Discord Botが参加しているチャンネルで `/upcoming` コマンドを実行すると、現在時刻から15分以内に開始予定のライブ配信情報が表示されます。
  - `/upcoming 60` のようにオプションとして任意の分数を指定することで、60分以内に開始予定のライブ配信情報を表示します。

- **reminderlistコマンド**
  - Discord Botが参加しているチャンネルで `/reminderlist` コマンドを実行すると、登録した有効なリマインダーが表示されます。



## 管理者向け機能

### データベースの簡易メンテナンス

ライブ配信予定の動画が削除や非公開化された場合やライブ配信中に限定公開になった場合など、適切なステータス遷移が行われないことがあります。この状況はスラッシュコマンドの`/live`や`/upcoming`の結果に影響する可能性があります。

環境変数に管理者のユーザーIDを`ADMIN_USER_ID`として設定したユーザーは、Discord BotとのDMを介してデータベースのメンテナンスを行うことができます。以下に例を示します。

#### 使用例

- **動画データの検索**
  ```sql
  SELECT * FROM "video_data" WHERE "live" = 'upcoming' ORDER BY "scheduled_start_time" ASC LIMIT 5;
  ```

- **チャンネル情報の更新**
  ```sql
  UPDATE "channels" SET channel_name = '<チャンネル名>' WHERE channel_id = '<チャンネルID>';
  ```

- **動画データの削除**
  ```sql
  DELETE FROM "video_data" WHERE "video_id" = '<ビデオID>';
  ```

実行結果は、環境変数MESSAGE_DELETE_TIMEOUTで設定された秒数が経過後に自動的に削除されます。ただし、Discord Botを再起動すると自動削除が行われず、DMに実行結果が残る場合があります。

## 注意事項

### リアルタイム通知について

本システムはリアルタイム通知を保証するものではありません。YouTubeの更新情報がフィードに反映されるタイミングにより、通知が遅れる可能性があります。

### 対象チャンネルの追加について

チャンネル追加時には1チャンネル直近5件のデータを取得します。そのため一度に大量のチャンネルを追加すると通知が大量に発生する可能性があります。その結果Discordのメッセージ制限に抵触することがあります。この点を考慮して、チャンネル情報の追加は慎重に実施してください。


## ライセンス

このプロジェクトは [MIT license](LICENSE) の下で公開されています。

## English Version

## Table of Contents

1. [Overview](#overview)
2. [List of Functions](#list-of-functions)
3. [Prerequisites](#prerequisites)
4. [Directory structure of the project](#directory-structure-of-the-project)
5. [Environment Variables](#environment-variables)
6. [Setup](#setup)
7. [How to use](#how-to-use)
8. [Functions for administrators](#functions-for-administrators)
9. [NOTES](#notes)
10. [License](#license)


## Overview.
This project uses a Discord bot to notify you of live YouTube feeds and videos. It monitors the RSS feed of a given channel and sends notifications to the Discord channel when a new video is posted or a live stream is launched.

## List of Functions

- **Retrieve the latest video information**: Retrieve the latest video information from YouTube channel RSS feeds on a regular basis.
- **Database storage**: Stores the retrieved video information in a PostgreSQL database.
- **New video notification**: When a new video is posted, a notification is sent to the specified Discord channel.
  - **Multiple channel support**: Notifications can be sent to multiple Discord channels.
  - **Update frequency setting**: Allows you to set the update frequency for each channel.
- **Slash command**: Displays information on currently streaming videos or videos scheduled to be streamed using the Discord slash command.
  - **`/live`command**: Displays information on videos currently being streamed.
  - **`/upcoming`command**: Displays information on the most recently scheduled videos.
  - **`/reminderlist`command**: Displays a list of registered reminders.
- **Reminder notification**: Sends a reminder notification 5 minutes before delivery using an emoji reaction.
- **Database manipulation (for administrators)**: allows administrators to perform database maintenance via Discord DM.
  - **Send SQL Query**: Administrators can manipulate the database by sending SQL queries.
  - **Auto-delete**: Execution results are automatically deleted after a set time.

## Prerequisites.

Before running this project, you will need the following

- Node.js (version 12 or higher recommended)
- npm (included with Node.js)
- PostgreSQL
- A valid Discord Bot token
- YouTube Data API key

## Directory structure of the project

```
.
├── .env.example
├── LICENSE
├── README.md
├── index.js
├── package-lock.json
├── package.json
└── src
    ├── config
    │   ├── dbConfig.example.js
    │   └── dbConfig.js
    ├── database
    │   ├── executeQuery.js
    │   ├── getChannelsData.js
    │   ├── queryParser.js
    │   ├── reminderModel.js
    │   ├── updateChannelIcon.js
    │   └── videoData.js
    ├── discord
    │   ├── bot.js
    │   ├── messages.js
    │   ├── notification.js
    │   └── reminderInteractions.js
    ├── reminders
    │   └── schedule.js
    ├── slashCommand
    │   ├── create.js
    │   ├── createConfig.json
    │   ├── delete.js
    │   ├── show.js
    │   ├── update.js
    │   └── updateConfig.json
    ├── tasks
    │   ├── reminderScheduler.js
    │   └── youtubeFeed.js
    ├── utils
    │   ├── convertDuration.js
    │   ├── formatDate.js
    │   ├── formatResultsAsTable.js
    │   └── isUrlAccessible.js
    └── youtube
        ├── api.js
        ├── checkAndUpdate.js
        └── feed.js
```

## Environment Variables

This project contains a `.env.example` file, which can be used as a reference to create the `.env` file.

### List of Boundary Variables

| environment variable name   | Description                                                            |
|-----------------------------|----------------------------------------------------------------------- |
| YOUTUBE_API_KEY             | YouTube Data API Key                                                   |
| DISCORD_BOT_TOKEN           | Discord Bot Token                                                      |
| CLIENT_ID                   | Discord Client ID                                                      |
| GUILD_ID                    | Discord Guild(server) ID                                               |
| DISCORD_LIVE_CHANNEL_NAME   | Name of Discord channel to be notified (for live streaming)            |
| DISCORD_LIVE_WEBHOOK_URL    | Webhook URL of the Discord channel to be notified (for live streaming) |
| DISCORD_VIDEO_CHANNEL_NAME  | Discord channel name to notify (for videos)                            |
| DISCORD_VIDEO_WEBHOOK_URL   | Webhook URL of the Discord channel to be notified (for videos)         |
| ADMIN_USER_ID               | Administrator's Discord user ID                                        |
| DB_HOST                     | Database host name                                                     |
| DB_NAME                     | Database Name                                                          |
| DB_USER                     | Database User Name                                                     |
| DB_PASSWORD                 | Database Password                                                      |
| DB_PORT                     | Database port number                                                   |
| REMINDER_SEARCH_INTERVAL    | Reminder search interval (minutes)                                     |
| REMINDER_RECHECK_INTERVAL   | Reminder re-search interval (minutes)                                  |
| MESSAGE_DELETE_TIMEOUT      | Interval for automatic DM deletion (seconds)                           |


If you use a service such as Fly.io or Heroku, use `DATABASE_URL` as the connection string.

## Setup

### Issuing YouTube Data API Key

1. Access the [Google Cloud Console](https://console.cloud.google.com/).
2. Select an existing project or create a new project.
3. From the left-hand menu, select "APIs & Services" → "Library".
4. Search for "YouTube Data API v3" and enable it.
5. From the left-hand menu, select "Credentials" and click on "Create Credentials" → "API Key".
6. Copy the created API key and set it in the `.env` file as `YOUTUBE_API_KEY`.

### Discord Botの作成

#### How to get DISCORD_BOT_TOKEN

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and click [New Application].
2. Enter an application name and click "Create".
3. Select "Bot" from the menu on the left and proceed as follows
   - Click on "Reset Token.
   - Click "Yes, do it!" in that order.
   - Copy the bot's token that appears.
4. In the Authorization Flow section, enable the following and click "Save Changes".
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT `
5. Set the copied token to `DISCORD_BOT_TOKEN` in the `.env` file.

#### How to get CLIENT_ID

1. Select `OAuth2` from the menu on the left and copy the `Client ID`.
2. Set the copied ID to `CLIENT_ID` in the `.env` file.

### OAuth2 Configuration

1. Go to "OAuth2" and then to "OAuth2 URL Generator".
2. In the "SCOPES" section, enable the following
   - `bot`
   - `applications.commands`
3. In the BOT PERMISSIONS section, enable the following
- `Send Messages`
- `Read Message History`
- `Use Slash Commands`
4. Copy the generated URL, open it in your browser, and add the bot to your server.

#### How to get GUILD_ID

1. Enable `Developer Mode` from "Advanced Settings" in "User Settings" of Discord.
2. Right click on the target server name in the Discord application and select `Copy Server ID`.
3. Set the copied ID to `GUILD_ID` in the `.env` file.

### How to get the webhook URL of a Discord channel

1. Right-click on the Discord channel and click Edit Channel.
2. Go to the "Linked Services" section and click Create Webhook.
3. Click on the created webhook and click "Copy Webhook URL".
4. Add the copied URL to your `.env` file.

### How to get an administrator's Discord user ID

1.  Open Discord and right-click on the target user name.
2. Click "Copy User ID".
3. Set the copied ID to `ADMIN_USER_ID` in the `.env` file

### Database Setup

#### 1. Install and start PostgreSQL.

#### 2. Execute the following commands to create the database and users
   ```sql
   CREATE DATABASE your_database_name;
   CREATE USER your_database_user WITH PASSWORD 'your_database_password';
   GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_database_user;
   ```

#### 3. Set database connection information in the .env file.

#### 4. Configuration of dbConfig.js
The database connection is configured in the `dbConfig.js` file. Since `dbConfig.example.js` is included as a sample file, modify the configuration to suit your environment and save it as `dbConfig.js`.

### Database Design

This project will use a database with three main tables to manage the application's data. Below is an overview of each table and its schema.

#### 1. `channels` table

Maintains basic channel information and associated Discord notification settings.

| Column name                  | Type           | Description          |
|----------------------|--------------|--------------------------------|
| channel_id           | VARCHAR(255) | YouTube Channel ID             |
| channel_name         | VARCHAR(255) | YouTube Channel Name           |
| channel_icon_url     | VARCHAR(255) | Channel Icon URL               |
| discord_channel_name | VARCHAR(255) | Discord channel name to notify |

#### 2. `video_data` table

Manage video information from YouTube and its distribution status.

| Column name          | Type                     | Description                                          |
|----------------------|--------------------------|------------------------------------------------------|
| video_id             | VARCHAR(255)             | Unique identifier of the video                       |
| title                | VARCHAR(255)             | Title of the video                                   |
| published            | TIMESTAMP                | Date and time the video was published                |
| updated              | TIMESTAMP                | Date and time the video information was last updated |
| channel              | VARCHAR(255)             | YouTube channel name to which the video belongs      |
| live                 | VARCHAR(50)              | Live streaming status of the video                   |
| scheduled_start_time | TIMESTAMP WITH TIME ZONE | Scheduled start time of streaming                    |
| actual_start_time    | TIMESTAMP WITH TIME ZONE | Actual start time of distribution                    |
| duration             | VARCHAR(50)              | Video duration (HH:MM:SS format)                     |

#### 3. `reminder` table

Tracks reminder information and its notification status based on user preferences.

| Column name    | Type                     | Description                            |
|----------------|--------------------------|----------------------------------------|
| id             | INTEGER                  | Primary key, auto-increment            |
| user_id        | BIGINT                   | User ID for which the reminder was set |
| message_content| TEXT                     | Message content of the reminder        |
| reminder_time  | TIMESTAMP WITH TIME ZONE | Time at which the reminder was set     |
| scheduled      | BOOLEAN                  | Schedule registration status           |
| executed       | BOOLEAN                  | Reminder execution status              |
| video_id       | VARCHAR(255)             | YouTube video ID                       |

### Creating Database Tables

Execute the following SQL to create database tables.

```sql
CREATE TABLE channels (
    channel_id VARCHAR(255) PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    channel_icon_url VARCHAR(255),
    discord_channel_name VARCHAR(255) NOT NULL
);

CREATE TABLE video_data (
    video_id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    published TIMESTAMP NOT NULL,
    updated TIMESTAMP NOT NULL,
    channel VARCHAR(255) NOT NULL,
    live VARCHAR(50),
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    duration VARCHAR(50)
);

CREATE TABLE reminder (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message_content TEXT NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled BOOLEAN DEFAULT FALSE,
    executed BOOLEAN DEFAULT FALSE,
    video_id VARCHAR(255),
    FOREIGN KEY (video_id) REFERENCES video_data(video_id)
);
```

### Registering data in the channels table

1.	`channels` Register data in a table. Below is an SQL statement to register as an example.

```sql
INSERT INTO channels (channel_id, channel_name, discord_channel_name)
VALUES ('UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Google Developers', 'Streamer update notifications');
```

Replace channel_id, channel_name, and discord_channel_name with appropriate values if necessary.

### Application Installation
Clone the repository.

```bash
git clone https://github.com/tatsumin39/stream-notifications-bot.git
cd stream-notifications-bot
```

Install the necessary packages.

```bash
npm install
```

Launching an Application
Start the application with the following command

```bash
node index.js
```


### Discord slash command registration

To register the slash command, execute the following command

  ```bash
  node src/slashCommand/create.js src/slashCommand/createConfig.json
  ```

### Updating Slash Commands

To update a registered slash command, follow these steps: 1.

1. Check the ID of the registered slash command.
node src/slashCommand/showSlashCommands.js

2. Save the definition of the slash command to be updated as a JSON file (updateConfig.json) with the ID of the slash command. 

3. Specify the JSON file and execute the following command

  ```bash
  node src/slashCommand/update.js src/slashCommand/updateConfig.json
  ```

### Deleting Slash Commands

To delete a registered slash command, follow these steps

1. Check the ID of the registered slash command.
node src/slashCommand/showSlashCommands.js

2. Specify the ID of the slash command you wish to delete and execute the following command

  ```bash
  node src/slashCommand/delete.js <commandId>
  ```


## How to use

#### Subscribe to Reminders

1. register an emoji :remind: for reminders in advance. 
2. react to the post to be live-streamed by using :remind: emoji. 
3. You will receive a DM notification from the Discord Bot 5 minutes before the scheduled live broadcast. 
4. If the live streaming schedule is changed, the reminder setting will be updated based on the new scheduled streaming time.

#### Using the slash command

- **live command**
  - Running the `/live` command on a channel in which a Discord Bot is participating will display information about the current live feed.

- **upcoming command**
  - Running the `/upcoming` command on a channel where a Discord Bot is participating will show information on live broadcasts scheduled to start within 15 minutes of the current time.
  - By specifying any number of minutes as an option, such as `/upcoming 60`, the live streaming information scheduled to start within 60 minutes will be displayed.

- **reminderlist command**
  - Running the `/reminderlist` command on a channel in which the Discord Bot is participating will show you the valid reminders you have registered.


## Functions for administrators

### Quick maintenance of databases

Proper status transitions may not occur when a video scheduled to be live-streamed is deleted or made private, or when a video becomes limited public during a live-streaming session. This situation may affect the result of the `/live` or `/upcoming` slash command.

Users who set the administrator's user ID as `ADMIN_USER_ID` in the environment variable can perform database maintenance via DM with the Discord Bot. An example is shown below.

#### Examples of Use

- **Video Data Search**
  ```sql
  SELECT * FROM "video_data" WHERE "live" = 'upcoming' ORDER BY "scheduled_start_time" ASC LIMIT 5;
  ```

- **Update channel information**
  ```sql
  UPDATE "channels" SET channel_name = '<Channel Name>' WHERE channel_id = '<Channel Name>';
  ```

- **Deleting Video Data**
  ```sql
  DELETE FROM "video_data" WHERE "video_id" = '<Video ID>';
  ```

The execution result is automatically deleted after the number of seconds set in the MESSAGE_DELETE_TIMEOUT environment variable. However, if Discord Bot is restarted, the execution result may remain in DM without automatic deletion.

## NOTES.

### Real-Time Notifications

This system does not guarantee real-time notifications, which may be delayed depending on when YouTube updates are reflected in the feed.

### Addition of Target Channels

When adding a channel, the data of the 5 most recent entries for one channel is retrieved. Therefore, adding a large number of channels at once may result in a large number of notifications. As a result, it may violate Discord's message limit. With this in mind, please be careful when adding channel information.

### Language Note
This project uses Japanese for notification messages to Discord, comments, and console.log statements for debugging. The Japanese used is basic, so please replace it with your preferred language if necessary.

## License

This project is released under [MIT license](LICENSE).