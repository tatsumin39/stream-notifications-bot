// メッセージテキストに基づいてクエリを動的に生成
export function parseMessageToQuery(messageText) {
  let query = '';
  let params = [];
  let placeholderIndex = 1;

  try {
    function appendWhereClause(inputText) {
      const whereRegex = /WHERE\s+(.+)$/i;
      const whereMatch = inputText.match(whereRegex);
      if (whereMatch) {
        let whereClause = whereMatch[1];
        whereClause.split(/\s+(AND|OR)\s+/i).forEach(part => {
          const conditionMatch = part.match(/(.*?)\s*=\s*['"](.*?)['"]/);
          if (conditionMatch) {
            const [_, columnName, columnValue] = conditionMatch;
            query += query.includes("WHERE") ? ` AND ${columnName} = $${placeholderIndex}` : ` WHERE ${columnName} = $${placeholderIndex}`;
            params.push(columnValue);
            placeholderIndex++;
          } else if (part.match(/AND|OR/i)) {
            query += ` ${part}`;
          }
        });
      }
    }

    if (messageText.match(/SELECT\s+/i)) {
      const selectMatch = messageText.match(/SELECT\s+(.*?)\s+FROM\s+["']([^"']+)["']/i);
      if (selectMatch) {
        const [fullMatch, columns, tableName] = selectMatch;
        query = `SELECT ${columns} FROM "${tableName}"`;
        appendWhereClause(messageText);

        const orderByMatch = messageText.match(/ORDER BY\s+(.*?)\s+(ASC|DESC)/);
        if (orderByMatch) {
          const [___, columnName, sortOrder] = orderByMatch;
          query += ` ORDER BY ${columnName} ${sortOrder}`;
        }

        const limitMatch = messageText.match(/LIMIT\s+(\d+)/);
        if (limitMatch) {
          const limitValue = limitMatch[1];
          query += ` LIMIT $${placeholderIndex}`;
          params.push(parseInt(limitValue, 10));
          placeholderIndex++;
        }
      }
    } else if (messageText.match(/DELETE FROM\s+/i)) {
      const deleteFromMatch = messageText.match(/DELETE FROM ["']([^"']+)["']/i);
      if (deleteFromMatch) {
        const tableName = deleteFromMatch[1];
        query = `DELETE FROM "${tableName}"`;
        appendWhereClause(messageText);
      }
    } else if (messageText.match(/INSERT INTO\s+/i)) {
      const insertMatch = messageText.match(/INSERT INTO ["']?([^"']+)["']?\s+\((.*?)\)\s+VALUES\s+\((.*?)\)/i);
      if (insertMatch) {
        const [__, tableName, columns, values] = insertMatch;
        const columnsList = columns.split(',').map(col => col.trim());
        const valuesList = values.split(',').map(val => val.trim().replace(/^['"]|['"]$/g, ''));
        query = `INSERT INTO "${tableName}" (${columnsList.join(', ')}) VALUES (${valuesList.map(() => `$${placeholderIndex++}`).join(', ')})`;
        params = valuesList;
      }
    } else if (messageText.match(/UPDATE\s+/i)) {
      const updateMatch = messageText.match(/UPDATE\s+["']([^"']+)["']\s+SET\s+(.*?)\s+WHERE\s+(.*?)(?:\s*=\s*['"](.*?)['"])/i);
      if (updateMatch) {
        const [_, tableName, setPairsString, whereColumn, whereValue] = updateMatch;
        const setPairs = setPairsString.split(',').map(pair => pair.trim().split(/\s*=\s*/));

        query = `UPDATE "${tableName}" SET `;
        let setParts = [];

        for (let [column, value] of setPairs) {
          setParts.push(`${column} = $${placeholderIndex}`);
          params.push(value.replace(/['"]/g, ''));
          placeholderIndex++;
        }

        query += setParts.join(', ');
        query += ` WHERE ${whereColumn} = $${placeholderIndex}`;
        params.push(whereValue.replace(/['"]/g, ''));
        placeholderIndex++;
      }
    }

    return { query, params };
  } catch (error) {
    console.error(`⛔️ Error parsing message to query: ${error.message}`);
    return { query: '', params: [] };
  }
}
