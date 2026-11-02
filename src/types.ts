export interface DocPage {
  id: string;
  /** Object URL of the rendered page image. */
  src: string;
  /** Natural size in CSS pixels (PDF points for PDF pages). */
  width: number;
  height: number;
}

/** Something that can be placed on a page: a drawn signature or a date. */
export interface Stamp {
  id: string;
  kind: 'signature' | 'date';
  dataUrl: string;
  /** Height divided by width. */
  aspect: number;
}

/** A stamp placed on a page. Position and width are fractions of the page size. */
export interface Placement {
  id: string;
  pageId: string;
  stamp: Stamp;
  x: number;
  y: number;
  width: number;
}
