# Forma ユーザーガイド

Forma は Markdown を文書向けのライブプレビューと PDF に変換する VS Code 拡張機能です。Markdown ファイルを開き、エディタータイトルバーのプレビューまたは PDF ボタンを使うか、コマンドパレットからコマンドを実行してください。

## 初回設定

1. Markdown ファイルを含む VS Code ワークスペースを開きます。
2. プロジェクト固有のテンプレートを使う場合は **MD: Initialize Forma Project Config** を一度実行します。
3. `.forma/` のファイルを編集し、**MD: Open Preview** でプレビューを開きます。

初期化コマンドは既存ファイルを上書きしません。`.forma/` にファイルがない場合は、拡張機能に内蔵された既定値が使われます。

## PDF の出力

Markdown ファイルをアクティブにして **MD: Export PDF** を実行します。既定では Markdown と同じ場所に `<ファイル名>.pdf` が作成されます。PDF には `.forma/export.scss` と `puppeteer.json` の設定が使われます。

Chromium または Google Chrome が必要です。自動検出できない場合は `forma.puppeteer.appPath` に実行ファイルのパスを指定してください。環境変数 `PUPPETEER_EXECUTABLE_PATH` も利用できます。

PDF を自動で開かない場合は `forma.common.useAutoOpenPDF` を `false` にします。

## プロジェクトファイル

`.forma/` には次のファイルを置けます。

- `default.scss`: 通常のプレビュー用テーマ。
- `print.scss`: `theme: print` で選択するページ分割プレビュー用テーマ。
- `export.scss`: PDF 専用のスタイル。
- `parser.js`: Markdown または HTML を変換する任意のフック。
- `puppeteer.json`: 用紙サイズ、余白、ブラウザー引数、出力先。

`forma.theme`、`forma.parser`、`forma.puppeteer` には名前付きライブラリを設定できます。frontmatter から次のように選択します。

```yaml
---
theme: print
parser: my-parser
puppeteer: book
---
```

## frontmatter

`numbering: 1-3` を指定すると、レベル 1 から 3 の見出しに番号が付きます。ヘッダーとフッターには `title`、`date`、`page`、または任意の文字列を指定できます。それぞれ最大 3 項目です。

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

## 文書ディレクティブ

Markdown 内で次の HTML コメントを使えます。

- `<!-- TOC -->`: レベル 1 から 6 の目次を作成します。
- `<!-- TOC [2] -->`: レベル 1 から 2 に制限します。
- `<!-- TOC [2, 4] -->`: レベル 2 から 4 を含めます。
- `<!-- IGNORE-TOC -->`: 次の見出しを目次から除外します。
- `<!-- IGNORE-NUM -->`: 次の見出しを番号付けから除外します。
- `<!-- ID[custom-id] -->`: 次の見出しに内部リンク用の別名を付けます。
- `---` だけの行: 改ページを挿入します。

HTML、脚注、タスクリスト、`![Alt](image.png =320x200)` のような画像サイズ指定、コンテナ、自動リンク、主要なプログラミング言語と設定ファイルの Prism ハイライトに対応しています。

## 画像と出力先

相対パスの画像は Markdown ファイルを基準に解決されます。`@/` で始まるパスはワークスペースルートを基準にします。`puppeteer.json` の `destination: "."` は元ファイルの隣、`destination: "@"` はワークスペースルート、`destination: "@/exports"` はその下の `exports` に PDF を出力します。