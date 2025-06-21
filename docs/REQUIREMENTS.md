# 依存関係更新 PR に対し、AI を使ってレビューを行う

- [x] 依存関係更新 PR の作成者は Renovate とする
- [x] Renovate が作った PR に対し、AI によるレビューを GitHub Actions で実行する
  - `on.pull_request` イベントでトリガー
  - `workflow_dispatch` イベントで手動トリガー可能
- [x] AI レビューの結果は、PR のコメントとして残す
- [x] AI レビューをモデルに依頼する際の最低限の入力は次とする
  - PRのタイトル
  - PRのボディ
  - PRの差分
- [ ] reusable workflowとして他のリポジトリから汎用的に使えるようにする

## AI

- [x] GitHub Models を使用する
- [x] GitHub Models を GitHub Actions から呼び出す際は `actions/ai-inference@v1` を使用する
