# Forma ユーザーガイド

FormaはMarkdownを文書向けのライブプレビューとPDFに変換するVS Code拡張機能です。Markdownファイルを開き、エディタータイトルバーのプレビューまたはPDFボタンを使うか、コマンドパレットからコマンドを実行してください。

英語版: [English Version](README.md).

## 初回設定

1. Markdownファイルを含むVS Codeワークスペースを開きます。
2. プロジェクト固有のテンプレートを使う場合は `Forma: Initialize Project Config` を一度実行します。
3. ワークスペース配下に生成された `.forma` ディレクトリの中にあるファイル群を編集し、`Forma: Open Preview` でプレビューを開きます。

この初期化コマンドは既存ファイルを上書きしません。`.forma` ディレクトリおよびその配下に対象のファイルがない場合は、拡張機能に内蔵された既定値が使われます。

## ワークスペースの信頼

Formaは信頼されたVS Codeワークスペースで使用する必要があります。信頼されていないワークスペースでは拡張機能はサポートされず、PDFの出力も無効になります。Formaのコマンドでプロジェクト設定を実行したりChromiumを起動したりする前に、ワークスペースを信頼してください。

## プレビューの操作

プレビューパネル内を右クリックすると、`Forma Preview: Zoom In (Make it bigger)`、`Forma Preview: Zoom Out (Make it smaller)`、`Forma Preview: Reset Zoom` を実行できます。プレビューの倍率は50%から200%まで10%刻みで変更でき、プレビューパネルだけに適用されます。PDFの出力倍率は変更されません。選択した倍率はワークスペースごとに記憶されます。

## PDF の出力

Markdown ファイルをアクティブにして `Forma: Export PDF` を実行します。既定では対象のMarkdownファイルと同じ場所に `<ファイル名>.pdf` が作成されます。PDFには `.forma/export.scss` と `puppeteer.json` の設定が使われます。

> [!WARNING]
> PDFの出力には、ChromiumまたはGoogle Chromeが必要です。自動検出できない場合は、VS Code設定内の `forma.puppeteer.puppeteerRunnerPath` に実行ファイルのパスを指定してください。環境変数 `PUPPETEER_EXECUTABLE_PATH` も利用できます。

なお、出力後にPDFを自動で開きたい場合は `forma.export.useAutoOpenPDF` を `true` にします。初期値は `false` です。

## プロジェクトファイル

[初回設定](#初回設定) で説明したように、`Forma: Initialize Project Config` を実行すると、ワークスペース直下に `.forma` というディレクトリが作成されます。これは、そのワークスペース専用のFormaの設定ディレクトリです。ここには以下のファイルを置くことができます。

- `default.scss`: 通常のプレビューテーマ
- `print.scss`: `theme: print` で選択された時に適用される、印刷プレビューテーマ
- `export.scss`: PDF 出力時に使用される専用のテーマ
- `parser.js`: Markdown やHTMLを変換するフックを定義
- `puppeteer.json`: 用紙サイズ、余白、ブラウザ起動引数、出力先などの設定

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

- `theme`: 使用する名前付きテーマを指定
- `parser`: 使用する名前付きパーサを指定
- `puppeteer`: 使用する名前付きPuppeteer設定を指定
- `numbering`: 指定された見出しの先頭に番号を付与
- `header`: 文書のヘッダーコンテンツを定義
- `footer`: 文書のフッターコンテンツを定義

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

`numbering` は `数値` または `ハイフン区切りの数値` を指定します。例えば、`1` と指定すると、レベル1の見出し: `#見出し` の先頭に数値が与えられ、`#1. 見出し` と表示されます。数値は1からの連番で、同じレベルの全ての見出しに付与されますが、`<!-- IGNORE-NUM -->` と書いた次の見出しは、連番のカウントから除外されます。

### ヘッダーとフッターの詳しい説明

#### 指定方法

`header` および `footer` には、2つか3つの文字列を指定します。2つの場合は左右の2箇所、3つの場合は左右と中央の3箇所のヘッダーまたはフッターが表示されます。また、これらには以下の特殊変数が使用できます:

- `title`: ページ内の最初のレベル1の見出しを表示
- `date`: 印刷またはプレビュー時点の日付を `YYYY-MM-DD` 形式で表示
- `page`: ページ番号を表示

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
    style: 'font-size: 12px; color: #ff0000'
  - 上部右のヘッダー
---
```

このように指定すると、"下部右のフッター" だけが、12pxの赤色になります。

## 文書ディレクティブ

Markdown内では、以下のディレクティブを使用できます。

- `<!-- TOC -->`: レベル1から6の目次を作成します。
- `<!-- TOC[2] -->`: レベル1から2に制限します。
- `<!-- TOC[2,4] -->`: レベル2から4を含めます。
- `<!-- IGNORE-TOC -->`: 次の見出しを目次から除外します。
- `<!-- IGNORE-NUM -->`: 次の見出しを[番号付け](#番号付けの詳しい説明)から除外します。
- `<!-- ID[custom-id] -->`: 次の見出しに内部リンク用の別名を付けます。
- `---` だけの行: 改ページを挿入します。

HTML、脚注、タスクリスト、`![Alt](image.png =320x200)` のような画像サイズ指定、コンテナ、自動リンク、主要なプログラミング言語と設定ファイルのPrismハイライトに対応しています。

### Prismの対応言語

**Web and scripting languages**

- `typescript`
- `json`
- `yaml`
- `markdown`
- `bash`
- `shell-session`

**Backend and systems languages**

- `python`
- `php`
- `java`
- `c`
- `cpp`
- `csharp`
- `go`
- `rust`
- `ruby`
- `kotlin`
- `swift`

**Database and configuration formats**

- `sql`
- `graphql`
- `docker`
- `ini`
- `toml`

## 画像と出力先

相対パスの画像はMarkdownファイルを基準に解決されます。`@/` で始まるパスはワークスペースルートを基準にします。`puppeteer.json` の `destination: "."` は元ファイルと同じ階層、`destination: "@"` はワークスペースルート、`destination: "@/exports"` はその下の `exports` にPDFを出力します。
