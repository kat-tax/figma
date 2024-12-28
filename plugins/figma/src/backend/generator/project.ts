import {emit} from '@create-figma-plugin/utilities';
import defaultReleaseConfig from 'config/release';

import * as random from 'common/random';
import * as string from 'common/string';
import * as consts from 'config/consts';
import * as config from 'backend/utils/config';
import * as parser from 'backend/parser/lib';

import {generateBundle} from './lib/generateBundle';
import {generateIndex} from './lib/generateIndex';
import {generateTheme} from './lib/generateTheme';

import type {ProjectBuild, ProjectInfo, ProjectRelease, ProjectBuildAssets, ProjectBuildComponents} from 'types/project';
import type {EventProjectRelease, EventProjectConfigLoad} from 'types/events';
import type {ComponentInfo, ComponentAsset} from 'types/component';
import type {VariableModes} from 'types/figma';

export function build(release: ProjectRelease) {
  const user = figma.currentUser;

  // Send new project config to the interface to use
  emit<EventProjectConfigLoad>('PROJECT_CONFIG_LOAD', release);

  // Save submitted project config to the document
  // except for the method & scope, those should be ephemeral
  figma.root.setPluginData(consts.F2RN_PROJECT_RELEASE, JSON.stringify({
    ...release,
    method: 'download',
    scope: 'document',
  } as ProjectRelease));

  // Determine which components to export
  let projectName = 'Components';
  let exportNodes: Set<ComponentNode> = new Set();
  switch (release.scope) {
    case 'document':
    case 'page':
      const useDoc = release.scope === 'document';
      const target = useDoc ? figma.root : figma.currentPage;
      projectName = useDoc ? figma.root.name : figma.currentPage.name;
      const targets = (target as ChildrenMixin)?.findAllWithCriteria({types: ['COMPONENT']});
      exportNodes = parser.getComponentTargets(targets);
      exportNodes.forEach(node => {
        if (release.scope === 'document') {
          const pageName = parser.getPage(node).name;
          if (pageName === consts.PAGES_SPECIAL.TESTS
            || pageName === consts.PAGES_SPECIAL.LIBRARY
            || pageName === consts.PAGES_SPECIAL.ICONS
            || pageName === consts.PAGES_SPECIAL.NAVIGATION) {
            exportNodes.delete(node);
          }
        }
      });
      break;
    case 'selected':
      exportNodes = parser.getComponentTargets(figma.currentPage.selection);
      break;
  }

  let projectVersion = '';

  // Export components, if any
  if (exportNodes.size > 0) {
    figma.notify(`Exporting ${exportNodes.size} component${exportNodes.size === 1 ? '' : 's'}…`, {timeout: 3500});
    setTimeout(async () => {
      const components: ProjectBuildComponents = [];
      const buildAssets: ProjectBuildAssets = [];
      const componentInfo: Record<string, ComponentInfo> = {};
      const assets = new Map<string, ComponentAsset>();

      for await (const component of exportNodes) {
        try {
          const bundle = await generateBundle(component, {...config.state}, true);
          if (bundle.code) {
            bundle.assets?.forEach(asset => assets.set(asset.hash, asset));
            componentInfo[bundle.key] = bundle.info;
            components.push([
              bundle.info.path,
              bundle.info.name,
              bundle.index,
              bundle.code,
              bundle.story,
              bundle.docs,
            ]);
            console.log('>> [project/bundle]', bundle);
          }
        } catch (e) {
          console.error('Failed to export', component, e);
        }
      }

      assets.forEach(asset => buildAssets.push([
        asset.name,
        asset.isVector,
        asset.bytes,
      ]));

      const [collectionConfig, collectionLocales] = await Promise.all([
        parser.getVariableCollection(consts.VARIABLE_COLLECTIONS.APP_CONFIG),
        parser.getVariableCollection(consts.VARIABLE_COLLECTIONS.LOCALES),
      ]);

      const [varsConfig, varsTranslations, modesLocales] = await Promise.all([
        parser.getVariables(collectionConfig?.variableIds),
        parser.getVariables(collectionLocales?.variableIds),
        parser.getVariableCollectionModes(collectionLocales),
      ]);
      
      const info: ProjectInfo = {
        appConfig: getAppConfig(collectionConfig, varsConfig),
        locales: getLocales(modesLocales),
        translations: getTranslations(collectionLocales, varsTranslations, modesLocales),
      };
      
      if (release.method === 'release') {
        const version = info.appConfig?.['Design']?.['PACKAGE_VERSION']?.toString();
        if (version) {
          projectVersion = version;
          const [major, minor, patch] = version.split('.').map(Number);
          const newVersion = `${major}.${minor}.${patch + 1}`;
          await setProjectVersion(newVersion);
          info.appConfig['Design']['PACKAGE_VERSION'] = newVersion;
        }
      }

      const build: ProjectBuild = {
        components,
        time: Date.now(),
        name: projectName,
        index: generateIndex(Object.values(componentInfo), config.state, true),
        theme: (await generateTheme(config.state)).themes.code,
        assets: buildAssets,
      };

      console.log('>> [project/build]', build, info);

      emit<EventProjectRelease>('PROJECT_RELEASE', build, info, release, user);
      if (release.method === 'release') {
        figma.notify('Release published.', {
          timeout: 10000,
          button: {
            text: 'Open Dashboard',
            action: () => figma.openExternal(`${consts.F2RN_SERVICE_URL}/dashboard`),
          },
        });
      }
    }, 500);
  } else {
    emit<EventProjectRelease>('PROJECT_RELEASE', null, null, release, user);
    figma.notify('No components found to export', {error: true});
    if (projectVersion) {
      setProjectVersion(projectVersion);
    }
  }
}

// TODO: reload project config on root document update
export function loadConfig() {
  let release: ProjectRelease;
  try {
    const rawConfig = figma.root.getPluginData(consts.F2RN_PROJECT_RELEASE);
    const parsedConfig = JSON.parse(rawConfig);
    release = parsedConfig;
  } catch (e) {}
  const loadedConfig = release || defaultReleaseConfig;
  // If docKey is empty, generate one and save immediately
  if (!loadedConfig.docKey) {
    loadedConfig.docKey = random.generateToken(22);
    figma.root.setPluginData(consts.F2RN_PROJECT_RELEASE, JSON.stringify(loadedConfig));
  }
  emit<EventProjectConfigLoad>('PROJECT_CONFIG_LOAD', loadedConfig);
}

function getAppConfig(
  collection: VariableCollection,
  variables: Variable[],
): ProjectInfo['appConfig'] {
  return variables.reduce((acc, cur) => {
    const defaultMode = collection.defaultModeId;
    const defaultValue = cur.valuesByMode[defaultMode]?.toString().trim();
    const [_group, _key] = cur.name.includes('/') ? cur.name.split('/') : ['General', cur.name];
    const group = string.titleCase(_group);
    const key = string.createIdentifierConstant(_key);
    const val = key.startsWith('@') ? `"${defaultValue}"` : defaultValue;
    if (!acc[group]) acc[group] = {};
    acc[group][key] = val;
    return acc;
  }, {} as ProjectInfo['appConfig']);
}

function getLocales(modes: VariableModes): ProjectInfo['locales'] {
  return {
    source: getLocaleData(modes.default.name)[0],
    all: modes.modes.map(mode =>
      getLocaleData(mode.name).map(s => s.trim()) as [string, string]),
  }
}

function getTranslations(
  locales: VariableCollection,
  messages: Variable[],
  modes: VariableModes,
): ProjectInfo['translations'] {
  return messages.reduce((acc, cur) => {
    const defaultMode = locales.defaultModeId;
    const defaultValue = cur.valuesByMode[defaultMode]?.toString().trim();
    const otherValues = Object.entries(cur.valuesByMode);
    acc[defaultValue] = otherValues.reduce((acc, [modeId, value]) => {
      if (modeId === defaultMode) return acc;
      const [locale] = getLocaleData(modes.modes?.find(mode => mode.modeId === modeId)?.name);
      if (locale) acc[locale] = value.toString().trim();
      return acc;
    }, {} as Record<string, string>);
    return acc;
  }, {} as ProjectInfo['translations']);
}

function getLocaleData(locale: string) {
  return locale.split(' – ');
}

async function setProjectVersion(version: string) {
  const config = await parser.getVariableCollection(consts.VARIABLE_COLLECTIONS.APP_CONFIG);
  if (config) {
    const variables = await parser.getVariables(config.variableIds);
    if (variables) {
      const variable = variables.find(v => v.name === 'Design/Package Version');
      if (variable) {
        variable.setValueForMode(config.defaultModeId, version);
      }
    }
  }
}

