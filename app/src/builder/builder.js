import grMatter from 'gray-matter';
import { randomBytes as getRandomBytes } from 'node:crypto';
import vsc from 'vscode';
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
    this.cache = new Map();
  }

  // #region Getters and Setters
  get rawMarkdownText() {
    if (this.cache.has('rawMarkdownText')) return this.cache.get('rawMarkdownText');

    const { content } = grMatter(this.vscTextDocument.getText());
    this.cache.set('rawMarkdownText', content);
    return content;
  }

  get rawHTMLText() {
    if (this.cache.has('rawHTMLText')) return this.cache.get('rawHTMLText');

    const html = this.render();
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

  get theme() {
    if (this.cache.has('theme')) return this.cache.get('theme');

    const theme = new ThemeConfiguration(this.vscTextDocument.uri, this.frontmatter.theme);
    this.cache.set('theme', theme);
    return theme;
  }

  get parser() {
    if (this.cache.has('parser')) return this.cache.get('parser');

    const parser = new ParserConfiguration(this.vscTextDocument.uri, this.frontmatter.parser);
    this.cache.set('parser', parser);
    return parser;
  }

  get browser() {
    if (this.cache.has('browser')) return this.cache.get('browser');

    const browser = new BrowserConfiguration(this.vscTextDocument.uri, this.frontmatter.browser);
    this.cache.set('browser', browser);
    return browser;
  }

  /** @type {import('markdown-it').Token[]} */
  get tokens() {
    if (this.cache.has('tokens')) return this.cache.get('tokens');

    const tokens = this.xMarkdownInstance.parse(this.rawMarkdownText, {});
    this.cache.set('tokens', tokens);
    return tokens;
  }

  /** @type {Map<string, string>} */
  get htmlStyleVariables() {
    if (this.cache.has('htmlStyleVariables')) return this.cache.get('htmlStyleVariables');

    const map = new Map();
    this.cache.set('htmlStyleVariables', map);
    return map;
  }

  /** @type {Map<string, [string, string][]>} */
  get htmlInjectionStyles() {
    if (this.cache.has('htmlInjectionStyles')) return this.cache.get('htmlInjectionStyles');

    const map = new Map();
    this.cache.set('htmlInjectionStyles', map);
    return map;
  }

  /** @type {Set<string>} */
  get htmlInjectionScripts() {
    if (this.cache.has('htmlInjectionScripts')) return this.cache.get('htmlInjectionScripts');

    const map = new Set();
    this.cache.set('htmlInjectionScripts', map);
    return map;
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
  set nonce(_) {
    throw new Error('Nonce is read-only and cannot be set.');
  }
  set theme(_) {
    throw new Error('Theme is read-only and cannot be set.');
  }
  set parser(_) {
    throw new Error('Parser is read-only and cannot be set.');
  }
  set browser(_) {
    throw new Error('Browser is read-only and cannot be set.');
  }
  set tokens(_) {
    throw new Error('Tokens are read-only and cannot be set.');
  }
  set htmlStyleVariables(_) {
    throw new Error('HTML style variables are read-only and cannot be set. Use .set() to modify individual variables.');
  }
  set htmlInjectionStyles(_) {
    throw new Error('HTML injection styles are read-only and cannot be set. Use .set() to modify individual styles.');
  }
  set htmlInjectionScripts(_) {
    throw new Error('HTML injection scripts are read-only and cannot be set. Use .add() to add new scripts.');
  }
  // #endregion

  /**
   * Render the Markdown from the processed tokens after all token handlers have processed them.
   * @returns {string} - The generated HTML.
   */
  render() {
    const tokens = this.cache.get('tokens') ?? this.xMarkdownInstance.parse(this.rawMarkdownText, {});
    this.cache.set('tokens', tokens);
    return this.xMarkdownInstance.renderer.render(tokens, this.xMarkdownInstance.options, {});
  }

  /**
   * Measure the rendered preview in Chromium and split it into A4-sized pages.
   * @returns {Promise<string>}
   */
  async buildPaginatedHTML() {
    const browser = await this.browser.getBrowser();

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
   * @param {string} [param.vscCspRource] - Content Security Policy source provided by the VSCode WebviewPanel.
   * @param {(uri: vsc.Uri) => string} [param.resolveResourceUri] - Converts local resource URIs for the target renderer.
   * @returns {Promise<string>} - The generated HTML body content.
   */
  async buildBodyHTML({ vscCspRource = 'file:', resolveResourceUri = (vscUri) => vscUri.toString() } = {}) {
    this.xMarkdownInstance.options.html = vsc.workspace.isTrusted;

    /**
     * Resolve the URI of an image.
     * @param {string | null} source - The source URI of the image.
     * @returns {string | null} - The resolved URI of the image, or null if it cannot be resolved.
     */
    this.xMarkdownInstance.resolveImageUri = (source) => {
      if (!source || source.startsWith('#')) return source;
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source)) return vsc.workspace.isTrusted ? source : null;

      const sourceUri = vsc.Uri.parse(source);
      const workspaceRootUri = this.browser.vscWorkspaceRootUri;
      const baseUri = source === '@' || source.startsWith('@/') ? workspaceRootUri : vsc.Uri.joinPath(this.vscTextDocument.uri, '..');
      if (!baseUri) return source;

      const imagePath = source === '@' ? '' : source.startsWith('@/') ? source.slice(2) : sourceUri.path;
      const imageUri = vsc.Uri.joinPath(baseUri, imagePath).with({ query: sourceUri.query, fragment: sourceUri.fragment });
      return resolveResourceUri(imageUri);
    };

    // Generate the raw HTML content from the Markdown source, applying user and system hooks.
    this.rawMarkdownText = await runUserHandleMarkdown(this);
    await runSystemHandleMarkdown(this); // This function modifies the tokens in place, so we don't need to capture its return value.
    this.rawHTMLText = this.render();
    this.rawHTMLText = await runUserHandleHTML(this);
    this.rawHTMLText = await runSystemHandleHTML(this);

    // Add the document nonce to style tags supplied by Markdown or parser hooks
    this.rawHTMLText = this.rawHTMLText.replace(/<style\b([^>]*)>/gi, (/** @type {string} */ _match, /** @type {string} */ attributes) => {
      const attributesWithoutNonce = attributes.replace(/\snonce\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/i, '');
      return `<style${attributesWithoutNonce} nonce="${this.nonce}">`;
    });

    // If the print theme is enabled, wrap the content with header and footer for print theme.
    if (this.theme.usePrintTheme) {
      this.rawHeaderHTMLText = await this.buildHeaderHTML();
      this.rawFooterHTMLText = await this.buildFooterHTML();
      // The pagination step clones the header and footer onto each page.
      this.rawHTMLText = `
        <div class="forma-preview-page-header">${this.rawHeaderHTMLText}</div>
        <div class="forma-preview-page-content">${this.rawHTMLText}</div>
        <div class="forma-preview-page-footer">${this.rawFooterHTMLText}</div>`;
    }

    await this.theme.load(); // Preload the theme CSS and other resources, if applicable.

    // Determine the base href for relative paths in the HTML.
    const baseHref = (() => {
      if (!vsc.workspace.isTrusted || !this.theme.fileUri) return '';
      const href = vsc.Uri.joinPath(this.theme.fileUri, '..').toString();
      return href.endsWith('/') ? href : `${href}/`;
    })();

    // Construct the Content Security Policy (CSP) string.
    const cspSourceText = (() => {
      const map = new Map();
      map.set('default-src', ["'none'"]);
      map.set('img-src', vsc.workspace.isTrusted ? [vscCspRource, 'https:', 'data:'] : [vscCspRource, 'data:']);
      map.set('media-src', vsc.workspace.isTrusted ? [vscCspRource, 'https:', 'data:'] : [vscCspRource, 'data:']);
      map.set('link-src', ['https://cdnjs.cloudflare.com', 'data:']);
      map.set('script-src', [vscCspRource, 'https://cdnjs.cloudflare.com', 'data:', `'nonce-${this.nonce}'`]);
      map.set('font-src', vsc.workspace.isTrusted ? [vscCspRource, 'https:', 'data:'] : [vscCspRource, 'data:']);
      map.set('style-src', [vscCspRource, 'https://cdnjs.cloudflare.com', 'data:', `'nonce-${this.nonce}'`]);
      return Array.from(map.entries())
        .map(([key, values]) => `${key} ${values.join(' ')}`)
        .join('; ');
    })();

    const htmlStyleVariablesDataUri = await (async () => {
      const config = await this.browser.loadConfig();
      this.htmlStyleVariables.set('--forma-page-margin-top', typeof config.margin.top === 'string' ? config.margin.top : '18mm');
      this.htmlStyleVariables.set('--forma-page-margin-right', typeof config.margin.right === 'string' ? config.margin.right : '18mm');
      this.htmlStyleVariables.set('--forma-page-margin-bottom', typeof config.margin.bottom === 'string' ? config.margin.bottom : '18mm');
      this.htmlStyleVariables.set('--forma-page-margin-left', typeof config.margin.left === 'string' ? config.margin.left : '18mm');
      this.htmlStyleVariables.set('--forma-page-width', typeof config.width === 'string' ? config.width : '18mm');
      this.htmlStyleVariables.set('--forma-page-height', typeof config.height === 'string' ? config.height : '18mm');
      this.htmlStyleVariables.set('--forma-page-format', typeof config.format === 'string' ? config.format : 'A4');
      this.htmlStyleVariables.set('--forma-page-scale', typeof config.scale === 'number' ? config.scale : 1.0);

      const vars = Array.from(this.htmlStyleVariables.entries())
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');
      return getStyleSheetDataUri(`:root { ${vars} }`);
    })();

    const htmlInjectionStylesDataUri = (() => {
      const styles = Array.from(this.htmlInjectionStyles.entries())
        .map(([selector, kvs]) => {
          const declarations = kvs.map(([key, value]) => `${key}: ${value};`).join(' ');
          return `${selector} { ${declarations} }`;
        })
        .join(' ');
      return getStyleSheetDataUri(styles);
    })();

    const themeCssDataUri = vsc.workspace.isTrusted && this.theme.fileUri && /\.css$/i.test(this.theme.fileUri.path) ? resolveResourceUri(this.theme.fileUri) : getStyleSheetDataUri(await this.theme.load());

    const bodyCustomDataAttrs = (() => {
      const map = new Map();
      map.set('data-forma-theme-name', this.theme.themeName);
      return Array.from(map.entries())
        .map(([key, value]) => `${key}="${this.xMarkdownInstance.utils.escapeHtml(value)}"`)
        .join(' ');
    })();

    const bodyClassList = (() => {
      const classArr = [];
      if (this.theme.usePrintTheme) classArr.push('forma-preview-pages');
      return classArr.join(' ');
    })();

    const htmlInjectionScriptsDataUri = (() => {
      const scripts = Array.from(this.htmlInjectionScripts).join(' ');
      return getScriptDataUri(scripts);
    })();

    const fillHtmlTemplateArgs = {
      body: this.rawHTMLText,
      base: baseHref,
      csp: cspSourceText,
      vars: htmlStyleVariablesDataUri,
      theme: themeCssDataUri,
      classList: bodyClassList,
      attrs: bodyCustomDataAttrs,
      customCss: htmlInjectionStylesDataUri,
      scripts: htmlInjectionScriptsDataUri,
    };

    this.rawHTMLText = fillHtmlTemplate(fillHtmlTemplateArgs);

    if (this.theme.usePrintTheme) {
      try {
        const bodyContent = await this.buildPaginatedHTML();
        this.rawHTMLText = fillHtmlTemplate({ ...fillHtmlTemplateArgs, body: bodyContent });
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
 * Converts JavaScript content to a data URI.
 * @param {string} content - The JavaScript content.
 * @returns {string} - The data URI.
 */
function getScriptDataUri(content) {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(content)}`;
}

/**
 * Fills an HTML template with the provided data.
 * @param {Object} param - The data to fill the template with.
 * @param {string} param.body - The HTML content.
 * @param {string} param.base - The base href.
 * @param {string} param.csp - The Content Security Policy.
 * @param {string} param.vars - The data URI for the CSS variables.
 * @param {string} param.theme - The data URI for the theme CSS.
 * @param {string} param.classList - The class list to insert into the body of the template.
 * @param {string} param.attrs - The custom data attributes to insert into the body of the template.
 * @param {string} param.customCss - The data URI for the custom CSS.
 * @param {string} param.scripts - The data URI for the HTML injection scripts.
 * @returns {string} - The filled HTML template.
 */
function fillHtmlTemplate({ body, base, csp, vars, theme, customCss, classList, attrs, scripts }) {
  const template = htmlBuilderTemplates.find((template) => template.name === 'template.skeleton.html')?.content ?? '';
  return template
    .replace('___BASE_HREF___', xMarkdownInstance.utils.escapeHtml(base))
    .replace('___CSP___', xMarkdownInstance.utils.escapeHtml(csp))
    .replace('___CSS_VARIABLES_DATA_URI___', xMarkdownInstance.utils.escapeHtml(vars))
    .replace('___THEME_CSS_DATA_URI___', xMarkdownInstance.utils.escapeHtml(theme))
    .replace('___CUSTOM_CSS_DATA_URI___', xMarkdownInstance.utils.escapeHtml(customCss))
    .replace('___BODY_CLASS___', classList)
    .replace('___BODY_CUSTOM_DATA_ATTRS___', attrs)
    .replace('___INJECTION_SCRIPTS___', scripts)
    .replace('___RAW_HTML___', body);
}
