- Deno・TypeScript を使用して開発
- Dependency Injection を採用し、テスト容易性を高める
- 各機能はモジュール化し、再利用性を高める
- 各機能はテスト可能な形で実装する
- 今後やるべきことを見つけたら、日本語で Issue を立てる
- コミットする前に deno check、deno test、deno fmt で lint とテスト、フォーマットを実行する

# テスト

- ロジックをテストする
- 例えば API を実行しているだけといった関数のテストは必要ない
- 環境変数にアクセスするテストでは `deno test --allow-env` を実行する

# コミット

- コミットメッセージは英語で書く
- conventional commit を採用

# PR

- PR のタイトル・bodyは日本語で書く
- issueを解決するPRの場合は、bodyの先頭に `fixes #issue番号` を書く
