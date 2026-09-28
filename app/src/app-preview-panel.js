import vsc from 'vscode';
import { wsConfigDirectoryName } from '@/assets/constants.js';
import { Builder } from '@/builder/builder.js';

export class AppPreviewPanel {
  /** @type {AppPreviewPanel | null} */
  static current;
  static previewUpdateDelay = 150;
  static previewZoomMin = 0.5;
  static previewZoomMax = 2;
  static previewZoomStep = 0.1;
  static previewZoomStateKey = 'forma.preview.zoom';
  /** @type {vsc.TextDocument} */
  vscTextDocument;
  /** @type {vsc.Disposable[]} */
  panelDisposables;
  /** @type {NodeJS.Timeout | undefined} */
  previewUpdateTimer;
  /** @type {number} */
  previewUpdateVersion = 0;
  /** @type {number} */
  previewZoom = 1;
  /** @type {vsc.ExtensionContext} */
  extensionContext;

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

    AppPreviewPanel.current = new AppPreviewPanel(vscWebviewPanel, vscTextEditor.document, context);
    vscWebviewPanel.onDidDispose(
      () => {
        if (AppPreviewPanel.current?.previewUpdateTimer) clearTimeout(AppPreviewPanel.current.previewUpdateTimer);
        for (const disposable of AppPreviewPanel.current?.panelDisposables ?? []) disposable.dispose();
        AppPreviewPanel.current = null;
      },
      null,
      context.subscriptions,
    );
    context.subscriptions.push(
      vsc.workspace.onDidChangeTextDocument(async (evt) => {
        if (AppPreviewPanel.current && evt.document.uri.toString() === AppPreviewPanel.current.vscTextDocument.uri.toString()) {
          AppPreviewPanel.current.scheduleUpdate(evt.document);
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
   * @param {vsc.ExtensionContext} context - The extension context used to persist preview state
   */
  constructor(panel, document, context) {
    this.vscWebviewPanel = panel;
    this.vscTextDocument = document;
    this.extensionContext = context;
    this.panelDisposables = [];
    const savedZoom = context.workspaceState.get(AppPreviewPanel.previewZoomStateKey, 1);
    this.previewZoom = typeof savedZoom === 'number' && Number.isFinite(savedZoom) ? Math.min(AppPreviewPanel.previewZoomMax, Math.max(AppPreviewPanel.previewZoomMin, savedZoom)) : 1;
    this.panelDisposables.push(
      panel.webview.onDidReceiveMessage((message) => {
        if (message?.type !== 'forma.preview.setZoom' || typeof message.zoom !== 'number') return;

        this.setZoom(message.zoom);
      }),
    );
  }

  /**
   * Set the preview-only zoom level and persist it.
   * @param {number} zoom - The requested zoom level.
   */
  setZoom(zoom) {
    this.previewZoom = Math.min(AppPreviewPanel.previewZoomMax, Math.max(AppPreviewPanel.previewZoomMin, zoom));
    this.vscWebviewPanel.webview.postMessage({ type: 'forma.preview.zoomChanged', zoom: this.previewZoom });
    void this.extensionContext.workspaceState.update(AppPreviewPanel.previewZoomStateKey, this.previewZoom);
  }

  /**
   * Schedule a preview update after the current burst of edits settles.
   * @param {vsc.TextDocument} document - The document to render.
   */
  scheduleUpdate(document) {
    this.vscTextDocument = document;
    if (this.previewUpdateTimer) clearTimeout(this.previewUpdateTimer);
    this.previewUpdateTimer = setTimeout(() => {
      this.previewUpdateTimer = undefined;
      void this.update(document);
    }, AppPreviewPanel.previewUpdateDelay);
  }

  /**
   * Update the preview panel with the rendered content of the given document.
   * @param {vsc.TextDocument} document - The text document to update the preview with
   */
  async update(document) {
    this.vscTextDocument = document;
    const updateVersion = ++this.previewUpdateVersion;
    try {
      const { webview } = this.vscWebviewPanel;
      const builder = new Builder(document);
      builder.htmlStyleVariables.set('--forma-preview-zoom', String(this.previewZoom));
      builder.htmlInjectionStyles.set('body', [['zoom', 'var(--forma-preview-zoom)']]);
      builder.htmlInjectionScripts.add(`(() => {
        window.addEventListener('message', (event) => {
          if (event.data?.type === 'forma.preview.zoomChanged' && typeof event.data.zoom === 'number') {
            document.documentElement.style.setProperty('--forma-preview-zoom', event.data.zoom);
          }
        });
      })();`);
      const bodyHtmlBuilderArgs = {
        vscCspRource: webview.cspSource,
        resolveResourceUri: (/** @type {vsc.Uri} */ vscUri) => webview.asWebviewUri(vscUri).toString(),
      };
      const html = await builder.buildBodyHTML(bodyHtmlBuilderArgs);
      if (updateVersion === this.previewUpdateVersion && AppPreviewPanel.current?.vscWebviewPanel === this.vscWebviewPanel) {
        this.vscWebviewPanel.webview.html = html;
      }
    } catch (error) {
      if (updateVersion === this.previewUpdateVersion && AppPreviewPanel.current?.vscWebviewPanel === this.vscWebviewPanel) {
        this.vscWebviewPanel.webview.html = `<pre>Forma preview error: ${String(error)}</pre>`;
      }
    }
  }
}
