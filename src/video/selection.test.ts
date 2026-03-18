import { describe, expect, it } from 'vitest';

import {
  getFallbackSequence,
  pickPreferredLadder,
  rankVariantCandidates,
  type EvaluatedVariant,
  type VariantSupportSnapshot,
} from './selection';
import type { VideoVariant } from './types';

const variants: VideoVariant[] = [
  createVariant('2160p-av1', '2160p', 'av1-webm'),
  createVariant('2160p-h264-original', '2160p', 'h264-mp4'),
  createVariant('1080p-av1', '1080p', 'av1-webm'),
  createVariant('1080p-h264', '1080p', 'h264-mp4'),
  createVariant('720p-av1', '720p', 'av1-webm'),
  createVariant('720p-h264', '720p', 'h264-mp4'),
];

describe('pickPreferredLadder', () => {
  it('mantém 2160p para iPhone premium em retrato/high-DPR', () => {
    expect(
      pickPreferredLadder({
        coverRequiredHeight: 2556,
        constrainedNetwork: false,
      }),
    ).toBe('2160p');
  });

  it('usa 1080p como baseline em desktop 1920x1080 DPR1', () => {
    expect(
      pickPreferredLadder({
        coverRequiredHeight: 1080,
        constrainedNetwork: false,
      }),
    ).toBe('1080p');
  });

  it('força 720p quando a rede é explicitamente restrita', () => {
    expect(
      pickPreferredLadder({
        coverRequiredHeight: 2556,
        constrainedNetwork: true,
      }),
    ).toBe('720p');
  });
});

describe('rankVariantCandidates', () => {
  it('não cai para 720p só porque a tela do iPhone é estreita', () => {
    const ranked = rankVariantCandidates(
      buildEvaluations({
        '2160p-av1': { canPlay: false },
      }),
      '2160p',
    );

    expect(ranked[0]?.variant.id).toBe('2160p-h264-original');
    expect(ranked[0]?.variant.ladder).toBe('2160p');
  });

  it('troca para H.264 no mesmo ladder antes de cair resolução quando AV1 não é smooth', () => {
    const ranked = rankVariantCandidates(
      buildEvaluations({
        '2160p-av1': { supported: true, smooth: false },
        '2160p-h264-original': { supported: true, smooth: true },
      }),
      '2160p',
    );

    expect(ranked[0]?.variant.id).toBe('2160p-h264-original');
  });

  it('não penaliza ausência de mediaCapabilities ou network info', () => {
    const ranked = rankVariantCandidates(
      buildEvaluations({
        '2160p-av1': {
          supported: null,
          smooth: null,
          powerEfficient: null,
        },
        '2160p-h264-original': {
          supported: null,
          smooth: null,
          powerEfficient: null,
        },
      }),
      '2160p',
    );

    expect(ranked[0]?.variant.id).toBe('2160p-av1');
  });
});

describe('getFallbackSequence', () => {
  it('tenta o mesmo ladder em outro codec antes de cair para 1080p', () => {
    const sequence = getFallbackSequence(findVariant('2160p-av1'), variants);

    expect(sequence.map((variant) => variant.id).slice(0, 3)).toEqual([
      '2160p-h264-original',
      '1080p-av1',
      '1080p-h264',
    ]);
  });

  it('pula variantes já bloqueadas na sessão', () => {
    const sequence = getFallbackSequence(
      findVariant('2160p-av1'),
      variants,
      new Set(['2160p-h264-original', '1080p-av1']),
    );

    expect(sequence[0]?.id).toBe('1080p-h264');
  });
});

function buildEvaluations(
  overrides: Partial<Record<string, Partial<VariantSupportSnapshot>>> = {},
): EvaluatedVariant[] {
  return variants.map((variant) => ({
    variant,
    support: {
      canPlay: true,
      supported: null,
      smooth: null,
      powerEfficient: null,
      ...overrides[variant.id],
    },
  }));
}

function createVariant(
  id: VideoVariant['id'],
  ladder: VideoVariant['ladder'],
  format: VideoVariant['format'],
): VideoVariant {
  const height = ladder === '2160p' ? 2160 : ladder === '1080p' ? 1080 : 720;
  const width = Math.round((height * 16) / 9);

  return {
    id,
    ladder,
    format,
    sourceKind: id.includes('original') ? 'original' : 'derivative',
    mimeType: format === 'av1-webm' ? 'video/webm; codecs="av01"' : 'video/mp4; codecs="avc1"',
    width,
    height,
    bitrate: height * 1000,
    framerate: 60,
    src: `/${id}`,
  };
}

function findVariant(id: string): VideoVariant {
  const variant = variants.find((candidate) => candidate.id === id);

  if (!variant) {
    throw new Error(`Variant not found: ${id}`);
  }

  return variant;
}
