import grMatter from 'gray-matter';
import { randomBytes as getRandomBytes } from 'node:crypto';
import vsc from 'vscode';
import GithubSlugger from 'github-slugger';
import { htmlBuilderTemplates } from '@/assets/constants.js';
import { ExtendedMarkdownIt } from '@/builder/extended-markdown-it.js';
import { ThemeConfiguration } from '@/builder/configuration-theme.js';
import { ParserConfiguration } from '@/builder/configuration-parser.js';
import { BrowserConfiguration } from '@/builder/configuration-browser.js';
import { runUserHandleMarkdown, runUserHandleHTML, runUserHandleHeaderHTML, runUserHandleFooterHTML } from '@/builder/custom-user-hooks.js';
import { runSystemHandleMarkdown, runSystemHandleHTML, runSystemHandleHeaderHTML, runSystemHandleFooterHTML } from '@/builder/custom-sys-hooks.js';

const xMarkdownInstance = new ExtendedMarkdownIt();

export class Builder {
  /** @param {vsc.TextDocument} vscTextDocument - Document provided by VS Code */
  constructor(vscTextDocument) {
    this.vscTextDocument = vscTextDocument;
    this.xMarkdownInstance = xMarkdownInstance;
    this.slugger = new GithubSlugger();
    this.cache = new Map();
  }

  get rawMarkdownText() {
    if (this.cache.has('rawMarkdownText')) return this.cache.get('rawMarkdownText');

    const { content } = grMatter(this.vscTextDocument.getText());
    this.cache.set('rawMarkdownText', content);
    return content;
  }

  get rawHTMLText() {
    if (this.cache.has('rawHTMLText')) return this.cache.get('rawHTMLText');

    const html = this.renderTokens();
    this.cache.set('rawHTMLText', html);
    return html;
  }

  get frontmatter() {
    if (this.cache.has('frontmatter')) return this.cache.get('frontmatter');

    const { data } = grMatter(this.vscTextDocument.getText());
    this.cache.set('frontmatter', data);
    return data;
  }

  get rawHeaderHTMLText() {
    if (this.cache.has('rawHeaderHTMLText')) return this.cache.get('rawHeaderHTMLText');
    const template = htmlBuilderTemplates.find((template) => template.name === 'template.header.html')?.content ?? '';
    this.cache.set('rawHeaderHTMLText', template);
    return template;
  }
  get rawFooterHTMLText() {
    if (this.cache.has('rawFooterHTMLText')) return this.cache.get('rawFooterHTMLText');
    const template = htmlBuilderTemplates.find((template) => template.name === 'template.footer.html')?.content ?? '';
    this.cache.set('rawFooterHTMLText', template);
    return template;
  }

  get nonce() {
    if (this.cache.has('nonce')) return this.cache.get('nonce');

    const nonce = getRandomBytes(16).toString('base64');
    this.cache.set('nonce', nonce);
    return nonce;
  }

  set rawMarkdownText(value) {
    this.cache.set('rawMarkdownText', value);
  }
  set rawHTMLText(value) {
    this.cache.set('rawHTMLText', value);
  }
  set frontmatter(value) {
    this.cache.set('frontmatter', value);
  }
  set rawHeaderHTMLText(value) {
    this.cache.set('rawHeaderHTMLText', value);
  }
  set rawFooterHTMLText(value) {
    this.cache.set('rawFooterHTMLText', value);
  }

  /**
   * Generate an HTML-safe slug (GFM-based) from the given text.
   * @param {string} text - The text to slugify.
   * @returns {string} - The generated slug.
   */
  asHtmlSafeString(text) {
    return this.slugger.slug(text);
  }

  /**
   * Build the application configuration object.
   * @returns {Promise<{ theme: ThemeConfiguration, parser: ParserConfiguration, browser: BrowserConfiguration }>}
   */
  async buildConfig() {
    if (this.cache.has('config')) return this.cache.get('config');

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
   * Build the Markdown tokens provided by the markdown-it from the raw Markdown text.
   * @returns {Promise<import('markdown-it').Token[]>} - The generated Markdown tokens.
   */
  async buildTokens() {
    if (this.cache.has('tokens')) return this.cache.get('tokens');

    const tokens = this.xMarkdownInstance.parse(this.rawMarkdownText, {});
    this.cache.set('tokens', tokens);
    return tokens;
  }

  /**
   * Render the Markdown tokens after all token handlers have processed them.
   * @returns {string} - The generated HTML.
   */
  renderTokens() {
    const tokens = this.cache.get('tokens') ?? this.xMarkdownInstance.parse(this.rawMarkdownText, {});
    this.cache.set('tokens', tokens);
    return this.xMarkdownInstance.renderer.render(tokens, this.xMarkdownInstance.options, {});
  }

  /**
   * Build the HTML style variables for the preview.
   * @param {string[][]} vars - An array of key-value pairs to be included in the style variables. e.g., [['--my-variable', 'value']].
   * @returns {Promise<string>} - The generated HTML style variables.
   */
  async buildHtmlStyleVariables(vars = []) {
    const map = new Map();
    const { browser } = await this.buildConfig();
    const browserConfig = await browser.loadConfig();
    map.set('--forma-page-margin-top', typeof browserConfig.margin.top === 'string' ? browserConfig.margin.top : '18mm');
    map.set('--forma-page-margin-right', typeof browserConfig.margin.right === 'string' ? browserConfig.margin.right : '18mm');
    map.set('--forma-page-margin-bottom', typeof browserConfig.margin.bottom === 'string' ? browserConfig.margin.bottom : '18mm');
    map.set('--forma-page-margin-left', typeof browserConfig.margin.left === 'string' ? browserConfig.margin.left : '18mm');
    map.set('--forma-page-width', typeof browserConfig.width === 'string' ? browserConfig.width : '18mm');
    map.set('--forma-page-height', typeof browserConfig.height === 'string' ? browserConfig.height : '18mm');
    map.set('--forma-page-format', typeof browserConfig.format === 'string' ? browserConfig.format : 'A4');
    map.set('--forma-page-scale', typeof browserConfig.scale === 'number' ? browserConfig.scale : 1.0);

    for (const [key, value] of vars) {
      map.set(key, value);
    }

    return Array.from(map.entries())
      .map(([key, value]) => `${key}: ${value};`)
      .join(' ');
  }

  /**
   * Measure the rendered preview in Chromium and split it into A4-sized pages.
   * @returns {Promise<string>}
   */
  async buildPaginatedHTML() {
    const config = await this.buildConfig();
    const browser = await config.browser.getBrowser();

    try {
      const page = await browser.newPage();

      await page.setContent(this.rawHTMLText, { waitUntil: 'load' });
      await page.evaluate(async () => {
        const pageDocument = document;
        await pageDocument.fonts.ready;
        await Promise.all(
          Array.from(pageDocument.images).map((image) =>
            image.complete
              ? undefined
              : new Promise((resolve) => {
                  image.addEventListener('load', resolve, { once: true });
                  image.addEventListener('error', resolve, { once: true });
                }),
          ),
        );
      });

      const pagedHtmlContainer = await page.evaluate(() => {
        const pageDocument = document;
        const header = pageDocument.querySelector('.forma-preview-page-header');
        const footer = pageDocument.querySelector('.forma-preview-page-footer');
        const contentContainer = pageDocument.querySelector('.forma-preview-page-content');
        const contentNodes = (contentContainer ? Array.from(contentContainer.children) : Array.from(pageDocument.body.children)).filter((element) => element.tagName !== 'SCRIPT');
        /** @type {HTMLElement[]} */
        const pages = [];
        let currentPage = null;

        /**
         * @param {HTMLElement} page
         * @param {Element} element
         */
        const appendPageElement = (page, element) => {
          const clone = /** @type {Element} */ (element.cloneNode(true));
          clone.querySelectorAll('.pageNumber').forEach((pageNumber) => {
            pageNumber.textContent = String(pages.length + 1);
          });
          page.appendChild(clone);
        };

        const createPage = () => {
          const page = pageDocument.createElement('section');
          page.className = 'forma-preview-page';

          if (header) appendPageElement(page, header);

          const pageContent = pageDocument.createElement('div');
          pageContent.className = 'forma-preview-page-content';
          page.appendChild(pageContent);

          if (footer) appendPageElement(page, footer);
          pages.push(page);
          return { page, pageContent };
        };

        for (const node of contentNodes) {
          if (node.matches('.page-break, [style*="page-break-after: always"], [style*="break-after: page"]')) {
            currentPage = null;
            continue;
          }

          if (!currentPage) currentPage = createPage();

          currentPage.pageContent.appendChild(node);
          if (currentPage.pageContent.scrollHeight > currentPage.pageContent.clientHeight && currentPage.pageContent.children.length > 1) {
            currentPage.pageContent.removeChild(node);
            currentPage = createPage();
            currentPage.pageContent.appendChild(node);
          }
        }

        return pages.map((page) => page.outerHTML).join('');
      });

      return pagedHtmlContainer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate the HTML body content from the Markdown source.
   * @param {Object} [param] - The data to fill the template with.
   * @param {string} [param.csp] - Content Security Policy source for the HTML.
   * @param {(uri: vsc.Uri) => string} [param.resolveResourceUri] - Converts local resource URIs for the target renderer.
   * @returns {Promise<string>} - The generated HTML body content.
   */
  async buildBodyHTML({ csp: cspSource = 'file:', resolveResourceUri = (vscUri) => vscUri.toString() } = {}) {
    const config = await this.buildConfig();

    /**
     * @param {string | null} source
     * @returns {string | null}
     */
    this.xMarkdownInstance.resolveImageUri = (source) => {
      if (!source || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source) || source.startsWith('#')) return source;

      const sourceUri = vsc.Uri.parse(source);
      const workspaceRootUri = config.browser.vscWorkspaceRootUri;
      const baseUri = source === '@' || source.startsWith('@/')
        ? workspaceRootUri
        : vsc.Uri.joinPath(this.vscTextDocument.uri, '..');
      if (!baseUri) return source;

      const imagePath = source === '@' ? '' : source.startsWith('@/') ? source.slice(2) : sourceUri.path;
      const imageUri = vsc.Uri.joinPath(baseUri, imagePath).with({ query: sourceUri.query, fragment: sourceUri.fragment });
      return resolveResourceUri(imageUri);
    };

    this.rawMarkdownText = await runUserHandleMarkdown(this);
    await runSystemHandleMarkdown(this);
    this.rawHTMLText = this.renderTokens();
    this.rawHTMLText = await runUserHandleHTML(this);
    this.rawHTMLText = await runSystemHandleHTML(this);

    // If the print theme is enabled, wrap the content with header and footer for print theme.
    if (config.theme.usePrintTheme) {
      this.rawHeaderHTMLText = await this.buildHeaderHTML();
      this.rawFooterHTMLText = await this.buildFooterHTML();
      // The pagination step clones the header and footer onto each page.
      this.rawHTMLText = `
        <div class="forma-preview-page-header">${this.rawHeaderHTMLText}</div>
        <div class="forma-preview-page-content">${this.rawHTMLText}</div>
        <div class="forma-preview-page-footer">${this.rawFooterHTMLText}</div>`;
    }

    const themeCssText = await config.theme.load();

    // Determine the base href for relative paths in the HTML.
    const baseHref = (() => {
      if (!config.theme.fileUri) return '';
      const href = vsc.Uri.joinPath(config.theme.fileUri, '..').toString();
      return href.endsWith('/') ? href : `${href}/`;
    })();

    // Construct the Content Security Policy (CSP) string.
    const csp = (() => {
      const map = new Map();
      map.set('default-src', ["'none'"]);
      map.set('img-src', [cspSource, 'https:', 'data:']);
      map.set('media-src', [cspSource, 'https:', 'data:']);
      map.set('link-src', [cspSource, 'https:', 'data:']);
      map.set('script-src', [cspSource, 'https://cdnjs.cloudflare.com', 'data:', `'nonce-${this.nonce}'`]);
      map.set('font-src', [cspSource, 'https:', 'data:']);
      map.set('style-src', [cspSource, 'https://cdnjs.cloudflare.com', 'data:', `'nonce-${this.nonce}'`]);
      return Array.from(map.entries())
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');
    })();

    const cssVariablesDataUri = getStyleSheetDataUri(`:root { ${await this.buildHtmlStyleVariables()} }`);
    const themeCssDataUri = config.theme.fileUri && /\.css$/i.test(config.theme.fileUri.path) ? resolveResourceUri(config.theme.fileUri) : getStyleSheetDataUri(themeCssText);

    const bodyCustomDataAttrs = (() => {
      const map = new Map();
      map.set('data-injected-by', 'forma');
      map.set('data-forma-theme-name', config.theme.themeName);
      return Array.from(map.entries())
        .map(([key, value]) => `${key}="${this.xMarkdownInstance.utils.escapeHtml(value)}"`)
        .join(' ');
    })();

    const bodyClassList = (() => {
      const classArr = [];
      if (config.theme.usePrintTheme) classArr.push('forma-preview-pages');
      return classArr.join(' ');
    })();

    this.rawHTMLText = fillHtmlTemplate({ bodyText: this.rawHTMLText, baseHref, csp, cssVariablesDataUri, themeCssDataUri, bodyClassList, bodyCustomDataAttrs });

    if (config.theme.usePrintTheme) {
      try {
        const bodyContent = await this.buildPaginatedHTML();
        this.rawHTMLText = fillHtmlTemplate({ bodyText: bodyContent, baseHref, csp, cssVariablesDataUri, themeCssDataUri, bodyClassList, bodyCustomDataAttrs });
      } catch {
        // Keep the unpaginated preview when Chromium is unavailable.
      }
    }

    return this.rawHTMLText;
  }

  /**
   * Generate the HTML for the header.
   * @returns {Promise<string>} - The header HTML.
   */
  async buildHeaderHTML() {
    this.rawHeaderHTMLText = await runUserHandleHeaderHTML(this);
    this.rawHeaderHTMLText = await runSystemHandleHeaderHTML(this);
    return this.rawHeaderHTMLText.replace(/\r?\n|\r/g, '');
  }

  /**
   * Generate the HTML for the footer.
   * @returns {Promise<string>} - The footer HTML.
   */
  async buildFooterHTML() {
    this.rawFooterHTMLText = await runUserHandleFooterHTML(this);
    this.rawFooterHTMLText = await runSystemHandleFooterHTML(this);
    return this.rawFooterHTMLText.replace(/\r?\n|\r/g, '');
  }
}

/**
 * Converts CSS content to a data URI.
 * @param {string} content - The CSS content.
 * @returns {string} - The data URI.
 */
function getStyleSheetDataUri(content) {
  return `data:text/css;charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Fills an HTML template with the provided data.
 * @param {Object} param - The data to fill the template with.
 * @param {string} param.bodyText - The text to insert into the body of the template.
 * @param {string} param.baseHref - The base href to insert into the template.
 * @param {string} param.csp - The Content Security Policy to insert into the template.
 * @param {string} param.cssVariablesDataUri - The data URI for the CSS variables to insert into the template.
 * @param {string} param.themeCssDataUri - The data URI for the theme CSS to insert into the template.
 * @param {string} param.bodyClassList - The class list to insert into the body of the template.
 * @param {string} param.bodyCustomDataAttrs - The custom data attributes to insert into the body of the template.
 * @returns {string} - The filled HTML template.
 */
function fillHtmlTemplate({ bodyText, baseHref, csp, cssVariablesDataUri, themeCssDataUri, bodyClassList, bodyCustomDataAttrs }) {
  const template = htmlBuilderTemplates.find((template) => template.name === 'template.skeleton.html')?.content ?? '';
  return template
    .replace('___BASE_HREF___', xMarkdownInstance.utils.escapeHtml(baseHref))
    .replace('___CSP___', xMarkdownInstance.utils.escapeHtml(csp))
    .replace('___CSS_VARIABLES_DATA_URI___', xMarkdownInstance.utils.escapeHtml(cssVariablesDataUri))
    .replace('___THEME_CSS_DATA_URI___', xMarkdownInstance.utils.escapeHtml(themeCssDataUri))
    .replace('___BODY_CLASS___', bodyClassList)
    .replace('___BODY_CUSTOM_DATA_ATTRS___', bodyCustomDataAttrs)
    .replace('___RAW_HTML___', bodyText);
}
