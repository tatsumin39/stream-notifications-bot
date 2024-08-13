import fetch from 'node-fetch';

// URLがアクセス可能かどうかを確認する関数
export const isUrlAccessible = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`⛔️ URLがアクセスできませんでした - エラーメッセージ: ${error.message}`);
    return false;
  }
};
