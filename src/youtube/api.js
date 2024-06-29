import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import { convertDuration } from '../utils/convertDuration.js';
import { updateChannelIcon } from '../database/updateChannelIcon.js';

const apiKey = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({
  version: 'v3',
  auth: apiKey
});

// チャンネルアイコンを更新する
export async function fetchChannelInfo(channel_id) {
  try {
    const response = await youtube.channels.list({
      part: 'snippet',
      id: channel_id,
      maxResults: 1
    });

    console.log(`🤖  YouTube.Channels.list API実行: ${channel_id}`);
    
    if (!response || !response.data || !response.data.items || response.data.items.length === 0) {
      console.log(`チャンネルID ${channel_id} の情報が見つかりませんでした。`);
      return null;
    }

    const channelSnippet = response.data.items[0].snippet;
    if (channelSnippet.thumbnails && channelSnippet.thumbnails.default) {
      const thumbnailUrl = channelSnippet.thumbnails.default.url;
      console.log(`チャンネル名: ${channelSnippet.title} の新しいアイコンURLは ${thumbnailUrl} です`);
      await updateChannelIcon(thumbnailUrl, channel_id);
    } else {
      console.log(`チャンネルID ${channel_id} のサムネイルが見つかりません。`);
    }
  } catch (error) {
    console.error(`API呼び出し中にエラーが発生しました: ${error.message}`);
    return null;
  }
}

// YouTube.Videos.list APIを実行しビデオ情報を取得
export async function fetchVideoInfo(videoId) {
  try {
    const response = await youtube.videos.list({
      part: ['id', 'snippet', 'liveStreamingDetails', 'contentDetails'],
      id: videoId,
      fields: 'items(id, snippet(liveBroadcastContent, title), liveStreamingDetails(scheduledStartTime, actualStartTime, actualEndTime), contentDetails(duration))'
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('ビデオ情報が見つかりませんでした');
    }

    const apiVideoInfo = response.data.items[0];
    console.log(`🤖  YouTube.Videos.list API実行: ${apiVideoInfo.snippet.title} videoId: ${videoId}`);

    let liveBroadcastContent = 'none';
    if (!apiVideoInfo.liveStreamingDetails) {
      liveBroadcastContent = 'video';
    }else if (apiVideoInfo.snippet.liveBroadcastContent === 'upcoming') {
      liveBroadcastContent = 'upcoming';
    } else if (apiVideoInfo.snippet.liveBroadcastContent === 'live') {
      liveBroadcastContent = 'live';
    }else if (apiVideoInfo.snippet.liveBroadcastContent === 'none' && apiVideoInfo.liveStreamingDetails.actualEndTime) {
      liveBroadcastContent = 'archive';
    }

    return {
      videoId: apiVideoInfo.id,
      liveBroadcastContent,
      title: apiVideoInfo.snippet.title,
      scheduled_start_time: apiVideoInfo.liveStreamingDetails?.scheduledStartTime || null,
      actual_start_time: apiVideoInfo.liveStreamingDetails?.actualStartTime || null,
      actualEndTime: apiVideoInfo.liveStreamingDetails?.actualEndTime || null,
      duration: convertDuration(apiVideoInfo.contentDetails.duration)
    };
  } catch (error) {
    console.error(`fetchVideoInfoでエラーが発生しました - ビデオID: ${videoId}, エラーメッセージ: ${error.message}`);
    return {
      videoId: videoId,
      liveBroadcastContent: 'none',
      title: false,
      scheduled_start_time: null,
      actual_start_time: null,
      actualEndTime: null,
      duration: null
    };
  }
}
