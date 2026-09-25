import wsDefaultScss from '@/assets/ws.default.scss?raw';
import wsPrintScss from '@/assets/ws.print.scss?raw';
import wsParserJs from '@/assets/ws.parser.js?raw';
import wsPuppeteerJson from '@/assets/ws.puppeteer.json?raw';
import templateSkeletonHtml from '@/assets/template.skeleton.html?raw';
import templateHeaderHtml from '@/assets/template.header.html?raw';
import templateFooterHtml from '@/assets/template.footer.html?raw';

export const wsConfigDirectoryName = '.forma';

export const locale = 'ja-JP';

export const headerHTMLStyle = [
  ['width', '100%'],
  ['font-size', '10px'],
  ['display', 'flex'],
  ['justify-content', 'space-between'],
  ['color', '#555'],
  /* Margin option will be added here from config */
];

export const footerHTMLStyle = [
  ['width', '100%'],
  ['font-size', '10px'],
  ['display', 'flex'],
  ['justify-content', 'space-between'],
  ['color', '#555'],
  /* Margin option will be added here from config */
];

/**
 * @typedef {Object} WorkspaceConfigTemplates
 * @property {string} content - The content of the template.
 * @property {string} name - The name of the template file.
 * @property {string} to - The target filename for the template.
 */
export const wsConfigTemplates = {
  /** @type {WorkspaceConfigTemplates[]} */
  list: [
    { content: wsDefaultScss, name: 'ws.default.scss', to: 'default.scss' },
    { content: wsPrintScss, name: 'ws.print.scss', to: 'print.scss' },
    { content: wsParserJs, name: 'ws.parser.js', to: 'parser.js' },
    { content: wsPuppeteerJson, name: 'ws.puppeteer.json', to: 'puppeteer.json' },
  ],
  /**
   * Returns the template with the specified name.
   * @param {string} name - The name of the template to find.
   * @returns {WorkspaceConfigTemplates}
   */
  getByName(name) {
    const target = this.list.find((tpl) => tpl.name === name);
    if (!target) throw new Error(`Template not found: ${name}`);
    return target;
  },
};

/**
 * @typedef {Object} HtmlBuilderTemplates
 * @property {string} content - The content of the template.
 * @property {string} name - The name of the template file.
 */
/** @type {HtmlBuilderTemplates[]} */
export const htmlBuilderTemplates = [
  { content: templateSkeletonHtml, name: 'template.skeleton.html' },
  { content: templateHeaderHtml, name: 'template.header.html' },
  { content: templateFooterHtml, name: 'template.footer.html' },
];
