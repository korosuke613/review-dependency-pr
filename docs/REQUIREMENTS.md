# 依存関係更新 PR に対し、AI を使ってレビューを行う

- [x] 依存関係更新 PR の作成者は Renovate、Dependabot とする
- [x] Renovate、Dependabot が作った PR に対し、AI によるレビューを GitHub Actions で実行する
  - `on.pull_request` イベントでトリガー
  - `workflow_dispatch` イベントで手動トリガー可能
- [x] AI レビューの結果は、PR のコメントとして残す
- [x] 同一PRに対する複数回のAIレビュー実行時は、新しいコメントを作成せず既存AIコメントを更新する
- [x] AI レビューをモデルに依頼する際の最低限の入力は次とする
  - PRのタイトル
  - PRのボディ
  - PRの差分
- [ ] reusable workflowとして他のリポジトリから汎用的に使えるようにする

## AI

- [x] GitHub Models を使用する
- [x] GitHub Models を GitHub Actions から呼び出す際は `actions/ai-inference@v1` を使用する
- [x] GitHub Models API を直接呼び出す機能を提供する
  - GitHub Personal Access Token による認証
  - ローカル実行やCI/CD環境以外での利用を可能にする
  - 既存の GitHub Actions ベースの実装との併用
- [x] AI プロバイダーの動的選択機能
  - 環境変数 `AI_PROVIDER` で `github-actions` または `github-models` を選択
  - デフォルトは `github-actions` を維持
