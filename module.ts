import { appRoot } from '@prisma/composer';
import { publicUrl } from '@prisma/composer-prisma-cloud';
import toolsweb from './service.ts';

export default appRoot('jae-tools', ({ provision }) => {
  const web = provision(toolsweb);
  provision(publicUrl({
    id: 'weburl',
    url: publicUrl.prismaBuild(),
    target: web.http,
  }));
});
