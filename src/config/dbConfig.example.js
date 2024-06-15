// dotenvモジュールをインポート
import dotenv from 'dotenv';
// 環境変数をロード
dotenv.config();

// PostgreSQL用のpgモジュールをデフォルトインポート
import pg from 'pg';
/** pgモジュールからPoolクラスを抽出 */
const { Pool } = pg;

/** データベース接続プールを設定
 * 環境変数からデータベースの接続情報を取得
 * @property {string} process.env.DB_HOST - データベースのホスト名
 * @property {string} process.env.DB_USER - データベースユーザー名
 * @property {string} process.env.DB_PASSWORD - データベースのパスワード
 * @property {string} process.env.DB_NAME - データベース名
 * @property {number} process.env.DB_PORT - データベースのポート番号
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
  // Fly.ioやHerokuなどのサービスを使用している場合は、以下のように接続文字列を使用します。
  // connectionString: process.env.DATABASE_URL
});

// データベース接続プールをエクスポート
export default pool;
