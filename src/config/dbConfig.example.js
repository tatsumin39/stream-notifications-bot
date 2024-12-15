// dotenvモジュールをインポートし、環境変数をロード
import dotenv from "dotenv";
dotenv.config();

// PostgreSQL用のpgモジュールをインポート
import pg from "pg";
const { Pool } = pg;

/**
 * データベース接続プールを設定します。
 * 環境変数からデータベースの接続情報を取得します。
 *
 * - **推奨設定**: 個別の環境変数 (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT) を使用。
 * - **代替設定**: `DATABASE_URL` が指定されている場合は接続文字列を使用。
 *
 * @constant
 * @type {Pool}
 * @property {string} [host] - データベースのホスト名 (例: localhost)
 * @property {string} [user] - データベースのユーザー名
 * @property {string} [password] - データベースのパスワード
 * @property {string} [database] - データベース名
 * @property {number} [port] - データベースのポート番号 (例: 5432)
 * @property {string} [connectionString] - 接続文字列 (Heroku, Fly.io などで推奨)
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  // 環境変数に `DATABASE_URL` が設定されている場合は接続文字列を使用します。
  ...(process.env.DATABASE_URL && { connectionString: process.env.DATABASE_URL }),
});

/**
 * プールのエラーイベントリスナーを追加します。
 * アイドル状態のクライアントで予期しないエラーが発生した場合、ログを出力します。
 */
pool.on("error", (err) => {
  console.error("⛔️ Unexpected error on idle client:", err.message);
});

/**
 * データベース接続プールをエクスポートします。
 * アプリケーション全体でこのプールを使用してクエリを実行します。
 */
export default pool;
