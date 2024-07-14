import dayjs from 'dayjs';

// 日付をフォーマットする関数
export function formatDate(dateString, format = 'YYYY-MM-DDTHH:mm:ss') {
  if (!dateString) {
    console.error(`⛔️ 無効な日付 "${dateString}" がformatDate関数に渡されました。`);
    return null;
  }

  const formattedDate = dayjs(dateString);
  if (!formattedDate.isValid()) {
    console.error(`⛔️ 無効な日付文字列 "${dateString}" がformatDate関数に渡されました。`);
    return null;
  }

  return formattedDate.format(format);
}
