/**
 * Hook to customize Markdown content before rendering.
 * @param {string} content - The Markdown content to be rendered (excluding frontmatter).
 * @param {Record<string, unknown>} frontmatter - The frontmatter data extracted from the Markdown file.
 * @param {string} rawText - The raw text of the Markdown file.
 * @returns {Promise<string>} The modified Markdown content.
 */
export async function handleMarkdown(content, frontmatter, rawText) {
  void frontmatter;
  void rawText;
  return content;
}

/**
 * Hook to customize HTML content after rendering.
 * @param {string} html - The HTML content to be rendered.
 * @param {{ frontmatter: Record<string, unknown>, rawText: string }} context - The context object containing frontmatter and raw text.
 * @returns {Promise<string>} The modified HTML content.
 */
export async function handleHTML(html, context) {
  void context;
  return html;
}

/**
 * Generate the PDF header dynamically from document metadata and rendered HTML.
 * @param {Record<string, unknown>} frontmatter - The frontmatter data.
 * @param {string} rawHTML - The rendered document HTML.
 * @returns {Promise<string>} The Puppeteer header template.
 */
export async function handleHeaderHTML(frontmatter, rawHTML) {
  void frontmatter;
  void rawHTML;
  return '';
}

/**
 * Generate the PDF footer dynamically from document metadata and rendered HTML.
 * @param {Record<string, unknown>} frontmatter - The frontmatter data.
 * @param {string} rawHTML - The rendered document HTML.
 * @returns {Promise<string>} The Puppeteer footer template.
 */
export async function handleFooterHTML(frontmatter, rawHTML) {
  void frontmatter;
  void rawHTML;
  return '';
}
