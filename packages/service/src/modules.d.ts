declare module '*.ttf' {
  const bytes: ArrayBuffer;
  export default bytes;
}
declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

/** DOM name used by src/model/embed.ts; workers-types leaves it out. */
type BlobPart = ArrayBuffer | ArrayBufferView | Blob | string;
