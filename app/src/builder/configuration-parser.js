import { wsConfigTemplates } from '@/assets/constants.js';
import { BaseConfiguration } from '@/builder/configuration-base.js';

export class ParserConfiguration extends BaseConfiguration {
  /** @type {import('vscode').Uri|undefined} */
  fileUri;

  /**
   * @param {import('vscode').Uri} vscDocumentUri - The URI of the target document.
   * @param {string} [parserName] - The parser name specified in the frontmatter.
   */
  constructor(vscDocumentUri, parserName) {
    super(vscDocumentUri, 'parser');

    this.fileUri =
      this.getPresetUri(parserName) ||
      this.getWorkspaceEntryUri() ||
      this.getPresetUri(this.libraries[0]?.name);
  }

  /**
   * Returns the parsed parser configuration object.
   * If no URI is found, it falls back to the initial template (@/assets/ws.parser.js).
   * @returns {Promise<any>}
   */
  async load() {
    if (this.cache.has('parserModule')) {
      return this.cache.get('parserModule');
    }
    
    let moduleUrl;

    // Load the parser configuration from the specified file URI if available
    if (this.fileUri) {
      moduleUrl = this.fileUri.toString();
    }
    // Fallback to the initial template if no URI is found
    else {
      const template = wsConfigTemplates.getByName('ws.parser.js');
      moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(template.content)}`;
    }

    const importedModule = await import(moduleUrl);
    const module = importedModule.default ?? importedModule;
    this.cache.set('parserModule', module);
    return module;
  }
}
