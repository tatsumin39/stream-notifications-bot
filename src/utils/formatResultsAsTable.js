// SQLの実行結果をマークダウンの表形式に変換
export function formatResultsAsTable(results) {
  if (typeof results === 'number') {
    return `影響を受けた行数: ${results}`;
  }

  if (!Array.isArray(results) || results.length === 0) {
    return 'データがありません。';
  }

  const headers = Object.keys(results[0]);
  const headerRow = '| ' + headers.join(' | ') + ' |';
  const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';

  const dataRows = results.map(item => {
    return '| ' + headers.map(header => {
      if (header === 'reminder_time') {
        return new Date(item[header]).toLocaleString();
      } else if (typeof item[header] === 'boolean') {
        return item[header] ? 'true' : 'false';
      } else {
        return item[header];
      }
    }).join(' | ') + ' |';
  }).join('\n');

  return headerRow + '\n' + separatorRow + '\n' + dataRows;
}
