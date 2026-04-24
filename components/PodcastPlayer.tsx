"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PodcastPlayer({
  audioUrl,
  durationSec,
}: {
  audioUrl: string;
  durationSec?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || durationSec || 0);
    const onEnd = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [durationSec]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el) return;
    const next = Number(e.target.value);
    el.currentTime = next;
    setCurrentTime(next);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative bg-[#141414] border border-[#D4AF37]/40 p-6 md:p-8">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t border-l border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t border-r border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#D4AF37]"
      />

      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="shrink-0 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A0A0A] transition-all duration-300"
        >
          <span className="text-2xl md:text-3xl font-display leading-none translate-x-[1px]">
            {isPlaying ? "❙❙" : "▶"}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={seek}
            aria-label="Seek"
            className="w-full appearance-none bg-transparent cursor-pointer accent-[#D4AF37]"
            style={{
              background: `linear-gradient(to right, #D4AF37 ${progress}%, #3F3F46 ${progress}%)`,
              height: 2,
            }}
          />
          <div className="mt-3 flex justify-between font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
