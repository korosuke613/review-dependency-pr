import ModelClient from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import type { AiReviewService } from './ai-review.ts';
import type { AIReviewResult, DependencyUpdate, PullRequest } from '../types/github.ts';

export interface GitHubModelsConfig {
  token: string;
  model: string;
  endpoint?: string;
}

export class GitHubModelsAiService implements AiReviewService {
  private client: ReturnType<typeof ModelClient>;
  private model: string;

  constructor(config: GitHubModelsConfig) {
    const endpoint = config.endpoint || 'https://models.inference.ai.azure.com';
    this.model = config.model;

    // GitHub Personal Access Token を使用して認証
    this.client = ModelClient(endpoint, new AzureKeyCredential(config.token));
  }

  async generateReview(pr: PullRequest, updates: DependencyUpdate[]): Promise<AIReviewResult> {
    try {
      const prompt = this.buildPrompt(pr, updates);

      const response = await this.client.path('/chat/completions').post({
        body: {
          messages: [
            {
              role: 'system',
              content:
                'あなたは経験豊富なソフトウェアエンジニアで、依存関係の更新に関するセキュリティとコンパチビリティの専門家です。依存関係更新PRのレビューを行い、構造化されたフィードバックを提供してください。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: this.model,
          temperature: 0.1,
          max_tokens: 2000,
        },
      });

      if (response.status !== '200') {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const aiResponse =
        (response.body as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
          ?.message?.content || '';
      return this.parseAiResponse(aiResponse, updates);
    } catch (error) {
      console.error('Error calling GitHub Models API:', error);

      // フォールバック: デフォルトレスポンスを返す
      return {
        summary:
          '依存関係の更新が検出されました。API呼び出しでエラーが発生したため、手動での確認を推奨します。',
        recommendation: 'needs_investigation',
        securityIssues: ['API呼び出しエラーのため、セキュリティ影響を確認できませんでした'],
        breakingChanges: [],
        performanceImpact: [],
        testingRequirements: ['すべての依存関係更新後のテストを実行してください'],
        additionalNotes: [`エラー詳細: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  formatReviewComment(result: AIReviewResult): string {
    let comment = '## 🤖 AI レビュー: 依存関係更新\n\n';
    comment += '*GitHub Models API により生成*\n\n';

    comment += `### 📋 概要\n${result.summary}\n\n`;

    comment += `### 🎯 推奨事項\n`;
    switch (result.recommendation) {
      case 'approve':
        comment += '✅ **承認** - この依存関係更新は安全に適用できます\n\n';
        break;
      case 'request_changes':
        comment += '⚠️ **変更要求** - 以下の問題を解決してください\n\n';
        break;
      case 'needs_investigation':
        comment += '🔍 **要調査** - 詳細な検証が必要です\n\n';
        break;
    }

    if (result.securityIssues.length > 0) {
      comment += '### 🔒 セキュリティ関連\n';
      result.securityIssues.forEach((issue) => {
        comment += `- ${issue}\n`;
      });
      comment += '\n';
    }

    if (result.breakingChanges.length > 0) {
      comment += '### 💥 破壊的変更\n';
      result.breakingChanges.forEach((change) => {
        comment += `- ${change}\n`;
      });
      comment += '\n';
    }

    if (result.performanceImpact.length > 0) {
      comment += '### ⚡ パフォーマンス影響\n';
      result.performanceImpact.forEach((impact) => {
        comment += `- ${impact}\n`;
      });
      comment += '\n';
    }

    if (result.testingRequirements.length > 0) {
      comment += '### 🧪 テスト要件\n';
      result.testingRequirements.forEach((requirement) => {
        comment += `- ${requirement}\n`;
      });
      comment += '\n';
    }

    if (result.additionalNotes.length > 0) {
      comment += '### 📝 追加事項\n';
      result.additionalNotes.forEach((note) => {
        comment += `- ${note}\n`;
      });
      comment += '\n';
    }

    comment += '---\n';
    comment +=
      '*このレビューは GitHub Models API を使用して自動生成されました。最終的な判断は人間の開発者が行ってください。*';
    comment += '\n\n<!-- AI-REVIEW-COMMENT -->';

    return comment;
  }

  private buildPrompt(pr: PullRequest, updates: DependencyUpdate[]): string {
    let prompt = `依存関係更新PRのレビューを行ってください。\n\n`;

    prompt += `**PR情報:**\n`;
    prompt += `- タイトル: ${pr.title}\n`;
    prompt += `- 説明: ${pr.body || 'なし'}\n`;
    prompt += `- 変更ファイル数: ${pr.changed_files}\n`;
    prompt += `- 追加行数: ${pr.additions}\n`;
    prompt += `- 削除行数: ${pr.deletions}\n\n`;

    if (updates.length > 0) {
      prompt += `**依存関係更新:**\n`;
      updates.forEach((update) => {
        prompt +=
          `- ${update.packageName}: ${update.currentVersion} → ${update.newVersion} (${update.changeType})\n`;
      });
      prompt += '\n';
    }

    prompt += `以下の観点から分析し、構造化された形式で回答してください:\n\n`;
    prompt += `1. **summary**: 更新内容の要約（1-2文）\n`;
    prompt += `2. **recommendation**: 推奨事項（approve/request_changes/needs_investigation）\n`;
    prompt += `3. **securityIssues**: セキュリティリスク（配列形式）\n`;
    prompt += `4. **breakingChanges**: 破壊的変更の可能性（配列形式）\n`;
    prompt += `5. **performanceImpact**: パフォーマンスへの影響（配列形式）\n`;
    prompt += `6. **testingRequirements**: 必要なテスト（配列形式）\n`;
    prompt += `7. **additionalNotes**: その他の注意事項（配列形式）\n\n`;

    prompt += `回答例:\n`;
    prompt += `summary: React 18.3.1への更新。セキュリティ修正とパフォーマンス改善が含まれます。\n`;
    prompt += `recommendation: approve\n`;
    prompt += `securityIssues:\n- CVE-2024-1234の修正が含まれています\n`;
    prompt += `breakingChanges:\n- 非推奨APIの削除により、一部のコンポーネント修正が必要\n`;
    prompt += `performanceImpact:\n- レンダリングパフォーマンスが15%向上\n`;
    prompt += `testingRequirements:\n- コンポーネントのレンダリングテストを実行\n`;
    prompt += `additionalNotes:\n- マイグレーションガイドを確認してください\n`;

    return prompt;
  }

  private parseAiResponse(response: string, _updates: DependencyUpdate[]): AIReviewResult {
    const defaultResult: AIReviewResult = {
      summary: '依存関係の更新が検出されました。',
      recommendation: 'needs_investigation',
      securityIssues: [],
      breakingChanges: [],
      performanceImpact: [],
      testingRequirements: ['更新後の動作確認テストを実行してください'],
      additionalNotes: [],
    };

    if (!response.trim()) {
      return defaultResult;
    }

    try {
      const result: AIReviewResult = {
        summary: this.extractSection(response, 'summary') || defaultResult.summary,
        recommendation: this.extractRecommendation(response) || defaultResult.recommendation,
        securityIssues: this.extractList(response, 'securityIssues'),
        breakingChanges: this.extractList(response, 'breakingChanges'),
        performanceImpact: this.extractList(response, 'performanceImpact'),
        testingRequirements: this.extractList(response, 'testingRequirements') ||
          defaultResult.testingRequirements,
        additionalNotes: this.extractList(response, 'additionalNotes'),
      };

      return result;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return defaultResult;
    }
  }

  private extractSection(response: string, section: string): string | null {
    const regex = new RegExp(`${section}[:\s]*([^\n]+)`, 'i');
    const match = response.match(regex);
    return match?.[1]?.trim() || null;
  }

  private extractRecommendation(response: string): AIReviewResult['recommendation'] | null {
    const lower = response.toLowerCase();
    if (lower.includes('recommendation: approve') || lower.includes('推奨: approve')) {
      return 'approve';
    }
    if (
      lower.includes('recommendation: request_changes') ||
      lower.includes('推奨: request_changes') ||
      lower.includes('変更要求')
    ) {
      return 'request_changes';
    }
    if (
      lower.includes('recommendation: needs_investigation') ||
      lower.includes('推奨: needs_investigation') ||
      lower.includes('要調査')
    ) {
      return 'needs_investigation';
    }
    return null;
  }

  private extractList(response: string, section: string): string[] {
    const regex = new RegExp(`${section}[^:]*:([^]*?)(?=\\n\\w+:|$)`, 'i');
    const match = response.match(regex);

    if (!match) return [];

    const content = match[1] || '';
    const items = content.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-') || line.startsWith('*'))
      .map((line) => line.substring(1).trim())
      .filter((line) => line.length > 0);

    return items;
  }
}
