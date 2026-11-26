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
// Workers' nodejs_compat provides it; the service doesn't load all of @types/node.
declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, fn: () => R): R;
    getStore(): T | undefined;
  }
}
