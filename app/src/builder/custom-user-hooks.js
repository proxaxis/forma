/**
 * @typedef {object} CustomParserModule
 * @property {function?} handleMarkdown - A function to handle Markdown content.
 * @property {function?} handleHTML - A function to handle HTML content.
 * @property {function?} handleHeaderHTML - A function to handle header HTML content.
 * @property {function?} handleFooterHTML - A function to handle footer HTML content.
 */

/** @type {CustomParserModule | null} */
let parserModule = null;

/**
 * Loads the custom parser module.
 * @param {import('@/builder/builder.js').Builder} builder
 * @returns {Promise<CustomParserModule | null>}
 */
async function loadParserModule(builder) {
  if (parserModule) return parserModule;

  parserModule = await builder.config?.parser.load();
  return parserModule;
}

/**
 * Runs the user's custom Markdown handler.
 * @param {import('@/builder/builder.js').Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed Markdown text.
 */
export async function runUserHandleMarkdown(builder) {
  const result = (await loadParserModule(builder))?.handleMarkdown?.(builder.rawMarkdownText, builder.frontmatter);
  return result ?? builder.rawMarkdownText;
}

/**
 * Runs the user's custom HTML handler.
 * @param {import('@/builder/builder.js').Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleHTML(builder) {
  const result = (await loadParserModule(builder))?.handleHTML?.(builder.rawHTMLText, builder.frontmatter);
  return result ?? builder.rawHTMLText;
}

/**
 * Runs the user's custom header HTML handler.
 * @param {import('@/builder/builder.js').Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleHeaderHTML(builder) {
  const result = (await loadParserModule(builder))?.handleHeaderHTML?.(builder.frontmatter, builder.rawHTMLText);
  return result ?? builder.rawHeaderHTMLText;
}

/**
 * Runs the user's custom footer HTML handler.
 * @param {import('@/builder/builder.js').Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleFooterHTML(builder) {
  const result = await (await loadParserModule(builder))?.handleFooterHTML?.(builder.frontmatter, builder.rawHTMLText);
  return result ?? builder.rawFooterHTMLText;
}
