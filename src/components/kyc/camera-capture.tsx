'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Video, Loader2, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface CameraCaptureProps {
  /** Called when a recording is captured (webm video blob + thumbnail data URL). */
  onCaptured: (result: { videoBlob: Blob; thumbnailDataUrl: string }) => void
  /** Duration of the auto-recorded clip in seconds. */
  duration?: number
  label?: string
  hint?: string
}

/**
 * Live camera capture using getUserMedia + MediaRecorder.
 * - Starts the webcam on mount, shows a live preview.
 * - User clicks "Start Recording" → records for `duration` seconds → stops.
 * - Shows a preview (video element) + retake option.
 * - Calls onCaptured with the webm Blob + a thumbnail frame (jpeg data URL).
 */
export function CameraCapture({ onCaptured, duration = 4, label = 'Live Face Capture', hint = 'Look directly at the camera and stay still' }: CameraCaptureProps) {
  const liveRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<'starting' | 'ready' | 'recording' | 'done' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(duration)

  // Start camera on mount
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (liveRef.current) {
          liveRef.current.srcObject = stream
          await liveRef.current.play().catch(() => {})
        }
        setStatus('ready')
      } catch (err: any) {
        console.error('Camera error:', err)
        setErrorMsg(
          err?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Please allow camera permission in your browser and reload.'
            : err?.name === 'NotFoundError'
            ? 'No camera found. Please connect a camera and try again.'
            : 'Could not start the camera. ' + (err?.message || ''),
        )
        setStatus('error')
      }
    }
    start()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop() } catch {}
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Capture a thumbnail frame from the live video to a canvas → jpeg data URL.
  const captureThumbnail = useCallback((): string => {
    const video = liveRef.current
    if (!video) return ''
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    // Mirror to match the preview (selfie)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return
    chunksRef.current = []
    setCountdown(duration)
    setStatus('recording')

    // Pick a supported mime type
    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8'
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm'
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        // Limit bitrate so a 4s clip stays small enough for upload/storage.
        videoBitsPerSecond: 1_500_000, // ~1.5 Mbps → ~750KB per 4s clip
      })
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setRecordingUrl(url)
        const thumb = captureThumbnail()
        setThumbnail(thumb)
        onCaptured({ videoBlob: blob, thumbnailDataUrl: thumb })
        setStatus('done')
      }
      recorder.start()
      // Countdown
      let remaining = duration
      const interval = setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        if (remaining <= 0) clearInterval(interval)
      }, 1000)
      // Auto-stop after duration
      timerRef.current = setTimeout(() => {
        clearInterval(interval)
        if (recorder.state !== 'inactive') recorder.stop()
      }, duration * 1000)
    } catch (err) {
      console.error('Recorder error:', err)
      setErrorMsg('Could not start recording. ' + (err as Error).message)
      setStatus('error')
    }
  }, [duration, captureThumbnail, onCaptured])

  const retake = useCallback(() => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecordingUrl(null)
    setThumbnail(null)
    setCountdown(duration)
    setStatus('ready')
  }, [recordingUrl, duration])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Video className="h-3.5 w-3.5 text-gold" /> {label}
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 border-gold/30 bg-black">
        {/* Live preview (mirrored) */}
        {status !== 'done' && (
          <video
            ref={liveRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
        {/* Recorded preview */}
        {status === 'done' && recordingUrl && (
          <video src={recordingUrl} controls autoPlay loop playsInline className="h-full w-full object-cover" />
        )}

        {/* Scanning overlay while recording */}
        {status === 'recording' && (
          <>
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-up" />
            <motion.div
              className="pointer-events-none absolute left-2 right-2 h-0.5 bg-up shadow-[0_0_12px_var(--up)]"
              initial={{ top: '12%' }}
              animate={{ top: ['12%', '82%', '12%'] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-down px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> REC {countdown}s
            </div>
          </>
        )}

        {/* Starting overlay */}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
            <span className="text-xs">Starting camera…</span>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <AlertCircle className="h-7 w-7 text-down" />
            <span className="text-[11px] text-muted-foreground">{errorMsg}</span>
          </div>
        )}

        {/* Done checkmark */}
        {status === 'done' && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-up text-white">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">{hint}</p>

      {status === 'ready' && (
        <Button type="button" className="bg-gold-gradient h-10 w-full font-semibold text-primary-foreground" onClick={startRecording}>
          <Camera className="mr-1 h-4 w-4" /> Start Recording ({duration}s)
        </Button>
      )}
      {status === 'recording' && (
        <Button type="button" disabled className="h-10 w-full">
          <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Recording… {countdown}s
        </Button>
      )}
      {status === 'done' && (
        <Button type="button" variant="outline" className="h-10 w-full border-border" onClick={retake}>
          <RefreshCw className="mr-1 h-4 w-4" /> Retake
        </Button>
      )}
    </div>
  )
}
