export function isDraftFenceInfo(info: string): boolean {
  return /^draft(?:\s|$)/.test(info.trim());
}

export interface HtmlImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

export function imageHtml(image: HtmlImage): string {
  const dimensions = `${image.width === undefined ? '' : ` width="${image.width}"`}${image.height === undefined ? '' : ` height="${image.height}"`}`;
  return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}"${dimensions}>`;
}
