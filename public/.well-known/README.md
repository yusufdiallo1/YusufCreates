# .well-known

`apple-developer-merchantid-domain-association` belongs here (no file
extension). Download it from Stripe → Settings → Payment methods → Apple Pay
after adding yusufcreates.com, drop it in this directory, then click Verify.

Two things that silently break it:

- Anything that redirects or rewrites the path. `src/middleware.ts` explicitly
  excludes `.well-known` for this reason.
- Serving it with the wrong bytes. It must return exactly the file Stripe gave
  you, with no wrapper and no trailing newline added.

If verification fails, Apple Pay does not appear as a payment option and no
error is shown anywhere. Test on a real iPhone in Safari — the simulator does
not prove it.
