// Shared by every framework example: three diagrams on one page.
export const sources = [
  'diagram "Alpha" version=1\nnode web "Alpha web"\nnode api "Alpha API"\nedge e1 web -> api "calls"\n',
  'diagram "Beta" version=1\nnode queue "Beta queue"\nnode worker "Beta worker"\nedge e1 queue -> worker "feeds"\n',
  'diagram "Gamma" version=1\nnode user "Gamma user"\nnode app "Gamma app"\nedge e1 user -> app "opens"\n',
];
export const updated = sources[0].replace('Alpha API', 'Updated API');
