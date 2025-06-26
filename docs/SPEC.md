# AI依存関係レビューシステム仕様

## コメント管理機能

### AIレビューコメントの更新機能

- 同一PRに対する複数回のAIレビュー実行時、新しいコメントを作成するのではなく、既存のAIコメントを更新する
- AIコメントの識別は `<!-- AI-REVIEW-COMMENT -->` 識別子を使用
- 既存AIコメントが存在しない場合は新規作成、存在する場合は更新を行う

### GitHubApiService インターフェース

- `getIssueComments(prNumber: number)`: PRの既存コメント一覧を取得
- `updateComment(commentId: number, body: string)`: 指定コメントIDのコメントを更新
- `createOrUpdateReviewComment(prNumber: number, body: string)`: AIレビューコメントの作成・更新を自動判定

### コメント識別子

- AIが生成したコメントには `<!-- AI-REVIEW-COMMENT -->` をHTMLコメントとして埋め込み
- この識別子により、既存のAIコメントを特定・更新可能

## 後方互換性

- 既存の `createComment()` メソッドは保持され、従来通り動作
- `post-review.ts` では新しい `createOrUpdateReviewComment()` を使用

## AI プロバイダー機能

### AI サービス抽象化

- `AiReviewService` インターフェースによる抽象化
- 複数のAIプロバイダーに対応可能な設計

### プロバイダー実装

#### GitHub Actions プロバイダー (`AiReviewServiceImpl`)

- 従来の `actions/ai-inference@v1` を使用
- `AI_REVIEW` 環境変数からレスポンスを取得
- GitHub Actions 環境での実行に最適化

#### GitHub Models プロバイダー (`GitHubModelsAiService`)

- GitHub Models API を直接呼び出し
- GitHub Personal Access Token による認証
- ローカル実行やCI/CD環境以外での利用が可能

### プロバイダー選択機能

#### ファクトリーパターン (`createAiReviewService`)

- `AI_PROVIDER` 環境変数による動的選択
- `github-actions` (デフォルト) または `github-models` を指定
- プロバイダー固有の設定を渡すことが可能

#### 環境変数

- `AI_PROVIDER`: プロバイダー選択 (`github-actions` | `github-models`)
- `AI_MODEL`: 使用するAIモデル (GitHub Models用)
- `AI_ENDPOINT`: API エンドポイント (GitHub Models用、省略可能)
- `GITHUB_TOKEN`: 認証トークン (GitHub Models用)

### GitHub Models API 仕様

#### 認証

- GitHub Personal Access Token を `AzureKeyCredential` として使用
- エンドポイント: `https://models.inference.ai.azure.com` (デフォルト)

#### API 呼び出し

- REST API `/chat/completions` エンドポイントを使用
- ChatGPT形式のメッセージ配列でプロンプトを送信
- JSON レスポンスを構造化された `AIReviewResult` に変換

#### フォールバック機能

- API呼び出し失敗時は安全なデフォルトレスポンスを返す
- `needs_investigation` 推奨で手動確認を促す
- エラー詳細を `additionalNotes` に含める

### 使用例

#### GitHub Actions での使用 (従来通り)

```bash
# 環境変数設定不要 (デフォルト)
deno run --allow-net --allow-env src/post-review.ts
```

#### ローカル実行での GitHub Models 使用

```bash
export AI_PROVIDER=github-models
export AI_MODEL=gpt-4o
export GITHUB_TOKEN=your_github_token
deno run --allow-net --allow-env src/main.ts review 123
```
