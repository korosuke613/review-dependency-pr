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
