"use client";

/**
 * Last-resort boundary. Catches failures in the root layout itself.
 *
 * This replaces <html> entirely, so it cannot use the app's fonts, tokens or
 * components — the layout that provides them is the thing that failed.
 * Everything here is inline and self-contained on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          backgroundColor: "#08090a",
          color: "#f7f8f8",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#8a8f98",
            }}
          >
            Error
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "1.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            The page failed to load.
          </h1>
          <p
            style={{
              margin: "0.75rem 0 0",
              color: "#8a8f98",
              lineHeight: 1.6,
            }}
          >
            Something went wrong before the site could start. Reloading usually
            clears it.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.7rem 1.25rem",
              borderRadius: "9999px",
              border: 0,
              backgroundColor: "#f7f8f8",
              color: "#08090a",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>

          {error.digest ? (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.75rem",
                color: "#8a8f98",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
