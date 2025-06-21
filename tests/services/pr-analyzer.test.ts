import { assertEquals } from 'jsr:@std/assert';
import { PrAnalyzerServiceImpl } from '../../src/services/pr-analyzer.ts';
import {
  mockCargoTomlFile,
  mockDependabotPackageJsonFile,
  mockDependabotPR,
  mockNonDependencyFile,
  mockPackageJsonFile,
  mockRenovatePR,
} from '../mocks/github-data.ts';

Deno.test('PrAnalyzerService', async (t) => {
  const service = new PrAnalyzerServiceImpl();

  await t.step('should extract version changes from patch', () => {
    const patch = `@@ -1,3 +1,3 @@
 "dependencies": {
-  "@types/node": "^20.9.0",
+  "@types/node": "^20.10.0",
 }`;

    const changes = service.extractVersionChanges(patch);
    assertEquals(changes.length, 1);
    assertEquals(changes[0]?.from, '20.9.0');
    assertEquals(changes[0]?.to, '20.10.0');
  });

  await t.step('should determine change type correctly', () => {
    assertEquals(service.determineChangeType('1.0.0', '2.0.0'), 'major');
    assertEquals(service.determineChangeType('1.0.0', '1.1.0'), 'minor');
    assertEquals(service.determineChangeType('1.0.0', '1.0.1'), 'patch');
    assertEquals(service.determineChangeType('20.9.0', '20.10.0'), 'minor');
  });

  await t.step('should analyze dependency updates from package.json', () => {
    const updates = service.analyzeDependencyUpdates(mockRenovatePR, [mockPackageJsonFile]);

    assertEquals(updates.length, 1);
    assertEquals(updates[0]?.packageName, '@types/node');
    assertEquals(updates[0]?.currentVersion, '20.9.0');
    assertEquals(updates[0]?.newVersion, '20.10.0');
    assertEquals(updates[0]?.ecosystem, 'npm');
    assertEquals(updates[0]?.changeType, 'minor');
  });

  await t.step('should analyze dependency updates from Cargo.toml', () => {
    const updates = service.analyzeDependencyUpdates(mockRenovatePR, [mockCargoTomlFile]);

    assertEquals(updates.length, 1);
    assertEquals(updates[0]?.packageName, 'serde');
    assertEquals(updates[0]?.currentVersion, '1.0.190');
    assertEquals(updates[0]?.newVersion, '1.0.193');
    assertEquals(updates[0]?.ecosystem, 'cargo');
    assertEquals(updates[0]?.changeType, 'patch');
  });

  await t.step('should ignore non-dependency files', () => {
    const updates = service.analyzeDependencyUpdates(mockRenovatePR, [mockNonDependencyFile]);
    assertEquals(updates.length, 0);
  });

  await t.step('should handle mixed file types', () => {
    const files = [mockPackageJsonFile, mockNonDependencyFile, mockCargoTomlFile];
    const updates = service.analyzeDependencyUpdates(mockRenovatePR, files);

    // Should find updates from both package.json and Cargo.toml, ignore main.ts
    assertEquals(updates.length, 2);

    const npmUpdate = updates.find((u) => u.ecosystem === 'npm');
    const cargoUpdate = updates.find((u) => u.ecosystem === 'cargo');

    assertEquals(npmUpdate?.packageName, '@types/node');
    assertEquals(cargoUpdate?.packageName, 'serde');
  });

  await t.step('should handle version strings with prefixes', () => {
    assertEquals(service.determineChangeType('^1.0.0', '^2.0.0'), 'major');
    assertEquals(service.determineChangeType('~1.0.0', '~1.1.0'), 'minor');
    assertEquals(service.determineChangeType('>=1.0.0', '>=1.0.1'), 'patch');
  });

  await t.step('should analyze dependency updates from Dependabot PR', () => {
    const updates = service.analyzeDependencyUpdates(mockDependabotPR, [
      mockDependabotPackageJsonFile,
    ]);

    assertEquals(updates.length, 1);
    assertEquals(updates[0]?.packageName, 'cross-spawn');
    assertEquals(updates[0]?.currentVersion, '7.0.3');
    assertEquals(updates[0]?.newVersion, '7.0.6');
    assertEquals(updates[0]?.ecosystem, 'npm');
    assertEquals(updates[0]?.changeType, 'patch');
  });

  await t.step('should handle both Renovate and Dependabot PRs', () => {
    const renovateUpdates = service.analyzeDependencyUpdates(mockRenovatePR, [mockPackageJsonFile]);
    const dependabotUpdates = service.analyzeDependencyUpdates(mockDependabotPR, [
      mockDependabotPackageJsonFile,
    ]);

    // Both should be analyzed successfully
    assertEquals(renovateUpdates.length, 1);
    assertEquals(dependabotUpdates.length, 1);

    // Renovate PR
    assertEquals(renovateUpdates[0]?.packageName, '@types/node');
    assertEquals(renovateUpdates[0]?.changeType, 'minor');

    // Dependabot PR
    assertEquals(dependabotUpdates[0]?.packageName, 'cross-spawn');
    assertEquals(dependabotUpdates[0]?.changeType, 'patch');
  });
});
