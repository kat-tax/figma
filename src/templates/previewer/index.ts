// @ts-ignore
import iframe from './iframe.tpl.html';
import imports from './importMap.json';
import loader from './loader.tpl';
import {build} from 'common/esbuild';

import type {Settings} from 'types/settings';

export default async (settings: Settings) => {
  const previewer = atob(loader.toString());
  const {code} = await build(previewer, settings);
  return atob(iframe)
    .replace('__IMPORT_MAP__', JSON.stringify(imports, undefined, 2))
    .replace('__LOADER__', code.toString());
};
