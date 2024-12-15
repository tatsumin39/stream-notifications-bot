/**
 * メッセージテキストを解析し、対応するSQLクエリとパラメータを生成します。
 * 
 * @function parseMessageToQuery
 * @param {string} messageText - 入力されたメッセージテキスト (例: "SELECT * FROM users WHERE id = 1")
 * @returns {Object} - SQLクエリ文字列 (`query`) とパラメータ配列 (`params`) を含むオブジェクト
 * @property {string} query - 動的に生成されたSQLクエリ
 * @property {Array} params - クエリ内で使用されるパラメータの配列
 */
export function parseMessageToQuery(messageText) {
  let query = "";
  let params = [];
  let placeholderIndex = 1;

  try {
    // WHERE句を解析してクエリに追加
    function appendWhereClause(inputText) {
      const whereRegex = /WHERE\s+(.+)$/i;
      const whereMatch = inputText.match(whereRegex);

      if (whereMatch) {
        const whereClause = whereMatch[1];
        whereClause.split(/\s+(AND|OR)\s+/i).forEach((part) => {
          const conditionMatch = part.match(/(.*?)\s*=\s*['"](.*?)['"]/);
          if (conditionMatch) {
            const [_, columnName, columnValue] = conditionMatch;
            query += query.includes("WHERE")
              ? ` AND ${columnName} = $${placeholderIndex}`
              : ` WHERE ${columnName} = $${placeholderIndex}`;
            params.push(columnValue);
            placeholderIndex++;
          } else if (part.match(/AND|OR/i)) {
            query += ` ${part}`;
          }
        });
      }
    }

    if (/SELECT\s+/i.test(messageText)) {
      // SELECT クエリの解析
      const selectMatch = messageText.match(/SELECT\s+(.*?)\s+FROM\s+["']?([^"']+)["']?/i);
      if (selectMatch) {
        const [, columns, tableName] = selectMatch;
        query = `SELECT ${columns} FROM "${tableName}"`;
        appendWhereClause(messageText);

        // ORDER BY の解析
        const orderByMatch = messageText.match(/ORDER BY\s+(\S+)\s+(ASC|DESC)/i);
        if (orderByMatch) {
          const [, columnName, sortOrder] = orderByMatch;
          query += ` ORDER BY ${columnName} ${sortOrder}`;
        }

        // LIMIT の解析
        const limitMatch = messageText.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          query += ` LIMIT $${placeholderIndex}`;
          params.push(parseInt(limitMatch[1], 10));
          placeholderIndex++;
        }
      }
    } else if (/DELETE FROM\s+/i.test(messageText)) {
      // DELETE クエリの解析
      const deleteMatch = messageText.match(/DELETE FROM ["']?([^"']+)["']?/i);
      if (deleteMatch) {
        const [, tableName] = deleteMatch;
        query = `DELETE FROM "${tableName}"`;
        appendWhereClause(messageText);
      }
    } else if (/INSERT INTO\s+/i.test(messageText)) {
      // INSERT クエリの解析
      const insertMatch = messageText.match(/INSERT INTO ["']?([^"']+)["']?\s+\((.*?)\)\s+VALUES\s+\((.*?)\)/i);
      if (insertMatch) {
        const [, tableName, columns, values] = insertMatch;
        const columnsList = columns.split(",").map((col) => col.trim());
        const valuesList = values.split(",").map((val) => val.trim().replace(/^['"]|['"]$/g, ""));
        query = `INSERT INTO "${tableName}" (${columnsList.join(", ")}) VALUES (${valuesList.map(() => `$${placeholderIndex++}`).join(", ")})`;
        params = valuesList;
      }
    } else if (/UPDATE\s+/i.test(messageText)) {
      // UPDATE クエリの解析
      const updateMatch = messageText.match(/UPDATE\s+["']?([^"']+)["']?\s+SET\s+(.*?)\s+WHERE\s+(.*?)(?:\s*=\s*['"](.*?)['"])/i);
      if (updateMatch) {
        const [, tableName, setPairsString, whereColumn, whereValue] = updateMatch;
        const setPairs = setPairsString.split(",").map((pair) => pair.trim().split(/\s*=\s*/));

        query = `UPDATE "${tableName}" SET `;
        const setParts = setPairs.map(([column, value]) => {
          params.push(value.replace(/['"]/g, ""));
          return `${column} = $${placeholderIndex++}`;
        });

        query += setParts.join(", ");
        query += ` WHERE ${whereColumn} = $${placeholderIndex}`;
        params.push(whereValue.replace(/['"]/g, ""));
        placeholderIndex++;
      }
    }

    return { query, params };
  } catch (error) {
    console.error(`⛔️ Error parsing message to query: ${error.message}`);
    return { query: "", params: [] };
  }
}
