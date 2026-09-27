/**
 * File overview: Hooks for customizing Markdown and HTML during rendering.
 * Each hook receives the current content and frontmatter as positional arguments
 * and may return a Promise with replacement content.
 */

/**
 * Hook to customize Markdown content before rendering.
 * @param {string} content - Markdown content to render, excluding frontmatter.
 * @param {Record<string, unknown>} frontmatter - Frontmatter extracted from the document.
 * @returns {Promise<string|undefined>} The modified Markdown content. If undefined is returned, this processing will be skipped.
 */
export async function handleMarkdown(content, frontmatter) {
  return undefined;
}

/**
 * Hook to customize HTML content after rendering.
 * @param {string} html - HTML built from the Markdown.
 * @param {Record<string, unknown>} frontmatter - Frontmatter extracted from the document.
 * @returns {Promise<string|undefined>} The modified HTML content. If undefined is returned, this processing will be skipped.
 */
export async function handleHTML(html, frontmatter) {
  return undefined;
}

/**
 * Generate the PDF and Print View header dynamically from document metadata.
 * @param {string} html - Header HTML template.
 * @param {Record<string, unknown>} frontmatter - Frontmatter extracted from the document.
 * @returns {Promise<string|undefined>} The modified header HTML. If undefined is returned, this processing will be skipped.
 */
export async function handleHeaderHTML(html, frontmatter) {
  return undefined;
}

/**
 * Generate the PDF and Print View footer dynamically from document metadata.
 * @param {string} html - Footer HTML template.
 * @param {Record<string, unknown>} frontmatter - Frontmatter extracted from the document.
 * @returns {Promise<string|undefined>} The modified footer HTML. If undefined is returned, this processing will be skipped.
 */
export async function handleFooterHTML(html, frontmatter) {
  return undefined;
}
