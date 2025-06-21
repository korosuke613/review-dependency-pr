import { assertEquals } from 'jsr:@std/assert';
import { GitHubApiServiceImpl } from '../../src/services/github-api.ts';
import { mockNonRenovatePR, mockRenovatePR } from '../mocks/github-data.ts';

// Mock Octokit for testing
class MockOctokit {
  rest = {
    pulls: {
      get: () => Promise.resolve({ data: mockRenovatePR }),
      listFiles: () => Promise.resolve({ data: [] }),
    },
    issues: {
      createComment: () => Promise.resolve({}),
      listComments: () => Promise.resolve({ data: [] }),
      updateComment: () => Promise.resolve({}),
    },
  };
}

Deno.test('GitHubApiService', async (t) => {
  const service = new GitHubApiServiceImpl('test-token', 'owner', 'repo');

  // Override the octokit instance for testing
  // deno-lint-ignore no-explicit-any
  (service as any).octokit = new MockOctokit();

  await t.step('should identify Renovate PR correctly', () => {
    assertEquals(service.isRenovatePR(mockRenovatePR), true);
    assertEquals(service.isRenovatePR(mockNonRenovatePR), false);
  });

  await t.step('should identify Renovate PR by username variations', () => {
    const renovateVariations = [
      { ...mockRenovatePR, user: { login: 'renovate[bot]', type: 'Bot' } },
      { ...mockRenovatePR, user: { login: 'renovate', type: 'User' } },
    ];

    renovateVariations.forEach((pr) => {
      assertEquals(service.isRenovatePR(pr), true);
    });
  });

  await t.step('should identify Renovate PR by title', () => {
    const renovateByTitle = {
      ...mockNonRenovatePR,
      title: 'renovate: update dependencies',
    };

    assertEquals(service.isRenovatePR(renovateByTitle), true);
  });

  await t.step('should identify Renovate PR by body', () => {
    const renovateByBody = {
      ...mockNonRenovatePR,
      body: 'This PR was created by Renovate Bot',
    };

    assertEquals(service.isRenovatePR(renovateByBody), true);
  });

  await t.step('should get PR information', async () => {
    const pr = await service.getPullRequest(123);
    assertEquals(pr.number, mockRenovatePR.number);
    assertEquals(pr.title, mockRenovatePR.title);
    assertEquals(pr.user.login, mockRenovatePR.user.login);
  });

  await t.step('should get PR files', async () => {
    const files = await service.getPullRequestFiles(123);
    assertEquals(Array.isArray(files), true);
  });

  await t.step('should get issue comments', async () => {
    const comments = await service.getIssueComments(123);
    assertEquals(Array.isArray(comments), true);
  });

  await t.step('should create new AI review comment when no existing comment', async () => {
    // deno-lint-ignore no-explicit-any
    const mockOctokit = (service as any).octokit;
    let createCommentCalled = false;
    let updateCommentCalled = false;

    mockOctokit.rest.issues.listComments = () => Promise.resolve({ data: [] });
    mockOctokit.rest.issues.createComment = () => {
      createCommentCalled = true;
      return Promise.resolve({
        data: {
          id: 456,
          html_url: 'https://github.com/owner/repo/pull/123#issuecomment-456',
        },
      });
    };
    mockOctokit.rest.issues.updateComment = () => {
      updateCommentCalled = true;
      return Promise.resolve({});
    };

    const result = await service.createOrUpdateReviewComment(123, 'Test AI review');

    assertEquals(createCommentCalled, true);
    assertEquals(updateCommentCalled, false);
    assertEquals(result.action, 'created');
    assertEquals(result.commentId, 456);
    assertEquals(result.commentUrl, 'https://github.com/owner/repo/pull/123#issuecomment-456');
  });

  await t.step('should update existing AI review comment when found', async () => {
    // deno-lint-ignore no-explicit-any
    const mockOctokit = (service as any).octokit;
    let createCommentCalled = false;
    let updateCommentCalled = false;

    const mockComments = [{
      id: 123,
      body: '<!-- AI-REVIEW-COMMENT -->\nPrevious AI review',
      user: { login: 'github-actions[bot]', type: 'Bot' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }];

    mockOctokit.rest.issues.listComments = () => Promise.resolve({ data: mockComments });
    mockOctokit.rest.issues.createComment = () => {
      createCommentCalled = true;
      return Promise.resolve({});
    };
    mockOctokit.rest.issues.updateComment = () => {
      updateCommentCalled = true;
      return Promise.resolve({});
    };

    const result = await service.createOrUpdateReviewComment(123, 'Updated AI review');

    assertEquals(createCommentCalled, false);
    assertEquals(updateCommentCalled, true);
    assertEquals(result.action, 'updated');
    assertEquals(result.commentId, 123);
    assertEquals(result.commentUrl, 'https://github.com/owner/repo/pull/123#issuecomment-123');
  });
});
