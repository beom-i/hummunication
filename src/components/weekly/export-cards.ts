import { preparePhoto } from "./photo-optimization";
import { storedZip } from "@/lib/stored-zip";
import { getFontEmbedCSS, toCanvas } from "html-to-image";

function canvasBytes(canvas: HTMLCanvasElement, format: "png" | "jpeg") {
  const binary = atob(canvas.toDataURL(`image/${format}`, 0.95).split(",")[1]);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function exportCards(ids: string[], format: "png" | "jpeg", zip: boolean) {
  await document.fonts.ready;
  const html = document.querySelector<HTMLElement>("[data-export-html]");
  if (!html || !ids.length) throw new Error("Preview unavailable");
  const fontEmbedCSS = await getFontEmbedCSS(html.closest("section") ?? html);
  // html-to-image floors font-size and subtracts 0.1px; the shorthand preserves the measured size.
  const includeStyleProperties = ["font", ...Array.from(getComputedStyle(html)).filter(property => property !== "font-size")];
  const files = [];
  for (const id of ids) {
    const sheet = document.querySelector<HTMLElement>(`[data-artifact-id="${id}"] [data-export-html]`);
    if (!sheet) throw new Error("Preview unavailable");
    // Resolve output-quality sources before html-to-image snapshots nested photo SVGs.
    await Promise.all(Array.from(sheet.querySelectorAll<SVGImageElement>("image[data-photo-original]")).map(async image => {
      const source = image.getAttribute("data-photo-original")!;
      const quality = Number(image.getAttribute("data-photo-quality"));
      if (quality === 0.85 || quality === 0.65) image.setAttribute("href", (await preparePhoto(source, quality)).source);
    }));
    const width = Number(sheet.dataset.exportWidth), height = Number(sheet.dataset.exportHeight);
    const canvas = await toCanvas(sheet, { width, height, canvasWidth: width, canvasHeight: height, pixelRatio: 1, fontEmbedCSS, includeStyleProperties, style: { transform: "none", position: "relative", left: "0", top: "0" } });
    files.push({ name: `${id}.${format === "jpeg" ? "jpg" : "png"}`, data: canvasBytes(canvas, format) });
  }
  const data = zip ? storedZip(files) : files[0].data;
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: zip ? "application/zip" : `image/${format}` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = zip ? "hummunication-weekly.zip" : files[0].name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
