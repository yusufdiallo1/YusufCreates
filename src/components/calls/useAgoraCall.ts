"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

/**
 * The Agora RTC lifecycle, as a hook.
 *
 * WHY THE SDK IS IMPORTED LAZILY. agora-rtc-sdk-ng is ~500 KB and touches
 * `window` at module scope, so a static import both breaks the server render
 * and puts half a megabyte into the portal bundle for every client who never
 * makes a call. It is pulled in inside `join`, at the moment someone actually
 * presses the button.
 *
 * WHY TRACKS ARE HELD IN REFS. Agora tracks are imperative objects with their
 * own lifecycle; putting them in state would re-render the tree on every
 * mute toggle and, worse, risk closing over a stale track in cleanup. State
 * here holds only what the UI renders — the booleans and the participant list.
 *
 * TEARDOWN IS NOT OPTIONAL. A camera track that is not stopped keeps the
 * hardware light on after the component unmounts, which people reasonably read
 * as being recorded.
 */

export type CallStatus = "idle" | "joining" | "live" | "error";

export interface RemoteParticipant {
  uid: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export function useAgoraCall(callId: string | null) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [secured, setSecured] = useState<boolean | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [remotes, setRemotes] = useState<RemoteParticipant[]>([]);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
  /** uid → container element for that participant's video. */
  const remoteContainers = useRef(new Map<string, HTMLDivElement>());

  const registerRemoteContainer = useCallback(
    (uid: string, el: HTMLDivElement | null) => {
      if (el) remoteContainers.current.set(uid, el);
      else remoteContainers.current.delete(uid);
    },
    [],
  );

  const leave = useCallback(async () => {
    const client = clientRef.current;

    // Stop before close: stop releases the hardware, close frees the track.
    // Closing without stopping can leave the camera light on in some browsers.
    micTrackRef.current?.stop();
    micTrackRef.current?.close();
    micTrackRef.current = null;

    camTrackRef.current?.stop();
    camTrackRef.current?.close();
    camTrackRef.current = null;

    if (client) {
      try {
        await client.leave();
      } catch {
        // Already gone. Nothing to recover and nothing worth surfacing.
      }
      client.removeAllListeners();
    }
    clientRef.current = null;
    setRemotes([]);
    setStatus("idle");
  }, []);

  const join = useCallback(async () => {
    if (!callId || clientRef.current) return;
    setStatus("joining");
    setError(null);

    try {
      // Credentials first: if this fails there is no point starting hardware.
      const res = await fetch("/api/calls/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not authorise the call.");
      }
      const creds = (await res.json()) as {
        appId: string;
        channel: string;
        token: string | null;
        uid: number;
        secured: boolean;
      };
      setSecured(creds.secured);

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      // Agora logs verbosely at info level; warnings and errors are the part
      // worth having in a production console.
      AgoraRTC.setLogLevel(2);

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      const syncRemotes = () => {
        setRemotes(
          client.remoteUsers.map((u: IAgoraRTCRemoteUser) => ({
            uid: String(u.uid),
            hasVideo: u.hasVideo,
            hasAudio: u.hasAudio,
          })),
        );
      };

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          // The container may not be mounted yet on the first frame — retry on
          // the next tick rather than dropping the stream silently.
          const play = () => {
            const el = remoteContainers.current.get(String(user.uid));
            if (el) user.videoTrack?.play(el);
            else setTimeout(play, 120);
          };
          play();
        }
        if (mediaType === "audio") user.audioTrack?.play();
        syncRemotes();
      });

      client.on("user-unpublished", syncRemotes);
      client.on("user-left", syncRemotes);

      await client.join(
        creds.appId,
        creds.channel,
        creds.token,
        creds.uid === 0 ? null : creds.uid,
      );

      /*
       * Microphone and camera are created SEPARATELY, not with
       * createMicrophoneAndCameraTracks.
       *
       * That helper rejects entirely if either device is missing or blocked —
       * so someone with no webcam cannot join by voice, which is the single
       * most common way a call fails. Created independently, a missing camera
       * costs the camera only.
       */
      try {
        micTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      } catch {
        setMicOn(false);
      }
      try {
        camTrackRef.current = await AgoraRTC.createCameraVideoTrack();
      } catch {
        setCameraOn(false);
      }

      const toPublish = [micTrackRef.current, camTrackRef.current].filter(
        Boolean,
      ) as (IMicrophoneAudioTrack | ICameraVideoTrack)[];
      if (toPublish.length > 0) await client.publish(toPublish);

      if (camTrackRef.current && localRef.current) {
        camTrackRef.current.play(localRef.current);
      }

      setStatus("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the call.");
      setStatus("error");
      await leave();
    }
  }, [callId, leave]);

  const toggleMic = useCallback(async () => {
    const track = micTrackRef.current;
    if (!track) return;
    const next = !micOn;
    await track.setEnabled(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCamera = useCallback(async () => {
    const track = camTrackRef.current;
    if (!track) return;
    const next = !cameraOn;
    await track.setEnabled(next);
    setCameraOn(next);
  }, [cameraOn]);

  /**
   * Swaps the published video track for the screen.
   *
   * Replacing rather than adding a second track: Agora allows one video track
   * per publisher, and remote participants keep the same subscription, so the
   * switch is seamless at the other end.
   */
  /**
   * Restores the camera as the published video track.
   *
   * Its own function rather than a branch inside toggleShare, because the
   * "track-ended" handler below needs to call it — and a useCallback that
   * refers to itself is a temporal-dead-zone hazard: the closure captures the
   * binding before it is initialised, so the first invocation from inside the
   * callback throws.
   */
  const stopShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    if (camTrackRef.current) {
      await client.unpublish();
      await client.publish(
        [micTrackRef.current, camTrackRef.current].filter(
          Boolean,
        ) as (IMicrophoneAudioTrack | ICameraVideoTrack)[],
      );
      if (localRef.current) camTrackRef.current.play(localRef.current);
    }
    setSharing(false);
  }, []);

  const startShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

    try {
      const screen = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "disable",
      );
      const screenTrack = Array.isArray(screen) ? screen[0] : screen;

      if (camTrackRef.current) await client.unpublish(camTrackRef.current);
      await client.publish(screenTrack);
      if (localRef.current) screenTrack.play(localRef.current);

      // Ending the share from the browser's own bar has to bring the camera
      // back, or the call silently loses its video.
      screenTrack.on("track-ended", () => {
        void stopShare();
      });
      setSharing(true);
    } catch {
      // Cancelling the picker is a normal outcome, not an error to report.
      setSharing(false);
    }
  }, [stopShare]);

  const toggleShare = useCallback(async () => {
    if (sharing) await stopShare();
    else await startShare();
  }, [sharing, startShare, stopShare]);

  // Hard guarantee that the hardware is released, however the component goes
  // away — navigation, an error boundary, or a closed tab.
  useEffect(() => {
    return () => {
      void leave();
    };
  }, [leave]);

  return {
    status,
    error,
    secured,
    micOn,
    cameraOn,
    sharing,
    remotes,
    localRef,
    registerRemoteContainer,
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleShare,
  };
}
