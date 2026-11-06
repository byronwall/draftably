# Browser ESM without a bundler

Install the runtime package, then copy its full `dist` directory to `runtime/` beside `index.html`. Serve this directory over HTTP. Open `index.html` at any public base path; its module and font chunk paths are relative.

The example compiles source in the browser. Use build-time SVG images when readers should not receive source or the compiler.
