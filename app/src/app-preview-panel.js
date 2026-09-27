import vsc from 'vscode';
import { wsConfigDirectoryName } from '@/assets/constants.js';
import { Builder } from '@/builder/builder.js';

export class AppPreviewPanel {
  /** @type {AppPreviewPanel | null} */
  static current;
  /** @type {vsc.TextDocument} */
  vscTextDocument;
  /** @type {vsc.Disposable[]} */
  panelDisposables;

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

    const localResourceRoots = [];

    // Allow resources next to the open document.
    localResourceRoots.push(vsc.Uri.joinPath(vscTextEditor.document.uri, '..'));

    // Allow resources from open workspace folders.
    if (vsc.workspace.workspaceFolders) {
      for (const folder of vsc.workspace.workspaceFolders) {
        localResourceRoots.push(folder.uri);
      }
    }

    // Allow bundled assets from the extension directory.
    localResourceRoots.push(context.extensionUri);

    const vscWebviewPanel = vsc.window.createWebviewPanel('forma.preview', 'Forma Preview', vsc.ViewColumn.Two, {
      enableScripts: true,
      localResourceRoots: localResourceRoots,
    });

    AppPreviewPanel.current = new AppPreviewPanel(vscWebviewPanel, vscTextEditor.document);
    vscWebviewPanel.onDidDispose(
      () => {
        for (const disposable of AppPreviewPanel.current?.panelDisposables ?? []) disposable.dispose();
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

    for (const workspaceFolder of vsc.workspace.workspaceFolders ?? []) {
      const stylesheetWatcher = vsc.workspace.createFileSystemWatcher(new vsc.RelativePattern(workspaceFolder, `${wsConfigDirectoryName}/*.{css,scss,sass}`));
      const refreshPreview = async (/** @type {vsc.Uri} */ uri) => {
        const currentPanel = AppPreviewPanel.current;
        if (!currentPanel) return;

        const changedWorkspaceFolder = vsc.workspace.getWorkspaceFolder(uri);
        const documentUri = currentPanel.vscTextDocument.uri;
        const documentWorkspaceFolder = vsc.workspace.getWorkspaceFolder(documentUri);
        if (changedWorkspaceFolder?.uri.toString() === documentWorkspaceFolder?.uri.toString()) {
          await currentPanel.update(currentPanel.vscTextDocument);
        }
      };

      AppPreviewPanel.current.panelDisposables.push(stylesheetWatcher, stylesheetWatcher.onDidChange(refreshPreview), stylesheetWatcher.onDidCreate(refreshPreview), stylesheetWatcher.onDidDelete(refreshPreview));
    }

    await AppPreviewPanel.current.update(vscTextEditor.document);
  }

  /**
   * @param {vsc.WebviewPanel} panel - The webview panel for the preview
   * @param {vsc.TextDocument} document - The text document to preview
   */
  constructor(panel, document) {
    this.vscWebviewPanel = panel;
    this.vscTextDocument = document;
    this.panelDisposables = [];
  }

  /**
   * Update the preview panel with the rendered content of the given document.
   * @param {vsc.TextDocument} document - The text document to update the preview with
   */
  async update(document) {
    this.vscTextDocument = document;
    try {
      const { webview } = this.vscWebviewPanel;
      this.vscWebviewPanel.webview.html = await new Builder(document).buildBodyHTML({ csp: webview.cspSource, resolveResourceUri: (vscUri) => webview.asWebviewUri(vscUri).toString() });
    } catch (error) {
      this.vscWebviewPanel.webview.html = `<pre>Forma preview error: ${String(error)}</pre>`;
    }
  }
}
