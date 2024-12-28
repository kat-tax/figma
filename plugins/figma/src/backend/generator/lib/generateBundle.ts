import CodeBlockWriter from 'code-block-writer';
import parseComponent from 'backend/parser';

import * as consts from 'config/consts';
import * as string from 'common/string';
import * as parser from 'backend/parser/lib';

import {generateNatives} from '../lib/natives';
import {generateIndex} from './generateIndex';
import {generateDocs} from './generateDocs';
import {generateStory} from './generateStory';
import {generateComponent} from './generateComponent';
import {writePropsAttributes} from './writePropsAttributes';
import {writePropsImports} from './writePropsImports';

import type {ComponentData, ComponentLinks} from 'types/component';
import type {ProjectSettings} from 'types/settings';

const emptyBundle: ComponentData = {
  id: '',
  key: '',
  code: '',
  docs: '',
  story: '',
  index: '',
  props: '',
  imports: '',
  width: 0,
  height: 0,
  links: {},
  icons: [],
  assets: null,
  info: null,
};

export async function generateBundle(
  node: ComponentNode,
  settings: ProjectSettings,
  skipCache: boolean = false,
): Promise<ComponentData> {
  // No node, return empty bundle
  if (!node) return emptyBundle;

  // Get component info
  const component = parser.getComponentInfo(node);

  // No target, return empty bundle
  if (!component.target) return emptyBundle;

  // Generate exo natives (if any)
  const isExo = component.page.name === consts.PAGES_SPECIAL.LIBRARY;
  const exo = generateNatives();

  // Native component
  if (isExo && exo[node.name]) {
    return {
      ...emptyBundle,
      id: node.id,
      key: node.key,
      width: node.width,
      height: node.height,
      code: exo[node.name],
      info: component,
    };
  }

  // Normal component, parse figma data
  const data = await parseComponent(node, skipCache);

  // No data, return empty bundle
  if (!data) return emptyBundle;

  // Profile
  const _t1 = Date.now();
  
  // Component links
  const links: ComponentLinks = {};
  links[string.componentPathNormalize(component.path)] = component.target.id;
  Object.values(data.meta.components).forEach(([node]) => {
    const info = parser.getComponentInfo(node);
    links[string.componentPathNormalize(info.path)] = info.target.id;
  });

  // Get frame size
  const {width, height} = parser.getComponentFrameSize(data.root.node, data.frame?.node);

  // Return bundle
  const bundle: ComponentData = {
    // Info
    id: component.target.id,
    key: component.target.key,
    props: writePropsAttributes(new CodeBlockWriter(settings.writer), {...component.propDefs}),
    imports: writePropsImports(new CodeBlockWriter(settings.writer), {...component.propDefs}),
    // Text
    code: await generateComponent(data, settings),
    docs: await generateDocs(component, settings),
    story: generateStory(component, settings),
    index: generateIndex([component], settings, false),
    // Data
    assets: Object.values(data.assetData),
    icons: Array.from(data.meta.iconsUsed),
    // Meta
    info: component,
    links,
    width,
    height,
  };

  // Profile
  console.log(`>> [bundle] ${Date.now() - _t1}ms`, component?.name || 'unknown');

  return bundle;
}
