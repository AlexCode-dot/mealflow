import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type VoiceStatus = 'idle' | 'listening' | 'denied' | 'error';

/**
 * On-device speech capture for dictating a recipe. Wraps expo-speech-recognition:
 * request permission → start (continuous, interim results so the transcript grows live) → stop.
 * The transcript is editable by the caller before it's sent for structuring.
 */
export function useVoiceCapture() {
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');

  useSpeechRecognitionEvent('start', () => setStatus('listening'));
  useSpeechRecognitionEvent('end', () => setStatus((s) => (s === 'listening' ? 'idle' : s)));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? '';
    if (text) setTranscript(text);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setStatus(event.error === 'not-allowed' ? 'denied' : 'error');
  });

  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('denied');
      return;
    }
    setTranscript('');
    ExpoSpeechRecognitionModule.start({
      lang: i18n.language === 'sv' ? 'sv-SE' : 'en-US',
      interimResults: true,
      // Keep listening through natural pauses — a recipe is dictated with gaps.
      continuous: true,
    });
  }, [i18n]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const reset = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    setTranscript('');
    setStatus('idle');
  }, []);

  return { status, transcript, setTranscript, start, stop, reset };
}
