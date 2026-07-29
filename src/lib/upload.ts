"use client";

/**
 * Three-step Convex upload, wrapped so every image field does it identically.
 *
 * Convex hands out a short-lived signed URL, you POST the bytes to it, and it
 * returns a storage id which then resolves to a public URL. Getting any step
 * wrong fails in a different confusing way, so it lives here once.
 */
export async function uploadImage(
  file: File,
  generateUploadUrl: () => Promise<string>,
  resolveUrl: (storageId: string) => Promise<string | null>,
): Promise<{ url: string; storageId: string }> {
  // Checked before the round trip so an obvious mistake fails immediately
  // rather than after a slow upload.
  if (!file.type.startsWith("image/")) {
    throw new Error("That needs to be an image file.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("That image is over 8MB — compress it first.");
  }

  return uploadFile(file, generateUploadUrl, resolveUrl);
}

/**
 * Uploads any file type — client deliverables are PDFs, zips and design
 * exports, not only images.
 *
 * The 50MB ceiling is a deliberate stop rather than a technical limit: a
 * deliverable larger than that wants a proper file host and a link, and
 * discovering the limit halfway through a slow upload is worse than being
 * told up front.
 */
export async function uploadFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
  resolveUrl: (storageId: string) => Promise<string | null>,
): Promise<{ url: string; storageId: string }> {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("That file is over 50MB — send it as a link instead.");
  }

  const uploadUrl = await generateUploadUrl();

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("The upload failed. Try again.");

  const { storageId } = (await res.json()) as { storageId: string };
  const url = await resolveUrl(storageId);
  if (!url) throw new Error("It uploaded but could not be read back.");

  return { url, storageId };
}
