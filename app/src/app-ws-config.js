import path from 'node:path';
import vsc from 'vscode';
import { wsConfigTemplates, wsConfigDirectoryName } from '@/assets/constants.js';

export class AppWsConfig {
  /**
   * Initializes the Forma workspace configuration.
   */
  static async initialize() {
    const vscWorkspaceDir = vsc.workspace.workspaceFolders?.[0];
    if (!vscWorkspaceDir) {
      void vsc.window.showWarningMessage('Open a workspace before initializing Forma Workspace Configuration.');
      return;
    }
    const wsConfigDirPath = vsc.Uri.joinPath(vscWorkspaceDir.uri, wsConfigDirectoryName);
    await vsc.workspace.fs.createDirectory(wsConfigDirPath);
    for (const template of wsConfigTemplates.list) {
      const dest = vsc.Uri.joinPath(wsConfigDirPath, template.to);
      try {
        await vsc.workspace.fs.stat(dest);
      } catch {
        await vsc.workspace.fs.writeFile(dest, new TextEncoder().encode(template.content));
      }
    }
    void vsc.window.showInformationMessage(`Created ${path.join(vscWorkspaceDir.uri.fsPath, wsConfigDirectoryName)}.`);
  }
}
