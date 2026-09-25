import grMatter from 'gray-matter';
import vsc from 'vscode';
import GithubSlugger from 'github-slugger';
import { htmlBuilderTemplates } from '@/assets/constants.js';
import { Markdown } from '@/builder/markdown.js';
import { ThemeConfiguration } from '@/builder/configuration-theme.js';
import { ParserConfiguration } from '@/builder/configuration-parser.js';
import { BrowserConfiguration } from '@/builder/configuration-browser.js';
import { runUserHandleMarkdown, runUserHandleHTML, runUserHandleHeaderHTML, runUserHandleFooterHTML } from '@/builder/custom-user-hooks.js';
import { runSystemHandleMarkdown, runSystemHandleHTML, runSystemHandleHeaderHTML, runSystemHandleFooterHTML } from '@/builder/custom-sys-hooks.js';

const markdown = new Markdown();

/**
 * Get the HTML template content by name.
 * @param {string} name
 * @returns {string}
 */
function getHtmlTemplate(name) {
  const item = htmlBuilderTemplates.find((template) => template.name === name);
  return item?.content ?? '';
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class Builder {
  /** @param {import('vscode').TextDocument} vscTextDocument - Document provided by VS Code */
  constructor(vscTextDocument) {
    this.vscTextDocument = vscTextDocument;
    this.markdown = markdown;
    this.slugger = new GithubSlugger();
    this.cache = new Map();
  }

  /**
   * @returns {string}
   */
  get rawMarkdownText() {
    if (this.cache.has('rawMarkdownText')) {
      return this.cache.get('rawMarkdownText');
    }

    const text = this.vscTextDocument.getText();
    const { content } = grMatter(text);
    this.cache.set('rawMarkdownText', content);
    return content;
  }

  /**
   * @param {string} value
   */
  set rawMarkdownText(value) {
    this.cache.set('rawMarkdownText', value);
  }

  /**
   * @returns {string}
   */
  get rawHTMLText() {
    if (this.cache.has('rawHTMLText')) {
      return this.cache.get('rawHTMLText');
    }

    const html = this.markdown.render(this.rawMarkdownText);
    this.cache.set('rawHTMLText', html);
    return html;
  }

  /**
   * @param {string} value
   */
  set rawHTMLText(value) {
    this.cache.set('rawHTMLText', value);
  }

  /**
   * @returns {Record<string, any>}
   */
  get frontmatter() {
    if (this.cache.has('frontmatter')) {
      return this.cache.get('frontmatter');
    }

    const { data } = grMatter(this.vscTextDocument.getText());
    this.cache.set('frontmatter', data);
    return data;
  }

  /**
   * @param {Record<string, any>} value
   */
  set frontmatter(value) {
    this.cache.set('frontmatter', value);
  }

  /**
   * @returns {string}
   */
  get rawHeaderHTMLText() {
    return this.cache.get('rawHeaderHTMLText') ?? '';
  }

  /**
   * @param {string} value
   */
  set rawHeaderHTMLText(value) {
    this.cache.set('rawHeaderHTMLText', value);
  }

  /**
   * @returns {string}
   */
  get rawFooterHTMLText() {
    return this.cache.get('rawFooterHTMLText') ?? '';
  }

  /**
   * @param {string} value
   */
  set rawFooterHTMLText(value) {
    this.cache.set('rawFooterHTMLText', value);
  }

  /**
   * Build the application configuration object (each Configuration instance).
   * @returns {Promise<{ theme: ThemeConfiguration, parser: ParserConfiguration, browser: BrowserConfiguration }>}
   */
  async buildConfig() {
    if (this.cache.has('config')) {
      return this.cache.get('config');
    }

    const vscTextDocumentUri = this.vscTextDocument.uri;
    const config = {
      theme: new ThemeConfiguration(vscTextDocumentUri, this.frontmatter.theme),
      parser: new ParserConfiguration(vscTextDocumentUri, this.frontmatter.parser),
      browser: new BrowserConfiguration(vscTextDocumentUri, this.frontmatter.puppeteer),
    };

    this.cache.set('config', config);
    return config;
  }

  /**
   * Get the application configuration object.
   * @returns {{ theme: ThemeConfiguration, parser: ParserConfiguration, browser: BrowserConfiguration }|undefined}
   */
  get config() {
    return this.cache.get('config');
  }

  /**
   * Build the Markdown tokens provided by the markdown-it from the raw Markdown text.
   * @returns {Promise<import('markdown-it').Token[]>} - The generated Markdown tokens.
   */
  async buildTokens() {
    if (this.cache.has('tokens')) {
      return this.cache.get('tokens');
    }

    const tokens = this.markdown.parse(this.rawMarkdownText, {});
    this.cache.set('tokens', tokens);
    return tokens;
  }

  /**
   * Get the application configuration object.
   * @returns {{ theme: ThemeConfiguration, parser: ParserConfiguration, browser: BrowserConfiguration }|undefined}
   */
  get tokens() {
    return this.cache.get('tokens');
  }

  /**
   * Generate an HTML-safe slug (GFM) from the given text.
   * @param {string} text - The text to slugify.
   * @returns {string} - The generated slug.
   */
  toHtmlSafeString(text) {
    return this.slugger.slug(text);
  }

  /**
   * Generate the HTML body content from the Markdown source.
   * @param {string} cspSource - Content Security Policy source for the HTML.
   * @returns {Promise<string>} - The generated HTML body content.
   */
  async buildBodyHTML(cspSource = 'file:') {
    const config = await this.buildConfig();

    // Run user and system hooks for Markdown processing
    this.rawMarkdownText = await runUserHandleMarkdown(this);
    this.rawMarkdownText = await runSystemHandleMarkdown(this);

    // Run user and system hooks for HTML processing
    this.cache.delete('rawHTMLText');
    this.rawHTMLText = await runUserHandleHTML(this);
    this.rawHTMLText = await runSystemHandleHTML(this);

    // Load the theme content if available
    const theme = await config.theme.load(this.frontmatter.preview === true);

    // The base href is determined by the theme's URI, ensuring that relative paths in the HTML are resolved correctly.
    const baseHref = (() => {
      if (!config.theme.fileUri) return '';
      const themeDirUri = vsc.Uri.joinPath(config.theme.fileUri, '..');
      const href = themeDirUri.toString();
      return href.endsWith('/') ? href : `${href}/`;
    })();

    const nonce = getNonce();
    const csp = `default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource} https: data:; script-src 'nonce-${nonce}';`;
    const template = getHtmlTemplate('template.skeleton.html');

    if (template) {
      this.rawHTMLText = template
        .replace('___BASE_HREF___', this.markdown.utils.escapeHtml(baseHref))
        .replace('___CSP___', this.markdown.utils.escapeHtml(csp))
        .replace('/* ___THEME___ */', theme)
        .replace('<!-- ___RAW_HTML___ -->', this.rawHTMLText)
        .replace('___NONCE___', this.markdown.utils.escapeHtml(nonce));
    }

    return this.rawHTMLText;
  }

  /**
   * Generate the HTML for the header and footer.
   * @returns {Promise<{ header: string, footer: string }>}
   */
  async buildHeaderFooterHTML() {
    await this.buildConfig();

    this.rawHeaderHTMLText = getHtmlTemplate('template.header.html');
    this.rawFooterHTMLText = getHtmlTemplate('template.footer.html');

    // Run user and system hooks for header and footer processing
    this.rawHeaderHTMLText = await runUserHandleHeaderHTML(this);
    this.rawHeaderHTMLText = await runSystemHandleHeaderHTML(this);

    // Run user and system hooks for footer processing
    this.rawFooterHTMLText = await runUserHandleFooterHTML(this);
    this.rawFooterHTMLText = await runSystemHandleFooterHTML(this);

    return {
      header: this.rawHeaderHTMLText,
      footer: this.rawFooterHTMLText,
    };
  }
}
