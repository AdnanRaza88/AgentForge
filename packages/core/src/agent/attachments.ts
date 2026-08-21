/**
 * Image / screenshot input (docs feature #6, status 🟡 in FEATURES-SPEC).
 * Accepts a base64 image (e.g. pasted screenshot of an error or UI design)
 * and attaches it to the next user message for vision-capable providers.
 * CLI-side clipboard image capture is host-specific and left as a REPL-level
 * concern (apps/cli reads from clipboard and calls `attachImage`).
 */
export interface ImageAttachment {
  mimeType: string;
  base64: string;
  label?: string;
}

export function attachImage(userText: string, image: ImageAttachment): { text: string; images: ImageAttachment[] } {
  const label = image.label ?? "pasted image";
  return {
    text: `${userText}\n\n[Attached: ${label}]`,
    images: [image],
  };
}
