"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { useAgoraCall, type CallStatus } from "@/components/calls/useAgoraCall";
import { useTranscription } from "@/components/calls/useTranscription";
import { Whiteboard } from "@/components/calls/Whiteboard";
import { CopyButton } from "@/components/ui/CopyButton";
import type { Id } from "@convex/_generated/dataModel";

/**
 * A call: video, whiteboard and notes, in one room.
 *
 * The three panes are TABS rather than a split view. A 16:10 whiteboard and a
 * video grid side by side leaves both too small to use on a laptop, and the
 * thing people actually do is switch between talking and drawing.
 *
 * Everything is glass on the canvas, matching the portal it opens from.
 */

type Pane = "call" | "board" | "notes";

export function CallRoom({
  callId,
  isAdmin,
  onLeave,
}: {
  callId: Id<"calls">;
  isAdmin: boolean;
  onLeave?: () => void;
}) {
  const call = useQuery(api.calls.get, { callId });
  const markStarted = useMutation(api.calls.markStarted);
  const endCall = useMutation(api.calls.end);
  const addLine = useMutation(api.calls.addTranscriptLine);
  const setGuestLink = useMutation(api.calls.setGuestLink);

  const [pane, setPane] = useState<Pane>("call");
  const [handRaised, setHandRaised] = useState(false);

  /*
   * Destructured, not held as one `agora` object.
   *
   * The hook returns a ref (localRef) alongside plain render state. Reading
   * `agora.cameraOn` during render then makes the compiler treat every access
   * on that object as a ref access, which it refuses. Pulling the values out
   * separately lets the ref be a ref and the state be state.
   */
  const {
    status,
    error: callError,
    secured,
    micOn,
    cameraOn,
    sharing,
    remotes,
    localRef,
    registerRemoteContainer,
    join: joinChannel,
    leave: leaveChannel,
    toggleMic,
    toggleCamera,
    toggleShare,
  } = useAgoraCall(callId);

  const onTranscriptLine = useCallback(
    (text: string) => {
      void addLine({ callId, text });
    },
    [addLine, callId],
  );
  const transcription = useTranscription(onTranscriptLine);

  const join = async () => {
    await joinChannel();
    await markStarted({ callId });
  };

  const leave = async () => {
    transcription.stop();
    await leaveChannel();
    onLeave?.();
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="glass-depth glass-near glass-panel overflow-hidden">
      {/* Header: what this is, and the one control that ends it. */}
      <div className="hairline-b flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm text-primary">
            {call?.title || "Call"}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {status === "live"
              ? `${remotes.length + 1} on the call`
              : status === "joining"
                ? "Connecting…"
                : "Not connected"}
            {/* Stated plainly rather than implied. In testing mode the channel
                is open to anyone with the App ID, and pretending otherwise
                would be the wrong kind of quiet. */}
            {secured === false ? " · unsecured channel" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Ends it for EVERYONE, which is why it is admin-only and separate
              from "Leave". Leaving is personal; ending stamps endedAt, revokes
              the guest link and closes the room for anyone still in it. */}
          {isAdmin ? (
            <button
              type="button"
              onClick={async () => {
                await endCall({ callId });
                await leave();
              }}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-secondary transition-colors duration-hover ease-hover hover:text-[color:var(--danger)]"
            >
              End for everyone
            </button>
          ) : null}

          {(["call", "board", "notes"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPane(p)}
              aria-pressed={pane === p}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs transition-colors duration-hover ease-hover ${
                pane === p
                  ? "bg-surface-2 text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {p === "call" ? "Call" : p === "board" ? "Whiteboard" : "Notes"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {callError ? (
          <p role="alert" className="mb-4 text-xs text-[color:var(--danger)]">
            {callError}
          </p>
        ) : null}

        {pane === "call" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Local. Mirrored, because a self-view that is not mirrored
                  reads as someone else's camera. */}
              <Tile label="You">
                <div
                  ref={localRef}
                  className="size-full [transform:scaleX(-1)]"
                />
                {!cameraOn ? <TileFallback label="Camera off" /> : null}
              </Tile>

              {remotes.map((r) => (
                <Tile key={r.uid} label={`Guest ${r.uid.slice(0, 4)}`}>
                  <div
                    ref={(el) => registerRemoteContainer(r.uid, el)}
                    className="size-full"
                  />
                  {!r.hasVideo ? <TileFallback label="Camera off" /> : null}
                </Tile>
              ))}

              {status === "live" && remotes.length === 0 ? (
                <Tile label="Waiting">
                  <TileFallback label="Nobody else has joined yet" />
                </Tile>
              ) : null}
            </div>

            <Controls
              status={status}
              micOn={micOn}
              cameraOn={cameraOn}
              sharing={sharing}
              onMic={() => void toggleMic()}
              onCamera={() => void toggleCamera()}
              onShare={() => void toggleShare()}
              handRaised={handRaised}
              onHand={() => setHandRaised((v) => !v)}
              onJoin={join}
              onLeave={leave}
            />

            {isAdmin ? (
              <div className="hairline-t mt-4 flex flex-wrap items-center gap-3 pt-4">
                {call?.guestKey ? (
                  <>
                    <CopyButton
                      value={`${origin}/call/${callId}?guest=${call.guestKey}`}
                      label="Copy guest link"
                    />
                    <button
                      type="button"
                      onClick={() => void setGuestLink({ callId, enabled: false })}
                      className="text-xs text-secondary hover:text-[color:var(--danger)]"
                    >
                      Revoke
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setGuestLink({ callId, enabled: true })}
                    className="control-outline rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-secondary hover:text-primary"
                  >
                    Create guest link
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        {pane === "board" ? (
          <Whiteboard callId={callId} canClear={isAdmin} />
        ) : null}

        {pane === "notes" ? (
          <Notes
            callId={callId}
            transcription={transcription}
            existing={call?.summary}
          />
        ) : null}
      </div>
    </div>
  );
}

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hairline relative aspect-video overflow-hidden rounded-[var(--radius-md)] bg-surface-2">
      {children}
      <span className="absolute bottom-2 left-2 rounded-[var(--radius-xs)] bg-[color:var(--bg-canvas)]/70 px-2 py-0.5 text-[11px] text-secondary">
        {label}
      </span>
    </div>
  );
}

function TileFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function Controls({
  status,
  micOn,
  cameraOn,
  sharing,
  onMic,
  onCamera,
  onShare,
  handRaised,
  onHand,
  onJoin,
  onLeave,
}: {
  status: CallStatus;
  micOn: boolean;
  cameraOn: boolean;
  sharing: boolean;
  onMic: () => void;
  onCamera: () => void;
  onShare: () => void;
  handRaised: boolean;
  onHand: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  if (status !== "live") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={onJoin}
          disabled={status === "joining"}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-50"
        >
          {status === "joining" ? "Connecting…" : "Join call"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Control
        active={micOn}
        onClick={onMic}
        onLabel="Mute"
        offLabel="Unmute"
      />
      <Control
        active={cameraOn}
        onClick={onCamera}
        onLabel="Stop video"
        offLabel="Start video"
      />
      <Control
        active={sharing}
        onClick={onShare}
        onLabel="Stop sharing"
        offLabel="Share screen"
      />
      <Control
        active={handRaised}
        onClick={onHand}
        onLabel="Lower hand"
        offLabel="Raise hand"
      />

      <button
        type="button"
        onClick={onLeave}
        className="ml-auto rounded-full bg-[color:var(--danger)] px-4 py-2 text-xs font-medium text-white transition-opacity duration-hover ease-hover hover:opacity-90"
      >
        Leave
      </button>
    </div>
  );
}

function Control({
  active,
  onClick,
  onLabel,
  offLabel,
}: {
  active: boolean;
  onClick: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`control-outline rounded-full px-3.5 py-2 text-xs transition-colors duration-hover ease-hover ${
        active ? "bg-surface-2 text-primary" : "text-secondary hover:text-primary"
      }`}
    >
      {active ? onLabel : offLabel}
    </button>
  );
}

function Notes({
  callId,
  transcription,
  existing,
}: {
  callId: Id<"calls">;
  transcription: ReturnType<typeof useTranscription>;
  existing?: string;
}) {
  const lines = useQuery(api.calls.transcript, { callId });
  const saveSummary = useMutation(api.calls.saveSummary);
  const [summary, setSummary] = useState<string | null>(existing ?? null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const write = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/calls/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId }),
      });
      const payload = (await res.json()) as {
        summary?: string;
        error?: string;
      };
      if (!res.ok || !payload.summary) {
        throw new Error(payload.error ?? "Could not write the notes.");
      }
      setSummary(payload.summary);
      await saveSummary({ callId, summary: payload.summary });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the notes.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {transcription.supported ? (
          <button
            type="button"
            onClick={() =>
              transcription.listening
                ? transcription.stop()
                : transcription.start()
            }
            aria-pressed={transcription.listening}
            className={`control-outline rounded-full px-3.5 py-2 text-xs transition-colors duration-hover ease-hover ${
              transcription.listening
                ? "bg-surface-2 text-primary"
                : "text-secondary hover:text-primary"
            }`}
          >
            {transcription.listening ? "Stop taking notes" : "Take notes"}
          </button>
        ) : (
          // Said out loud rather than hiding the button. "Why is there no note
          // taker" is a worse experience than knowing the browser cannot.
          <p className="text-xs text-muted">
            Live notes need Chrome, Edge or Safari.
          </p>
        )}

        <button
          type="button"
          onClick={() => void write()}
          disabled={working || (lines?.length ?? 0) === 0}
          className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-canvas transition-opacity duration-hover ease-hover hover:opacity-90 disabled:opacity-40"
        >
          {working ? "Writing…" : "Write the notes"}
        </button>

        {transcription.listening ? (
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            Listening
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="hairline rounded-[var(--radius-md)] bg-surface-1 p-4">
          <h3 className="text-xs tracking-[0.06em] text-muted uppercase">
            Notes
          </h3>
          <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">
            {summary}
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs tracking-[0.06em] text-muted uppercase">
          Transcript
        </h3>
        {(lines?.length ?? 0) === 0 ? (
          <p className="mt-2 text-xs text-muted">
            Nothing yet. Start taking notes and what is said appears here.
          </p>
        ) : (
          <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {(lines ?? []).map((l) => (
              <li key={l._id} className="text-xs text-secondary">
                <span className="text-primary">{l.speaker}</span> — {l.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
