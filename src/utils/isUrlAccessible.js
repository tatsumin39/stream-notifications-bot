import fetch from "node-fetch";

/**
 * 指定されたURLがアクセス可能かどうかを確認します。
 *
 * @async
 * @function isUrlAccessible
 * @param {string} url - アクセスを確認するURL
 * @returns {Promise<boolean>} - アクセス可能な場合は `true`、それ以外は `false`
 */
export const isUrlAccessible = async (url) => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return true; // ステータスコード200系の場合はアクセス可能
    }
    console.warn(`⚠️ URL ${url} へのアクセスが失敗しました。HTTPステータス: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`⛔️ URL ${url} がアクセスできません: ${error.message}`);
    return false;
  }
};
