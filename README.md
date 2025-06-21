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

To use this review functionality in your repository, create a workflow file like this:

```yaml
name: Review Dependency PR

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
      github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Parameters

#### Required Parameters

- `pr_number`: The PR number to review

#### Optional Parameters

- `ai_model`: AI model to use (default: `openai/gpt-4o`)
- `max_tokens`: Maximum tokens for AI response (default: `2000`)
- `diff_lines_limit`: Maximum lines of diff to include in review (default: `3000`)
- `review_language`: Language for review output (`en` or `ja`, default: `en`)

#### Required Secrets

- `github_token`: GitHub token for API access (usually `${{ secrets.GITHUB_TOKEN }}`)

### Permissions

The following permissions are required in the repository where you use this:

- `contents: read`
- `pull-requests: write`
- `models: read`

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
