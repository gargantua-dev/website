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

export interface DiagnosticEventPayload {
  [key: string]: unknown;
}

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
