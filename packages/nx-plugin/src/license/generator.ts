/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { readNxJson, Tree, updateNxJson } from '@nx/devkit';
import { LicenseGeneratorSchema } from './schema';
import { defaultLicenseConfig, writeLicenseConfig } from './config';
import { ensureAwsNxPluginConfig } from '../utils/config/utils';
import { SYNC_GENERATOR_NAME } from './sync/generator';
import { NxGeneratorInfo, getGeneratorInfo } from '../utils/nx';
import { addGeneratorMetricsIfApplicable } from '../utils/metrics';

export const LICENSE_GENERATOR_INFO: NxGeneratorInfo =
  getGeneratorInfo(__filename);

export async function licenseGenerator(
  tree: Tree,
  options: LicenseGeneratorSchema,
) {
  const { license, copyrightHolder } = options;

  // Write default config for the license headers
  await ensureAwsNxPluginConfig(tree);
  await writeLicenseConfig(
    tree,
    defaultLicenseConfig(license, copyrightHolder),
  );

  // Configure sync generator to run as part of all projects' lint target
  const nxJson = readNxJson(tree);
  updateNxJson(tree, {
    ...nxJson,
    targetDefaults: {
      ...nxJson.targetDefaults,
      lint: {
        ...nxJson.targetDefaults?.lint,
        syncGenerators: [
          ...(nxJson.targetDefaults?.lint?.syncGenerators ?? []).filter(
            (g) => g !== SYNC_GENERATOR_NAME,
          ),
          SYNC_GENERATOR_NAME,
        ],
      },
    },
  });

  await addGeneratorMetricsIfApplicable(tree, [LICENSE_GENERATOR_INFO]);
}

export default licenseGenerator;
