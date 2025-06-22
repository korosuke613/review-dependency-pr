export interface Config {
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  ai: {
    model: string;
    provider: 'github-actions' | 'github-models';
    endpoint?: string;
  };
}

export interface Environment {
  GITHUB_TOKEN: string;
  GITHUB_REPOSITORY: string;
  PR_NUMBER: string;
  AI_REVIEW: string | undefined;
  AI_PROVIDER?: 'github-actions' | 'github-models';
  AI_MODEL?: string;
  AI_ENDPOINT?: string;
}
