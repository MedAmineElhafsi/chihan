/**
 * Photos from a phone are large and carry where they were taken. A photo of
 * a sofa in someone's living room would otherwise tell every reader the
 * address of that living room.
 *
 * Redrawing the picture on a canvas keeps only its pixels: no location, no
 * camera details. It also brings a 6 MB photo down to a few hundred KB, which
 * on a newcomer's prepaid data plan is somebody's money.
 */
export async function shrinkImage(
  file: File,
  maxSide = 1600,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  }).catch(() => null);
  if (!bitmap) throw new Error("unreadable");

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("unreadable");
  // A transparent PNG would turn black as a JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("unreadable");
  return blob;
}
