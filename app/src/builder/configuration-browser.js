import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vsc from 'vscode';
import { wsConfigTemplates } from '@/assets/constants.js';
import { BaseConfiguration, asObject, asNotEmptyString, toUri } from '@/builder/configuration-base.js';

const execFileAsync = promisify(execFile);

/**
 * 指定パスのファイルが存在しアクセス可能か確認します。
 * @param {string} executablePath
 * @returns {Promise<boolean>}
 */
async function isExecutable(executablePath) {
  try {
    await access(executablePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * OS ごとの標準的なブラウザ実行ファイルパスの一覧を返します。
 * @returns {string[]}
 */
function standardPaths() {
  if (process.platform === 'linux') {
    return [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ];
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  if (process.platform === 'win32') {
    const roots = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean);
    return roots.flatMap((root) => {
      if (!root) return [];
      return [
        path.join(root, 'Google/Chrome/Application/chrome.exe'),
        path.join(root, 'Microsoft/Edge/Application/msedge.exe'),
      ];
    });
  }
  return [];
}

/**
 * PATH 環境変数上のコマンドから実行可能ファイルを探します。
 * @returns {Promise<string|undefined>}
 */
async function findOnPath() {
  const commands =
    process.platform === 'win32'
      ? ['chrome.exe', 'msedge.exe']
      : process.platform === 'darwin'
        ? ['chromium', 'google-chrome', 'Google Chrome']
        : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];

  for (const command of commands) {
    try {
      const { stdout } = await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [command]);
      const executablePath = stdout.trim().split(/\r?\n/)[0];
      if (executablePath && (await isExecutable(executablePath))) return executablePath;
    } catch {
      // 次のコマンド候補を継続探索
    }
  }
  return undefined;
}

/**
 * ブラウザ実行ファイルのパスを解決します。
 * @param {string | undefined} configuredPath - 設定等から渡されたパス
 * @returns {Promise<string>}
 */
export async function getBrowserExecutablePath(configuredPath) {
  const candidates = [configuredPath, process.env.PUPPETEER_EXECUTABLE_PATH, ...standardPaths()];
  for (const candidate of candidates) {
    if (candidate && (await isExecutable(candidate))) return candidate;
  }
  const pathExecutable = await findOnPath();
  if (pathExecutable) return pathExecutable;

  throw new Error(
    `Could not find Chromium or Google Chrome. Set forma.puppeteer.appPath or PUPPETEER_EXECUTABLE_PATH. Searched on ${os.platform()}.`
  );
}

export class BrowserConfiguration extends BaseConfiguration {
  /** @type {vsc.Uri|undefined} */
  fileUri;
  /** @type {vsc.Uri|undefined} */
  runnerFileUri;
  /** @type {string|undefined} */
  configuredAppPath;

  /**
   * @param {vsc.Uri} vscDocumentUri - 対象ドキュメントの URI
   * @param {string} [presetName] - frontmatter で指定された Puppeteer プリセット名
   */
  constructor(vscDocumentUri, presetName) {
    super(vscDocumentUri, 'puppeteer');

    const rawConfig = asObject(vsc.workspace.getConfiguration('forma', this.vscDocumentUri).get('puppeteer', {}));
    const rawRunnerPath = asNotEmptyString(rawConfig.puppeteerRunnerPath);
    this.configuredAppPath = asNotEmptyString(rawConfig.appPath);

    this.runnerFileUri = rawRunnerPath ? toUri(rawRunnerPath) : undefined;
    this.fileUri =
      this.getPresetUri(presetName) ||
      this.getWorkspaceEntryUri() ||
      this.getPresetUri(this.libraries[0]?.name);
  }

  /**
   * Puppeteer の設定 JSON オブジェクトを読み込んで返します。
   * @returns {Promise<Record<string, any>>}
   */
  async loadConfig() {
    let content;

    if (this.fileUri) {
      const fileBuffer = await vsc.workspace.fs.readFile(this.fileUri);
      content = new TextDecoder().decode(fileBuffer);
    } else {
      content = (wsConfigTemplates.getByName('ws.puppeteer.json')).content;
    }

    try {
      return JSON.parse(content);
    } catch (err) {
      const target = this.fileUri ? this.fileUri.toString() : 'constants.js (wsPuppeteerJson)';
      throw new Error(`Failed to parse Puppeteer config JSON: ${target}`, { cause: err });
    }
  }

  /**
   * ブラウザ実行可能ファイルのフルパスを解決して返します。
   * @param {string} [overridePath]
   * @returns {Promise<string>}
   */
  async resolveExecutablePath(overridePath) {
    return getBrowserExecutablePath(overridePath || this.configuredAppPath);
  }
}
