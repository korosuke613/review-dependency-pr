#!/usr/bin/env -S deno run --allow-net --allow-env

import { GitHubApiServiceImpl } from './services/github-api.ts';
import { PrAnalyzerServiceImpl } from './services/pr-analyzer.ts';
import { AiReviewServiceImpl } from './services/ai-review.ts';
import type { Environment } from './types/config.ts';

async function main() {
  try {
    const env = getEnvironment();
    const [owner, repo] = env.GITHUB_REPOSITORY.split('/');
    const prNumber = parseInt(env.PR_NUMBER, 10);

    console.log(`Processing PR #${prNumber} in ${env.GITHUB_REPOSITORY}`);

    // Initialize services
    if (!owner || !repo) {
      throw new Error('Invalid GITHUB_REPOSITORY format. Expected owner/repo');
    }

    const githubApi = new GitHubApiServiceImpl(env.GITHUB_TOKEN, owner, repo);

    // Use AI_REVIEW from environment if available
    if (env.AI_REVIEW) {
      console.log('Using AI review from GitHub Actions');

      // Post the AI review directly from environment variable
      await githubApi.createComment(prNumber, env.AI_REVIEW);

      console.log('✅ AI review comment posted successfully');
      return;
    }

    // Fallback to original logic if AI_REVIEW is not available
    console.log('AI_REVIEW not found in environment, running local AI review');

    const prAnalyzer = new PrAnalyzerServiceImpl();
    const aiReview = new AiReviewServiceImpl();

    // Get PR information
    const pr = await githubApi.getPullRequest(prNumber);

    // Check if this is a Renovate PR
    if (!githubApi.isRenovatePR(pr)) {
      console.log('This is not a Renovate PR, skipping AI review');
      return;
    }

    console.log(`Analyzing Renovate PR: ${pr.title}`);

    // Get changed files
    const files = await githubApi.getPullRequestFiles(prNumber);

    // Analyze dependency updates
    const updates = prAnalyzer.analyzeDependencyUpdates(pr, files);

    console.log(`Found ${updates.length} dependency updates`);
    updates.forEach((update) => {
      console.log(
        `- ${update.packageName}: ${update.currentVersion} → ${update.newVersion} (${update.changeType})`,
      );
    });

    // Generate AI review
    const reviewResult = await aiReview.generateReview(pr, updates);

    // Format review comment
    const commentBody = aiReview.formatReviewComment(reviewResult);

    // Post comment to PR
    await githubApi.createComment(prNumber, commentBody);

    console.log('✅ AI review comment posted successfully');
    console.log(`Recommendation: ${reviewResult.recommendation}`);
  } catch (error) {
    console.error('❌ Error processing PR:', error);
    Deno.exit(1);
  }
}

function getEnvironment(): Environment {
  const requiredEnvVars = {
    GITHUB_TOKEN: Deno.env.get('GITHUB_TOKEN'),
    GITHUB_REPOSITORY: Deno.env.get('GITHUB_REPOSITORY'),
    PR_NUMBER: Deno.env.get('PR_NUMBER'),
  };

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    GITHUB_TOKEN: requiredEnvVars.GITHUB_TOKEN!,
    GITHUB_REPOSITORY: requiredEnvVars.GITHUB_REPOSITORY!,
    PR_NUMBER: requiredEnvVars.PR_NUMBER!,
    AI_REVIEW: Deno.env.get('AI_REVIEW'),
  };
}

if (import.meta.main) {
  await main();
}
