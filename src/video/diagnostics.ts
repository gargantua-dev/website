import type { VideoPlayerConfig } from '../config/playerConfig';
import type { DiagnosticEventName, DiagnosticEventPayload } from './types';

const PREFIX = '[gargantua-player]';

export class Diagnostics {
  constructor(private readonly config: VideoPlayerConfig) {}

  info(event: DiagnosticEventName, payload: DiagnosticEventPayload = {}): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.info(PREFIX, event, payload);
  }

  warn(event: DiagnosticEventName, payload: DiagnosticEventPayload = {}): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.warn(PREFIX, event, payload);
  }

  error(event: DiagnosticEventName, payload: DiagnosticEventPayload = {}): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.error(PREFIX, event, payload);
  }
}
