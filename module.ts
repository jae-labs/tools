import { appRoot } from '@prisma/composer';
import { publicUrl } from '@prisma/composer-prisma-cloud';
import toolsweb from './service.ts';

const REGION_APP_NAMES: Record<string, string> = {
  'us-east-1': 'jae-tools-us-east-1',
  'us-west-1': 'jae-tools-us-west-1',
  'eu-west-3': 'jae-tools-eu-west-3',
  'eu-central-1': 'jae-tools',
  'ap-northeast-1': 'jae-tools-ap-northeast-1',
  'ap-southeast-1': 'jae-tools-ap-southeast-1',
};

const appName = REGION_APP_NAMES[process.env.PRISMA_REGION ?? 'eu-central-1'] ?? 'jae-tools';

export default appRoot(appName, ({ provision }) => {
  const web = provision(toolsweb);
  provision(publicUrl({
    id: 'weburl',
    url: publicUrl.prismaBuild(),
    target: web.http,
  }));
});
