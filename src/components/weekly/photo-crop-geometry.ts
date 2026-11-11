export function photoGeometry(width: number, height: number, rotation: number) {
  return {
    width: rotation % 180 ? height : width,
    height: rotation % 180 ? width : height,
    transform: rotation === 90 ? `translate(${height} 0) rotate(90)` : rotation === 180 ? `translate(${width} ${height}) rotate(180)` : rotation === 270 ? `translate(0 ${width}) rotate(270)` : undefined,
  };
}

export function centeredPhotoCrop(width: number, height: number, rotation: number) {
  const bounds = photoGeometry(width, height, rotation);
  const cropWidth = Math.min(0.9, 0.9 * bounds.height * (119 / 71) / bounds.width);
  const cropHeight = cropWidth * bounds.width / ((119 / 71) * bounds.height);
  return { x: (1 - cropWidth) / 2, y: (1 - cropHeight) / 2, width: cropWidth, height: cropHeight };
}
