import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice SOS activation with the Web Speech API.
 *
 * - Continuous recognition; when the user's custom safety phrase is heard,
 *   onPhraseDetected fires (the user still confirms the SOS activation,
 *   preventing accidental triggers).
 * - Listening must be started by a user gesture (button tap) because
 *   browsers require permission + gesture for microphone access.
 * - Falls back with a clear error when SpeechRecognition is unsupported.
 */

function similarity(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  // token overlap ratio
  const ta = new Set(a.split(/\s+/));
  const tb = new Set(b.split(/\s+/));
  const inter = [...ta].filter((w) => tb.has(w)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : inter / union;
}

export function useVoiceSOS({ phrase, onPhraseDetected, threshold = 0.75 }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const recRef = useRef(null);
  const phraseRef = useRef(phrase);
  const callbackRef = useRef(onPhraseDetected);
  const manuallyStoppedRef = useRef(false);

  phraseRef.current = phrase;
  callbackRef.current = onPhraseDetected;

  const stop = useCallback(() => {
    manuallyStoppedRef.current = true;
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError(
        'Voice recognition is not supported in this browser. Try Chrome, Edge or Safari.'
      );
      return false;
    }
    const Ctor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      manuallyStoppedRef.current = false;
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interimText += r[0].transcript;
        }
        const heard = `${finalText} ${interimText}`.trim();
        setTranscript(heard);
        const target = (phraseRef.current || 'help me').toLowerCase().trim();
        if (target && similarity(heard, target) >= threshold) {
          callbackRef.current && callbackRef.current(heard);
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError(
            'Microphone permission denied. Allow microphone access in your browser settings to use voice activation.'
          );
          setListening(false);
        } else if (event.error === 'no-speech') {
          // silent - continuous mode keeps listening
        } else if (event.error !== 'aborted') {
          setError(`Voice recognition error: ${event.error}`);
          setListening(false);
        }
      };

      rec.onend = () => {
        // Chrome auto-stops after silence - restart unless user stopped it
        if (!manuallyStoppedRef.current) {
          try {
            rec.start();
          } catch {
            setListening(false);
          }
        }
      };

      recRef.current = rec;
      rec.start();
      setListening(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Could not start voice recognition. Please try again.');
      return false;
    }
  }, [supported]);

  useEffect(
    () => () => {
      manuallyStoppedRef.current = true;
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          /* noop */
        }
      }
    },
    []
  );

  return { listening, transcript, error, supported, start, stop, setError };
}
