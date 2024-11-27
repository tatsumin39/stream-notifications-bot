import fetch from 'node-fetch';

/**
 * YouTube動画がShort動画か通常動画かを判定する
 * @param {string} videoId - 判定対象の動画ID
 * @returns {Promise<boolean>} - Short動画の場合はtrue、それ以外はfalse
 */
export async function isShort(videoId) {
  const url = `https://youtube.com/shorts/${videoId}`;
  try {
    // リダイレクトを追跡する設定
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    // レスポンスURLが/shorts/を含む場合はShort動画
    if (response.url.includes('/shorts/')) {
      return true; // Short動画
    }
    // それ以外の場合は通常動画
    return false;
  } catch (error) {
    console.error('⛔️ isShort関数内でエラーが発生:', error.message);
    return false; // 判定できない場合は通常動画として扱う
  }
}
