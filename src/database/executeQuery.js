import pool from '../config/dbConfig.js'; // データベース接続設定をインポート

/**
 * 汎用的なSQLクエリを実行する関数。クエリの種類に応じて異なる結果を返す。
 * @param {string} query - 実行するSQLクエリ
 * @param {Array} [params=[]] - SQLクエリのパラメータ（デフォルトは空の配列）
 * @returns {Promise<Object[]|number>} - SELECTクエリでは結果の配列、その他のクエリでは影響を受けた行数を返す
 */
export async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);

    // クエリの種類に応じた処理
    const command = query.trim().split(' ')[0].toUpperCase(); // クエリの最初の単語を取得して大文字に変換
    console.log(`command: ${command}`);
    switch (command) {
      case 'SELECT':
        console.log(`SELECT: ${result.rows}`);
        return result.rows; // SELECTの場合はrowsをそのまま返す
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE':
        // RETURNING句が使用されているかどうかで返す値を変える
        if (query.toUpperCase().includes('RETURNING')) {
          console.log(`INSERT/UPDATE/DELETE: ${result.rows}`);
          return result.rows; // RETURNING句があればrowsを返す
        } else {
          console.log(`INSERT/UPDATE/DELETE: ${result.rowCount}`);
          return result.rowCount; // なければ影響を受けた行数を返す
        }
      default:
        // 未知のクエリタイプ
        console.error('⛔️ 未知のクエリタイプです。:', command);
        return [];
    }
  } catch (error) {
    console.error(`⛔️ executeQuery関数実行中にエラーが発生しました: '${error}`);
    return []; // エラーが発生した場合は空の配列または0を返す
  }
}
