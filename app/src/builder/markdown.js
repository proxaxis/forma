import MarkdownIt from 'markdown-it';
import xContainer from 'markdown-it-container';
import xCustomBlock from 'markdown-it-custom-block';
import xFootnote from 'markdown-it-footnote';
import xImsize from 'markdown-it-imsize';
import xLinkAttributes from 'markdown-it-link-attributes';
import xTaskLists from 'markdown-it-task-lists';
import Prism from 'prismjs';

/**
 * Resolves a module to its default export if it exists, otherwise returns the module itself.
 * @param {*} plugin - The plugin to resolve.
 * @returns The resolved plugin.
 */
const xModuleResolver = (plugin) => (plugin && plugin.default ? plugin.default : plugin);

/**
 * Highlights code with the specified language.
 * @param {string} code - The code to highlight.
 * @param {string} language - The language to use for highlighting.
 * @returns {string} The highlighted code.
 */
function highlight(code, language) {
  if (language && Prism.languages[language]) {
    return `<pre class="language-${language}"><code>${Prism.highlight(code, Prism.languages[language], language)}</code></pre>`;
  }
  return '';
}

/**
 * Handlers for the custom container.
 * @returns {Object} The handlers for the custom container.
 */
function xContainerHandlers() {
  return {
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
  };
}

export class Markdown extends MarkdownIt {
  constructor() {
    super({
      html: true,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      highlight,
    });

    this.normalizeLink = (url) => url;
    this.normalizeLinkText = (url) => url;

    this.importMarkdownItPlugins();
  }

  importMarkdownItPlugins() {
    this.use(xModuleResolver(xImsize))
      .use(xModuleResolver(xCustomBlock))
      .use(xModuleResolver(xContainer), xContainerHandlers())
      .use(xModuleResolver(xFootnote))
      .use(xModuleResolver(xTaskLists))
      .use(xModuleResolver(xLinkAttributes), { attrs: { target: '_blank', rel: 'noopener' } });
  }
}
