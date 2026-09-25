import vsc from 'vscode';
import { Builder } from '@/builder/builder.js';

export class AppPreviewPanel {
  /** @type {AppPreviewPanel | null} */
  static current;

  /**
   * Show the preview panel for the currently active Markdown document.
   * @param {vsc.ExtensionContext} context - The extension context provided by VS Code
   * @returns {Promise<void>} - A promise that resolves when the preview panel is shown or updated
   */
  static async show(context) {
    const vscTextEditor = vsc.window.activeTextEditor;

    if (!vscTextEditor || vscTextEditor.document.languageId !== 'markdown') {
      void vsc.window.showWarningMessage('Open a Markdown document to preview it.');
      return;
    }

    if (AppPreviewPanel.current) {
      AppPreviewPanel.current.vscWebviewPanel.reveal(vsc.ViewColumn.Two);
      await AppPreviewPanel.current.update(vscTextEditor.document);
      return;
    }

    const normalizedPath = vscTextEditor.document.uri.fsPath.replace(/\\/g, '/');
    const lastSeparatorIndex = Math.max(normalizedPath.lastIndexOf('/'), normalizedPath.lastIndexOf('\\'));
    const resourceRootFsPath = lastSeparatorIndex >= 0 ? normalizedPath.slice(0, lastSeparatorIndex) : vscTextEditor.document.uri.fsPath;
    const resourceRootUri = resourceRootFsPath ? vsc.Uri.file(resourceRootFsPath) : undefined;

    const localResourceRoots = [];

    // 開いているドキュメントの親ディレクトリを追加
    localResourceRoots.push(vsc.Uri.joinPath(vscTextEditor.document.uri, '..'));

    // 開いているワークスペースディレクトリの URI を追加
    if (vsc.workspace.workspaceFolders) {
      for (const folder of vsc.workspace.workspaceFolders) {
        localResourceRoots.push(folder.uri);
      }
    }

    // 拡張機能自体のルートディレクトリ
    localResourceRoots.push(context.extensionUri);

    const vscWebviewPanel = vsc.window.createWebviewPanel(
      'forma.preview',
      'Forma Preview',
      vsc.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: localResourceRoots,
      }
    );

    AppPreviewPanel.current = new AppPreviewPanel(vscWebviewPanel, vscTextEditor.document);
    vscWebviewPanel.onDidDispose(
      () => {
        AppPreviewPanel.current = null;
      },
      null,
      context.subscriptions,
    );
    context.subscriptions.push(
      vsc.workspace.onDidChangeTextDocument(async (evt) => {
        if (AppPreviewPanel.current && evt.document.uri.toString() === AppPreviewPanel.current.vscTextDocument.uri.toString()) {
          await AppPreviewPanel.current.update(evt.document);
        }
      }),
    );
    await AppPreviewPanel.current.update(vscTextEditor.document);
  }

  /**
   * @param {vsc.WebviewPanel} panel - The webview panel for the preview
   * @param {vsc.TextDocument} document - The text document to preview
   */
  constructor(panel, document) {
    this.vscWebviewPanel = panel;
    this.vscTextDocument = document;
  }

  /**
   * Update the preview panel with the rendered content of the given document.
   * @param {vsc.TextDocument} document - The text document to update the preview with
   */
  async update(document) {
    this.vscTextDocument = document;
    try {
      this.vscWebviewPanel.webview.html = await new Builder(document).buildBodyHTML(this.vscWebviewPanel.webview.cspSource);
    } catch (error) {
      this.vscWebviewPanel.webview.html = `<pre>Forma preview error: ${String(error)}</pre>`;
    }
  }
}
