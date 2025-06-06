/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tree, readJson, readProjectConfiguration } from '@nx/devkit';
import { INFRA_APP_GENERATOR_INFO, tsInfraGenerator } from './generator';
import { TsInfraGeneratorSchema } from './schema';
import { createTreeUsingTsSolutionSetup } from '../../utils/test';
import { expectHasMetricTags } from '../../utils/metrics.spec';

describe('infra generator', () => {
  let tree: Tree;

  const options: TsInfraGeneratorSchema = {
    name: 'test',
    ruleSet: 'aws_prototyping',
    directory: 'packages',
    skipInstall: true,
  };

  beforeEach(() => {
    tree = createTreeUsingTsSolutionSetup();
  });

  it('should generate files with correct content', async () => {
    await tsInfraGenerator(tree, options);
    const config = readProjectConfiguration(tree, '@proj/test');
    expect(config.projectType).toEqual('application');
    // Verify files are generated
    expect(tree.exists('packages/test/cdk.json')).toBeTruthy();
    expect(tree.exists('packages/test/src/main.ts')).toBeTruthy();
    expect(
      tree.exists('packages/test/src/stacks/application-stack.ts'),
    ).toBeTruthy();
    // Create snapshots of generated files
    expect(tree.read('packages/test/cdk.json').toString()).toMatchSnapshot(
      'cdk-json',
    );
    expect(tree.read('packages/test/src/main.ts').toString()).toMatchSnapshot(
      'main-ts',
    );
    expect(
      tree.read('packages/test/src/stacks/application-stack.ts').toString(),
    ).toMatchSnapshot('application-stack-ts');
    // Snapshot the entire project structure
    const projectFiles = {
      'cdk.json': tree.read('packages/test/cdk.json').toString(),
      'src/main.ts': tree.read('packages/test/src/main.ts').toString(),
      'src/stacks/application-stack.ts': tree
        .read('packages/test/src/stacks/application-stack.ts')
        .toString(),
      'project.json': tree.read('packages/test/project.json').toString(),
    };
    expect(projectFiles).toMatchSnapshot('project-structure');
  });

  it('should configure project.json with correct targets', async () => {
    await tsInfraGenerator(tree, options);
    const config = readProjectConfiguration(tree, '@proj/test');
    // Snapshot entire project configuration
    expect(config).toMatchSnapshot('project-configuration');
    // Verify and snapshot build target configuration
    expect(config.targets.build).toMatchSnapshot('build-target');
    // Verify and snapshot deploy target configuration
    expect(config.targets.deploy).toMatchSnapshot('deploy-target');
    // Verify and snapshot destroy target configuration
    expect(config.targets.destroy).toMatchSnapshot('destroy-target');
    // Test specific configuration values
    expect(config.targets.synth).toMatchObject({
      cache: true,
      executor: 'nx:run-commands',
      outputs: ['{workspaceRoot}/dist/packages/test/cdk.out'],
      dependsOn: ['^build', 'compile'],
      options: {
        cwd: 'packages/test',
        command: 'cdk synth',
      },
    });
    expect(config.targets.deploy).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command: 'cdk deploy --require-approval=never',
      },
    });
    expect(config.targets['deploy-ci']).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command:
          'cdk deploy --require-approval=never --app ../../dist/packages/test/cdk.out',
      },
    });
    expect(config.targets.destroy).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command: 'cdk destroy --require-approval=never',
      },
    });
    expect(config.targets['destroy-ci']).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command:
          'cdk destroy --require-approval=never --app ../../dist/packages/test/cdk.out',
      },
    });
    expect(config.targets.cdk).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command: 'cdk',
      },
    });
    expect(config.targets.bootstrap).toMatchObject({
      executor: 'nx:run-commands',
      options: {
        cwd: 'packages/test',
        command: 'cdk bootstrap',
      },
    });
  });

  it('should add required dependencies to package.json', async () => {
    await tsInfraGenerator(tree, options);
    const packageJson = JSON.parse(tree.read('package.json').toString());
    // Snapshot entire package.json
    expect(packageJson).toMatchSnapshot('package-json');
    // Snapshot dependencies section
    expect(packageJson.dependencies).toMatchSnapshot('dependencies');
    // Snapshot devDependencies section
    expect(packageJson.devDependencies).toMatchSnapshot('dev-dependencies');
    // Test specific dependency values
    expect(packageJson.dependencies).toMatchObject({
      '@cdklabs/cdk-validator-cfnguard': expect.any(String),
      'aws-cdk-lib': expect.any(String),
      'aws-cdk': expect.any(String),
      esbuild: expect.any(String),
      constructs: expect.any(String),
      'source-map-support': expect.any(String),
    });
    expect(packageJson.devDependencies).toMatchObject({
      tsx: expect.any(String),
    });
  });

  it('should generate valid CDK application code', async () => {
    await tsInfraGenerator(tree, options);
    // Test main.ts content
    const mainTs = tree.read('packages/test/src/main.ts').toString();
    expect(mainTs).toMatchSnapshot('main-ts-content');
    // Test application-stack.ts content
    const stackTs = tree
      .read('packages/test/src/stacks/application-stack.ts')
      .toString();
    expect(stackTs).toMatchSnapshot('stack-ts-content');
    // Test cdk.json content
    const cdkJson = JSON.parse(tree.read('packages/test/cdk.json').toString());
    expect(cdkJson).toMatchSnapshot('cdk-json-content');
  });

  it('should handle custom project names correctly', async () => {
    const customOptions: TsInfraGeneratorSchema = {
      name: 'custom-infra',
      directory: 'packages',
      ruleSet: 'aws_prototyping',
      skipInstall: true,
    };
    await tsInfraGenerator(tree, customOptions);
    // Snapshot project configuration with custom name
    const config = readProjectConfiguration(tree, '@proj/custom-infra');
    expect(config).toMatchSnapshot('custom-name-project-config');
    // Verify file paths with custom name
    expect(tree.exists('packages/custom-infra/cdk.json')).toBeTruthy();
    expect(tree.exists('packages/custom-infra/src/main.ts')).toBeTruthy();
    expect(
      tree.exists('packages/custom-infra/src/stacks/application-stack.ts'),
    ).toBeTruthy();
    // Snapshot files with custom name
    const customFiles = {
      'cdk.json': tree.read('packages/custom-infra/cdk.json').toString(),
      'src/main.ts': tree.read('packages/custom-infra/src/main.ts').toString(),
      'src/stacks/application-stack.ts': tree
        .read('packages/custom-infra/src/stacks/application-stack.ts')
        .toString(),
    };
    expect(customFiles).toMatchSnapshot('custom-name-files');
  });

  it('should generate consistent file content across runs', async () => {
    // First run
    await tsInfraGenerator(tree, options);
    const firstRunFiles = {
      'cdk.json': tree.read('packages/test/cdk.json').toString(),
      'src/main.ts': tree.read('packages/test/src/main.ts').toString(),
      'src/stacks/application-stack.ts': tree
        .read('packages/test/src/stacks/application-stack.ts')
        .toString(),
    };
    // Reset tree and run again
    tree = createTreeUsingTsSolutionSetup();
    await tsInfraGenerator(tree, options);
    const secondRunFiles = {
      'cdk.json': tree.read('packages/test/cdk.json').toString(),
      'src/main.ts': tree.read('packages/test/src/main.ts').toString(),
      'src/stacks/application-stack.ts': tree
        .read('packages/test/src/stacks/application-stack.ts')
        .toString(),
    };
    // Compare runs
    expect(firstRunFiles).toEqual(secondRunFiles);
    expect(secondRunFiles).toMatchSnapshot('consistent-files');
  });

  it('should add generator to project metadata', async () => {
    // Call the generator function
    await tsInfraGenerator(tree, options);

    expect(
      readJson(tree, 'packages/test/project.json').metadata,
    ).toHaveProperty('generator', INFRA_APP_GENERATOR_INFO.id);
  });

  it('should add generator metric to app.ts', async () => {
    // Call the generator function
    await tsInfraGenerator(tree, options);

    // Verify the metric was added to app.ts
    expectHasMetricTags(tree, INFRA_APP_GENERATOR_INFO.metric);
  });
});
