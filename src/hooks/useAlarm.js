import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Emergency alarm engine built on the Web Audio API.
 *
 * - The AudioContext is created lazily and resumed inside the user-gesture
 *   call that starts the alarm (required by mobile autoplay policies).
 * - A two-oscillator siren (sawtooth + square, LFO frequency sweep) is used
 *   as the primary sound source.
 * - If Web Audio is unavailable/blocked, a generated WAV file played through
 *   a looping <audio> element is used as fallback.
 * - `isPlaying` only becomes true after playback actually starts, so the UI
 *   never claims the alarm is sounding when it is not.
 */

const SIREN_BASE = 650; // Hz
const SIREN_DEPTH = 350; // Hz sweep depth
const SIREN_RATE = 1.1; // Hz of the sweep

/** Generate a short looping siren as a WAV blob (fallback path). */
function generateSirenWav(seconds = 2, sampleRate = 22050) {
  const n = seconds * sampleRate;
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = SIREN_BASE + SIREN_DEPTH * Math.sin(2 * Math.PI * SIREN_RATE * t);
    const v = Math.round(Math.sin(2 * Math.PI * f * t) * 32000);
    view.setInt16(44 + i * 2, v, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** Generate a classic telephone ring cadence WAV (2s ring, 4s loop gap). */
function generateRingtoneWav(sampleRate = 22050) {
  const seconds = 6;
  const n = seconds * sampleRate;
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Two 1s rings (440+480Hz) then 4s silence - classic US ring cadence
    const inRing = (t < 2) ? 1 : 0;
    const tr = t % 1;
    const envelope = inRing && (tr < 1) ? 1 : 0;
    const v =
      envelope *
      (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) *
      14000;
    view.setInt16(44 + i * 2, Math.round(v), true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function useAlarm() {
  const ctxRef = useRef(null);
  const nodesRef = useRef([]);
  const timerRef = useRef(null);
  const fallbackRef = useRef(null);
  const unlockedAudioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const teardownWebAudio = useCallback(() => {
    nodesRef.current.forEach(({ osc, gain, lfo, lfoGain }) => {
      try {
        lfo && lfo.stop();
        osc && osc.stop();
        gain && gain.disconnect();
        lfoGain && lfoGain.disconnect();
      } catch {
        /* already stopped */
      }
    });
    nodesRef.current = [];
  }, []);

  const teardownFallback = useCallback(() => {
    if (fallbackRef.current) {
      fallbackRef.current.pause();
      fallbackRef.current.src = '';
      fallbackRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    teardownWebAudio();
    teardownFallback();
    setIsPlaying(false);
  }, [teardownWebAudio, teardownFallback]);

  /**
   * Must be called synchronously inside the user-gesture handler (the
   * ACTIVATE SOS click). It resumes/creates the AudioContext and silently
   * primes a fallback <audio> element so the alarm can still start seconds
   * later, after the async GPS step, even under mobile autoplay policies.
   */
  const unlock = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        // 50 ms of silence fully unlocks iOS Web Audio
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch {
      /* Web Audio unlock failed - fallback below may still work */
    }
    try {
      if (!unlockedAudioRef.current) {
        const a = new Audio(generateSirenWav(1));
        a.muted = true;
        a.loop = true;
        unlockedAudioRef.current = a;
        a.play().catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(
    async (durationSec = 0) => {
      setError(null);
      stop();
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio API not supported');
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (ctx.state !== 'running') {
          throw new Error('Audio output blocked by the browser');
        }

        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.9, now + 0.08);
        gain.connect(ctx.destination);

        // LFO sweeps the carrier frequencies up and down (siren effect)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = SIREN_RATE;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = SIREN_DEPTH;
        lfo.connect(lfoGain);

        const mkOsc = (type, vol) => {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = SIREN_BASE + SIREN_DEPTH;
          lfoGain.connect(osc.frequency);
          const g = ctx.createGain();
          g.gain.value = vol;
          osc.connect(g);
          g.connect(gain);
          osc.start(now);
          return osc;
        };

        const o1 = mkOsc('sawtooth', 0.6);
        const o2 = mkOsc('square', 0.35);
        lfo.start(now);
        nodesRef.current = [
          { osc: o1, gain: null, lfo: null, lfoGain: null },
          { osc: o2, gain: null, lfo: null, lfoGain: null },
          { osc: null, gain, lfo, lfoGain },
        ];

        setIsPlaying(true);
        if (durationSec > 0) {
          timerRef.current = setTimeout(() => stop(), durationSec * 1000);
        }
        return true;
      } catch (webAudioErr) {
        console.warn('Web Audio alarm failed, trying fallback:', webAudioErr);
        // Fallback: looping generated WAV through an <audio> element
        try {
          const audio = unlockedAudioRef.current || new Audio(generateSirenWav());
          audio.muted = false;
          audio.loop = true;
          try {
            audio.currentTime = 0;
          } catch {
            /* not seekable yet */
          }
          fallbackRef.current = audio;
          await audio.play();
          setIsPlaying(true);
          if (durationSec > 0) {
            timerRef.current = setTimeout(() => stop(), durationSec * 1000);
          }
          return true;
        } catch (fallbackErr) {
          console.error('Alarm fallback also failed:', fallbackErr);
          setIsPlaying(false);
          setError(
            'Could not play the alarm sound. Your browser may be blocking audio - tap the screen or check media volume, then start the alarm again.'
          );
          return false;
        }
      }
    },
    [stop]
  );

  /** Classic ring-ring pattern used by the Fake Call screen. */
  const startRingtone = useCallback(async () => {
    setError(null);
    stop();
    try {
      const audio = new Audio(generateRingtoneWav());
      audio.loop = true;
      audio.volume = 0.9;
      fallbackRef.current = audio;
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch (err) {
      console.error('Ringtone playback failed:', err);
      setIsPlaying(false);
      setError('Could not play the ringtone. Check your device volume.');
      return false;
    }
  }, [stop]);

  // Always stop sound if the tab is closed or the component tree unmounts
  useEffect(() => {
    const onUnload = () => stop();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      stop();
    };
  }, [stop]);

  return { isPlaying, error, start, stop, startRingtone, unlock, clearError: () => setError(null) };
}
