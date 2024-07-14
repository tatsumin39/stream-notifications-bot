import axios from 'axios';

// URLがアクセス可能かどうかを確認する関数
export const isUrlAccessible = async (url) => {
  try {
    await axios.get(url);
    return true;
  } catch (error) {
    console.error(`⛔️ URLがアクセスできませんでした - エラーメッセージ: ${error.message}`);
    return false;
  }
};
