import { Octokit } from '@octokit/rest';
import type { IssueComment, PullRequest, PullRequestFile } from '../types/github.ts';

export interface GitHubApiService {
  getPullRequest(prNumber: number): Promise<PullRequest>;
  getPullRequestFiles(prNumber: number): Promise<PullRequestFile[]>;
  createComment(prNumber: number, body: string): Promise<void>;
  getIssueComments(prNumber: number): Promise<IssueComment[]>;
  updateComment(commentId: number, body: string): Promise<void>;
  createOrUpdateReviewComment(prNumber: number, body: string): Promise<void>;
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

    return data.map((file) => ({
      filename: file.filename,
      status: file.status as PullRequestFile['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      ...(file.patch && { patch: file.patch }),
      ...(file.previous_filename && { previous_filename: file.previous_filename }),
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

  async getIssueComments(prNumber: number): Promise<IssueComment[]> {
    const { data } = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
    });

    return data.map((comment) => ({
      id: comment.id,
      body: comment.body || '',
      user: {
        login: comment.user?.login || '',
        type: comment.user?.type || '',
      },
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    }));
  }

  async updateComment(commentId: number, body: string): Promise<void> {
    await this.octokit.rest.issues.updateComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: commentId,
      body,
    });
  }

  async createOrUpdateReviewComment(prNumber: number, body: string): Promise<void> {
    const AI_REVIEW_IDENTIFIER = '<!-- AI-REVIEW-COMMENT -->';
    const commentWithIdentifier = `${AI_REVIEW_IDENTIFIER}\n${body}`;

    const comments = await this.getIssueComments(prNumber);
    const existingAiComment = comments.find((comment) =>
      comment.body.includes(AI_REVIEW_IDENTIFIER)
    );

    if (existingAiComment) {
      await this.updateComment(existingAiComment.id, commentWithIdentifier);
    } else {
      await this.createComment(prNumber, commentWithIdentifier);
    }
  }

  isRenovatePR(pr: PullRequest): boolean {
    return pr.user.login === 'renovate[bot]' ||
      pr.user.login === 'renovate' ||
      pr.title.toLowerCase().includes('renovate') ||
      pr.body?.toLowerCase().includes('renovate') === true;
  }
}
