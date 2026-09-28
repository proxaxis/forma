import vsc from 'vscode';
import sass from 'sass';
import { wsConfigTemplates } from '@/assets/constants.js';
import { BaseConfiguration } from '@/builder/configuration-base.js';

export class ThemeConfiguration extends BaseConfiguration {
  /** @type {vsc.Uri|undefined} */
  fileUri;

  /**
   * @param {vsc.Uri} vscDocumentUri - The URI of the target document.
   * @param {string} [themeName] - The theme name specified in the frontmatter.
   */
  constructor(vscDocumentUri, themeName) {
    super(vscDocumentUri, 'theme');

    this.usePrintTheme = false;
    this.themeName = themeName ?? this.entry ?? 'none';
    this.fileUri = undefined;

    if (themeName === 'print') {
      this.usePrintTheme = true;
      this.fileUri = this.getWorkspaceEntryUri('print.scss');
    } else {
      this.fileUri = this.getPresetUri(themeName) || this.getWorkspaceEntryUri();
    }
  }

  /**
   * Returns the loaded stylesheet content, compiling SCSS to CSS if necessary.
   * If no URI is found, it falls back to the initial template (@/assets/ws.default.scss).
   * @returns {Promise<string>} The loaded stylesheet content, either as CSS or the original content if not SCSS.
   */
  async load() {
    if (this.cache.has('stylesheet')) {
      return this.cache.get('stylesheet');
    }
    
    const fallbackTemplate = this.usePrintTheme ? wsConfigTemplates.getByName('ws.print.scss') : wsConfigTemplates.getByName('ws.default.scss');
    return this.loadStylesheet(this.fileUri, fallbackTemplate?.content ?? '');
  }

  /**
   * Returns the stylesheet used exclusively while exporting a PDF.
   * @returns {Promise<string>} The compiled export stylesheet.
   */
  async loadExport() {
    const exportFileUri = this.getWorkspaceEntryUri('export.scss');
    const fallbackTemplate = wsConfigTemplates.getByName('ws.export.scss');
    return this.loadStylesheet(exportFileUri, fallbackTemplate?.content ?? '');
  }

  /**
   * Loads and compiles a stylesheet from a URI or fallback content.
   * @param {vsc.Uri|undefined} fileUri - The stylesheet URI.
   * @param {string} fallbackContent - Content used when the URI is unavailable.
   * @returns {Promise<string>} The loaded stylesheet content.
   */
  async loadStylesheet(fileUri, fallbackContent) {
    /** @type {string} */
    let content;
    /** @type {boolean} */
    let isScss = true;
    /** @type {sass.Syntax} - ('scss' | 'indented' | 'css') */
    let syntax = 'scss';
    /** @type {URL|undefined} */
    let fileUrl;

    // Load the content from the specified file URI if available
    if (fileUri && vsc.workspace.isTrusted) {
      const fileBuffer = await vsc.workspace.fs.readFile(fileUri);
      content = new TextDecoder().decode(fileBuffer);
      isScss = /\.(scss|sass)$/i.test(fileUri.path);
      syntax = fileUri.path.endsWith('.sass') ? 'indented' : 'scss';
      fileUrl = fileUri.fsPath ? new URL(`file://${fileUri.fsPath}`) : undefined;
    }
    // Fallback to the initial template if no URI is found
    else {
      content = fallbackContent;
    }

    if (!isScss) return content;

    const compileResult = sass.compileString(content, {
      syntax,
      url: fileUrl,
      loadPaths: this.vscWorkspaceRootUri?.fsPath ? [this.vscWorkspaceRootUri.fsPath] : [],
    });

    return compileResult.css;
  }
}
