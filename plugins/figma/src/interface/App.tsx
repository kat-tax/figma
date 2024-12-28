import {useState, useEffect} from 'react';
import {Tabs, TooltipProvider} from 'figma-kit';
import {LoadingIndicator} from 'figma-ui';

import {NavBar} from 'interface/base/NavBar';
import {DualPanel} from 'interface/base/DualPanel';

import {ProjectComponents} from 'interface/views/ProjectComponents';
import {ProjectAssets} from 'interface/views/ProjectAssets';
import {ProjectIcons} from 'interface/views/ProjectIcons';
import {ProjectTheme} from 'interface/views/ProjectTheme';
import {ProjectDocs} from 'interface/views/ProjectDocs';
import {ProjectExport} from 'interface/views/ProjectExport';
import {ProjectSettings} from 'interface/views/ProjectSettings';

import {ComponentCode} from 'interface/views/ComponentCode';
import {ComponentDocs} from 'interface/views/ComponentDocs';
import {ComponentStory} from 'interface/views/ComponentStory';
import {ComponentPreview} from 'interface/views/ComponentPreview';

import {useBuild} from 'interface/hooks/useBuild';
import {useEditor} from 'interface/hooks/useEditor';
import {useDarkMode} from 'interface/hooks/useDarkMode';
import {useNavigation} from 'interface/hooks/useNavigation';
import {useUserSettings} from 'interface/hooks/useUserSettings';
import {useStyleGenServer} from 'interface/hooks/useStyleGenServer';
import {useSelectedVariant} from 'interface/hooks/useSelectedVariant';
import {useProjectBackground} from 'interface/hooks/useProjectBackground';
import {useProjectLanguage} from 'interface/hooks/useProjectLanguage';
import {useProjectConfig} from 'interface/hooks/useProjectConfig';
import {useProjectTheme} from 'interface/hooks/useProjectTheme';
import {useProjectIcons} from 'interface/hooks/useProjectIcons';

import type {Theme} from '@monaco-editor/react';
import type {AppTabs} from 'types/app';

interface AppProps {
  isReady: boolean,
  isVSCode: boolean,
  isDevMode: boolean,
}

const tabs: AppTabs = {
  main: [
    'components',
    'icons',
    'theme',
    //'docs',
    //'assets',
    'export',
    'settings',
  ],
  component: [
    'component/code',
    'component/story',
    'component/docs',
  ],
};

export function App(props: AppProps) {
  const {isReady, isVSCode, isDevMode} = props;
  const [lastResize, setLastResize] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const build = useBuild();
  const theme = useProjectTheme();
  const icons = useProjectIcons();
  const project = useProjectConfig();
  const language = useProjectLanguage();
  const background = useProjectBackground();
  const settings = useUserSettings();
  const variant = useSelectedVariant();
  const monaco = useEditor(settings.config, build.links);
  const isDark = useDarkMode();
  const nav = useNavigation(build);

  const isReadOnly = isDevMode || isVSCode;
  const hasStyles = Boolean(theme);
  const hasIcons = Boolean(icons?.list?.length);
  const hasTabs = Boolean(isReady && project && monaco);
  const iconSet = icons.sets[0];
  const compKey = build.roster[nav.component] ? nav.component: null;

  // Monaco options
  const editorTheme: Theme = isDark ? 'vs-dark' : 'light';
  const editorOptions = {
    ...settings.config.monaco.general,
    tabSize: settings.config.writer.indentNumberOfSpaces,
  };

  // Start style gen server
  useStyleGenServer();

  // Go to overview when viewing a component that doesn't exist
  useEffect(() => {
    if (!compKey && nav.component) {
      nav.gotoOverview();
    }
  }, [compKey, nav]);

  // Reset search mode when tab or component changes
  useEffect(() => {
    setSearchMode(false);
  }, [nav.tab, nav.component]);

  return hasTabs ? (
    <TooltipProvider disableHoverableContent>
      <Tabs.Root
        style={{height: 'calc(100% - 41px)'}}
        value={nav.tab}
        onValueChange={nav.gotoTab}>
        <NavBar {...{nav, tabs, build, isVSCode, searchMode, searchQuery, setSearchMode, setSearchQuery}}/>
        <Tabs.Content value="components">
          <ProjectComponents {...{nav, build, isReadOnly, iconSet, hasIcons, hasStyles, searchMode, searchQuery}}/>
        </Tabs.Content>
        <Tabs.Content value="icons">
          <ProjectIcons {...{nav, build, isReadOnly, icons, hasStyles, searchMode, searchQuery}}/>
        </Tabs.Content>
        <Tabs.Content value="theme">
          <ProjectTheme {...{monaco, hasStyles, editorOptions, editorTheme}}/>
        </Tabs.Content>
        <Tabs.Content value="assets">
          <ProjectAssets {...{build, searchMode, searchQuery}}/>
        </Tabs.Content>
        <Tabs.Content value="docs">
          <ProjectDocs {...{nav, build, isReadOnly, searchQuery}}/>
        </Tabs.Content>
        <Tabs.Content value="export">
          <ProjectExport {...{project, build}}/>
        </Tabs.Content>
        <Tabs.Content value="settings">
          <ProjectSettings {...{monaco, settings, editorOptions, editorTheme}}/>
        </Tabs.Content>
        <Tabs.Content value="component/code">
          <DualPanel
            primary={<ComponentCode {...{nav, compKey, build, monaco, editorOptions, editorTheme}}/>}
            secondary={<ComponentPreview {...{nav, compKey, build, variant, theme, background, language, settings, lastResize, isDark}}/>}
            onResize={() => setLastResize(Date.now())}
          />
        </Tabs.Content>
        <Tabs.Content value="component/story">
          <ComponentStory {...{compKey, monaco, editorOptions, editorTheme}}/>
        </Tabs.Content>
        <Tabs.Content value="component/docs">
          <ComponentDocs {...{compKey, monaco, editorOptions,editorTheme}}/>
        </Tabs.Content>
      </Tabs.Root>
    </TooltipProvider>
  ) : (
    <div className="center fill">
      <LoadingIndicator/>
    </div>
  );
}
