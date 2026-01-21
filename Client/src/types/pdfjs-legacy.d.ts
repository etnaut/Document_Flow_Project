declare module 'pdfjs-dist/legacy/build/pdf' {
  const pdfjsLib: any;
  export = pdfjsLib;
}

declare module 'pdfjs-dist/build/pdf.worker.min.js' {
  const workerSrc: string;
  export default workerSrc;
}

declare module 'pdfjs-dist/build/pdf.worker.min.js?url' {
  const workerSrc: string;
  export default workerSrc;
}

// .mjs variants
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const workerSrc: string;
  export default workerSrc;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const workerSrc: string;
  export default workerSrc;
}
