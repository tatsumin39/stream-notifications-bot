/**
 * SQLの実行結果をMarkdownの表形式にフォーマットします。
 *
 * @function formatResultsAsTable
 * @param {Object[]|number} results - SQLクエリの実行結果。行の配列または影響を受けた行数。
 * @returns {string} - Markdown形式の表または実行結果のメッセージ。
 */
export function formatResultsAsTable(results) {
  // 結果が行数の場合
  if (typeof results === "number") {
    return `影響を受けた行数: ${results}`;
  }

  // 結果が配列でない場合や空の場合
  if (!Array.isArray(results) || results.length === 0) {
    return "データがありません。";
  }

  // テーブルのヘッダーを生成
  const headers = Object.keys(results[0]);
  const headerRow = `| ${headers.join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;

  // テーブルのデータ行を生成
  const dataRows = results
    .map((item) =>
      `| ${headers
        .map((header) => {
          const value = item[header];
          if (header === "reminder_time" && value) {
            return new Date(value).toLocaleString(); // reminder_timeをローカル日時形式に変換
          } else if (typeof value === "boolean") {
            return value ? "true" : "false"; // boolean値を文字列化
          } else {
            return value ?? "null"; // null値を明示的に "null" と表現
          }
        })
        .join(" | ")} |`
    )
    .join("\n");

  // ヘッダー行、セパレーター行、データ行を結合して返す
  return `${headerRow}\n${separatorRow}\n${dataRows}`;
}
