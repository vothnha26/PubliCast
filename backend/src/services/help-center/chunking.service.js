const { CHUNKING_CONFIG } = require('../../constants/help-center.constants');

/**
 * Strips HTML tags/entities down to plain text, collapsing whitespace.
 */
function stripHtml(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Splits plain text into overlapping chunks of roughly CHUNK_SIZE characters,
 * breaking on paragraph boundaries where possible to avoid cutting mid-sentence.
 */
function chunkText(text, chunkSize = CHUNKING_CONFIG.CHUNK_SIZE, overlap = CHUNKING_CONFIG.CHUNK_OVERLAP) {
  const paragraphs = text.split('\n').filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length > 0 && current.length + paragraph.length + 1 > chunkSize) {
      chunks.push(current.trim());
      current = current.slice(Math.max(0, current.length - overlap));
    }
    current += (current ? '\n' : '') + paragraph;

    while (current.length > chunkSize) {
      chunks.push(current.slice(0, chunkSize).trim());
      current = current.slice(chunkSize - overlap);
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(Boolean);
}

/**
 * Converts article HTML content into an ordered list of text chunks ready
 * for embedding.
 */
function chunkContent(html) {
  const plainText = stripHtml(html);
  return chunkText(plainText);
}

module.exports = { chunkContent, stripHtml, chunkText };
