import { defineConfig as composer } from '@prisma/composer/config';
import { nodeBuild } from '@prisma/composer/node/control';
import { prismaCloud, prismaState } from '@prisma/composer-prisma-cloud/control';
import { definePrismaConfig } from 'prisma/config';

const validRegions = new Set([
  'us-east-1',
  'us-west-1',
  'eu-west-3',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
] as const);

type RegionId =
  | 'us-east-1'
  | 'us-west-1'
  | 'eu-west-3'
  | 'eu-central-1'
  | 'ap-northeast-1'
  | 'ap-southeast-1';

const envRegion = process.env.PRISMA_REGION;
const region: RegionId =
  envRegion && validRegions.has(envRegion as RegionId)
    ? (envRegion as RegionId)
    : 'eu-central-1';

export default definePrismaConfig({
  composer: composer({
    entry: './module.ts',
    extensions: [prismaCloud({ region }), nodeBuild()],
    state: prismaState(),
  }),
});
