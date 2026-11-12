export function photoGeometry(width: number, height: number, rotation: number) {
  return {
    width: rotation % 180 ? height : width,
    height: rotation % 180 ? width : height,
    transform: rotation === 90 ? `translate(${height} 0) rotate(90)` : rotation === 180 ? `translate(${width} ${height}) rotate(180)` : rotation === 270 ? `translate(0 ${width}) rotate(270)` : undefined,
  };
}

export function centeredPhotoCrop(width: number, height: number, rotation: number, aspect = 16 / 9) {
  const bounds = photoGeometry(width, height, rotation);
  const cropWidth = Math.min(0.9, 0.9 * bounds.height * aspect / bounds.width);
  const cropHeight = cropWidth * bounds.width / (aspect * bounds.height);
  return { x: (1 - cropWidth) / 2, y: (1 - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

export function photoCropForAspect(width: number, height: number, rotation: number, crop: { x: number; y: number; width: number; height: number }, aspect: number) {
  const bounds = photoGeometry(width, height, rotation);
  const cropWidth = Math.min(crop.width, crop.height * bounds.height * aspect / bounds.width);
  const cropHeight = cropWidth * bounds.width / (aspect * bounds.height);
  return { x: crop.x + (crop.width - cropWidth) / 2, y: crop.y + (crop.height - cropHeight) / 2, width: cropWidth, height: cropHeight };
}
