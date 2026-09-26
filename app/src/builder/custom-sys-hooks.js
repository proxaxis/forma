import { locale } from '@/assets/constants.js';
import { randomUUID as getRandomUUID } from 'node:crypto';

/**
 * @typedef {object} CustomParserModule
 * @property {function?} handleMarkdown - A function to handle Markdown content.
 * @property {function?} handleHTML - A function to handle HTML content.
 * @property {function?} handleHeaderHTML - A function to handle header HTML content.
 * @property {function?} handleFooterHTML - A function to handle footer HTML content.
 *
 * @typedef {import('@/builder/builder.js').Builder} Builder
 * @typedef {import('@/builder/frontmatter.types.js').HeaderFooterDirective} HeaderFooterDirective
 * @typedef {import('@/builder/frontmatter.types.js').CustomHeaderFooterDirective} CustomHeaderFooterDirective
 */

/**
 * Runs the system's custom Markdown handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<void>} - Processes the parsed Markdown tokens.
 */
export async function runSystemHandleMarkdown(builder) {
  const tokens = await builder.buildTokens();

  const tocRegex = /<!--\s*TOC(?:\s*\[\s*(\d+)(?:\s*,\s*(\d+))?\s*\])?\s*-->/;
  const ignoreRegex = /<!--\s*IGNORE-TOC\s*-->/;
  const ignoreNumberingRegex = /<!--\s*IGNORE-NUM\s*-->/;
  const aliasRegex = /<!--\s*ID\[\s*([a-zA-Z0-9_\-]+)\s*\]\s*-->/;
  const pageBreakRegex = /^---/;
  const numberingValue = builder.frontmatter.numbering;
  const numberingMatch = String(numberingValue ?? '')
    .trim()
    .match(/^(\d+)(?:-(\d+))?$/);
  const numberingConfig = numberingMatch ? { min: Number(numberingMatch[1]), max: Number(numberingMatch[2] ?? numberingMatch[1]) } : null;

  const headlineIdAliasMap = new Map();
  const headlines = [];
  let pendingAlias = null;
  let pendingIgnore = false;
  let pendingIgnoreNumbering = false;
  const numberingCounters = Array(7).fill(0);
  let tocToken = null;
  let tocConfig = null;

  // --- 1. トークン走査とメタデータ収集・ID注入 ---
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // コードブロック内の Markdown は評価しない。
    if (token.type === 'fence' || token.type === 'code_block') {
      continue;
    }

    // Markdown-it parses a standalone `---` as an hr token rather than an HTML block.
    if (token.type === 'hr' && token.markup === '---') {
      token.type = 'html_block';
      token.content = '<div style="page-break-after: always; break-after: page;"></div>';
      continue;
    }

    // HTML コメントの判定
    if (token.type === 'html_block' || token.type === 'html_inline') {
      // 1-0. 改ページコメントの検出
      if (pageBreakRegex.test(token.content)) {
        token.content = '<div style="page-break-after: always; break-after: page;"></div>';
        continue;
      }

      // 1-1. TOC コメントの検出
      const tocMatch = token.content.match(tocRegex);
      if (tocMatch && !tocConfig) {
        tocToken = token;
        const rawX = tocMatch[1] !== undefined ? Number(tocMatch[1]) : undefined;
        const rawY = tocMatch[2] !== undefined ? Number(tocMatch[2]) : undefined;

        if (rawX === undefined) {
          tocConfig = { min: 1, max: 6 };
        } else if (rawY === undefined) {
          tocConfig = { min: 1, max: rawX };
        } else {
          tocConfig = { min: rawX, max: rawY };
        }
        continue;
      }

      // 1-2. 直前の除外コメントの検出
      if (ignoreRegex.test(token.content)) {
        pendingIgnore = true;
      }

      if (ignoreNumberingRegex.test(token.content)) {
        pendingIgnoreNumbering = true;
      }

      if (ignoreRegex.test(token.content) || ignoreNumberingRegex.test(token.content)) {
        continue;
      }

      // 1-3. 直前の <!-- ID[alias] --> 検出
      const aliasMatch = token.content.match(aliasRegex);
      if (aliasMatch) {
        pendingAlias = aliasMatch[1];
        continue;
      }
    }

    // 2. 見出しの処理 (heading_open)
    if (token.type === 'heading_open') {
      const level = Number(token.tag.replace('h', ''));
      const inlineToken = tokens[i + 1];
      const originalText = inlineToken ? inlineToken.content : '';
      let text = originalText;
      const uuid = getRandomUUID().replaceAll('-', '');

      if (numberingConfig && level < numberingConfig.min) {
        for (let counterLevel = numberingConfig.min; counterLevel < numberingCounters.length; counterLevel++) {
          numberingCounters[counterLevel] = 0;
        }
      }

      if (numberingConfig && !pendingIgnore && !pendingIgnoreNumbering && level >= numberingConfig.min && level <= numberingConfig.max) {
        for (let counterLevel = numberingConfig.min; counterLevel < level; counterLevel++) {
          if (numberingCounters[counterLevel] === 0) {
            numberingCounters[counterLevel] = 1;
          }
        }

        numberingCounters[level] += 1;
        for (let counterLevel = level + 1; counterLevel < numberingCounters.length; counterLevel++) {
          numberingCounters[counterLevel] = 0;
        }

        const numbering = numberingCounters.slice(numberingConfig.min, level + 1).join('.');
        text = `${numbering}. ${originalText}`;
        inlineToken.content = text;
        /** @type {import('markdown-it').Token} */
        const numberingToken = Object.create(Object.getPrototypeOf(inlineToken));
        Object.assign(numberingToken, {
          type: 'text',
          tag: '',
          attrs: null,
          map: null,
          nesting: 0,
          level: inlineToken.level,
          children: null,
          content: `${numbering}. `,
          markup: '',
          info: '',
          meta: null,
          block: false,
          hidden: false,
        });
        inlineToken.children ??= [];
        inlineToken.children.unshift(numberingToken);
      }

      // 見出し要素に id 属性 (UUID) を付与
      token.attrSet('id', uuid);

      // 見出しテキストを自動エイリアスとして登録
      headlineIdAliasMap.set(builder.asHtmlSafeString(originalText), uuid);

      // 明示的なエイリアスを登録
      if (pendingAlias) {
        headlineIdAliasMap.set(pendingAlias, uuid);
      }

      // IGNORE 指定がなければ目次用リストに含める
      if (!pendingIgnore) {
        headlines.push({ level, text, uuid, alias: pendingAlias });
      }

      // フラグを初期化
      pendingAlias = null;
      pendingIgnore = false;
      pendingIgnoreNumbering = false;
    }
  }

  // --- 2. TOC コメントトークンを目次HTMLに置き換え ---
  if (tocToken && tocConfig) {
    const targetHeadings = headlines.filter((h) => h.level >= tocConfig.min && h.level <= tocConfig.max);

    if (targetHeadings.length === 0) {
      tocToken.content = '';
      return;
    }

    let html = '<ul class="toc">\n';
    let currentLevel = targetHeadings[0].level;

    targetHeadings.forEach((h, index) => {
      if (index > 0) {
        if (h.level > currentLevel) {
          html += '<ul>\n'.repeat(h.level - currentLevel);
        } else if (h.level < currentLevel) {
          html += '</li>\n' + '</ul>\n</li>\n'.repeat(currentLevel - h.level);
        } else {
          html += '</li>\n';
        }
      }
      // アンカー先は常に UUID
      html += `  <li><a href="#${h.uuid}">${h.text}</a>`;
      currentLevel = h.level;
    });

    html += '</li>\n' + '</ul>\n</li>\n'.repeat(currentLevel - targetHeadings[0].level);
    html += '</ul>';
    tocToken.content = html + '\n';
  }

  // --- 3. 内部リンクのエイリアス解決用マップをトークンへ反映 ---
  tokens.forEach((token) => {
    if (token.type !== 'inline' || !token.children) return;

    token.children.forEach((child) => {
      if (child.type !== 'link_open') return;
      const href = child.attrGet('href');
      const targetId = typeof href === 'string' ? href.match(/^#(.+)$/)?.[1] : undefined;
      const resolvedId = targetId ? headlineIdAliasMap.get(targetId) : undefined;
      if (resolvedId) child.attrSet('href', `#${resolvedId}`);
    });
  });
}

/**
 * Runs the system's custom HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed HTML content.
 */
export async function runSystemHandleHTML(builder) {
  return builder.rawHTMLText;
}

/**
 * Runs the system's custom header HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed header HTML content.
 */
export async function runSystemHandleHeaderHTML(builder) {
  return buildHeaderFooterHTML({ builder, isHeader: true });
}

/**
 * Runs the system's custom footer HTML handler.
 * @param {Builder} builder - The builder instance.
 * @returns {Promise<string>} - The processed footer HTML content.
 */
export async function runSystemHandleFooterHTML(builder) {
  return buildHeaderFooterHTML({ builder, isFooter: true });
}

/**
 * Builds the header or footer HTML for PDF and Print View.
 * @param {object} options - This function is used to build the header and footer HTML for PDF and Print View.
 * @param {Builder} options.builder - The builder instance.
 * @param {boolean} [options.isHeader=false] - Whether to build the header HTML.
 * @param {boolean} [options.isFooter=false] - Whether to build the footer HTML.
 * @returns {Promise<string>} - The processed header or footer HTML content.
 */
async function buildHeaderFooterHTML({ builder, isHeader = false, isFooter = false }) {
  const config = await builder.buildConfig();
  const defaults = isHeader ? ['title', 'date'] : ['', '', 'page'];
  const type = isHeader ? 'header' : 'footer';

  const directives = (() => {
    /** @type {HeaderFooterDirective|undefined} */
    const raw = isHeader ? builder.frontmatter.header : builder.frontmatter.footer;

    /** @type {CustomHeaderFooterDirective[]} */
    let items = [];
    if (typeof raw === 'string') items = [{ item: raw.trim(), style: undefined }];
    else if (!raw || (typeof raw === 'object' && !Array.isArray(raw))) items = defaults.map((item) => ({ item, style: undefined }));
    else if (Array.isArray(raw)) items = raw.map((val) => typeof val === 'string' ? { item: val.trim(), style: undefined } : val);

    return items.filter((_, i) => i < 3);
  })();

  /** @type {string} */
  const injectionStyleText = directives
    .map((d, i) => d.style ? `.forma-document-${type} span[data-forma-document-${type}-item-index="${i}"] { ${d.style}; }` : undefined)
    .filter(Boolean)
    .join(' ');

  const elements = [];
  for (let i = 0; i < directives.length; i++) {
    const itemName = (directives[i].item ?? directives[i].value ?? '').trim();
    switch (itemName.toLowerCase()) {
      case 'title':
        const tokens = await builder.buildTokens();
        const headlineIndex = tokens.findIndex((token) => token.type === 'heading_open' && token.tag === 'h1');

        if (headlineIndex > -1 && tokens[headlineIndex + 1]?.content) {
          elements.push(`<span data-forma-document-header-item="title" data-forma-document-header-item-index="${i}">${tokens[headlineIndex + 1].content}</span>`);
          break;
        }

        elements.push(`<span data-forma-document-header-item="no-title" data-forma-document-header-item-index="${i}">No Title Document</span>`);
        break;

      case 'date':
        const dateText = new Date().toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '-');
        elements.push(`<span data-forma-document-header-item="date" data-forma-document-header-item-index="${i}">${dateText}</span>`);
        break;

      case 'page':
        elements.push(`<span class="pageNumber" data-forma-document-header-item="page" data-forma-document-header-item-index="${i}"></span>`);
        break;

      default:
        elements.push(`<span data-forma-document-header-item="custom" data-forma-document-header-item-index="${i}">${itemName}</span>`);
    }
  }

  return (isHeader ? builder.rawHeaderHTMLText : builder.rawFooterHTMLText)
    .replace('___NONCE___', builder.nonce)
    .replace('___STYLE_FONT_SIZE___', (await config.browser.loadConfig())?.defaultHeaderFooterFont?.size ?? '12px')
    .replace('___STYLE_FONT_COLOR___', (await config.browser.loadConfig())?.defaultHeaderFooterFont?.color ?? '#555')
    .replace('___STYLE_MARGIN_LEFT___', (await config.browser.loadConfig())?.margin?.left ?? '0px')
    .replace('___STYLE_MARGIN_RIGHT___', (await config.browser.loadConfig())?.margin?.right ?? '0px')
    .replace('___STYLE_INJECTION___', String(injectionStyleText).replace(/<\/style/gi, '<\\/style'))
    .replace('___CONTENT___', elements.join(''));
}
