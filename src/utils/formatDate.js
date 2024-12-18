import dayjs from "dayjs";

/**
 * 指定された日付文字列を指定フォーマットでフォーマットします。
 *
 * @function formatDate
 * @param {string|Date} dateInput - フォーマットする日付文字列またはDateオブジェクト。
 * @param {string} [format='YYYY-MM-DDTHH:mm:ss'] - 出力する日付フォーマット。デフォルトは ISO 8601 拡張形式。
 * @returns {string|null} - フォーマットされた日付文字列を返す。無効な日付の場合は `null`。
 */
export function formatDate(dateInput, format = "YYYY-MM-DDTHH:mm:ss") {
  // 入力がない場合のエラーハンドリング
  if (!dateInput) {
    console.error(`⛔️ 無効な日付が渡されました: "${dateInput}"`);
    return null;
  }

  // Day.jsオブジェクトを生成
  const formattedDate = dayjs(dateInput);

  // 日付の有効性を確認
  if (!formattedDate.isValid()) {
    console.error(`⛔️ 無効な日付文字列が渡されました: "${dateInput}"`);
    return null;
  }

  // フォーマットして返す
  return formattedDate.format(format);
}
