import { access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import vsc from 'vscode';
import puppeteer from 'puppeteer-core';
import { wsConfigTemplates } from '@/assets/constants.js';
import { BaseConfiguration, asObject, asNotEmptyString, toUri } from '@/builder/configuration-base.js';

const execFileAsync = promisify(execFile);

/**
 * Checks whether a path exists and is accessible.
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
 * Returns standard browser executable paths for the current operating system.
 * @returns {string[]}
 */
function standardPaths() {
  if (process.platform === 'linux') {
    return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  }
  if (process.platform === 'darwin') {
    return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  }
  if (process.platform === 'win32') {
    const roots = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean);
    return roots.flatMap((root) => {
      if (!root) return [];
      return [path.join(root, 'Google/Chrome/Application/chrome.exe'), path.join(root, 'Microsoft/Edge/Application/msedge.exe')];
    });
  }
  return [];
}

/**
 * Finds a browser executable by searching commands on PATH.
 * @returns {Promise<string|undefined>}
 */
async function findOnPath() {
  const commands = process.platform === 'win32' ? ['chrome.exe', 'msedge.exe'] : process.platform === 'darwin' ? ['chromium', 'google-chrome', 'Google Chrome'] : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];

  for (const command of commands) {
    try {
      const { stdout } = await execFileAsync(process.platform === 'win32' ? 'where' : 'which', [command]);
      const executablePath = stdout.trim().split(/\r?\n/)[0];
      if (executablePath && (await isExecutable(executablePath))) return executablePath;
    } catch {
      // Continue with the next candidate command.
    }
  }
  return undefined;
}

/**
 * Resolves the browser executable path.
 * @param {string | undefined} configuredPath - Path supplied by configuration.
 * @returns {Promise<string>}
 */
export async function getBrowserExecutablePath(configuredPath) {
  const candidates = [configuredPath, process.env.PUPPETEER_EXECUTABLE_PATH, ...standardPaths()];
  for (const candidate of candidates) {
    if (candidate && (await isExecutable(candidate))) return candidate;
  }
  const pathExecutable = await findOnPath();
  if (pathExecutable) return pathExecutable;

  throw new Error(`Could not find Chromium or Google Chrome. Set forma.puppeteer.puppeteerRunnerPath or PUPPETEER_EXECUTABLE_PATH. Searched on ${os.platform()}.`);
}

export class BrowserConfiguration extends BaseConfiguration {
  /** @type {vsc.Uri|undefined} */
  fileUri;
  /** @type {vsc.Uri|undefined} */
  runnerFileUri;
  /**
   * @param {vsc.Uri} vscDocumentUri - URI of the target document.
   * @param {string} [presetName] - Puppeteer preset selected in frontmatter.
   */
  constructor(vscDocumentUri, presetName) {
    super(vscDocumentUri, 'puppeteer');

    const rawConfig = asObject(vsc.workspace.getConfiguration('forma', this.vscDocumentUri).get('puppeteer', {}));
    const rawRunnerPath = asNotEmptyString(rawConfig.puppeteerRunnerPath);
    this.runnerFileUri = rawRunnerPath ? toUri(rawRunnerPath) : undefined;
    this.fileUri = this.getPresetUri(presetName) || this.getWorkspaceEntryUri() || this.getPresetUri(this.libraries[0]?.name);
  }

  /**
   * Loads the Puppeteer configuration JSON object.
   * @returns {Promise<Record<string, any>>}
   */
  async loadConfig() {
    if (this.cache.has('puppeteerConfig')) {
      return this.cache.get('puppeteerConfig');
    }

    let content;

    if (this.fileUri) {
      const fileBuffer = await vsc.workspace.fs.readFile(this.fileUri);
      content = new TextDecoder().decode(fileBuffer);
    } else {
      content = wsConfigTemplates.getByName('ws.puppeteer.json').content;
    }

    try {
      const config = JSON.parse(content);
      this.cache.set('puppeteerConfig', config);
      return config;
    } catch (err) {
      const target = this.fileUri ? this.fileUri.toString() : 'constants.js (wsPuppeteerJson)';
      throw new Error(`Failed to parse Puppeteer config JSON: ${target}`, { cause: err });
    }
  }

  /**
   * Resolves the full path to the browser executable.
   * @param {string} [overridePath]
   * @returns {Promise<string>}
   */
  async resolveExecutablePath(overridePath) {
    return getBrowserExecutablePath(overridePath);
  }

  /**
   * Launches a headless browser using the resolved configuration.
   * @returns {Promise<import('puppeteer-core').Browser>}
   */
  async getBrowser() {
    const browserConfig = await this.loadConfig();
    const browserExecutablePath = await this.resolveExecutablePath();
    const { browserArguments = [] } = browserConfig ?? {};
    return puppeteer.launch({
      executablePath: browserExecutablePath,
      headless: true,
      args: browserArguments,
    });
  }
}
