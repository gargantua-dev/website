export interface VideoPlayerConfig {
  zoom: number;
  playbackRate: number;
  enableConsoleDiagnostics: boolean;
  stallRecoveryThresholdMs: number;
  maxRecoveryAttemptsPerSession: number;
}

export const playerConfig: VideoPlayerConfig = {
  zoom: 1,
  playbackRate: 1,
  enableConsoleDiagnostics: true,
  stallRecoveryThresholdMs: 1600,
  maxRecoveryAttemptsPerSession: 2,
};
