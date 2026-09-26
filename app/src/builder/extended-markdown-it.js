import MarkdownIt from 'markdown-it'; // See https://markdown-it.github.io/markdown-it/
import xContainer from 'markdown-it-container';
import xCustomBlock from 'markdown-it-custom-block';
import xFootnote from 'markdown-it-footnote';
import xImsize from 'markdown-it-imsize';
import xLinkAttributes from 'markdown-it-link-attributes';
import xTaskLists from 'markdown-it-task-lists';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';

loadLanguages([
  // Webフロント / スクリプト
  'typescript',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell-session',

  // バックエンド / システム言語
  'python',
  'php',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'kotlin',
  'swift',

  // データベース・設定ファイル
  'sql',
  'graphql',
  'docker',
  'ini',
  'toml',
]);

/**
 * Resolves a module to its default export if it exists, otherwise returns the module itself.
 * @param {*} plugin - The plugin to resolve.
 * @returns {*} - The resolved plugin.
 */
const xModuleResolver = (plugin) => (plugin && plugin.default ? plugin.default : plugin);

/**
 * @callback ResolveImageUri
 * @param {string | null} source
 * @returns {string | null}
 */

export class ExtendedMarkdownIt extends MarkdownIt {
  /** @type {ResolveImageUri} */
  resolveImageUri = () => null;

  constructor() {
    super({
      /** @type {boolean} Enable HTML tags in source. */
      html: true,
      /** @type {boolean} Use '/' to close single tags (<br />). */
      xhtmlOut: true,
      /** @type {boolean} Convert '\n' in paragraphs into <br>. */
      breaks: true,
      /** @type {boolean} Autoconvert URL-like text to links. */
      linkify: true,
      /**
       * Highlights code with the specified language.
       * @param {string} text - The code to highlight.
       * @param {string} language - The language to use for highlighting.
       * @returns {string} The highlighted code.
       */
      highlight: (text, language) => {
        if (language && Prism.languages[language]) {
          return Prism.highlight(text, Prism.languages[language], language);
        }
        return '';
      },
    });

    this.attachNormalizeLinkFunctions();
    this.importMarkdownItPlugins();
    this.renderer.rules.image = (tokens, index, options, env, self) => {
      const token = tokens[index];
      const sourceAttribute = token.attrGet('src');
      const resolvedSource = this.resolveImageUri?.(typeof sourceAttribute === 'string' ? sourceAttribute : null);
      if (resolvedSource) token.attrSet('src', resolvedSource);
      token.attrSet('alt', self.renderInlineAsText(token.children ?? [], options, env));
      return self.renderToken(tokens, index, options);
    };
    this.renderer.rules.fence = (tokens, index) => {
      const token = tokens[index];
      const language = token.info.trim().split(/\s+/)[0] ?? '';

      const highlighted = language && Prism.languages[language] ? Prism.highlight(token.content, Prism.languages[language], language) : this.utils.escapeHtml(token.content);

      const languageClass = language ? ` class="language-${this.utils.escapeHtml(language)}"` : '';

      return `<pre${languageClass}><code${languageClass}>${highlighted.trim()}</code></pre>\n`;
    };
  }

  attachNormalizeLinkFunctions() {
    // Function used to encode link url to a machine-readable format, which includes url-encoding, punycode, etc.
    this.normalizeLink = /** @param {string} url */ (url) => url;
    // Function used to decode link url to a human-readable format.
    this.normalizeLinkText = /** @param {string} url */ (url) => url;
  }

  importMarkdownItPlugins() {
    this.use(xModuleResolver(xImsize))
      .use(xModuleResolver(xCustomBlock))
      .use(xModuleResolver(xContainer), {
        /**
         * Validates the parameters for the container.
         * @param {string} params
         * @returns {boolean} True if the parameters are valid, false otherwise.
         */
        validate: (params) => {
          return !!params.trim().match(/^[\w-]+$/);
        },
        /**
         * Conposes the opening and closing HTML tags for the container.
         * @param {import('markdown-it').Token[]} tokens
         * @param {number} idx
         * @returns {string} The HTML for the container.
         */
        render: (tokens, idx) => {
          const match = tokens[idx].info.trim().match(/^([\w-]+)$/);
          if (!match) {
            return '';
          }
          const className = encodeURIComponent(match[1]);

          if (tokens[idx].nesting === 1) {
            return `<div class="${className}">\n`;
          } else {
            return '</div>\n';
          }
        },
      })
      .use(xModuleResolver(xFootnote))
      .use(xModuleResolver(xTaskLists))
      .use(xModuleResolver(xLinkAttributes), { attrs: { target: '_blank', rel: 'noopener' } });
  }
}
