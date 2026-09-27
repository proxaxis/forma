# Forma

Forma is a VS Code extension for authoring document-style Markdown. It renders a live preview in a Webview and exports the active Markdown document to PDF through `puppeteer-core`.

For end-user instructions, see [GUIDE.md](GUIDE.md) or [GUIDE-JP.md](GUIDE-JP.md).

## Developer Notes

### Runtime flow

`src/index.js` activates the extension and registers the commands declared in `package.json`:

- `forma.preview` creates one `WebviewPanel` in column two and refreshes it when the document or a workspace stylesheet changes.
- `forma.export` builds the same document HTML, applies export CSS, and writes a PDF beside the source document by default.
- `forma.initprojectconfig` creates `.forma` in the first workspace folder without overwriting existing files.
- `forma.copyAnchor` copies a generated heading anchor to the clipboard.

`Builder` is the rendering pipeline. It parses frontmatter with `gray-matter`, runs the selected user parser hooks, parses Markdown with `ExtendedMarkdownIt`, applies system heading/TOC/page-break processing, runs the HTML hook, and wraps the result in the skeleton template. The print theme additionally measures the rendered document in Chromium and divides it into page sections.

### Configuration resolution

`BaseConfiguration` reads `forma.theme`, `forma.parser`, or `forma.puppeteer` from the document's VS Code configuration. Each section has an `entry` file and named `libraries` containing `{ name, path }` entries. Paths may be filesystem paths or `file://` URIs.

For parser and browser configuration, the effective file is selected in this order:

1. The preset named by the document frontmatter.
2. The section's `entry` file in the document's workspace `.forma` directory.
3. The first configured library.
4. The bundled asset in `src/assets`.

Themes use the same first three choices except that `theme: print` selects `.forma/print.scss`; the bundled `ws.print.scss` is the fallback. `export.scss` is loaded separately for PDF output.

Chromium resolution checks `forma.puppeteer.appPath`, `PUPPETEER_EXECUTABLE_PATH`, known OS installation paths, and finally commands on `PATH`. `puppeteerRunnerPath` is retained as configuration metadata but is not used by the current launcher.

### Markdown and system directives

`ExtendedMarkdownIt` enables raw HTML, hard line breaks, linkification, image sizing, custom blocks, containers, footnotes, task lists, link attributes, and Prism highlighting. Links receive `target="_blank"` and `rel="noopener"`; relative image paths are resolved against the document directory, while `@/path` resolves from the workspace root.

System comments are processed outside fenced code blocks:

- `<!-- TOC -->`, `<!-- TOC [N] -->`, and `<!-- TOC [N, M] -->` insert a table of contents.
- `<!-- IGNORE-TOC -->` and `<!-- IGNORE-NUM -->` affect the following heading.
- `<!-- ID[alias] -->` assigns an explicit heading alias.
- A standalone `---` or a matching page-break HTML comment becomes a page break.

Every heading receives a random ID. Automatic slugs and explicit aliases are resolved to that ID, so internal links remain stable within a rendered document.

### Workspace assets

The initialization command copies these bundled templates to `.forma/`: `default.scss`, `print.scss`, `export.scss`, `parser.js`, and `puppeteer.json`. The HTML skeleton and header/footer templates remain extension assets and are filled by `Builder`.

Parser hooks are asynchronous and use positional arguments: `handleMarkdown(content, frontmatter)`, `handleHTML(html, frontmatter)`, `handleHeaderHTML(html, frontmatter)`, and `handleFooterHTML(html, frontmatter)`. Returning `undefined` leaves the input unchanged.

### Development

```bash
npm install
npm run lint
npm run build
npm test
```

The integration tests need a display server on Linux containers. Use `xvfb-run npm test` in CI when no desktop display is available.
