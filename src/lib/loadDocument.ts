import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { newId } from './id';
import type { DocPage } from '../types';

GlobalWorkerOptions.workerSrc = workerUrl;

// Render scale for PDF pages; higher means sharper prints.
const RENDER_SCALE = 2;

export async function loadDocument(file: File): Promise<DocPage[]> {
  if (file.type === 'application/pdf') return loadPdf(file);
  if (file.type.startsWith('image/')) return [await loadImage(file)];
  throw new Error('Unsupported file type. Use a PDF or an image.');
}

async function loadPdf(file: File): Promise<DocPage[]> {
  const task = getDocument({ data: await file.arrayBuffer() });
  const pages: DocPage[] = [];
  try {
    const pdf = await task.promise;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not render page.'))), 'image/png'),
      );
      pages.push({
        id: newId(),
        src: URL.createObjectURL(blob),
        width: viewport.width / RENDER_SCALE,
        height: viewport.height / RENDER_SCALE,
      });
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

function loadImage(file: File): Promise<DocPage> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({ id: newId(), src, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('Could not read that image.'));
    };
    img.src = src;
  });
}
