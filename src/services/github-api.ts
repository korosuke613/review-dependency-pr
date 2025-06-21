import { Octokit } from '@octokit/rest';
import type { PullRequest, PullRequestFile } from '../types/github.ts';

export interface GitHubApiService {
  getPullRequest(prNumber: number): Promise<PullRequest>;
  getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]>;
  createComment(prNumber: number, body: string): Promise<void>;
  isRenovatePR(pr: PullRequest): boolean;
}

export class GitHubApiServiceImpl implements GitHubApiService {
  private octokit: InstanceType<typeof Octokit>;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async getPullRequest(prNumber: number): Promise<PullRequest> {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      user: {
        login: data.user?.login || '',
        type: data.user?.type || '',
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha,
      },
      head: {
        ref: data.head.ref,
        sha: data.head.sha,
      },
      state: data.state as 'open' | 'closed',
      draft: data.draft ?? false,
      mergeable: data.mergeable,
      changed_files: data.changed_files,
      additions: data.additions,
      deletions: data.deletions,
    };
  }

  async getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]> {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
    });

    return data.map((file: any) => ({
      filename: file.filename,
      status: file.status as PullRequestFile['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      previous_filename: file.previous_filename,
    }));
  }

  async createComment(prNumber: number, body: string): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body,
    });
  }

  isRenovatePR(pr: PullRequest): boolean {
    return pr.user.login === 'renovate[bot]' ||
      pr.user.login === 'renovate' ||
      pr.title.toLowerCase().includes('renovate') ||
      pr.body?.toLowerCase().includes('renovate') === true;
  }
}
