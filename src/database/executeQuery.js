import pool from "../config/dbConfig.js"; // データベース接続設定をインポート

/**
 * 汎用的なSQLクエリを実行する関数。
 * 
 * クエリタイプに応じて以下の結果を返します:
 * - `SELECT`: クエリ結果の配列 (`rows`) を返します。
 * - `INSERT`, `UPDATE`, `DELETE`: 
 *   - `RETURNING` 句が含まれている場合、結果の配列 (`rows`) を返します。
 *   - 含まれていない場合、影響を受けた行数 (`rowCount`) を返します。
 * - 未知のクエリタイプ: 空の配列を返します。
 *
 * @async
 * @function executeQuery
 * @param {string} query - 実行するSQLクエリ
 * @param {Array} [params=[]] - SQLクエリのパラメータ（デフォルトは空の配列）
 * @returns {Promise<Object[]|number>} - クエリ結果の配列 (`rows`) または影響を受けた行数 (`rowCount`)
 * @throws {Error} - クエリ実行中にエラーが発生した場合
 */
export async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);

    // クエリタイプを判別
    const command = query.trim().split(" ")[0].toUpperCase();

    switch (command) {
      case "SELECT":
        return result.rows; // SELECTクエリの場合、結果の配列を返す

      case "INSERT":
      case "UPDATE":
      case "DELETE":
        if (query.toUpperCase().includes("RETURNING")) {
          return result.rows; // RETURNING句がある場合、結果の配列を返す
        } else {
          return result.rowCount; // 影響を受けた行数を返す
        }

      default:
        console.warn(`⚠️ Unsupported query type: ${command}`);
        return []; // 未知のクエリタイプの場合、空の配列を返す
    }
  } catch (error) {
    console.error("⛔️ Error executing query:", {
      query,
      params,
      message: error.message,
    });
    throw new Error("Database query failed."); // エラーを再スローして呼び出し元で処理可能に
  }
}
