import { degrees, PDFDocument } from 'pdf-lib';
import type { PDFImage, PDFPage } from 'pdf-lib';
import type { DocPage, Placement, Stamp } from '../types';

// Width of pages built from an uploaded image, in PDF points (A4 width).
const IMAGE_PAGE_WIDTH = 595;

/**
 * Build a PDF of the document with its placed stamps. PDFs are stamped in
 * place so their text stays sharp and selectable; images, and PDFs pdf-lib
 * can't edit (e.g. encrypted ones), are rebuilt from the rendered page images.
 */
export async function exportPdf(file: File, pages: DocPage[], placements: Placement[]): Promise<Uint8Array> {
  const isPdf = file.type === 'application/pdf';
  if (isPdf) {
    try {
      return await stampOriginal(file, pages, placements);
    } catch (err) {
      console.warn('Could not edit the original PDF; exporting page images instead.', err);
    }
  }
  return fromPageImages(pages, placements, !isPdf);
}

async function stampOriginal(file: File, pages: DocPage[], placements: Placement[]) {
  const doc = await PDFDocument.load(await file.arrayBuffer());
  const pdfPages = doc.getPages();
  if (pdfPages.length !== pages.length) throw new Error('Page count does not match the rendered document.');
  const embed = stampEmbedder(doc);
  for (const [i, page] of pages.entries()) {
    for (const p of placements.filter(p => p.pageId === page.id)) {
      drawPlacement(pdfPages[i], await embed(p.stamp), p);
    }
  }
  return doc.save();
}

async function fromPageImages(pages: DocPage[], placements: Placement[], scaleToA4: boolean) {
  const doc = await PDFDocument.create();
  const embed = stampEmbedder(doc);
  for (const page of pages) {
    const width = scaleToA4 ? IMAGE_PAGE_WIDTH : page.width;
    const height = width * (page.height / page.width);
    const pdfPage = doc.addPage([width, height]);
    pdfPage.drawImage(await embedImage(doc, page.src), { x: 0, y: 0, width, height });
    for (const p of placements.filter(p => p.pageId === page.id)) {
      drawPlacement(pdfPage, await embed(p.stamp), p);
    }
  }
  return doc.save();
}

/** Embeds each stamp once, however many times it's placed. */
function stampEmbedder(doc: PDFDocument) {
  const cache = new Map<string, Promise<PDFImage>>();
  return (stamp: Stamp) => {
    let image = cache.get(stamp.id);
    if (!image) {
      image = fetch(stamp.dataUrl)
        .then(r => r.arrayBuffer())
        .then(bytes => doc.embedPng(bytes));
      cache.set(stamp.id, image);
    }
    return image;
  };
}

async function embedImage(doc: PDFDocument, src: string): Promise<PDFImage> {
  const blob = await (await fetch(src)).blob();
  if (blob.type === 'image/jpeg') return doc.embedJpg(await blob.arrayBuffer());
  if (blob.type === 'image/png') return doc.embedPng(await blob.arrayBuffer());
  // pdf-lib only reads PNG and JPEG, so convert anything else (WebP, GIF).
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not convert image.'))), 'image/png'),
  );
  return doc.embedPng(await png.arrayBuffer());
}

/**
 * Draw a placement onto a PDF page. Placements are measured on the page as
 * shown (after the page's /Rotate), so map back into unrotated PDF space and
 * rotate the image to match.
 */
function drawPlacement(pdfPage: PDFPage, image: PDFImage, p: Placement) {
  const box = pdfPage.getCropBox();
  const rotation = (((pdfPage.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const sideways = rotation === 90 || rotation === 270;
  const shownWidth = sideways ? box.height : box.width;
  const shownHeight = sideways ? box.width : box.height;
  const width = p.width * shownWidth;
  const height = width * p.stamp.aspect;
  // The stamp's bottom-left corner as shown, measured from the top-left.
  const u = p.x * shownWidth;
  const v = p.y * shownHeight + height;
  const [x, y] = {
    0: [u, box.height - v],
    90: [v, u],
    180: [box.width - u, v],
    270: [box.width - v, box.height - u],
  }[rotation];
  pdfPage.drawImage(image, { x: box.x + x, y: box.y + y, width, height, rotate: degrees(rotation) });
}
