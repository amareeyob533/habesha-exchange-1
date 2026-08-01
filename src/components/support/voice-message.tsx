'use client'

import { useRef, useState, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface VoiceMessageProps {
  /** Base64 data URL of the recorded audio (e.g. "data:audio/webm;base64,...") */
  voiceData: string
  /** Optional mime type (audio/webm, audio/mp4, …). When omitted we fall back to "audio/webm". */
  voiceMime?: string | null
  /** Optional duration in seconds (used as fallback before the <audio> metadata loads). */
  voiceDuration?: number | null
  /** Optional compact mode — narrower width. Defaults to false. */
  compact?: boolean
}

/**
 * VoiceMessage — compact inline audio player for support chat bubbles.
 *
 * Renders a play/pause button, a fake-waveform progress bar, and the duration.
 * Uses a hidden <audio> element with the base64 data URL as its source.
 *
 * The parent always mounts this component fresh (it's only rendered when there
 * is voice data), so we don't need to reset state on src changes — the audio
 * element's own events (onPlay / onPause / onEnded / onTimeUpdate) drive the
 * UI state, and the initial `duration` is seeded from the prop until the
 * browser's metadata load completes.
 */
export function VoiceMessage({ voiceData, voiceMime, voiceDuration, compact }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number>(voiceDuration ?? 0)

  const src = voiceData
  // Browsers are picky about the mime attribute on <source>. The data URL prefix
  // already carries the real mime, so most players will detect it automatically —
  // but we still pass the explicit mime when we have it for Safari compatibility.
  const mimeAttr = voiceMime || undefined

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      // Catch the play() promise so "interrupted by pause" errors don't surface.
      audio.play().catch(() => { /* user clicked again mid-load */ })
    }
  }, [isPlaying])

  const onTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTime(audio.currentTime)
  }
  const onLoadedMeta = () => {
    const audio = audioRef.current
    if (!audio) return
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
    }
  }
  const onEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }
  const onPlay = () => setIsPlaying(true)
  const onPause = () => setIsPlaying(false)

  const safeDuration = duration > 0 ? duration : (voiceDuration ?? 0)
  const progress = safeDuration > 0 ? Math.min(1, currentTime / safeDuration) : 0

  // Deterministic pseudo-waveform bars so the player looks like a voice message
  // (no FFT needed — purely visual). Bar heights are derived from the index so
  // they don't re-randomise on every render.
  const barCount = compact ? 18 : 28
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453
    const h = 25 + (Math.abs(seed - Math.floor(seed)) * 70) // 25%–95%
    // Bars before the playhead are gold; bars after are muted.
    const played = (i + 1) / barCount <= progress
    return { h, played }
  })

  return (
    <div className={`flex items-center gap-2 ${compact ? 'w-[170px]' : 'w-[210px]'}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMeta}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
      >
        {mimeAttr ? <source src={src} type={mimeAttr} /> : null}
      </audio>

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-gold transition-transform hover:scale-105 active:scale-95"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex h-7 items-center gap-[2px]">
          {bars.map((b, i) => (
            <span
              key={i}
              style={{ height: `${b.h}%` }}
              className={`flex-1 rounded-full transition-colors ${b.played ? 'bg-gold' : 'bg-muted-foreground/40'}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(safeDuration)}</span>
        </div>
      </div>
    </div>
  )
}
