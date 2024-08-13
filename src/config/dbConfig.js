// dotenvモジュールをインポート
import dotenv from 'dotenv';
// 環境変数をロード
dotenv.config();

/** データベースのURLを環境変数から取得 */
const DATABASE_URL = process.env.DATABASE_URL;

// PostgreSQL用のpgモジュールをデフォルトインポート
import pg from 'pg';
/** pgモジュールからPoolクラスを抽出 */
const { Pool } = pg;

/** データベース接続プールを設定
 * @param {Object} config - プールの設定
 * @param {string} config.connectionString - 接続するデータベースのURL
 */
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// データベース接続プールをエクスポート
export default pool;
