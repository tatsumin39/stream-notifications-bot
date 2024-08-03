import pool from "../config/dbConfig.js";

/**
 * 古い動画データをクリーンアップします。
 * - 'upcoming' ステータスの動画で、scheduled_start_timeが13時間以上経過したものを削除します。
 * - 'live' ステータスの動画で、actual_start_timeが13時間以上経過したものを削除します。
 */
export async function cleanUpVideoData() {
  const startTimestamp = new Date();
  const now = new Date();
  const thirteenHoursAgo = new Date(
    now.getTime() - 13 * 60 * 60 * 1000
  ).toISOString();

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const upcomingResults = await client.query(
        `
        SELECT video_id, title, channel FROM video_data
        WHERE status = 'upcoming'
        AND scheduled_start_time < $1
      `,
        [thirteenHoursAgo]
      );

      const liveResults = await client.query(
        `
        SELECT video_id, title, channel FROM video_data
        WHERE status = 'live'
        AND actual_start_time < $1
      `,
        [thirteenHoursAgo]
      );

      if (upcomingResults.rows.length > 0) {
        console.log(
          `🗑️ ${upcomingResults.rows.length}件の削除対象の upcoming ステータスの動画:`
        );
        upcomingResults.rows.forEach((row) => {
          console.log(`タイトル: ${row.title} Video_ID: ${row.video_id}`);
        });
      }
      if (liveResults.rows.length > 0) {
        console.log(
          `🗑️ ${liveResults.rows.length}件の削除対象の live ステータスの動画:`
        );
        liveResults.rows.forEach((row) => {
          console.log(`タイトル: ${row.title} Video_ID: ${row.video_id}`);
        });
      }

      await client.query(
        `
        DELETE FROM video_data
        WHERE status = 'upcoming'
        AND scheduled_start_time < $1
      `,
        [thirteenHoursAgo]
      );

      await client.query(
        `
        DELETE FROM video_data
        WHERE status = 'live'
        AND actual_start_time < $1
      `,
        [thirteenHoursAgo]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("⛔️ Error deleting old video data:", err);
  }

  const endTimestamp = new Date();
  const elapsedMilliseconds = endTimestamp - startTimestamp;
  const elapsedSeconds = elapsedMilliseconds / 1000;

  console.log(
    `video_dataテーブルのクリーンアップ実行時間: ${elapsedSeconds}秒\n`
  );
}
