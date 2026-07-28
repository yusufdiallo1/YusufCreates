/**
 * Confirmation chime.
 *
 * Synthesised with Web Audio rather than shipped as an asset: the whole sound
 * is under 40 lines of maths, so there is no file to download, no decode step,
 * and no format juggling between Safari and everything else.
 *
 * The shape is deliberately Apple-Pay-like — two quick rising notes with a
 * fast attack and a soft exponential tail. What makes that read as "done"
 * rather than "alert" is the interval and the decay: a perfect fifth rising,
 * each note gone inside 200ms, no sustain.
 *
 * Three rules:
 *
 * 1. Never blocks. Sound is decoration; if the context cannot start, the
 *    submission still succeeded and the user still sees the success state.
 * 2. Respects prefers-reduced-motion. Someone who has asked the system to
 *    calm down should not be surprised by audio either — the two settings
 *    travel together for vestibular and attention sensitivities.
 * 3. Created lazily, on the gesture. Browsers block AudioContext until a user
 *    interaction, so constructing one at import time yields a permanently
 *    suspended context that never plays anything.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    // Safari still needs the prefixed constructor on older versions.
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function shouldStaySilent(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * One note. A sine with no harmonics is what keeps this from sounding like a
 * game — a triangle or square would add overtones that read as cheap.
 */
function tone(
  audio: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  peak: number,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startAt);

  // A 12ms attack. Instant would click; anything slower loses the crispness.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.012);
  // Exponential, because loudness is perceived logarithmically — a linear
  // fade sounds like it stops abruptly. Never ramps to exactly 0, which is
  // undefined for this curve.
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * Two-note rising confirmation. Call it from the success path of an action
 * the person deliberately took.
 */
export function playConfirmation(): void {
  if (shouldStaySilent()) return;

  const audio = getContext();
  if (!audio) return;

  // A context created before any gesture starts suspended. Resuming inside
  // the handler is what actually unlocks it on iOS.
  if (audio.state === "suspended") void audio.resume().catch(() => {});

  const now = audio.currentTime;

  // A5 then E6: a rising perfect fifth. Rising resolves, falling reads as an
  // error, which is the whole difference between "sent" and "something broke".
  // Kept quiet on purpose — 0.13 gain is present without being startling.
  tone(audio, 880, now, 0.16, 0.13);
  tone(audio, 1318.51, now + 0.085, 0.22, 0.1);
}
