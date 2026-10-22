/** Crop a canvas to its drawn pixels so the signature places tightly on the page. */
export function trimCanvas(src: HTMLCanvasElement, pad = 4): HTMLCanvasElement {
  const { width, height } = src;
  const data = src.getContext('2d')!.getImageData(0, 0, width, height).data;
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  const w = Math.min(width, right + pad) - left;
  const h = Math.min(height, bottom + pad) - top;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(src, left, top, w, h, 0, 0, w, h);
  return out;
}
