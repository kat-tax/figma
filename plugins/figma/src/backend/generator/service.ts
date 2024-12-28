import {getAllIconComponents} from 'backend/importer/icons';
import {on, emit} from '@create-figma-plugin/utilities';
import {diff} from 'deep-object-diff';

import * as delay from 'common/delay';
import * as assert from 'common/assert';
import * as string from 'common/string';
import * as consts from 'config/consts';
import * as parser from 'backend/parser/lib';
import * as config from 'backend/utils/config';

import {generateIndex} from './lib/generateIndex';
import {generateTheme} from './lib/generateTheme';
import {generateBundle} from './lib/generateBundle';

import type {ComponentInfo, ComponentAsset, ComponentLinks, ComponentRoster} from 'types/component';
import type {EventComponentBuild, EventProjectTheme, EventProjectLanguage, EventProjectIcons, EventNodeAttrSave, EventPropsSave, EventProjectBackground} from 'types/events';
import type {ProjectSettings} from 'types/settings';

let _lastThemeCode = '';
let _lastThemeName = '';

export async function watchComponents(
  targetComponent: () => void,
  updateBackground: () => void,
) {
  // Save component props when parsed
  on<EventPropsSave>('PROPS_SAVE', (props) => {
    // TODO: fix this
    // figma.root.setSharedPluginData('f2rn', consts.F2RN_COMP_PROPS, JSON.stringify(props));
  });

  // Recompile component on node attribute change
  on<EventNodeAttrSave>('NODE_ATTR_SAVE', (nodeId, nodeSrc, data) => {
    const node = figma.getNodeById(nodeId);
    const attr = parser.getNodeAttrs(node, nodeSrc);
    const delta = Object.keys(diff(attr, data)).length;
    if (delta > 0) {
      // TODO: improve undo UX (recompile component / refresh node toolbar)
      // figma.commitUndo();
      node.setSharedPluginData('f2rn', consts.F2RN_NODE_ATTRS, JSON.stringify(data));
      const component = parser.getComponentTarget(node);
      if (component) {
        compile(all, true, new Set([component]));
      }
    }
  });

  // Init: update background preview color
  updateBackground();

  // Init: compile all components in background
  const all = parser.getComponentTargets(figma.root.findAllWithCriteria({types: ['COMPONENT']}));
  if (all.size > 0) {
    await compile(all);
    // Select targeted component since it's available now
    targetComponent();
    // Refresh component cache
    await compile(all, true);
  }

  // Recompile changed components on doc change
  figma.on('documentchange', async (e) => {
    // Page background update
    if (e.documentChanges.length === 1
      && e.documentChanges[0].type === 'PROPERTY_CHANGE'
      && e.documentChanges[0].properties.includes('backgrounds')) {
      updateBackground();
      return;
    }

    // We need to get all components for the roster
    const all = parser.getComponentTargets(figma.root.findAllWithCriteria({types: ['COMPONENT']}));
    // No components, do nothing
    if (all.size === 0) return;
    // Get all components that were updated
    const updates: SceneNode[] = [];
    e.documentChanges.forEach(change => {
      // Ignore events that aren't relevant
      if (change.type !== 'CREATE'
        && change.type !== 'PROPERTY_CHANGE')
          return;
      // Ignore events only effecting pluginData (our cache)
      if (change.type === 'PROPERTY_CHANGE'
        && change.properties.includes('pluginData'))
          return;
      // Queue component to update
      if (change.node.type === 'COMPONENT') {
        updates.push(change.node as SceneNode);
      } else {
        const target = parser.getComponentTarget(change.node as SceneNode);
        if (target) {
          updates.push(target);
        }
      }
    });
    // No updates, do nothing
    if (updates.length === 0) return;
    // Get updated targets and compile
    const update = parser.getComponentTargets(updates);
    await compile(all, true, update);
    console.log('>> [update]', Array.from(update));
  });
}

export async function watchTheme(settings: ProjectSettings) {
  const updateTheme = async () => {
    const tokens = await generateTheme(settings);
    const {code, collection, hasStyles} = tokens.themes;
    const colName = collection?.current?.name ?? collection?.default?.name;
    const themeName = collection
      ? `${string.createIdentifierCamel(colName)}`
      : 'main';
    if (code === _lastThemeCode && themeName === _lastThemeName)
        return;
    _lastThemeCode = code;
    _lastThemeName = themeName;
    emit<EventProjectTheme>('PROJECT_THEME', code, themeName, hasStyles);
  };
  setInterval(updateTheme, 1200);
  updateTheme();
}

export async function watchIcons() {
  let _sets = new Set<string>();
  let _list = new Set<string>();
  let _map = new Map<string, string>();

  const updateIcons = () => {
    const icons = getAllIconComponents();
    const sets = new Set(icons?.map((i) => i.name.split(':')[0]));
    const list = new Set(icons?.map((i) => i.name));
    const map = new Map(icons?.map((i) => [i.name, i.id]));

    if (assert.areMapsEqual(map, _map)
      && assert.areSetsEqual(sets, _sets)
      && assert.areSetsEqual(list, _list))
      return;

    _sets = sets;
    _list = list;
    _map = map;

    emit<EventProjectIcons>(
      'PROJECT_ICONS',
      Array.from(sets),
      Array.from(list),
      Object.fromEntries(map),
    );
  };
  setInterval(updateIcons, 500);
  updateIcons();
}

export async function watchLocales() {
  let _lastLanguage = '';
  const updateLanguage = async () => {
    const language = await parser.getVariableCollectionModes(consts.VARIABLE_COLLECTIONS.LOCALES);
    if (!language || !language.current) return;
    const name = language.current.name;
    if (name === _lastLanguage) return;
    _lastLanguage = name;
    emit<EventProjectLanguage>('PROJECT_LANGUAGE', name);
  };
  setInterval(updateLanguage, 300);
  updateLanguage();
}

export async function compile(
  components: Set<ComponentNode>,
  skipCache?: boolean,
  updated?: Set<ComponentNode>,
) {
  const _roster: ComponentRoster = {};
  const _info: Record<string, ComponentInfo> = {};
  const _assets: Record<string, ComponentAsset> = {};
  const _icons = new Set<string>();

  let _links: ComponentLinks = {};
  let _total = 0;
  let _loaded = 0;

  // Iterate over all components, fill roster, info, and total
  for await (const component of components) {
    const info = parser.getComponentInfo(component);
    if (!info) continue;
    const {name, page, path, target} = info;
    const {id, key} = target;
    const loading = !skipCache;
    const preview = ''; // data:image/png;base64,${await info.target.exportAsync({format: 'PNG'})}` : '';
    _total++;
    _info[key] = info;
    _roster[key] = {id, name, page: page.name, path, loading, preview};
  }

  // Generate index
  const index = generateIndex(Object.values(_info), config.state, true);

  // Compile either all components or just updated components if provided
  const targets = updated || components;
  for await (const component of targets) {
    // Prevent UI from freezing
    delay.wait(1);
    try {
      const _t1 = Date.now();

      if (!component) continue;

      // Compile component
      const bundle = await generateBundle(component, {...config.state}, skipCache);

      // Derive data
      const {id, key, info, links, icons, assets} = bundle;
      const pages = figma.root.children?.map(p => p.name);

      // Aggregate data
      _loaded++;
      _links = {..._links, ...links};
      _roster[key] = {
        ..._roster[key],
        id,
        name: info.name,
        page: info.page.name,
        loading: false,
      };

      // Aggregate assets and icons
      icons?.forEach(icon => {_icons.add(icon)});
      assets?.forEach(asset => {_assets[asset.hash] = asset});

      // Send compilation to interface
      emit<EventComponentBuild>('COMPONENT_BUILD', {
        index,
        pages,
        links: _links,
        total: _total,
        loaded: _loaded,
        roster: _roster,
        assets: _assets,
        icons: Array.from(_icons),
        assetMap: {},
      }, bundle);

      // Profile
      console.log(`>> [compile] ${Date.now() - _t1}ms`, info.name);
    } catch (e) {
      console.error('Failed to export', component, e);
    }
  }
}
