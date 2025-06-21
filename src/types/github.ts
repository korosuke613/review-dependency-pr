export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  user: {
    login: string;
    type: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  state: 'open' | 'closed';
  draft: boolean;
  mergeable: boolean | null;
  changed_files: number;
  additions: number;
  deletions: number;
}

export interface PullRequestFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface ReviewComment {
  body: string;
  path?: string;
  position?: number;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
}

export interface AIReviewResult {
  summary: string;
  recommendation: 'approve' | 'request_changes' | 'needs_investigation';
  securityIssues: string[];
  breakingChanges: string[];
  performanceImpact: string[];
  testingRequirements: string[];
  additionalNotes: string[];
}

export interface DependencyUpdate {
  packageName: string;
  currentVersion: string;
  newVersion: string;
  ecosystem: string;
  changeType: 'major' | 'minor' | 'patch';
  releaseNotes?: string;
  vulnerabilities?: Array<{
    severity: 'low' | 'moderate' | 'high' | 'critical';
    description: string;
    cve?: string;
  }>;
}

export interface IssueComment {
  id: number;
  body: string;
  user: {
    login: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
}
