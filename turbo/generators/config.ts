import { packageGenerator } from '@pixpilot/workspace-package-generator';

module.exports = function generator(plop: unknown) {
  packageGenerator(plop, {
    author: 'Mo doaie <m.doaie@hotmail.com>',
  });
};
