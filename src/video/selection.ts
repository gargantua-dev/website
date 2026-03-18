import { evaluateVariantSupport, getPlaybackEnvironment } from './capabilities';
import type { PlaybackEnvironment } from './capabilities';
import type {
  VariantSelectionDiagnostics,
  VariantSelectionResult,
  VideoLadder,
  VideoVariant,
} from './types';

const LADDER_ORDER: VideoLadder[] = ['2160p', '1080p', '720p'];
const CANDIDATE_ORDER: Record<VideoLadder, VideoLadder[]> = {
  '2160p': ['2160p', '1080p', '720p'],
  '1080p': ['1080p', '2160p', '720p'],
  '720p': ['720p', '1080p', '2160p'],
};

export interface VariantSupportSnapshot {
  canPlay: boolean;
  supported: boolean | null;
  smooth: boolean | null;
  powerEfficient: boolean | null;
}

export interface EvaluatedVariant {
  variant: VideoVariant;
  support: VariantSupportSnapshot;
}

export async function selectInitialVariant(
  video: HTMLVideoElement,
  variants: VideoVariant[],
): Promise<VariantSelectionResult> {
  const environment = getPlaybackEnvironment();
  const preferredLadder = pickPreferredLadder(environment);
  const evaluations = await Promise.all(
    variants.map(async (variant): Promise<EvaluatedVariant> => {
      const support = await evaluateVariantSupport(video, variant, environment.mediaCapabilities);

      return {
        variant,
        support: toSupportSnapshot(support),
      };
    }),
  );

  const orderedCandidates = sortCandidateVariants(variants, preferredLadder, evaluations);
  const rankedCandidates = rankVariantCandidates(evaluations, preferredLadder);
  const diagnostics = buildSelectionDiagnostics(environment, preferredLadder, orderedCandidates, evaluations);
  const selectedCandidate = rankedCandidates[0];

  if (selectedCandidate) {
    return {
      variant: selectedCandidate.variant,
      reason: buildSelectionReason({
        variant: selectedCandidate.variant,
        preferredLadder,
        environment,
        support: selectedCandidate.support,
      }),
      candidates: orderedCandidates,
      diagnostics,
    };
  }

  const lastResortVariant = getLastResortVariant(variants);

  return {
    variant: lastResortVariant,
    reason: 'Nenhuma variante passou pelos filtros explícitos; usando o fallback final mais compatível.',
    candidates: orderedCandidates,
    diagnostics,
  };
}

export function pickPreferredLadder(
  environment: Pick<PlaybackEnvironment, 'coverRequiredHeight' | 'constrainedNetwork'>,
): VideoLadder {
  if (environment.constrainedNetwork) {
    return '720p';
  }

  if (environment.coverRequiredHeight >= 1620) {
    return '2160p';
  }

  if (environment.coverRequiredHeight >= 900) {
    return '1080p';
  }

  return '720p';
}

export function rankVariantCandidates(
  evaluations: EvaluatedVariant[],
  preferredLadder: VideoLadder,
): EvaluatedVariant[] {
  return [...evaluations]
    .filter((evaluation) => isSelectableCandidate(evaluation.support))
    .sort((left, right) => compareCandidates(left, right, preferredLadder));
}

export function getFallbackVariant(
  current: VideoVariant,
  variants: VideoVariant[],
  rejectedVariantIds: ReadonlySet<string> = new Set<string>(),
): VideoVariant | null {
  return getFallbackSequence(current, variants, rejectedVariantIds)[0] ?? null;
}

export function getFallbackSequence(
  current: VideoVariant,
  variants: VideoVariant[],
  rejectedVariantIds: ReadonlySet<string> = new Set<string>(),
): VideoVariant[] {
  const seen = new Set<string>([current.id, ...rejectedVariantIds]);
  const sequence: VideoVariant[] = [];
  const ladderIndex = LADDER_ORDER.indexOf(current.ladder);
  const lowerLadders = ladderIndex >= 0 ? LADDER_ORDER.slice(ladderIndex + 1) : [];

  const maybeAdd = (variant: VideoVariant | undefined) => {
    if (!variant || seen.has(variant.id)) {
      return;
    }

    seen.add(variant.id);
    sequence.push(variant);
  };

  maybeAdd(
    variants.find(
      (variant) =>
        variant.ladder === current.ladder &&
        variant.format !== current.format &&
        variant.id !== current.id,
    ),
  );

  for (const ladder of lowerLadders) {
    maybeAdd(variants.find((variant) => variant.ladder === ladder && variant.format === current.format));
    maybeAdd(variants.find((variant) => variant.ladder === ladder && variant.format !== current.format));
  }

  return sequence;
}

function sortCandidateVariants(
  variants: VideoVariant[],
  preferredLadder: VideoLadder,
  evaluations: EvaluatedVariant[],
): VideoVariant[] {
  const supportById = new Map(evaluations.map((evaluation) => [evaluation.variant.id, evaluation.support]));

  return [...variants].sort((left, right) =>
    compareVariantPreference(
      left,
      supportById.get(left.id),
      right,
      supportById.get(right.id),
      preferredLadder,
    ),
  );
}

function compareCandidates(left: EvaluatedVariant, right: EvaluatedVariant, preferredLadder: VideoLadder): number {
  return compareVariantPreference(left.variant, left.support, right.variant, right.support, preferredLadder);
}

function compareVariantPreference(
  leftVariant: VideoVariant,
  leftSupport: VariantSupportSnapshot | undefined,
  rightVariant: VideoVariant,
  rightSupport: VariantSupportSnapshot | undefined,
  preferredLadder: VideoLadder,
): number {
  const preferredOrder = CANDIDATE_ORDER[preferredLadder];

  if (leftVariant.ladder !== rightVariant.ladder) {
    return preferredOrder.indexOf(leftVariant.ladder) - preferredOrder.indexOf(rightVariant.ladder);
  }

  const leftSmoothPenalty = leftSupport?.smooth === false ? 1 : 0;
  const rightSmoothPenalty = rightSupport?.smooth === false ? 1 : 0;

  if (leftSmoothPenalty !== rightSmoothPenalty) {
    return leftSmoothPenalty - rightSmoothPenalty;
  }

  const leftPowerPenalty = leftSupport?.powerEfficient === false ? 1 : 0;
  const rightPowerPenalty = rightSupport?.powerEfficient === false ? 1 : 0;

  if (leftPowerPenalty !== rightPowerPenalty) {
    return leftPowerPenalty - rightPowerPenalty;
  }

  if (leftVariant.format === rightVariant.format) {
    return 0;
  }

  return leftVariant.format === 'av1-webm' ? -1 : 1;
}

function isSelectableCandidate(support: VariantSupportSnapshot): boolean {
  return support.canPlay && support.supported !== false;
}

function toSupportSnapshot(support: {
  canPlay: boolean;
  mediaCapabilities: {
    supported: boolean;
    smooth: boolean;
    powerEfficient: boolean;
  } | null;
}): VariantSupportSnapshot {
  return {
    canPlay: support.canPlay,
    supported: support.mediaCapabilities?.supported ?? null,
    smooth: support.mediaCapabilities?.smooth ?? null,
    powerEfficient: support.mediaCapabilities?.powerEfficient ?? null,
  };
}

function buildSelectionDiagnostics(
  environment: PlaybackEnvironment,
  preferredLadder: VideoLadder,
  orderedCandidates: VideoVariant[],
  evaluations: EvaluatedVariant[],
): VariantSelectionDiagnostics {
  const supportById = new Map(evaluations.map((evaluation) => [evaluation.variant.id, evaluation.support]));

  return {
    preferredLadder,
    viewportWidth: environment.viewportWidth,
    viewportHeight: environment.viewportHeight,
    devicePixelRatio: environment.devicePixelRatio,
    coverRequiredHeight: environment.coverRequiredHeight,
    constrainedNetwork: environment.constrainedNetwork,
    saveData: environment.saveData,
    effectiveType: environment.effectiveType,
    evaluations: orderedCandidates.map((variant) => {
      const support = supportById.get(variant.id);

      return {
        variantId: variant.id,
        ladder: variant.ladder,
        format: variant.format,
        canPlay: support?.canPlay ?? false,
        supported: support?.supported ?? null,
        smooth: support?.smooth ?? null,
        powerEfficient: support?.powerEfficient ?? null,
        rejectedReason: support ? buildRejectedReason(support) : 'support-unknown',
      };
    }),
  };
}

function buildRejectedReason(support: VariantSupportSnapshot): string | null {
  if (!support.canPlay) {
    return 'canPlayType=false';
  }

  if (support.supported === false) {
    return 'mediaCapabilities.supported=false';
  }

  return null;
}

function buildSelectionReason(input: {
  variant: VideoVariant;
  preferredLadder: VideoLadder;
  environment: PlaybackEnvironment;
  support: VariantSupportSnapshot;
}): string {
  const parts = [
    `ladderPreferida=${input.preferredLadder}`,
    `viewport=${input.environment.viewportWidth}x${input.environment.viewportHeight}`,
    `dpr=${input.environment.devicePixelRatio}`,
    `coverRequiredHeight=${Math.round(input.environment.coverRequiredHeight)}`,
    `redeRestrita=${input.environment.constrainedNetwork}`,
    `saveData=${input.environment.saveData}`,
    `effectiveType=${input.environment.effectiveType}`,
    `variante=${input.variant.id}`,
  ];

  if (typeof input.support.smooth === 'boolean') {
    parts.push(`smooth=${input.support.smooth}`);
  }

  if (typeof input.support.powerEfficient === 'boolean') {
    parts.push(`powerEfficient=${input.support.powerEfficient}`);
  }

  return parts.join(', ');
}

function getLastResortVariant(variants: VideoVariant[]): VideoVariant {
  return (
    variants.find((variant) => variant.ladder === '720p' && variant.format === 'h264-mp4') ??
    variants.find((variant) => variant.ladder === '720p') ??
    variants[variants.length - 1]
  );
}
