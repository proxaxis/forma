import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
    if (!vsc.workspace.isTrusted) {
      void vsc.window.showWarningMessage('PDF export is unavailable in an untrusted workspace.');
      return;
    }
    const builder = new Builder(vscTextDocument);
    const docBodyTemplate = await inlineLocalImages(await builder.buildBodyHTML());
    const docHeaderTemplate = await builder.buildHeaderHTML();
    const docFooterTemplate = await builder.buildFooterHTML();
    const { browserArguments = [], destination = '.', ...puppeteerExportOptions } = (await builder.browser.loadConfig()) || {};
    const browserExecutablePath = await builder.browser.resolveExecutablePath();
    const documentDirectory = path.dirname(vscTextDocument.uri.fsPath);
    const outputDirectory = destination === '@' || destination.startsWith('@/') ? path.join(builder.browser.vscWorkspaceRootUri?.fsPath ?? documentDirectory, destination.slice(destination === '@' ? 1 : 2)) : path.join(documentDirectory, destination);
    const docOutputPath = path.join(outputDirectory, `${path.basename(vscTextDocument.uri.fsPath, path.extname(vscTextDocument.uri.fsPath))}.pdf`);
    await mkdir(outputDirectory, { recursive: true });

    const browser = await puppeteer.launch({
      executablePath: browserExecutablePath,
      headless: true,
      args: browserArguments,
    });
    try {
      const page = await browser.newPage();
      await page.setBypassCSP(true);
      await page.setContent(docBodyTemplate, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images).map((image) =>
            image.complete
              ? undefined
              : new Promise((resolve) => {
                  image.addEventListener('load', resolve, { once: true });
                  image.addEventListener('error', resolve, { once: true });
                }),
          ),
        );
      });
      const exportStyleText = await builder.theme.loadExport();
      await page.addStyleTag({ content: exportStyleText });
      await page.evaluate(() => {
        /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.forma-preview-page-header, .forma-preview-page-footer')).forEach((element) => {
          element.style.display = 'none';
        });

        document.querySelectorAll('.forma-preview-page-content').forEach((element) => {
          element.replaceWith(...Array.from(element.childNodes));
        });
      });
      await page.pdf({
        path: docOutputPath,
        displayHeaderFooter: true,
        headerTemplate: docHeaderTemplate,
        footerTemplate: docFooterTemplate,
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

/**
 * Embeds local file images so Chromium can load them from the about:blank PDF page.
 * @param {string} html - Rendered document HTML.
 * @returns {Promise<string>}
 */
async function inlineLocalImages(html) {
  const imageSources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((match) => match[1]);
  const replacements = await Promise.all(
    imageSources.map(async (source) => {
      if (!source.startsWith('file:')) return [source, source];

      try {
        const imageUrl = new URL(source);
        const imageBuffer = await readFile(fileURLToPath(imageUrl));
        const contentType = getImageContentType(path.extname(imageUrl.pathname));
        return [source, `data:${contentType};base64,${imageBuffer.toString('base64')}`];
      } catch {
        return [source, source];
      }
    }),
  );

  return replacements.reduce((result, [source, replacement]) => result.replaceAll(`src="${source}"`, `src="${replacement}"`), html);
}

/**
 * @param {string} extension - Image file extension.
 * @returns {string}
 */
function getImageContentType(extension) {
  return (
    {
      '.avif': 'image/avif',
      '.gif': 'image/gif',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    }[extension.toLowerCase()] ?? 'application/octet-stream'
  );
}
