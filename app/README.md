# Forma

Forma is a VS Code extension for writing Word-like documents in Markdown. It provides a live Webview preview and exports the active Markdown document to PDF with Puppeteer.

## Features

- `forma.preview` opens a live Markdown preview in the second editor group.
- `forma.export` writes a PDF next to the active Markdown file.
- `forma.initprojectconfig` creates a `.forma` directory with project-level defaults.
- Markdown supports HTML, links, footnotes, task lists, containers, image sizing, anchors, and Prism code highlighting.

## Requirements

Run `npm install` with Node.js 24 or later. PDF export uses `puppeteer-core`; set `forma.puppeteer.appPath` when Chromium is not available through the default environment.

## Extension Settings

- `forma.theme`: CSS/SCSS defaults and named theme presets.
- `forma.parser`: parser hook defaults and named parser presets.
- `forma.puppeteer`: PDF presets, templates, and Chromium path.
- `forma.common.useAutoPDFOpen`: open exported PDFs automatically.

Settings can be overridden per project in `.forma/` with `default.css` or `default.scss`, `parser.js`, `puppeteer.json`, `headerTemplate.html`, and `footerTemplate.html`. A Markdown frontmatter directive (`theme`, `parser`, or `puppeteer`) selects a named preset from the corresponding `list` setting.

## Known Issues

The VS Code integration tests require a display server when run in a Linux container. Use `xvfb-run npm test` in CI or a desktop environment.

## Release Notes

### 0.0.1

Initial Forma implementation.

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
