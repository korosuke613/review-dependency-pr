import type { PullRequest, PullRequestFile } from '../../src/types/github.ts';

export const mockRenovatePR: PullRequest = {
  number: 123,
  title: 'Update dependency @types/node to v20.10.0',
  body:
    'This PR contains the following updates:\n\n| Package | Change | Age | Adoption | Passing | Confidence |\n|---|---|---|---|---|---|\n| [@types/node](https://togithub.com/DefinitelyTyped/DefinitelyTyped/tree/HEAD/types/node) ([source](https://togithub.com/DefinitelyTyped/DefinitelyTyped)) | [`20.9.0` -> `20.10.0`](https://renovatebot.com/diffs/npm/@types%2fnode/20.9.0/20.10.0) | [![age](https://developer.mend.io/api/mc/badges/age/npm/@types%2fnode/20.10.0?slim=true)](https://docs.renovatebot.com/merge-confidence/) | [![adoption](https://developer.mend.io/api/mc/badges/adoption/npm/@types%2fnode/20.10.0?slim=true)](https://docs.renovatebot.com/merge-confidence/) | [![passing](https://developer.mend.io/api/mc/badges/compatibility/npm/@types%2fnode/20.9.0/20.10.0?slim=true)](https://docs.renovatebot.com/merge-confidence/) | [![confidence](https://developer.mend.io/api/mc/badges/confidence/npm/@types%2fnode/20.9.0/20.10.0?slim=true)](https://docs.renovatebot.com/merge-confidence/) |',
  user: {
    login: 'renovate[bot]',
    type: 'Bot',
  },
  base: {
    ref: 'main',
    sha: 'abc123',
  },
  head: {
    ref: 'renovate/types-node-20.x',
    sha: 'def456',
  },
  state: 'open',
  draft: false,
  mergeable: true,
  changed_files: 1,
  additions: 1,
  deletions: 1,
};

export const mockNonRenovatePR: PullRequest = {
  number: 124,
  title: 'Add new feature',
  body: 'This PR adds a new feature',
  user: {
    login: 'developer',
    type: 'User',
  },
  base: {
    ref: 'main',
    sha: 'abc123',
  },
  head: {
    ref: 'feature/new-feature',
    sha: 'ghi789',
  },
  state: 'open',
  draft: false,
  mergeable: true,
  changed_files: 3,
  additions: 50,
  deletions: 10,
};

export const mockPackageJsonFile: PullRequestFile = {
  filename: 'package.json',
  status: 'modified',
  additions: 1,
  deletions: 1,
  changes: 2,
  patch: `@@ -15,7 +15,7 @@
   "devDependencies": {
     "@types/node": "^20.9.0",
     "typescript": "^5.0.0"
   }
-    "@types/node": "^20.9.0",
+    "@types/node": "^20.10.0",
   }`,
};

export const mockCargoTomlFile: PullRequestFile = {
  filename: 'Cargo.toml',
  status: 'modified',
  additions: 1,
  deletions: 1,
  changes: 2,
  patch: `@@ -8,7 +8,7 @@
 [dependencies]
-serde = "1.0.190"
+serde = "1.0.193"
 tokio = { version = "1.0", features = ["full"] }`,
};

export const mockNonDependencyFile: PullRequestFile = {
  filename: 'src/main.ts',
  status: 'modified',
  additions: 5,
  deletions: 2,
  changes: 7,
  patch: `@@ -1,6 +1,9 @@
 import { serve } from 'https://deno.land/std/http/server.ts';
 
+// Add new functionality
+const PORT = 8000;
+
 serve((req) => {
-  return new Response('Hello World');
+  return new Response('Hello World!');
 });`,
};
