export interface DocPage {
  id: string;
  /** Object URL of the rendered page image. */
  src: string;
  /** Natural size in CSS pixels. */
  width: number;
  height: number;
}

export interface Signature {
  id: string;
  dataUrl: string;
  /** Height divided by width. */
  aspect: number;
}

/** A signature placed on a page. Position and width are fractions of the page size. */
export interface Placement {
  id: string;
  pageId: string;
  signature: Signature;
  x: number;
  y: number;
  width: number;
}
