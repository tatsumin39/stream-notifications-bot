import fetch from "node-fetch";

/**
 * 指定されたYouTube動画がショート動画かどうかを判定します。
 *
 * @function isShort
 * @param {string} videoId - 判定対象のYouTube動画ID。
 * @returns {Promise<boolean>} - 動画がショートの場合は `true`、それ以外の場合は `false`。
 * @throws {Error} - ネットワークエラーや無効な応答の場合にスローします。
 */
export async function isShort(videoId) {
  // ショート動画のURL形式
  const url = `https://youtube.com/shorts/${videoId}`;
  try {
    // HEADリクエストでリダイレクトURLをチェック
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });

    // リダイレクト先URLに"/shorts/"を含むかどうかで判定
    return response.url.includes("/shorts/");
  } catch (error) {
    // エラーが発生した場合はログに記録し、falseを返す
    console.error(`⛔️ ショート動画判定中にエラーが発生しました: ${error.message}`);
    return false;
  }
}
