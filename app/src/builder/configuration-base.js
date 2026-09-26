import { statSync } from 'node:fs';
import vsc from 'vscode';
import { wsConfigDirectoryName } from '@/assets/constants.js';

/**
 * Converts a value to an object. If the value is not an object, returns an empty object.
 * @param {unknown} value - The value to convert.
 * @returns {Record<string, any>} - The converted object or an empty object if the value is not an object.
 */
export function asObject(value) {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
}

/**
 * Normalizes a string by trimming whitespace. If the value is not a string or is an empty string, returns undefined.
 * @param {unknown} value - The value to normalize.
 * @returns {string|undefined} - The normalized string or undefined if the value is not a valid string.
 */
export function asNotEmptyString(value) {
  return (value && typeof value === 'string' && value.trim() !== '') ? value : undefined;
}

/**
 * Converts a file path or URI string to a vscode.Uri object.
 * @param {string} from - The file path or URI string to convert.
 * @returns {vsc.Uri} - The corresponding vscode.Uri object.
 */
export function toUri(from) {
  return from.startsWith('file://') ? vsc.Uri.parse(from) : vsc.Uri.file(from);
}

export class BaseConfiguration {
  /** @type {vsc.Uri} */
  vscDocumentUri;
  /** @type {vsc.Uri|undefined} */
  vscWorkspaceRootUri;
  /** @type {vsc.Uri|undefined} */
  vscWorkspaceConfigDirUri;
  /** @type {vsc.Uri|undefined} */
  vscWorkspaceConfigEntryUri;
  /** @type {string|undefined} */
  entry;
  /** @type {{ name?: string, path?: string }[]} */
  libraries;

  /**
   * @param {vsc.Uri} vscDocumentUri - The URI of the target document.
   * @param {string} section - Section name in the workspace configuration (e.g., 'theme', 'parser', 'puppeteer').
   */
  constructor(vscDocumentUri, section) {
    this.vscDocumentUri = vscDocumentUri;
    this.vscWorkspaceRootUri = vsc.workspace.getWorkspaceFolder(vscDocumentUri)?.uri;
    const workspaceConfigDirUri = this.vscWorkspaceRootUri
      ? vsc.Uri.joinPath(this.vscWorkspaceRootUri, wsConfigDirectoryName)
      : undefined;
    try {
      this.vscWorkspaceConfigDirUri = workspaceConfigDirUri && statSync(workspaceConfigDirUri.fsPath).isDirectory()
        ? workspaceConfigDirUri
        : undefined;
    } catch {
      this.vscWorkspaceConfigDirUri = undefined;
    }

    const rawConfig = asObject(vsc.workspace.getConfiguration('forma', vscDocumentUri).get(section, {}));
    this.entry = asNotEmptyString(rawConfig.entry);
    this.libraries = (Array.isArray(rawConfig.libraries) ? rawConfig.libraries : [])
      .map((item) => ({
        name: asNotEmptyString(item?.name),
        path: asNotEmptyString(item?.path),
      }))
      .filter((item) => (item.name && item.path));

    this.cache = new Map();
  }

  /**
   * Returns the URI of a preset configuration file based on the given name.
   * @param {unknown} name
   * @returns {vsc.Uri|undefined}
   */
  getPresetUri(name) {
    if (typeof name !== 'string') return undefined;
    const target = this.libraries.find((item) => item?.name === name);
    const targetPath = asNotEmptyString(target?.path);
    return targetPath ? toUri(targetPath) : undefined;
  }

  /**
   * Returns the URI of the entry file in the workspace configuration directory.
   * @param {string} [fileName=this.entry] - The name of the entry file to look for.
   * @returns {vsc.Uri|undefined}
   */
  getWorkspaceEntryUri(fileName = this.entry) {
    if (!this.vscWorkspaceConfigDirUri || !fileName) return undefined;

    const entryUri = vsc.Uri.joinPath(this.vscWorkspaceConfigDirUri, fileName);
    try {
      return statSync(entryUri.fsPath).isFile() ? entryUri : undefined;
    } catch {
      return undefined;
    }
  }
}
