<style>
* {
  text-autospace: normal;
}

.warn {
  position: relative;
  margin: 1.2em 0;
  padding: 12px 16px 12px 42px;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  border-radius: 4px;
  color: #78350f;
  font-size: 0.9em;
  line-height: 1.6;
}

.warn::before {
  content: "⚠️";
  position: absolute;
  left: 14px;
  top: 13px;
  font-size: 16px;
  line-height: 1;
}

.warn code {
  background-color: rgba(245, 158, 11, 0.15);
  color: #92400e;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

@media (prefers-color-scheme: dark) {
  .warn {
    background-color: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.35);
    border-left: 4px solid #f59e0b;
    color: #fef3c7;
  }

  .warn code {
    background-color: rgba(245, 158, 11, 0.25);
    color: #fde68a;
  }
}

details {
  margin: 1em 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #f8fafc;
  overflow: hidden;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

details[open] {
  border-color: #cbd5e1;
  background-color: #ffffff;
}

details > summary {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  font-size: 0.95em;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  user-select: none;
  list-style: none;
  transition: color 0.15s ease;
}

details > summary::-webkit-details-marker {
  display: none;
}

details > summary::before {
  content: "";
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex-shrink: 0;
  background-color: #64748b;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>') no-repeat center / contain;
  mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>') no-repeat center / contain;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

details > summary:hover {
  color: #0f172a;
}
details > summary:hover::before {
  background-color: #0f172a;
}

details[open] > summary::before {
  transform: rotate(90deg);
}

details[open] > summary {
  border-bottom: 1px solid #f1f5f9;
}

details .content {
  padding: 12px 16px;
  font-size: 0.9em;
  line-height: 1.6;
  color: #475569;
}

details .content pre {
  margin: 0.5em 0;
}

@media (prefers-color-scheme: dark) {
  details {
    border-color: #334155;
    background-color: #1e293b;
  }

  details[open] {
    border-color: #475569;
    background-color: #0f172a;
  }

  details > summary {
    color: #e2e8f0;
  }

  details > summary::before {
    background-color: #94a3b8;
  }

  details > summary:hover {
    color: #ffffff;
  }
  details > summary:hover::before {
    background-color: #ffffff;
  }

  details[open] > summary {
    border-bottom-color: #1e293b;
  }

  details .content {
    color: #cbd5e1;
  }
}
</style>

# Forma ユーザーガイド

FormaはMarkdownを文書向けのライブプレビューとPDFに変換するVS Code拡張機能です。Markdownファイルを開き、エディタータイトルバーのプレビューまたはPDFボタンを使うか、コマンドパレットからコマンドを実行してください。

英語版: [English Version](README.md).

## 初回設定

1. Markdownファイルを含むVS Codeワークスペースを開きます。
2. プロジェクト固有のテンプレートを使う場合は `Forma: Initialize Project Config` を一度実行します。
3. ワークスペース配下に生成された `.forma` ディレクトリの中にあるファイル群を編集し、`Forma: Open Preview` でプレビューを開きます。

この初期化コマンドは既存ファイルを上書きしません。`.forma` ディレクトリ内に対象のファイルがない場合は、拡張機能に内蔵された既定値が使われます。

## PDF の出力

Markdown ファイルをアクティブにして `Forma: Export PDF` を実行します。既定では対象のMarkdownファイルと同じ場所に `<ファイル名>.pdf` が作成されます。PDFには `.forma/export.scss` と `puppeteer.json` の設定が使われます。

<div class="warn">

PDF の出力には、ChromiumまたはGoogle Chromeが必要です。自動検出できない場合は、VS Code設定内の `forma.puppeteer.puppeteerRunnerPath` に実行ファイルのパスを指定してください。環境変数 `PUPPETEER_EXECUTABLE_PATH` も利用できます。

</div>

なお、出力後にPDFを自動で開きたい場合は `forma.common.useAutoOpenPDF` を `true` にします。初期値は `false` です。

## プロジェクトファイル

[初回設定](#初回設定) で説明したように、`Forma: Initialize Project Config` を実行すると、ワークスペース直下に `.forma` というディレクトリが作成されます。これは、そのワークスペース専用のFormaの設定ディレクトリです。ここには以下のファイルを置くことができます。

* `default.scss`: 通常のプレビューテーマ
* `print.scss`: `theme: print` で選択された時に適用される、印刷プレビューテーマ
* `export.scss`: PDF 出力時に使用される専用のテーマ
* `parser.js`: Markdown やHTMLを変換するフックを定義
* `puppeteer.json`: 用紙サイズ、余白、ブラウザ起動引数、出力先などの設定

VSCode の設定内に `forma.theme.libraries`、`forma.parser.libraries`、`forma.puppeteer.libraries` を定義することで、名前付きライブラリを使用できるようになります。例えば:

```json
// VSCode Configuration
{
  "forma.theme.libraries": [{ "name": "foo", "path": "@/path/to/foo.scss" }]
}
```
※ `@` はワークスペースのルートディレクトリを示すエイリアスです。

このように設定すれば、Markdownフロントマターから次のように選択して使用できます。

```yaml
---
theme: foo
---
```

なお、`forma.theme.entry`、`forma.parser.entry`、`forma.puppeteer.entry` を変更することで、ロードする設定ファイルの名前を変更することができます。

## フロントマター

既定のFormaでは、以下のフロントマターが使用可能です:

* `theme`: 使用する名前付きテーマを指定
* `parser`: 使用する名前付きパーサを指定
* `puppeteer`: 使用する名前付きPuppeteer設定を指定
* `numbering`: 指定された見出しの先頭に番号を付与
* `header`: 文書のヘッダーコンテンツを定義
* `footer`: 文書のフッターコンテンツを定義

これらのフロントマターは以下のように使用します:
```yaml
---
theme: foo
parser: var
puppeteer: hoge
numbering: 1-3
header:
  - 上部左のヘッダー
  - 上部中央のヘッダー
  - 上部右のヘッダー
footer:
  - 下部左のフッター
  - 下部中央のフッター
  - 下部右のフッター
---
```

### 番号付けの詳しい説明

<details>
  <summary>numbering の詳しい説明</summary>
  <div class="content">

  `numbering` は `数値` または `ハイフン区切りの数値` を指定します。例えば、`1` と指定すると、レベル1の見出し: `#見出し` の先頭に数値が与えられ、`#1. 見出し` と表示されます。数値は1からの連番で、同じレベルの全ての見出しに付与されますが、`<!-- IGNORE-NUM -->` と書いた次の見出しは、連番のカウントから除外されます。

  </div>
</details>

### ヘッダーとフッターの詳しい説明

<details>
  <summary>header / footer の詳しい説明</summary>
  <div class="content">

  #### 指定方法

  `header` および `footer` には、2つか3つの文字列を指定します。2つの場合は左右の2箇所、3つの場合は左右と中央の3箇所のヘッダーまたはフッターが表示されます。また、これらには以下の特殊変数が使用できます:
  * `title`: ページ内の最初のレベル1の見出しを表示
  * `date`: 印刷またはプレビュー時点の日付を `YYYY-MM-DD` 形式で表示
  * `page`: ページ番号を表示

  #### スタイル

  ヘッダーおよびフッターには、スタイルを当てることができ、その設定場所は2箇所あります。

  まず、`puppeteer.json` 内の `defaultHeaderFooterFont` です。ここでは、ヘッダーとフッターで共通の `size`: フォントサイズと `color`: 文字色を指定できます。例えば:

  ```json
  // puppeteer.json
  "defaultHeaderFooterFont": {
    "size": "12px",
    "color": "#ff0000"
  }
  ```

  このように指定すると、ヘッダーとフッターの文字サイズが12pxになり、文字色が赤になります。

  次に、フロントマターで指定する方法です。以下のように記述できます:

  ```yaml
  ---
  header:
    - item: 下部右のフッター
      style: "font-size: 12px; color: #ff0000"
    - 上部右のヘッダー
  ---
  ```

  このように指定すると、"下部右のフッター" だけが、12pxの赤色になります。

  </div>
</details>

## 文書ディレクティブ

Markdown内では、以下のディレクティブを使用できます。

* `<!-- TOC -->`: レベル1から6の目次を作成します。
* `<!-- TOC[2] -->`: レベル1から2に制限します。
* `<!-- TOC[2,4] -->`: レベル2から4を含めます。
* `<!-- IGNORE-TOC -->`: 次の見出しを目次から除外します。
* `<!-- IGNORE-NUM -->`: 次の見出しを[番号付け](#番号付けの詳しい説明)から除外します。
* `<!-- ID[custom-id] -->`: 次の見出しに内部リンク用の別名を付けます。
* `---` だけの行: 改ページを挿入します。

HTML、脚注、タスクリスト、`![Alt](image.png =320x200)` のような画像サイズ指定、コンテナ、自動リンク、主要なプログラミング言語と設定ファイルのPrismハイライトに対応しています。

<details><summary>Prismの対応言語</summary>
  <div class="content">

  **Web and scripting languages**
  * `typescript`
  * `json`
  * `yaml`
  * `markdown`
  * `bash`
  * `shell-session`

  **Backend and systems languages**
  * `python`
  * `php`
  * `java`
  * `c`
  * `cpp`
  * `csharp`
  * `go`
  * `rust`
  * `ruby`
  * `kotlin`
  * `swift`

  **Database and configuration formats**
  * `sql`
  * `graphql`
  * `docker`
  * `ini`
  * `toml`

  </div>
</details>

## 画像と出力先

相対パスの画像はMarkdownファイルを基準に解決されます。`@/` で始まるパスはワークスペースルートを基準にします。`puppeteer.json` の `destination: "."` は元ファイルと同じ階層、`destination: "@"` はワークスペースルート、`destination: "@/exports"` はその下の `exports` にPDFを出力します。
