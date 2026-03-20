import type { VideoPlayerConfig } from '../config/playerConfig';
import type { DiagnosticEventName, DiagnosticPayloadMap } from './types';

const PREFIX = '[gargantua-player]';

export class Diagnostics {
  constructor(private readonly config: VideoPlayerConfig) {}

  info<E extends DiagnosticEventName>(event: E, payload: DiagnosticPayloadMap[E]): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.info(PREFIX, event, payload);
  }

  warn<E extends DiagnosticEventName>(event: E, payload: DiagnosticPayloadMap[E]): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.warn(PREFIX, event, payload);
  }

  error<E extends DiagnosticEventName>(event: E, payload: DiagnosticPayloadMap[E]): void {
    if (!this.config.enableConsoleDiagnostics) {
      return;
    }

    console.error(PREFIX, event, payload);
  }
}
