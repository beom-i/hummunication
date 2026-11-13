export function photoOutputSize(width: number, height: number) {
  const scale = Math.min(1, 2400 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function photoSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function photoDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function optimizePhoto(image: HTMLImageElement, quality: number) {
  const { width, height } = photoOutputSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Photo encoding failed")), "image/webp", quality));
  const source = await photoDataUrl(blob);
  return { source, size: blob.size, width, height };
}

// Reuse processing across the same photo's field, cards and export; bound retained images.
const prepared = new Map<string, Map<number, Promise<Awaited<ReturnType<typeof optimizePhoto>>>>>();
export function preparePhoto(source: string, quality: 0.85 | 0.65) {
  let qualities = prepared.get(source);
  if (!qualities) {
    if (prepared.size >= 32) prepared.delete(prepared.keys().next().value!);
    qualities = new Map(); prepared.set(source, qualities);
  }
  let task = qualities.get(quality);
  if (!task) {
    const entries = qualities;
    task = (async () => {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Photo unavailable");
      const blob = await response.blob();
      if (!/^image\/(png|jpeg|webp)$/.test(blob.type)) throw new Error("사진 파일 형식을 확인해 주세요");
      const url = URL.createObjectURL(blob);
      try {
        const image = new window.Image(); image.src = url; await image.decode();
        const output = await optimizePhoto(image, quality);
        return output.size < blob.size ? output : { source: await photoDataUrl(blob), size: blob.size, width: image.naturalWidth, height: image.naturalHeight };
      } finally { URL.revokeObjectURL(url); }
    })().catch(error => { entries.delete(quality); throw error; });
    qualities.set(quality, task);
  }
  return task;
}
