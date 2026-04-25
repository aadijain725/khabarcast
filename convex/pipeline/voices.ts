// Shared voice config — single source of truth for TTS model + settings.
// Mirrors poc/04-voice-config.md. Bump VOICE_CONFIG_VERSION whenever a
// voice id, model, or settings value changes.

export const VOICE_CONFIG_VERSION = "v2-2026-04-25";

export type Speaker = "KALAM" | "ANCHOR";

export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

export type VoiceConfig = {
  id: string;
  model: string;
  settings: VoiceSettings;
};

// Voice IDs. Kept in sync with `convex/hosts.ts#DEFAULT_VOICE_BY_SLOT` —
// renderAudio currently uses these constants instead of the host record's
// voiceId; consolidating to a single source (the host record) is a follow-up.
// Override via convex env (`ELEVENLABS_VOICE_KALAM`, `ELEVENLABS_VOICE_ANCHOR`)
// when rotating voices without a redeploy.
const DEFAULT_KALAM_ID = "01DQSLgg3WJX3GZ2K4fl";
const DEFAULT_ANCHOR_ID = "8WqHCYyrnUqoK70Px5EJ";

export function getVoices(): Record<Speaker, VoiceConfig> {
  const kalamId = process.env.ELEVENLABS_VOICE_KALAM ?? DEFAULT_KALAM_ID;
  const anchorId = process.env.ELEVENLABS_VOICE_ANCHOR ?? DEFAULT_ANCHOR_ID;
  return {
    KALAM: {
      id: kalamId,
      model: "eleven_turbo_v2_5",
      settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      },
    },
    ANCHOR: {
      id: anchorId,
      model: "eleven_v3",
      settings: {
        stability: 0.35,
        similarity_boost: 0.75,
        style: 0.55,
        use_speaker_boost: true,
      },
    },
  };
}

export const MP3_OUTPUT_FORMAT = "mp3_44100_128";
export const MP3_BYTES_PER_SECOND = 128_000 / 8; // 16_000
