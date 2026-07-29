/**
 * Structured data for search engines.
 *
 * Two things this gets right that a bare `<script>` does not.
 *
 * First, escaping. `JSON.stringify` does not touch `<`, so a post title
 * containing `</script>` would close the tag early and anything after it would
 * be parsed as markup — a stored XSS through the blog editor. Replacing `<`
 * with its unicode escape is inert inside JSON and keeps the payload valid.
 *
 * Second, placement. Rendered as the first child of a fragment, React put the
 * tag in a different place on the server than on the client and hydration
 * failed, which regenerates the whole tree on load. Wrapping it in a real
 * element keeps both passes agreeing.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <section
      aria-hidden="true"
      className="hidden"
      // Not a fragment: the script needs a stable element around it so the
      // server and client render it into the same position.
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(data).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
