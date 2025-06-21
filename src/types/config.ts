export interface Config {
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  ai: {
    model: string;
    provider: string;
  };
}

export interface Environment {
  GITHUB_TOKEN: string;
  GITHUB_REPOSITORY: string;
  PR_NUMBER: string;
  AI_REVIEW: string | undefined;
}
