import type { VideoPlayerConfig } from '../config/playerConfig';
import { Diagnostics } from './diagnostics';
import { getFallbackSequence, selectInitialVariant } from './selection';
import type { PlaybackFailureContext, VideoManifest, VideoVariant } from './types';

interface PlayerElements {
  root: HTMLElement;
  stage: HTMLElement;
  poster: HTMLImageElement;
  video: HTMLVideoElement;
}

export async function mountVideoPlayer(
  target: HTMLElement,
  manifest: VideoManifest,
  config: VideoPlayerConfig,
): Promise<void> {
  const diagnostics = new Diagnostics(config);
  const elements = createPlayerElements(target, manifest.poster, config);
  const availableVariants = manifest.variants;

  diagnostics.info('init', {
    zoom: config.zoom,
    playbackRate: config.playbackRate,
    variants: availableVariants.map((variant) => variant.id),
  });

  let activeVariant: VideoVariant | null = null;
  let recoveryAttempts = 0;
  let pendingRecoveryTimeout: number | null = null;
  let playbackStarted = false;
  let stageReady = false;
  const rejectedVariantIds = new Set<string>();
  const unsupportedVariantIds = new Set<string>();

  const clearRecoveryTimeout = () => {
    if (pendingRecoveryTimeout !== null) {
      window.clearTimeout(pendingRecoveryTimeout);
      pendingRecoveryTimeout = null;
    }
  };

  const revealVideo = () => {
    if (stageReady) {
      return;
    }

    stageReady = true;
    elements.stage.dataset.ready = 'true';
  };

  const buildExcludedVariantIds = () => new Set([...unsupportedVariantIds, ...rejectedVariantIds]);

  const scheduleRecovery = (reason: string) => {
    const currentVariant = activeVariant;

    if (!currentVariant) {
      return;
    }

    if (recoveryAttempts >= config.maxRecoveryAttemptsPerSession) {
      diagnostics.error('fatal-error', {
        reason: 'Limite de tentativas de recuperação atingido.',
        activeVariant: currentVariant.id,
      });
      return;
    }

    clearRecoveryTimeout();
    pendingRecoveryTimeout = window.setTimeout(() => {
      rejectedVariantIds.add(currentVariant.id);
      const excludedVariantIds = buildExcludedVariantIds();
      const fallbackSequence = getFallbackSequence(currentVariant, availableVariants, excludedVariantIds);
      const fallbackVariant = fallbackSequence[0] ?? null;

      diagnostics.warn('stall-detected', {
        reason,
        activeVariant: currentVariant.id,
        recoveryAttempts,
        fallbackChain: fallbackSequence.map((variant) => variant.id),
        blockedVariants: Array.from(excludedVariantIds),
      });

      if (!fallbackVariant) {
        diagnostics.error('fatal-error', {
          reason: 'Nenhum fallback adicional disponível.',
          activeVariant: currentVariant.id,
          blockedVariants: Array.from(excludedVariantIds),
        });
        return;
      }

      recoveryAttempts += 1;

      diagnostics.warn('fallback-triggered', {
        from: currentVariant.id,
        to: fallbackVariant.id,
        reason,
        recoveryAttempts,
        fallbackChain: fallbackSequence.map((variant) => variant.id),
        blockedVariants: Array.from(excludedVariantIds),
      });

      void applyVariant(fallbackVariant, `fallback:${reason}`, {
        fallbackChain: fallbackSequence.map((variant) => variant.id),
        blockedVariants: Array.from(excludedVariantIds),
      });
    }, config.stallRecoveryThresholdMs);
  };

  const cancelStallMonitoring = () => {
    clearRecoveryTimeout();
  };

  const attachEventListeners = () => {
    elements.video.addEventListener('loadeddata', () => {
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        elements.video.requestVideoFrameCallback(() => {
          revealVideo();
        });
        return;
      }

      revealVideo();
    });

    elements.video.addEventListener('playing', () => {
      cancelStallMonitoring();

      if (!playbackStarted) {
        playbackStarted = true;
        diagnostics.info('playback-started', {
          variant: activeVariant?.id,
          sourceKind: activeVariant?.sourceKind,
          playbackRate: elements.video.playbackRate,
          quality: getPlaybackQuality(elements.video),
        });
      } else {
        diagnostics.info('recovery-succeeded', {
          variant: activeVariant?.id,
          quality: getPlaybackQuality(elements.video),
        });
      }
    });

    elements.video.addEventListener('waiting', () => {
      scheduleRecovery('waiting');
    });

    elements.video.addEventListener('stalled', () => {
      scheduleRecovery('stalled');
    });

    elements.video.addEventListener('canplay', () => {
      cancelStallMonitoring();
    });

    elements.video.addEventListener('seeked', () => {
      cancelStallMonitoring();
    });

    elements.video.addEventListener('suspend', () => {
      cancelStallMonitoring();
    });

    elements.video.addEventListener('error', () => {
      if (!activeVariant) {
        diagnostics.warn('playback-error', {
          reason: 'Erro antes da variante inicial ser definida.',
          nativeCode: elements.video.error?.code ?? null,
        });
        return;
      }

      const error = elements.video.error;
      const failureContext: PlaybackFailureContext = {
        reason: 'Erro nativo do elemento de vídeo.',
        nativeCode: error?.code ?? null,
        details: {
          message: mapMediaErrorCode(error?.code),
          activeVariant: activeVariant?.id,
        },
      };

      diagnostics.error('playback-error', { ...failureContext });

      if (activeVariant) {
        if (recoveryAttempts >= config.maxRecoveryAttemptsPerSession) {
          diagnostics.error('fatal-error', {
            ...failureContext,
            reason: 'Limite de tentativas de recuperação atingido após erro de reprodução.',
          });
          return;
        }

        rejectedVariantIds.add(activeVariant.id);
        const excludedVariantIds = buildExcludedVariantIds();
        const fallbackSequence = getFallbackSequence(activeVariant, availableVariants, excludedVariantIds);
        const fallbackVariant = fallbackSequence[0] ?? null;

        if (fallbackVariant) {
          recoveryAttempts += 1;
          diagnostics.warn('fallback-triggered', {
            from: activeVariant.id,
            to: fallbackVariant.id,
            reason: 'error-event',
            nativeCode: error?.code ?? null,
            fallbackChain: fallbackSequence.map((variant) => variant.id),
            blockedVariants: Array.from(excludedVariantIds),
          });
          void applyVariant(fallbackVariant, 'error-event', {
            fallbackChain: fallbackSequence.map((variant) => variant.id),
            blockedVariants: Array.from(excludedVariantIds),
          });
          return;
        }
      }

      diagnostics.error('fatal-error', { ...failureContext });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        elements.video.pause();
        return;
      }

      void playCurrentVideo('visibility-resume');
    });
  };

  const playCurrentVideo = async (reason: string) => {
    try {
      await elements.video.play();
    } catch (error) {
      diagnostics.error('playback-error', {
        reason,
        variant: activeVariant?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const applyVariant = async (
    variant: VideoVariant,
    reason: string,
    details: Record<string, unknown> = {},
  ) => {
    activeVariant = variant;
    cancelStallMonitoring();
    elements.video.pause();
    elements.video.src = variant.src;
    elements.video.load();
    elements.video.dataset.variant = `${variant.id}`;

    diagnostics.info('variant-selected', {
      variant: variant.id,
      sourceKind: variant.sourceKind,
      ladder: variant.ladder,
      format: variant.format,
      width: variant.width,
      height: variant.height,
      bitrate: variant.bitrate,
      reason,
      ...details,
    });

    await playCurrentVideo(reason);
  };

  attachEventListeners();

  const selection = await selectInitialVariant(elements.video, availableVariants);

  for (const evaluation of selection.diagnostics.evaluations) {
    if (
      evaluation.rejectedReason === 'canPlayType=false' ||
      evaluation.rejectedReason === 'mediaCapabilities.supported=false'
    ) {
      unsupportedVariantIds.add(evaluation.variantId);
    }
  }

  if (selection.candidates[0]?.id !== selection.variant.id) {
    diagnostics.warn('fallback-triggered', {
      from: selection.candidates[0]?.id,
      to: selection.variant.id,
      reason: 'initial-selection',
      details: selection.reason,
      selectionDiagnostics: selection.diagnostics,
    });
  }

  await applyVariant(selection.variant, selection.reason, {
    selectionDiagnostics: selection.diagnostics,
  });
}

function createPlayerElements(
  target: HTMLElement,
  posterUrl: string,
  config: VideoPlayerConfig,
): PlayerElements {
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.style.setProperty('--video-scale', String(config.zoom));

  const poster = document.createElement('img');
  poster.className = 'stage__poster';
  poster.src = posterUrl;
  poster.alt = '';
  poster.decoding = 'async';
  poster.fetchPriority = 'high';
  poster.loading = 'eager';

  const video = document.createElement('video');
  video.className = 'stage__video';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.controls = false;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.playbackRate = config.playbackRate;
  video.defaultPlaybackRate = config.playbackRate;
  video.setAttribute('aria-label', 'Vídeo em looping de um buraco negro');

  stage.append(poster, video);
  target.append(stage);

  return {
    root: target,
    stage,
    poster,
    video,
  };
}

function mapMediaErrorCode(code?: number | null): string {
  switch (code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return 'Reprodução abortada pelo navegador ou pelo usuário.';
    case MediaError.MEDIA_ERR_NETWORK:
      return 'Falha de rede ao carregar o vídeo.';
    case MediaError.MEDIA_ERR_DECODE:
      return 'Falha ao decodificar o vídeo.';
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return 'Fonte de vídeo não suportada.';
    default:
      return 'Erro de mídia desconhecido.';
  }
}

function getPlaybackQuality(video: HTMLVideoElement): Record<string, unknown> | null {
  if (!('getVideoPlaybackQuality' in video)) {
    return null;
  }

  const quality = video.getVideoPlaybackQuality();

  return {
    droppedVideoFrames: quality.droppedVideoFrames,
    totalVideoFrames: quality.totalVideoFrames,
    corruptedVideoFrames: quality.corruptedVideoFrames,
  };
}
