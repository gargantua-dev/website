export type VideoFormat = 'av1-webm' | 'h264-mp4';
export type VideoLadder = '720p' | '1080p' | '2160p';

export interface VideoVariant {
  id: string;
  ladder: VideoLadder;
  format: VideoFormat;
  sourceKind: 'original' | 'derivative';
  mimeType: string;
  width: number;
  height: number;
  bitrate: number;
  framerate: number;
  src: string;
}

export interface VideoManifest {
  poster: string;
  variants: VideoVariant[];
}

export interface VariantEvaluationDiagnostic {
  variantId: string;
  ladder: VideoLadder;
  format: VideoFormat;
  canPlay: boolean;
  supported: boolean | null;
  smooth: boolean | null;
  powerEfficient: boolean | null;
  rejectedReason: string | null;
}

export interface VariantSelectionDiagnostics {
  preferredLadder: VideoLadder;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  coverRequiredHeight: number;
  constrainedNetwork: boolean;
  saveData: boolean;
  effectiveType: string;
  evaluations: VariantEvaluationDiagnostic[];
}

export type DiagnosticEventName =
  | 'init'
  | 'variant-selected'
  | 'fallback-triggered'
  | 'playback-started'
  | 'stall-detected'
  | 'recovery-succeeded'
  | 'playback-error'
  | 'fatal-error';

export type DiagnosticPayloadMap = {
  init: {
    zoom: number;
    playbackRate: number;
    variants: string[];
  };
  'variant-selected': {
    variant: string;
    sourceKind: string;
    ladder: VideoLadder;
    format: VideoFormat;
    width: number;
    height: number;
    bitrate: number;
    reason: string;
  } & Record<string, unknown>;
  'fallback-triggered': {
    from: string | undefined;
    to: string;
    reason: string;
  } & Record<string, unknown>;
  'playback-started': {
    variant: string | undefined;
    sourceKind: string | undefined;
    playbackRate: number;
    quality: Record<string, unknown> | null;
  };
  'stall-detected': {
    reason: string;
    activeVariant: string;
    recoveryAttempts: number;
    fallbackChain: string[];
    blockedVariants: string[];
  };
  'recovery-succeeded': {
    variant: string | undefined;
    quality: Record<string, unknown> | null;
  };
  'playback-error': { reason: string } & Record<string, unknown>;
  'fatal-error': { reason: string } & Record<string, unknown>;
};

export interface VariantSelectionResult {
  variant: VideoVariant;
  reason: string;
  candidates: VideoVariant[];
  diagnostics: VariantSelectionDiagnostics;
}

export interface PlaybackFailureContext {
  reason: string;
  nativeCode?: number | null;
  details?: Record<string, unknown>;
}
