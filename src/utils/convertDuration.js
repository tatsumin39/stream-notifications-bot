/**
 * ISO 8601 形式の持続時間（例: 'PT1H30M15S'）を 'HH:mm:ss' 形式に変換します。
 *
 * @function convertDuration
 * @param {string} duration - ISO 8601 形式の持続時間（例: 'PT1H30M15S' または 'P0D'）。
 * @returns {string} - 'HH:mm:ss' 形式の持続時間（例: '01:30:15'）。
 */
export function convertDuration(duration) {
  if (duration === "P0D") {
    return "00:00:00"; // 持続時間がゼロの場合の特別なケース
  }

  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);

  if (!matches) {
    console.error(`⛔️ 無効な持続時間形式 "${duration}" が convertDuration 関数に渡されました。`);
    return "00:00:00"; // 無効なフォーマットの場合
  }

  // 正規表現のマッチ結果を抽出し、存在しない部分はゼロに初期化
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);

  // 'HH:mm:ss' 形式の文字列を生成
  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0")) // 各時間単位を2桁にフォーマット
    .join(":");
}
