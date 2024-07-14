// ISO 8601形式の持続時間をHH:MM:SSに変換する関数
export function convertDuration(duration) {
  if (duration === "P0D") {
    return "00:00:00";
  }
  const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!matches) {
    console.error(`⛔️ 無効な持続時間形式 "${duration}" がconvertDuration関数に渡されました。`);
    return "00:00:00";
  }
  const hours = (matches[1] ? parseInt(matches[1]) : 0);
  const minutes = (matches[2] ? parseInt(matches[2]) : 0);
  const seconds = (matches[3] ? parseInt(matches[3]) : 0);
  return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}
