import { storedZip } from "@/lib/stored-zip";
import { getFontEmbedCSS, toCanvas } from "html-to-image";

function canvasBytes(canvas: HTMLCanvasElement, format: "png" | "jpeg") {
  const binary = atob(canvas.toDataURL(`image/${format}`, 0.95).split(",")[1]);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function rasterize(svg: SVGSVGElement, format: "png" | "jpeg") {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  const properties = ["fill", "stroke", "stroke-width", "opacity", "font-family", "font-size", "font-weight", "letter-spacing", "text-anchor"];
  originals.forEach((element, index) => {
    const style = getComputedStyle(element);
    properties.forEach((property) => (copies[index] as SVGElement).style.setProperty(property, style.getPropertyValue(property)));
  });
  await Promise.all(Array.from(copy.querySelectorAll("image")).map(async (image) => {
    const href = image.getAttribute("href")!;
    if (href.startsWith("data:")) return;
    const response = await fetch(href);
    if (!response.ok) throw new Error("Asset unavailable");
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    image.setAttribute("href", dataUrl);
  }));
  copy.setAttribute("width", "1200");
  copy.setAttribute("height", "1500");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    // toBlob schedules idle work and stalls a multi-card export in background tabs.
    return canvasBytes(canvas, format);
  } finally { URL.revokeObjectURL(url); }
}

export async function exportCards(ids: string[], format: "png" | "jpeg", zip: boolean) {
  await document.fonts.ready;
  const html = document.querySelector<HTMLElement>("[data-export-html]");
  const fontEmbedCSS = html ? await getFontEmbedCSS(html, { preferredFontFormat: "woff2" }) : "";
  const files = [];
  for (const id of ids) {
    const artifact = document.querySelector(`[data-artifact-id="${id}"]`);
    const sheet = artifact?.querySelector<HTMLElement>("[data-export-html]");
    const svg = artifact?.querySelector<SVGSVGElement>("svg");
    if (!sheet && !svg) throw new Error("Preview unavailable");
    const data = sheet ? canvasBytes(await toCanvas(sheet, { width: 480, height: 600, canvasWidth: 1200, canvasHeight: 1500, pixelRatio: 1, fontEmbedCSS, style: { transform: "none", position: "relative", left: "0", top: "0" } }), format) : await rasterize(svg!, format);
    files.push({ name: `${id}.${format === "jpeg" ? "jpg" : "png"}`, data });
  }
  const data = zip ? storedZip(files) : files[0].data;
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: zip ? "application/zip" : `image/${format}` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = zip ? "hummunication-weekly.zip" : files[0].name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
