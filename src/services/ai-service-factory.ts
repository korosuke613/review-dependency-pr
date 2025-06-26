import { AiReviewServiceImpl } from './ai-review.ts';
import { GitHubModelsAiService } from './github-models-ai.ts';
import type { AiReviewService } from './ai-review.ts';

export function createAiReviewService(
  provider: 'github-actions' | 'github-models' = 'github-actions',
  config?: {
    token?: string;
    model?: string | undefined;
    endpoint?: string | undefined;
  },
): AiReviewService {
  switch (provider) {
    case 'github-models': {
      if (!config?.token) {
        throw new Error('GitHub token is required for GitHub Models provider');
      }

      return new GitHubModelsAiService({
        token: config.token,
        model: config.model || 'gpt-4o',
        ...(config.endpoint && { endpoint: config.endpoint }),
      });
    }

    case 'github-actions':
    default:
      return new AiReviewServiceImpl();
  }
}
