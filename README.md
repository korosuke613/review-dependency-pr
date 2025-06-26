# Review Dependency PR

Automated AI review tool for dependency update pull requests

## Overview

This tool provides automated AI reviews for dependency update PRs created by Renovate using GitHub Models.

## Features

- Automated review of dependency update PRs
- Security impact analysis
- Compatibility checking
- Performance impact analysis
- Specific actionable recommendations

## Usage

This tool provides two approaches for AI-powered dependency PR reviews:

### 1. GitHub Actions Built-in AI (Recommended)

Uses GitHub Actions' built-in AI capabilities with `actions/ai-inference`.

```yaml
name: Review Dependency PR (GitHub Actions AI)

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
        type: number

jobs:
  get-pr-number:
    name: Get PR Number
    runs-on: ubuntu-latest
    if: github.actor == 'renovate[bot]' || github.event_name == 'workflow_dispatch'
    outputs:
      pr_number: ${{ steps.get-pr.outputs.pr_number }}
    steps:
      - name: Get PR number
        id: get-pr
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "pr_number=${{ github.event.inputs.pr_number }}" >> $GITHUB_OUTPUT
          else
            echo "pr_number=${{ github.event.number }}" >> $GITHUB_OUTPUT
          fi

  review:
    permissions:
      contents: read
      pull-requests: write
      models: read
    name: AI Review for Dependency Updates
    needs: get-pr-number
    uses: korosuke613/review-dependency-pr/.github/workflows/reusable-review-dependency-pr.yml@main
    with:
      pr_number: ${{ fromJson(needs.get-pr-number.outputs.pr_number) }}
      # Optional: Customize the following parameters
      # ai_model: 'openai/gpt-4o'
      # max_tokens: 2000
      # diff_lines_limit: 3000
      # review_language: 'en'
    secrets:
      token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. GitHub Models Direct API

Uses GitHub Models API directly for more flexibility and local development support.

```yaml
name: Review Dependency PR (Direct API)

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
        type: number

jobs:
  get-pr-number:
    name: Get PR Number
    runs-on: ubuntu-latest
    if: github.actor == 'renovate[bot]' || github.event_name == 'workflow_dispatch'
    outputs:
      pr_number: ${{ steps.get-pr.outputs.pr_number }}
    steps:
      - name: Get PR number
        id: get-pr
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "pr_number=${{ github.event.inputs.pr_number }}" >> $GITHUB_OUTPUT
          else
            echo "pr_number=${{ github.event.number }}" >> $GITHUB_OUTPUT
          fi

  review:
    permissions:
      contents: read
      pull-requests: write
    name: AI Review for Dependency Updates (Direct API)
    needs: get-pr-number
    uses: korosuke613/review-dependency-pr/.github/workflows/reusable-review-dependency-pr-direct.yml@main
    with:
      pr_number: ${{ fromJson(needs.get-pr-number.outputs.pr_number) }}
      # Optional: Customize the following parameters
      # ai_model: 'gpt-4o'
      # ai_endpoint: 'https://models.inference.ai.azure.com'
      # max_tokens: 2000
      # diff_lines_limit: 3000
      # review_language: 'en'
    secrets:
      github_token: ${{ secrets.GITHUB_TOKEN }} # Requires GitHub Personal Access Token
```

### Parameters

#### Required Parameters

- `pr_number`: The PR number to review

#### Optional Parameters

**Common to both approaches:**

- `max_tokens`: Maximum tokens for AI response (default: `2000`)
- `diff_lines_limit`: Maximum lines of diff to include in review (default: `3000`)
- `review_language`: Language for review output (`en` or `ja`, default: `en`)

**GitHub Actions AI specific:**

- `ai_model`: AI model to use (default: `openai/gpt-4o`)

**Direct API specific:**

- `ai_model`: AI model to use (default: `gpt-4o`)
- `ai_endpoint`: AI endpoint URL (default: `https://models.inference.ai.azure.com`)

#### Required Secrets

**GitHub Actions AI:**

- `token`: GitHub token for API access (usually `${{ secrets.GITHUB_TOKEN }}`)

**Direct API:**

- `github_token`: GitHub Personal Access Token for GitHub Models API

### Permissions

**GitHub Actions AI:**

- `contents: read`
- `pull-requests: write`
- `models: read`

**Direct API:**

- `contents: read`
- `pull-requests: write`

### Local Development

For local development and testing, you can also run the tool directly:

```bash
# Set environment variables
export GITHUB_TOKEN="your_github_token"
export GITHUB_REPOSITORY="owner/repo"
export AI_PROVIDER="github-models"  # or "github-actions"
export AI_MODEL="gpt-4o"

# Run review for a specific PR
deno run --allow-net --allow-env --allow-sys src/main.ts review 123

# Or use environment variable
export PR_NUMBER=123
deno run --allow-net --allow-env --allow-sys src/main.ts
```

**Note on Azure SDK:** The direct API mode uses the `@azure-rest/ai-inference` package, which may have its own system-level dependencies. If you encounter issues, please refer to the Azure SDK for JavaScript documentation.


## Development

### Prerequisites

- Deno v2.x
- GitHub CLI

### Setup

```bash
# Clone the repository
git clone https://github.com/korosuke613/review-dependency-pr.git
cd review-dependency-pr

# Check development environment
deno --version
```

### Testing

```bash
# Run tests
deno test --allow-env

# Format code
deno fmt

# Type checking
deno check **/*.ts
```

## License

MIT License
