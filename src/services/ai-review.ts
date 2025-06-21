import type { AIReviewResult, DependencyUpdate, PullRequest } from '../types/github.ts';

export interface AiReviewService {
  generateReview(pr: PullRequest, updates: DependencyUpdate[]): Promise<AIReviewResult>;
  formatReviewComment(result: AIReviewResult): string;
}

export class AiReviewServiceImpl implements AiReviewService {
  generateReview(_pr: PullRequest, updates: DependencyUpdate[]): Promise<AIReviewResult> {
    // Note: In the GitHub Actions workflow, AI inference is handled by actions/ai-inference@v1
    // This service provides the structure for processing AI responses
    const aiResponse = Deno.env.get('AI_REVIEW') || '';

    return Promise.resolve(this.parseAiResponse(aiResponse, updates));
  }

  formatReviewComment(result: AIReviewResult): string {
    let comment = '## 🤖 AI レビュー: 依存関係更新\n\n';

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
      '*このレビューは AI によって自動生成されました。最終的な判断は人間の開発者が行ってください。*';

    return comment;
  }

  private _buildPrompt(pr: PullRequest, updates: DependencyUpdate[]): string {
    let prompt = `依存関係更新PRのレビューを行ってください。\n\n`;

    prompt += `**PR情報:**\n`;
    prompt += `- タイトル: ${pr.title}\n`;
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

    prompt += `以下の観点から分析してください:\n`;
    prompt += `1. セキュリティリスク\n`;
    prompt += `2. 破壊的変更の可能性\n`;
    prompt += `3. パフォーマンスへの影響\n`;
    prompt += `4. 必要なテスト\n`;
    prompt += `5. 総合的な推奨事項 (approve/request_changes/needs_investigation)\n`;

    return prompt;
  }

  private parseAiResponse(response: string, _updates: DependencyUpdate[]): AIReviewResult {
    // Default fallback result
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
      // Simple parsing logic - in a real implementation, this would be more sophisticated
      const result: AIReviewResult = {
        summary: this.extractSection(response, 'summary') || defaultResult.summary,
        recommendation: this.extractRecommendation(response) || defaultResult.recommendation,
        securityIssues: this.extractList(response, 'security'),
        breakingChanges: this.extractList(response, 'breaking'),
        performanceImpact: this.extractList(response, 'performance'),
        testingRequirements: this.extractList(response, 'test') ||
          defaultResult.testingRequirements,
        additionalNotes: this.extractList(response, 'notes'),
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
    if (lower.includes('approve')) return 'approve';
    if (lower.includes('request_changes') || lower.includes('changes')) return 'request_changes';
    if (lower.includes('investigation') || lower.includes('investigate')) {
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
