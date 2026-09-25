/** @typedef {import('@/utils/resource.js').Resource} Resource */

/**
 * @typedef {object} ResourceConfiguration
 * @property {string} [entry] - The entry file name of the resource.
 * @property {{name?: string, path?: string}[]} [libraries] - The list of available presets for the resource.
 */

/**
 * @typedef {object} PuppeteerConfiguration
 * @property {string} [puppeteerRunnerPath] - The path to the Puppeteer runner.
 * @property {string} [entry] - The entry file name of the Puppeteer configuration.
 * @property {{name?: string, path?: string}[]} [libraries] - The list of available Puppeteer presets.
 */

/**
 * @typedef {object} AppConfiguration
 * @property {Resource|undefined} theme - The path to the theme CSS or SCSS file.
 * @property {Resource|undefined} parser - The path to the parser JavaScript file.
 * @property {Resource|undefined} puppeteerConfig - The path to the Puppeteer configuration file.
 * @property {Resource|undefined} puppeteerRunner - The path to the Puppeteer runner file.
 */
