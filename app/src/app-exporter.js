import path from 'node:path';
import vsc from 'vscode';
import puppeteer from 'puppeteer-core';
import { Builder } from '@/builder/builder.js';

export class AppExporter {
  /**
   * Exports a Markdown document to a PDF file.
   * @param {vsc.TextDocument|undefined} vscTextDocument - The document to export provided by VS Code.
   */
  static async export(vscTextDocument) {
    if (!vscTextDocument || vscTextDocument.languageId !== 'markdown') {
      void vsc.window.showWarningMessage('Open a Markdown document to export it.');
      return;
    }
    const builder = new Builder(vscTextDocument);
    const config = await builder.buildConfig();
    const docBodyTemplate = await builder.buildBodyHTML();
    const docHeaderFooterTemplate = await builder.buildHeaderFooterHTML();
    const { browserArguments = [], destination = '.', ...puppeteerExportOptions } = await config.browser.loadConfig() || {};
    const browserExecutablePath = await config.browser.resolveExecutablePath();
    const docOutputPath = path.join(path.dirname(vscTextDocument.uri.fsPath), destination, `${path.basename(vscTextDocument.uri.fsPath, path.extname(vscTextDocument.uri.fsPath))}.pdf`);

    const browser = await puppeteer.launch({
      executablePath: browserExecutablePath,
      headless: true,
      args: browserArguments,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(docBodyTemplate, { waitUntil: 'load' });
      await page.pdf({
        path: docOutputPath,
        displayHeaderFooter: true,
        headerTemplate: docHeaderFooterTemplate.header,
        footerTemplate: docHeaderFooterTemplate.footer,
        ...puppeteerExportOptions,
      });
    } finally {
      await browser.close();
    }
    
    const vscCommonConfiguration = vsc.workspace.getConfiguration('forma.common');
    if (vscCommonConfiguration.get('useAutoOpenPDF', true)) {
      await vsc.env.openExternal(vsc.Uri.file(docOutputPath));
    }
    void vsc.window.showInformationMessage(`Exported ${path.basename(docOutputPath)}.`);
  }
}
