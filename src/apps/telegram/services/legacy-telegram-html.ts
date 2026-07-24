export default function toLegacyTelegramHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<\/blockquote>/gi, '</blockquote>\n')
    .replace(/<footer>/gi, '\n')
    .replace(/<\/footer>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
