import type { VideoVariant } from './types';

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

interface MediaCapabilitiesInfo {
  supported: boolean;
  smooth: boolean;
  powerEfficient: boolean;
}

interface VideoDecodingConfigurationLike {
  type: 'file';
  video: {
    contentType: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
  };
}

interface MediaCapabilitiesLike {
  decodingInfo: (configuration: VideoDecodingConfigurationLike) => Promise<MediaCapabilitiesInfo>;
}

export interface PlaybackEnvironment {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  coverRequiredHeight: number;
  constrainedNetwork: boolean;
  saveData: boolean;
  effectiveType: string;
  mediaCapabilities?: MediaCapabilitiesLike;
}

export interface VariantCapabilityResult {
  canPlay: boolean;
  mediaCapabilities: MediaCapabilitiesInfo | null;
}

export function getPlaybackEnvironment(): PlaybackEnvironment {
  const navigatorWithConnection = navigator as NavigatorWithConnection;
  const connection =
    navigatorWithConnection.connection ??
    navigatorWithConnection.mozConnection ??
    navigatorWithConnection.webkitConnection;

  const effectiveType = connection?.effectiveType ?? 'unknown';
  const saveData = connection?.saveData === true;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const devicePixelRatio = clamp(window.devicePixelRatio || 1, 1, 3);
  const coverRequiredHeight = calculateCoverRequiredHeight(viewportWidth, viewportHeight, devicePixelRatio);
  const constrainedNetwork =
    saveData ||
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g';

  return {
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    coverRequiredHeight,
    constrainedNetwork,
    saveData,
    effectiveType,
    mediaCapabilities: navigator.mediaCapabilities as MediaCapabilitiesLike | undefined,
  };
}

export async function evaluateVariantSupport(
  video: HTMLVideoElement,
  variant: VideoVariant,
  mediaCapabilities?: MediaCapabilitiesLike,
): Promise<VariantCapabilityResult> {
  const canPlay = video.canPlayType(variant.mimeType) !== '';

  if (!canPlay) {
    return {
      canPlay,
      mediaCapabilities: null,
    };
  }

  if (!mediaCapabilities) {
    return {
      canPlay,
      mediaCapabilities: null,
    };
  }

  try {
    const result = await mediaCapabilities.decodingInfo({
      type: 'file',
      video: {
        contentType: variant.mimeType,
        width: variant.width,
        height: variant.height,
        bitrate: variant.bitrate || estimateBitrate(variant),
        framerate: variant.framerate,
      },
    });

    return {
      canPlay,
      mediaCapabilities: result,
    };
  } catch {
    return {
      canPlay,
      mediaCapabilities: null,
    };
  }
}

function estimateBitrate(variant: VideoVariant): number {
  if (variant.format === 'av1-webm') {
    return variant.height >= 2160 ? 6500000 : variant.height >= 1080 ? 2200000 : 1200000;
  }

  return variant.height >= 1080 ? 5200000 : 2800000;
}

export function calculateCoverRequiredHeight(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio: number,
): number {
  return Math.max(viewportHeight, viewportWidth * (9 / 16)) * clamp(devicePixelRatio, 1, 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
