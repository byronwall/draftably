declare module '*.ttf' {
  const bytes: ArrayBuffer;
  export default bytes;
}
declare module '*.md' {
  const text: string;
  export default text;
}
declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}
declare module 'cssstyle' {
  export class CSSStyleDeclaration {
    color: string;
  }
}
