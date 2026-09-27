# Forma User Guide

Forma turns Markdown into a document-oriented live preview and a PDF. Open a Markdown file, then use the preview or PDF button in the editor title bar, or run the commands from the Command Palette.

## First Setup

1. Open a VS Code workspace containing your Markdown document.
2. Run **MD: Initialize Forma Project Config** once if you want project-local templates.
3. Edit the generated files under `.forma/` and open the preview with **MD: Open Preview**.

The initializer never replaces files that already exist. Without `.forma` files, Forma uses its bundled defaults.

## Exporting a PDF

Run **MD: Export PDF** with a Markdown document active. The default output is `<document-name>.pdf` beside the Markdown file. The PDF uses `.forma/export.scss` and the Puppeteer settings from `puppeteer.json`.

Forma needs Chromium or Google Chrome. Set `forma.puppeteer.appPath` to its executable path when it cannot be found automatically. You can also set `PUPPETEER_EXECUTABLE_PATH` in the environment.

Set `forma.common.useAutoOpenPDF` to `false` to keep the PDF from opening automatically.

## Project Files

`.forma/` may contain:

- `default.scss`: preview theme used by default.
- `print.scss`: paginated preview theme selected with `theme: print`.
- `export.scss`: PDF-only styles.
- `parser.js`: optional content transformation hooks.
- `puppeteer.json`: PDF size, margins, browser arguments, and output destination.

The `forma.theme`, `forma.parser`, and `forma.puppeteer` settings support named libraries. A document can select one with frontmatter:

```yaml
---
theme: print
parser: my-parser
puppeteer: book
---
```

## Frontmatter

Use `numbering: 1-3` to number headings from level 1 through level 3. Header and footer items support `title`, `date`, `page`, or literal text. Each side has up to three items.

```yaml
---
numbering: 1-3
header:
  - item: title
    style: font-weight: bold
  - item: date
footer: ['', '', page]
---
```

## Document Directives

Use these HTML comments in Markdown:

- `<!-- TOC -->` creates a table of contents for levels 1 through 6.
- `<!-- TOC [2] -->` limits it to levels 1 through 2.
- `<!-- TOC [2, 4] -->` includes levels 2 through 4.
- `<!-- IGNORE-TOC -->` excludes the next heading from the table of contents.
- `<!-- IGNORE-NUM -->` excludes the next heading from numbering.
- `<!-- ID[custom-id] -->` gives the next heading an internal-link alias.
- A line containing `---` creates a page break.

Forma supports HTML, footnotes, task lists, image dimensions such as `![Alt](image.png =320x200)`, containers, automatic links, and Prism highlighting for common programming and configuration languages.

## Images and Output Paths

Relative images are resolved from the Markdown file. Paths beginning with `@/` are resolved from the workspace root. In `puppeteer.json`, `destination: "."` writes beside the source file; `destination: "@"` writes at the workspace root, and `destination: "@/exports"` writes below it.