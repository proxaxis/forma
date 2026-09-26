/**
 * @typedef {object} CustomParserModule
 * @property {function?} handleMarkdown - A function to handle Markdown content.
 * @property {function?} handleHTML - A function to handle HTML content.
 * @property {function?} handleHeaderHTML - A function to handle header HTML content.
 * @property {function?} handleFooterHTML - A function to handle footer HTML content.
 *
 * @typedef {import('@/builder/builder.js').Builder} Builder
 */

/**
 * Runs the user's custom Markdown handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed Markdown text.
 */
export async function runUserHandleMarkdown(builder) {
  const config = await builder.buildConfig();
  const result = await (await config.parser.load())?.handleMarkdown?.(builder.rawMarkdownText, builder.frontmatter);
  return result ?? builder.rawMarkdownText;
}

/**
 * Runs the user's custom HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleHTML(builder) {
  const config = await builder.buildConfig();
  const result = await (await config.parser.load())?.handleHTML?.(builder.rawHTMLText, builder.frontmatter);
  return result ?? builder.rawHTMLText;
}

/**
 * Runs the user's custom header HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleHeaderHTML(builder) {
  const { parser } = await builder.buildConfig();
  const result = await (await parser.load())?.handleHeaderHTML?.(builder.rawHeaderHTMLText, builder.frontmatter);
  return result ?? builder.rawHeaderHTMLText;
}

/**
 * Runs the user's custom footer HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML text.
 */
export async function runUserHandleFooterHTML(builder) {
  const { parser } = await builder.buildConfig();
  const result = await (await parser.load())?.handleFooterHTML?.(builder.rawFooterHTMLText, builder.frontmatter);
  return result ?? builder.rawFooterHTMLText;
}
