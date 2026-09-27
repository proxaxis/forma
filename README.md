# forma
Let's create documents in Markdown!

# Memo
GitHub Actions の流れ:
```bash
# 1. package.json のバージョン更新と Git タグ作成（npm version コマンドが便利です）
npm version patch   # 0.0.1 -> 0.0.2 に更新され、コミットと 'v0.0.2' タグが自動作成されます

# 2. リモートへコミットとタグを push
git push origin main --tags
```
