#!/usr/bin/env -S deno run --allow-net --allow-env

import { GitHubApiServiceImpl } from './services/github-api.ts';
import { PrAnalyzerServiceImpl } from './services/pr-analyzer.ts';
import { createAiReviewService } from './services/ai-service-factory.ts';

async function main() {
  console.log('🤖 Dependency PR Review System');
  console.log('================================');

  // GitHub ActionsからPR_NUMBER環境変数が設定されている場合はそれを使用
  const prNumberEnv = Deno.env.get('PR_NUMBER');
  if (prNumberEnv) {
    const prNumber = parseInt(prNumberEnv, 10);
    if (!isNaN(prNumber)) {
      await reviewPR(prNumber);
      return;
    }
  }

  const args = Deno.args;

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  deno run --allow-net --allow-env src/main.ts <command>');
    console.log('');
    console.log('Commands:');
    console.log('  review <pr-number>  - Review a specific PR');
    console.log('  help                - Show this help message');
    console.log('');
    console.log('Environment Variables:');
    console.log('  PR_NUMBER           - PR number to review (for GitHub Actions)');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'review': {
      if (args.length < 2) {
        console.error('Error: PR number is required for review command');
        Deno.exit(1);
      }
      const prArg = args[1];
      if (!prArg) {
        console.error('Error: PR number is required for review command');
        Deno.exit(1);
      }
      await reviewPR(parseInt(prArg, 10));
      break;
    }

    case 'help':
      console.log('Dependency PR Review System Help');
      console.log('This tool analyzes dependency update PRs created by Renovate');
      console.log('and provides AI-powered reviews focusing on security, compatibility,');
      console.log('and testing requirements.');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Use "help" command for usage information');
      Deno.exit(1);
  }
}

async function reviewPR(prNumber: number) {
  try {
    const token = Deno.env.get('GITHUB_TOKEN');
    const repository = Deno.env.get('GITHUB_REPOSITORY');

    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    if (!repository) {
      throw new Error('GITHUB_REPOSITORY environment variable is required');
    }

    const [owner, repo] = repository.split('/');

    console.log(`🔍 Analyzing PR #${prNumber} in ${repository}`);

    // Initialize services
    if (!owner || !repo) {
      throw new Error('Invalid GITHUB_REPOSITORY format. Expected owner/repo');
    }

    const githubApi = new GitHubApiServiceImpl(token, owner, repo);
    const prAnalyzer = new PrAnalyzerServiceImpl();

    // AI プロバイダーの選択
    const aiProvider = Deno.env.get('AI_PROVIDER') as 'github-actions' | 'github-models' ||
      'github-actions';
    const aiModel = Deno.env.get('AI_MODEL');
    const aiEndpoint = Deno.env.get('AI_ENDPOINT');

    const aiReview = createAiReviewService(aiProvider, {
      token,
      ...(aiModel && { model: aiModel }),
      ...(aiEndpoint && { endpoint: aiEndpoint }),
    });

    // Get PR information
    const pr = await githubApi.getPullRequest(prNumber);

    console.log(`📋 PR Title: ${pr.title}`);
    console.log(`👤 Author: ${pr.user.login}`);

    // Check if this is a Renovate PR
    if (!githubApi.isRenovatePR(pr)) {
      console.log('⚠️  This is not a Renovate PR');
      return;
    }

    console.log('✅ Confirmed as Renovate PR');

    // Get changed files
    console.log('📂 Analyzing changed files...');
    const files = await githubApi.getPullRequestFiles(prNumber);

    // Analyze dependency updates
    const updates = prAnalyzer.analyzeDependencyUpdates(pr, files);

    console.log(`📦 Found ${updates.length} dependency updates:`);
    updates.forEach((update) => {
      console.log(
        `   • ${update.packageName}: ${update.currentVersion} → ${update.newVersion} (${update.changeType})`,
      );
    });

    // Generate AI review
    console.log('🤖 Generating AI review...');
    const reviewResult = await aiReview.generateReview(pr, updates);

    console.log('📝 Review Summary:');
    console.log(`   Summary: ${reviewResult.summary}`);
    console.log(`   Recommendation: ${reviewResult.recommendation}`);

    if (reviewResult.securityIssues.length > 0) {
      console.log(`   Security Issues: ${reviewResult.securityIssues.length}`);
    }

    if (reviewResult.breakingChanges.length > 0) {
      console.log(`   Breaking Changes: ${reviewResult.breakingChanges.length}`);
    }

    // Format and post review comment
    console.log('📤 Posting review comment...');
    const comment = aiReview.formatReviewComment(reviewResult);
    await githubApi.createOrUpdateReviewComment(prNumber, comment);

    console.log('✅ Review posted successfully');
  } catch (error) {
    console.error('❌ Error analyzing PR:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
