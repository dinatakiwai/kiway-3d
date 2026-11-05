const MIN_SIZE_TO_COMPRESS = 180 * 1024;
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITIES = [0.8, 0.68, 0.58];

/** Shrink large raster product photos before they are stored and served to shoppers. */
export async function compressProductImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const largestEdge = Math.max(bitmap.width, bitmap.height);
    if (largestEdge <= MAX_IMAGE_EDGE && file.size <= MIN_SIZE_TO_COMPRESS) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / largestEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let bestBlob: Blob | null = null;
    for (const quality of WEBP_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality)
      );
      if (!blob || blob.type !== "image/webp") break;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size < file.size) break;
    }
    if (!bestBlob || bestBlob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "product-image";
    return new File([bestBlob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    // Keep uploads working on browsers that cannot decode or encode this image.
    return file;
  } finally {
    bitmap?.close();
  }
}
