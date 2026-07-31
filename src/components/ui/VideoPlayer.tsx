"use client";

/**
 * Video, from either an uploaded file or a link someone pasted.
 *
 * Three sources, decided from the URL rather than asked for separately:
 * YouTube, Vimeo, or a direct file. Making someone pick "YouTube" from a
 * dropdown *and then* paste a YouTube URL is asking the same question twice.
 *
 * Embeds are built from the video id, never from the pasted string — a URL
 * dropped straight into an iframe src is an injection surface, and the id is
 * the only part actually needed.
 */

type Parsed =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  | { kind: "instagram"; id: string }
  | { kind: "file"; src: string }
  | { kind: "unknown" };

/** Reads a video id out of the common URL shapes. */
export function parseVideoUrl(raw: string): Parsed {
  const url = raw.trim();
  if (!url) return { kind: "unknown" };

  // youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) return { kind: "youtube", id: yt[1] };

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "vimeo", id: vimeo[1] };

  // Reels, posts and TV all embed through the same /p/<code>/embed path.
  const ig = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  if (ig) return { kind: "instagram", id: ig[1] };

  // Anything ending in a video extension, including Convex storage URLs which
  // carry no extension but are served with a video content type.
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("/api/storage/")) {
    return { kind: "file", src: url };
  }

  return { kind: "unknown" };
}

export function VideoPlayer({
  url,
  poster,
  className,
}: {
  url: string;
  poster?: string;
  className?: string;
}) {
  const parsed = parseVideoUrl(url);
  if (parsed.kind === "unknown") return null;

  const frame = `relative aspect-video w-full overflow-hidden rounded-xl bg-surface-2 ${className ?? ""}`;

  if (parsed.kind === "file") {
    return (
      <div className={frame}>
        {/* Native controls. A custom control bar is a large amount of
            accessibility work — keyboard, captions, fullscreen, scrubbing —
            to arrive somewhere worse than what the browser already ships. */}
        <video
          controls
          preload="metadata"
          poster={poster}
          playsInline
          className="size-full"
        >
          <source src={parsed.src} />
          Your browser cannot play this video.
        </video>
      </div>
    );
  }

  const src =
    parsed.kind === "youtube"
      ? // youtube-nocookie: no tracking cookie is set unless the visitor
        // actually presses play.
        `https://www.youtube-nocookie.com/embed/${parsed.id}?rel=0`
      : parsed.kind === "instagram"
        ? `https://www.instagram.com/p/${parsed.id}/embed`
        : `https://player.vimeo.com/video/${parsed.id}`;

  /* Instagram embeds are portrait and carry their own chrome, so a 16:9 box
     letterboxes them with dead bars down both sides. */
  const box =
    parsed.kind === "instagram"
      ? `relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface-2 ${className ?? ""}`
      : frame;

  return (
    <div className={box}>
      <iframe
        src={src}
        title="Video"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
