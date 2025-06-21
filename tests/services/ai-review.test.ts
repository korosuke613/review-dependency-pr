import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { AiReviewServiceImpl } from '../../src/services/ai-review.ts';
import { mockRenovatePR } from '../mocks/github-data.ts';
import type { AIReviewResult, DependencyUpdate } from '../../src/types/github.ts';

Deno.test('AiReviewService', async (t) => {
  const service = new AiReviewServiceImpl();

  const mockUpdates: DependencyUpdate[] = [
    {
      packageName: '@types/node',
      currentVersion: '20.9.0',
      newVersion: '20.10.0',
      ecosystem: 'npm',
      changeType: 'minor',
    },
    {
      packageName: 'react',
      currentVersion: '17.0.0',
      newVersion: '18.0.0',
      ecosystem: 'npm',
      changeType: 'major',
    },
  ];

  await t.step('should generate default review when no AI response', async () => {
    // Clear environment variable
    const originalAiReview = Deno.env.get('AI_REVIEW');
    Deno.env.delete('AI_REVIEW');

    const result = await service.generateReview(mockRenovatePR, mockUpdates);

    assertEquals(result.recommendation, 'needs_investigation');
    assertEquals(result.testingRequirements.length > 0, true);

    // Restore environment variable
    if (originalAiReview) {
      Deno.env.set('AI_REVIEW', originalAiReview);
    }
  });

  await t.step('should format review comment correctly', () => {
    const mockResult: AIReviewResult = {
      summary: 'Two dependency updates detected',
      recommendation: 'request_changes',
      securityIssues: ['Potential security issue with React 18'],
      breakingChanges: ['React 18 has breaking changes'],
      performanceImpact: ['Improved performance expected'],
      testingRequirements: ['Run component tests', 'Test React 18 compatibility'],
      additionalNotes: ['Consider migration guide'],
    };

    const comment = service.formatReviewComment(mockResult);

    assertStringIncludes(comment, '🤖 AI レビュー: 依存関係更新');
    assertStringIncludes(comment, 'Two dependency updates detected');
    assertStringIncludes(comment, '⚠️ **変更要求**');
    assertStringIncludes(comment, '🔒 セキュリティ関連');
    assertStringIncludes(comment, 'Potential security issue with React 18');
    assertStringIncludes(comment, '💥 破壊的変更');
    assertStringIncludes(comment, 'React 18 has breaking changes');
    assertStringIncludes(comment, '⚡ パフォーマンス影響');
    assertStringIncludes(comment, 'Improved performance expected');
    assertStringIncludes(comment, '🧪 テスト要件');
    assertStringIncludes(comment, 'Run component tests');
    assertStringIncludes(comment, '📝 追加事項');
    assertStringIncludes(comment, 'Consider migration guide');
  });

  await t.step('should format approve recommendation correctly', () => {
    const mockResult: AIReviewResult = {
      summary: 'Safe updates',
      recommendation: 'approve',
      securityIssues: [],
      breakingChanges: [],
      performanceImpact: [],
      testingRequirements: [],
      additionalNotes: [],
    };

    const comment = service.formatReviewComment(mockResult);
    assertStringIncludes(comment, '✅ **承認**');
  });

  await t.step('should format needs_investigation recommendation correctly', () => {
    const mockResult: AIReviewResult = {
      summary: 'Complex updates',
      recommendation: 'needs_investigation',
      securityIssues: [],
      breakingChanges: [],
      performanceImpact: [],
      testingRequirements: [],
      additionalNotes: [],
    };

    const comment = service.formatReviewComment(mockResult);
    assertStringIncludes(comment, '🔍 **要調査**');
  });

  await t.step('should handle empty sections gracefully', () => {
    const mockResult: AIReviewResult = {
      summary: 'Simple update',
      recommendation: 'approve',
      securityIssues: [],
      breakingChanges: [],
      performanceImpact: [],
      testingRequirements: [],
      additionalNotes: [],
    };

    const comment = service.formatReviewComment(mockResult);

    // Should not include empty sections
    assertEquals(comment.includes('🔒 セキュリティ関連'), false);
    assertEquals(comment.includes('💥 破壊的変更'), false);
    assertEquals(comment.includes('⚡ パフォーマンス影響'), false);
    assertEquals(comment.includes('📝 追加事項'), false);

    // Should still include basic structure
    assertStringIncludes(comment, '📋 概要');
    assertStringIncludes(comment, '🎯 推奨事項');
  });
});
