"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Live transcription of the LOCAL microphone, via the Web Speech API.
 *
 * WHY LOCAL-ONLY. Each participant transcribes themselves and writes their own
 * lines to the shared transcript. Transcribing the mixed remote audio instead
 * would produce one speaker-less blob — and attribution is most of what makes
 * the notes useful ("who agreed to this" is the question people actually have
 * afterwards).
 *
 * WHY THE WEB SPEECH API. It costs nothing, needs no extra vendor, no extra
 * key and no audio ever leaving the machine except as text the user's own
 * browser produced. The trade is real and worth stating plainly: it is
 * Chrome/Edge/Safari only, quality varies, and in Chrome the audio is sent to
 * Google's servers for recognition. `supported` is exposed so the UI can say
 * so rather than showing a button that does nothing.
 *
 * RESTARTS ARE EXPECTED, NOT AN ERROR. The API stops on its own after a pause
 * in speech, roughly every minute. Without the restart in `onend` the note
 * taker appears to work and then quietly stops part-way through a call.
 */

// Neither of these is in the DOM lib's standard types yet.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/*
 * Whether the browser can do this at all.
 *
 * Read through useSyncExternalStore rather than set in an effect: the answer
 * differs between server (always no) and client, which is exactly the case
 * this primitive exists for. The subscribe function is a no-op because the
 * capability cannot change during a session — a browser does not grow a speech
 * engine while the page is open.
 */
const noopSubscribe = () => () => {};
const supportedSnapshot = () => getRecognitionCtor() !== null;
const supportedServerSnapshot = () => false;

export function useTranscription(onLine: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(
    noopSubscribe,
    supportedSnapshot,
    supportedServerSnapshot,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Mirrors `listening` for the onend handler, which closes over stale state. */
  const wantListening = useRef(false);

  /*
   * The callback in a ref, so the recognition instance never has to be torn
   * down and rebuilt just because the parent re-rendered. Rebuilding it
   * mid-sentence drops whatever was being said.
   */
  const onLineRef = useRef(onLine);
  useEffect(() => {
    onLineRef.current = onLine;
  }, [onLine]);

  const stop = useCallback(() => {
    wantListening.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    // Interim results are read but not emitted — they are what makes the
    // on-screen indicator feel live without writing half-sentences to the
    // shared transcript.
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const text = result[0].transcript.trim();
        if (text) onLineRef.current(text);
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" are routine. A permission denial is not, and
      // retrying it would loop forever against a dialog the user has dismissed.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantListening.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      // Ends on its own after a pause. Restart unless we asked it to stop.
      if (!wantListening.current) {
        setListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        // Already restarting. Harmless.
      }
    };

    wantListening.current = true;
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      stop();
    }
  }, [stop]);

  // Never leave recognition running against an unmounted component — it holds
  // the microphone indicator on and keeps writing lines to a dead callback.
  useEffect(() => {
    return () => {
      wantListening.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return { listening, supported, start, stop };
}
