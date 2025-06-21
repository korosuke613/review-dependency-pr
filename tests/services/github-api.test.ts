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
    },
  };
}

Deno.test('GitHubApiService', async (t) => {
  const service = new GitHubApiServiceImpl('test-token', 'owner', 'repo');

  // Override the octokit instance for testing
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
});
