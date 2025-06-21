# 依存関係更新 PR に対し、AI を使ってレビューを行う
- 依存関係更新 PR の作成者は Renovate とする
- Renovate が作った PR に対し、AI によるレビューを GitHub Actions で実行する
  - `on.pull_request` イベントでトリガー
  - `workflow_dispatch` イベントで手動トリガー可能
- AI レビューの結果は、PR のコメントとして残す

## AI
- GitHub Models を使用する
- GitHub Models を GitHub Actions から呼び出す際は `actions/ai-inference@v1` を使用する
