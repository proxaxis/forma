import vsc from 'vscode';
import { AppExporter } from '@/app-exporter.js';
import { AppPreviewPanel } from '@/app-preview-panel.js';
import { AppWsConfig } from '@/app-ws-config.js';

/**
 * @param {vsc.ExtensionContext} context - The extension context provided by VS Code.
 * @returns {void}
 */
export function activate(context) {
  console.log('Forma extension is now active!');
  vsc.commands.executeCommand('setContext', 'hasCustomMarkdownPreview', true);

  context.subscriptions.push(
    vsc.commands.registerCommand('forma.preview', async () => {
      try {
        console.log('forma.preview triggered');
        await AppPreviewPanel.show(context);
      } catch (/** @type {unknown} */ err) {
        if (err instanceof Error) {
          console.error('Error in forma.preview:', err);
          vsc.window.showErrorMessage(`forma.preview error: ${err.message}`);
        }
      }
    }),
    vsc.commands.registerCommand('forma.preview.zoomIn', () => {
      AppPreviewPanel.current?.setZoom(AppPreviewPanel.current.previewZoom + AppPreviewPanel.previewZoomStep);
    }),
    vsc.commands.registerCommand('forma.preview.zoomOut', () => {
      AppPreviewPanel.current?.setZoom(AppPreviewPanel.current.previewZoom - AppPreviewPanel.previewZoomStep);
    }),
    vsc.commands.registerCommand('forma.preview.resetZoom', () => {
      AppPreviewPanel.current?.setZoom(1);
    }),
    vsc.commands.registerCommand('forma.export', () => {
      try {
        console.log('forma.export triggered');
        AppExporter.export(vsc.window.activeTextEditor?.document);
      } catch (/** @type {unknown} */ err) {
        if (err instanceof Error) {
          console.error('Error in forma.export:', err);
          vsc.window.showErrorMessage(`forma.export error: ${err.message}`);
        }
      }
    }),
    vsc.commands.registerCommand('forma.initprojectconfig', () => {
      try {
        console.log('forma.initprojectconfig triggered');
        AppWsConfig.initialize();
      } catch (/** @type {unknown} */ err) {
        if (err instanceof Error) {
          console.error('Error in forma.initprojectconfig:', err);
          vsc.window.showErrorMessage(`forma.initprojectconfig error: ${err.message}`);
        }
      }
    }),
    vsc.commands.registerCommand('forma.copyAnchor', async (text) => {
      await vsc.env.clipboard.writeText(text);
      vsc.window.setStatusBarMessage(`Copied: ${text}`, 2000);
    }),
  );
}

export function deactivate() {}
