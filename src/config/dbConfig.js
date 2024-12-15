import dotenv from "dotenv";
import pg from "pg";

// 環境変数をロード
dotenv.config();

// データベース接続URLを取得
const DATABASE_URL = process.env.DATABASE_URL;

// pgモジュールからPoolクラスを抽出
const { Pool } = pg;

/**
 * PostgreSQL データベース接続プールを設定します。
 *
 * @constant
 * @type {Pool}
 * @property {string} connectionString - データベース接続URL (環境変数から取得)
 * @property {number} max - プール内の最大接続数 (デフォルト: 10)
 * @property {number} idleTimeoutMillis - 接続がアイドル状態になった後にクローズされるまでの時間 (ミリ秒)
 * @property {number} connectionTimeoutMillis - 新しい接続のタイムアウト時間 (ミリ秒)
 */
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10, // プールの最大接続数
  idleTimeoutMillis: 30000, // アイドルタイムアウト: 30秒
  connectionTimeoutMillis: 2000, // 接続タイムアウト: 2秒
});

/**
 * プールのエラーイベントリスナーを追加します。
 * 予期しないエラーが発生した場合にログを出力します。
 */
pool.on("error", (err) => {
  console.error("⛔️ Unexpected error on idle client:", err.message);
});

/**
 * データベース接続プールをエクスポートします。
 * 他のモジュールでこのプールを使用してクエリを実行します。
 */
export default pool;
