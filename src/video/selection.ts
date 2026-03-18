import { getPlaybackEnvironment, evaluateVariantSupport } from './capabilities';
import type { VariantSelectionResult, VideoLadder, VideoVariant } from './types';

const LADDER_ORDER: VideoLadder[] = ['2160p', '1080p', '720p'];
const CANDIDATE_ORDER: Record<VideoLadder, VideoLadder[]> = {
  '2160p': ['2160p', '1080p', '720p'],
  '1080p': ['1080p', '720p', '2160p'],
  '720p': ['720p', '1080p', '2160p'],
};

export async function selectInitialVariant(
  video: HTMLVideoElement,
  variants: VideoVariant[],
): Promise<VariantSelectionResult> {
  const environment = getPlaybackEnvironment();
  const preferredLadder = pickPreferredLadder(environment.effectiveWidth, environment.constrainedNetwork);
  const sortedCandidates = sortCandidates(variants, preferredLadder);

  for (const variant of sortedCandidates) {
    const support = await evaluateVariantSupport(video, variant, environment.mediaCapabilities);

    if (!support.canPlay) {
      continue;
    }

    if (support.mediaCapabilities && !support.mediaCapabilities.supported) {
      continue;
    }

    const reason = buildSelectionReason({
      variant,
      preferredLadder,
      effectiveWidth: environment.effectiveWidth,
      constrainedNetwork: environment.constrainedNetwork,
      saveData: environment.saveData,
      effectiveType: environment.effectiveType,
      smooth: support.mediaCapabilities?.smooth,
      powerEfficient: support.mediaCapabilities?.powerEfficient,
    });

    return {
      variant,
      reason,
      candidates: sortedCandidates,
    };
  }

  return {
    variant: sortedCandidates[sortedCandidates.length - 1],
    reason: 'Nenhuma variante passou pela avaliação completa; usando o último fallback disponível.',
    candidates: sortedCandidates,
  };
}

export function getFallbackVariant(current: VideoVariant, variants: VideoVariant[]): VideoVariant | null {
  const ladderIndex = LADDER_ORDER.indexOf(current.ladder);
  const lowerLadders = LADDER_ORDER.slice(ladderIndex + 1);

  for (const ladder of lowerLadders) {
    const sameFormat = variants.find((variant) => variant.ladder === ladder && variant.format === current.format);

    if (sameFormat) {
      return sameFormat;
    }

    const anyFormat = variants.find((variant) => variant.ladder === ladder);

    if (anyFormat) {
      return anyFormat;
    }
  }

  const alternativeFormat = variants.find(
    (variant) => variant.ladder === current.ladder && variant.format !== current.format,
  );

  return alternativeFormat ?? null;
}

function sortCandidates(variants: VideoVariant[], preferredLadder: VideoLadder): VideoVariant[] {
  const preferredOrder = CANDIDATE_ORDER[preferredLadder];

  return [...variants].sort((left, right) => {
    if (left.ladder !== right.ladder) {
      return preferredOrder.indexOf(left.ladder) - preferredOrder.indexOf(right.ladder);
    }

    if (left.format === right.format) {
      return 0;
    }

    return left.format === 'av1-webm' ? -1 : 1;
  });
}

function pickPreferredLadder(effectiveWidth: number, constrainedNetwork: boolean): VideoLadder {
  if (constrainedNetwork || effectiveWidth <= 1100) {
    return '720p';
  }

  if (effectiveWidth <= 2200) {
    return '1080p';
  }

  return '2160p';
}

function buildSelectionReason(input: {
  variant: VideoVariant;
  preferredLadder: VideoLadder;
  effectiveWidth: number;
  constrainedNetwork: boolean;
  saveData: boolean;
  effectiveType: string;
  smooth?: boolean;
  powerEfficient?: boolean;
}): string {
  const parts = [
    `ladderPreferida=${input.preferredLadder}`,
    `larguraEfetiva=${Math.round(input.effectiveWidth)}`,
    `redeRestrita=${input.constrainedNetwork}`,
    `saveData=${input.saveData}`,
    `effectiveType=${input.effectiveType}`,
    `variante=${input.variant.id}`,
  ];

  if (typeof input.smooth === 'boolean') {
    parts.push(`smooth=${input.smooth}`);
  }

  if (typeof input.powerEfficient === 'boolean') {
    parts.push(`powerEfficient=${input.powerEfficient}`);
  }

  return parts.join(', ');
}
