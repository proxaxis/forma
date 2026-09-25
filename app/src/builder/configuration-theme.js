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
    this.fileUri = undefined;

    if (themeName === 'print') {
      this.usePrintTheme = true;
      this.fileUri = this.getWorkspaceEntryUri('print.scss');
    }
    else {
      this.fileUri = this.getPresetUri(themeName) || this.getWorkspaceEntryUri();
    }
  }

  /**
   * Returns the loaded stylesheet content, compiling SCSS to CSS if necessary.
   * If no URI is found, it falls back to the initial template (@/assets/ws.default.scss).
   * @returns {Promise<string>} The loaded stylesheet content, either as CSS or the original content if not SCSS.
   */
  async load() {
    /** @type {string} */
    let content;
    /** @type {boolean} */
    let isScss = true;
    /** @type {sass.Syntax} - ('scss' | 'indented' | 'css') */
    let syntax = 'scss';
    /** @type {URL|undefined} */
    let fileUrl;

    // Load the content from the specified file URI if available
    if (this.fileUri) {
      const fileBuffer = await vsc.workspace.fs.readFile(this.fileUri);
      content = new TextDecoder().decode(fileBuffer);
      isScss = /\.(scss|sass)$/i.test(this.fileUri.path);
      syntax = this.fileUri.path.endsWith('.sass') ? 'indented' : 'scss';
      fileUrl = this.fileUri.fsPath ? new URL(`file://${this.fileUri.fsPath}`) : undefined;
    }
    // Fallback to the initial template if no URI is found
    else {
      const fallbackTemplate = this.usePrintTheme ? wsConfigTemplates.getByName('ws.print.scss') : wsConfigTemplates.getByName('ws.default.scss');
      content = fallbackTemplate?.content ?? '';
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
