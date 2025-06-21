import type { DependencyUpdate, PullRequest, PullRequestFile } from '../types/github.ts';

export interface PrAnalyzerService {
  analyzeDependencyUpdates(pr: PullRequest, files: PullRequestFile[]): DependencyUpdate[];
  extractVersionChanges(content: string): Array<{ from: string; to: string }>;
  determineChangeType(currentVersion: string, newVersion: string): 'major' | 'minor' | 'patch';
}

export class PrAnalyzerServiceImpl implements PrAnalyzerService {
  analyzeDependencyUpdates(_pr: PullRequest, files: PullRequestFile[]): DependencyUpdate[] {
    const updates: DependencyUpdate[] = [];

    for (const file of files) {
      if (this.isDependencyFile(file.filename)) {
        const ecosystem = this.getEcosystem(file.filename);
        const packageUpdates = this.extractPackageUpdates(file, ecosystem);
        updates.push(...packageUpdates);
      }
    }

    return updates;
  }

  extractVersionChanges(content: string): Array<{ from: string; to: string }> {
    const changes: Array<{ from: string; to: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('-') && !line.startsWith('---')) {
        const nextLineIndex = lines.indexOf(line) + 1;
        const nextLine = lines[nextLineIndex];

        if (nextLine?.startsWith('+') && !nextLine.startsWith('+++')) {
          const fromVersion = this.extractVersion(line.substring(1));
          const toVersion = this.extractVersion(nextLine.substring(1));

          if (fromVersion && toVersion) {
            changes.push({ from: fromVersion, to: toVersion });
          }
        }
      }
    }

    return changes;
  }

  determineChangeType(currentVersion: string, newVersion: string): 'major' | 'minor' | 'patch' {
    const current = this.parseVersion(currentVersion);
    const next = this.parseVersion(newVersion);

    if (next.major !== current.major) return 'major';
    if (next.minor !== current.minor) return 'minor';
    return 'patch';
  }

  private isDependencyFile(filename: string): boolean {
    const dependencyFiles = [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'Cargo.toml',
      'Cargo.lock',
      'requirements.txt',
      'poetry.lock',
      'go.mod',
      'go.sum',
      'deno.json',
      'deno.lock',
    ];

    return dependencyFiles.some((file) => filename.endsWith(file));
  }

  private getEcosystem(filename: string): string {
    if (filename.includes('package')) return 'npm';
    if (filename.includes('Cargo')) return 'cargo';
    if (filename.includes('requirements') || filename.includes('poetry')) return 'pip';
    if (filename.includes('go.')) return 'go';
    if (filename.includes('deno')) return 'deno';
    return 'unknown';
  }

  private extractPackageUpdates(file: PullRequestFile, ecosystem: string): DependencyUpdate[] {
    if (!file.patch) return [];

    const updates: DependencyUpdate[] = [];
    const versionChanges = this.extractVersionChanges(file.patch);

    for (const change of versionChanges) {
      const packageName = this.extractPackageName(file.patch, change.from);
      if (packageName !== null) {
        updates.push({
          packageName,
          currentVersion: change.from,
          newVersion: change.to,
          ecosystem,
          changeType: this.determineChangeType(change.from, change.to),
        });
      }
    }

    return updates;
  }

  private extractVersion(line: string): string | null {
    const versionRegex = /(\d+\.\d+\.\d+(?:-[\w\d.-]+)?(?:\+[\w\d.-]+)?)/;
    const match = line.match(versionRegex);
    return match?.[1] ?? null;
  }

  private extractPackageName(patch: string, version: string): string | null {
    const lines = patch.split('\n');

    for (const line of lines) {
      if (line.includes(version)) {
        // JSON format (package.json, package-lock.json)
        const jsonRegex = /"([^"]+)":\s*"[^"]*"/;
        const jsonMatch = line.match(jsonRegex);
        if (jsonMatch?.[1]) return jsonMatch[1];

        // TOML format (Cargo.toml)
        const tomlRegex = /^[+-]?\s*([a-zA-Z0-9_-]+)\s*=\s*"[^"]*"/;
        const tomlMatch = line.match(tomlRegex);
        if (tomlMatch?.[1]) return tomlMatch[1];

        // YAML format (other dependency files)
        const yamlRegex = /^[+-]?\s*([a-zA-Z0-9_-]+):\s*/;
        const yamlMatch = line.match(yamlRegex);
        if (yamlMatch?.[1]) return yamlMatch[1];
      }
    }

    return null;
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    // Remove prefixes (^, ~, >=, etc.) and extract version numbers
    const cleaned = version.replace(/^[^\d]*/, '');
    const versionMatch = cleaned.match(/(\d+)\.(\d+)\.(\d+)/);

    if (versionMatch) {
      return {
        major: parseInt(versionMatch[1]!, 10),
        minor: parseInt(versionMatch[2]!, 10),
        patch: parseInt(versionMatch[3]!, 10),
      };
    }

    // Fallback for incomplete versions
    const parts = cleaned.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }
}
