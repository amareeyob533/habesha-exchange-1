'use client'
import { useState, useRef, useCallback } from 'react'

/**
 * useVoiceRecorder
 *
 * Records audio using the browser's MediaRecorder API and exposes the result
 * as a base64 data URL (suitable for posting to the support reply API).
 *
 * The hook is intentionally simple: a single take, with start/stop/cancel.
 * Call `reset()` after a successful upload so the next take starts clean.
 *
 * Notes on mime types:
 *   - Chrome/Edge/Firefox → audio/webm
 *   - Safari (macOS/iOS)  → audio/mp4
 * The MediaRecorder picks the best mime type the browser supports, and we
 * surface it as `mime` so callers can pass it along to the API.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioData, setAudioData] = useState<string | null>(null) // base64 data URL
  const [mime, setMime] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          setAudioData(reader.result as string)
          setMime(mr.mimeType || 'audio/webm')
        }
        reader.onerror = () => setError('Failed to encode recording')
        reader.readAsDataURL(blob)
        chunksRef.current = []
        cleanupStream()
      }
      mr.onerror = () => setError('Recording error')
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setDuration(0)
      setAudioData(null)
      setMime(null)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch (err: any) {
      console.error('Recording failed:', err)
      cleanupStream()
      setError(err?.message || 'Failed to start recording')
      throw err
    }
  }, [cleanupStream])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Replace onstop so it doesn't produce audioData for a cancelled take.
      mediaRecorderRef.current.onstop = null
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    cleanupStream()
    chunksRef.current = []
    setAudioData(null)
    setMime(null)
    setDuration(0)
    setIsRecording(false)
  }, [cleanupStream])

  const reset = useCallback(() => {
    setAudioData(null)
    setMime(null)
    setDuration(0)
    setError(null)
  }, [])

  return {
    isRecording,
    duration,
    audioData,
    mime,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  }
}
