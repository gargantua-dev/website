import posterUrl from '../../assets/generated/black-hole-poster.avif';
import original2160Mp4Url from '../../assets/black-hole.mp4';
import fallback1080Mp4Url from '../../assets/generated/black-hole-1080p-h264.mp4';
import fallback720Mp4Url from '../../assets/generated/black-hole-720p-h264.mp4';
import av1_720Url from '../../assets/generated/black-hole-720p-av1.webm';
import av1_1080Url from '../../assets/generated/black-hole-1080p-av1.webm';
import av1_2160Url from '../../assets/generated/black-hole-2160p-av1.webm';
import type { VideoManifest } from './types';

export const mediaManifest: VideoManifest = {
  poster: posterUrl,
  variants: [
    {
      id: '2160p-av1',
      ladder: '2160p',
      format: 'av1-webm',
      sourceKind: 'derivative',
      mimeType: 'video/webm; codecs="av01.0.12M.08"',
      width: 3840,
      height: 2160,
      bitrate: 6439179,
      framerate: 60,
      src: av1_2160Url,
    },
    {
      id: '2160p-h264-original',
      ladder: '2160p',
      format: 'h264-mp4',
      sourceKind: 'original',
      mimeType: 'video/mp4; codecs="avc1.640028"',
      width: 3840,
      height: 2160,
      bitrate: 12337147,
      framerate: 60,
      src: original2160Mp4Url,
    },
    {
      id: '1080p-av1',
      ladder: '1080p',
      format: 'av1-webm',
      sourceKind: 'derivative',
      mimeType: 'video/webm; codecs="av01.0.08M.08"',
      width: 1920,
      height: 1080,
      bitrate: 2172017,
      framerate: 60,
      src: av1_1080Url,
    },
    {
      id: '1080p-h264',
      ladder: '1080p',
      format: 'h264-mp4',
      sourceKind: 'derivative',
      mimeType: 'video/mp4; codecs="avc1.64002A"',
      width: 1920,
      height: 1080,
      bitrate: 5114171,
      framerate: 60,
      src: fallback1080Mp4Url,
    },
    {
      id: '720p-av1',
      ladder: '720p',
      format: 'av1-webm',
      sourceKind: 'derivative',
      mimeType: 'video/webm; codecs="av01.0.05M.08"',
      width: 1280,
      height: 720,
      bitrate: 1126900,
      framerate: 60,
      src: av1_720Url,
    },
    {
      id: '720p-h264',
      ladder: '720p',
      format: 'h264-mp4',
      sourceKind: 'derivative',
      mimeType: 'video/mp4; codecs="avc1.64001F"',
      width: 1280,
      height: 720,
      bitrate: 2259830,
      framerate: 60,
      src: fallback720Mp4Url,
    },
  ],
};
