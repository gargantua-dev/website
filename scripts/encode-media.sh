#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_VIDEO="$ROOT_DIR/assets/black-hole.mp4"
OUTPUT_DIR="$ROOT_DIR/assets/generated"

AV1_2160="$OUTPUT_DIR/black-hole-2160p-av1.webm"
AV1_1080="$OUTPUT_DIR/black-hole-1080p-av1.webm"
AV1_720="$OUTPUT_DIR/black-hole-720p-av1.webm"
H264_1080="$OUTPUT_DIR/black-hole-1080p-h264.mp4"
H264_720="$OUTPUT_DIR/black-hole-720p-h264.mp4"
POSTER_AVIF="$OUTPUT_DIR/black-hole-poster.avif"

mkdir -p "$OUTPUT_DIR"

if [[ ! -f "$SOURCE_VIDEO" ]]; then
  echo "Arquivo de origem não encontrado: $SOURCE_VIDEO" >&2
  exit 1
fi

encode_if_missing() {
  local output_file="$1"
  shift

  if [[ -f "$output_file" ]]; then
    echo "Pulando $(basename "$output_file"), arquivo já existe."
    return
  fi

  ffmpeg -y "$@" "$output_file"
}

echo "Gerando AV1 2160p..."
encode_if_missing "$AV1_2160" \
  -i "$SOURCE_VIDEO" \
  -an \
  -vf "scale=-2:2160:flags=lanczos,format=yuv420p" \
  -c:v libsvtav1 \
  -preset 6 \
  -crf 29 \
  -g 240 \
  -pix_fmt yuv420p

echo "Gerando AV1 1080p..."
encode_if_missing "$AV1_1080" \
  -i "$SOURCE_VIDEO" \
  -an \
  -vf "scale=-2:1080:flags=lanczos,format=yuv420p" \
  -c:v libsvtav1 \
  -preset 7 \
  -crf 31 \
  -g 240 \
  -pix_fmt yuv420p

echo "Gerando AV1 720p..."
encode_if_missing "$AV1_720" \
  -i "$SOURCE_VIDEO" \
  -an \
  -vf "scale=-2:720:flags=lanczos,format=yuv420p" \
  -c:v libsvtav1 \
  -preset 8 \
  -crf 33 \
  -g 240 \
  -pix_fmt yuv420p

echo "Gerando H.264 1080p..."
encode_if_missing "$H264_1080" \
  -i "$SOURCE_VIDEO" \
  -an \
  -vf "scale=-2:1080:flags=lanczos,format=yuv420p" \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -profile:v high \
  -level:v 4.2 \
  -movflags +faststart

echo "Gerando H.264 720p..."
encode_if_missing "$H264_720" \
  -i "$SOURCE_VIDEO" \
  -an \
  -vf "scale=-2:720:flags=lanczos,format=yuv420p" \
  -c:v libx264 \
  -preset slow \
  -crf 19 \
  -profile:v high \
  -level:v 4.1 \
  -movflags +faststart

echo "Gerando poster AVIF..."
encode_if_missing "$POSTER_AVIF" \
  -ss 4 \
  -i "$SOURCE_VIDEO" \
  -frames:v 1 \
  -vf "scale=1920:-2:flags=lanczos" \
  -c:v libsvtav1 \
  -preset 8 \
  -crf 24

echo "Arquivos gerados em $OUTPUT_DIR"
