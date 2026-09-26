/**
 * Hook to customize Markdown content before rendering.
 * @param {string} text - The Markdown content to be rendered (excluding frontmatter).
 * @param {Record<string, unknown>} frontmatter - The frontmatter data extracted from the Markdown file.
 * @returns {Promise<string|undefined>} The modified Markdown content. If undefined is returned, this processing will be skipped.
 */
export async function handleMarkdown(text, frontmatter) {
  return undefined;
}

/**
 * Hook to customize HTML content after rendering.
 * @param {string} html - The HTML content to be rendered.
 * @param {Record<string, unknown>} frontmatter - The frontmatter data extracted from the Markdown file.
 * @returns {Promise<string|undefined>} The modified HTML content. If undefined is returned, this processing will be skipped.
 */
export async function handleHTML(html, frontmatter) {
  return undefined;
}

/**
 * Generate the PDF header dynamically from document metadata and rendered HTML.
 * @param {string} html - The header HTML template.
 * @param {Record<string, unknown>} frontmatter - The frontmatter data.
 * @returns {Promise<string|undefined>} The modified header HTML. If undefined is returned, this processing will be skipped.
 */
export async function handleHeaderHTML(html, frontmatter) {
  return undefined;
}

/**
 * Generate the PDF footer dynamically from document metadata and rendered HTML.
 * @param {string} html - The footer HTML template.
 * @param {Record<string, unknown>} frontmatter - The frontmatter data.
 * @returns {Promise<string|undefined>} The modified footer HTML. If undefined is returned, this processing will be skipped.
 */
export async function handleFooterHTML(html, frontmatter) {
  return undefined;
}
