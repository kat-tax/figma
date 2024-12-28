import type {EventHandler} from '@create-figma-plugin/utilities';
import type {AppPages} from 'types/app';
import type {UserSettings} from 'types/settings';
import type {NodeAttrData} from 'types/node';
import type {TypeScriptComponent} from 'interface/utils/editor/lib/language';
import type {ComponentData, ComponentBuild} from 'types/component';
import type {ThemeScale, ThemeRadius, ThemePresets} from 'types/themes';
import type {ProjectBuild, ProjectInfo, ProjectRelease} from 'types/project';

/* General */

export interface EventOpenLink extends EventHandler {
  name: 'OPEN_LINK';
  handler: (url: string) => void;
}

export interface EventNotify extends EventHandler {
  name: 'NOTIFY';
  handler: (message: string, error?: boolean) => void;
}

/* App */

export interface EventAppReady extends EventHandler {
  name: 'APP_READY';
  handler: () => void;
}

export interface EventAppStart extends EventHandler {
  name: 'APP_START';
  handler: (user: User, vscode: boolean, readonly: boolean) => void;
}

export interface EventAppNavigate extends EventHandler {
  name: 'APP_NAVIGATE';
  handler: (page: AppPages) => void;
}

/* Config */

export interface EventConfigLoad extends EventHandler {
  name: 'CONFIG_LOAD';
  handler: (config: UserSettings) => void;
}

export interface EventConfigUpdate extends EventHandler {
  name: 'CONFIG_UPDATE';
  handler: (config: UserSettings) => void;
}

/** Props */

export interface EventPropsSave extends EventHandler {
  name: 'PROPS_SAVE';
  handler: (props: {
    [name: string]: TypeScriptComponent;
  }) => void;
}

/* Node */

export interface EventFocusNode extends EventHandler {
  name: 'NODE_FOCUS';
  handler: (nodeId: string | null) => void;
}

export interface EventFocusedNode extends EventHandler {
  name: 'NODE_FOCUSED';
  handler: (nodeId: string | null) => void;
}

export interface EventNodeAttrSave extends EventHandler {
  name: 'NODE_ATTR_SAVE';
  handler: (nodeId: string, nodeSrc: string, data: NodeAttrData) => void;
}

export interface EventNodeAttrReq extends EventHandler {
  name: 'NODE_ATTR_REQ';
  handler: (nodeId: string, nodeSrc: string) => void;
}

export interface EventNodeAttrRes extends EventHandler {
  name: 'NODE_ATTR_RES';
  handler: (nodeId: string, data: NodeAttrData) => void;
}

/* Component */

export interface EventComponentBuild extends EventHandler {
  name: 'COMPONENT_BUILD';
  handler: (build: ComponentBuild, component: ComponentData) => void;
}

export interface EventSelectComponent extends EventHandler {
  name: 'SELECT_COMPONENT';
  handler: (name: string) => void;
}

export interface EventSelectVariant extends EventHandler {
  name: 'SELECT_VARIANT';
  handler: (name: string, props: {[property: string]: string}) => void;
}

export interface DropComponentHandler extends EventHandler {
  name: 'DROP_COMPONENT'
  handler: (component: ComponentData) => void
}

/* Project */

export interface EventProjectRelease extends EventHandler {
  name: 'PROJECT_RELEASE';
  handler: (project: ProjectBuild | null, info: ProjectInfo | null, config: ProjectRelease, user: User) => void;
}

export interface EventProjectTheme extends EventHandler {
  name: 'PROJECT_THEME';
  handler: (theme: string, current: string, hasStyles: boolean) => void;
}

export interface EventProjectBackground extends EventHandler {
  name: 'PROJECT_BACKGROUND';
  handler: (color: string) => void;
}

export interface EventProjectLanguage extends EventHandler {
  name: 'PROJECT_LANGUAGE';
  handler: (language: string) => void;
}

export interface EventProjectIcons extends EventHandler {
  name: 'PROJECT_ICONS';
  handler: (sets: string[], list: string[], map: Record<string, string>) => void;
}

export interface EventProjectExport extends EventHandler {
  name: 'PROJECT_EXPORT';
  handler: (config: ProjectRelease) => void;
}

export interface EventProjectConfigLoad extends EventHandler {
  name: 'PROJECT_CONFIG_LOAD';
  handler: (config: ProjectRelease) => void;
}

export interface EventProjectImportComponents extends EventHandler {
  name: 'PROJECT_IMPORT_COMPONENTS';
  handler: (iconSet: string) => void;
}

export interface EventProjectImportIcons extends EventHandler {
  name: 'PROJECT_IMPORT_ICONS';
  handler: (name: string, svgs: Record<string, string>) => void;
}

export interface EventProjectImportTheme extends EventHandler {
  name: 'PROJECT_IMPORT_THEME';
  handler: (theme: ThemePresets | 'Brand', scale: ThemeScale, radius: ThemeRadius) => void;
}

/* Style Gen */

export interface EventStyleGenReq extends EventHandler {
  name: 'STYLE_GEN_REQ';
  handler: (css: {[s: string]: {[s: string]: unknown}}) => void;
}

export interface EventStyleGenRes extends EventHandler {
  name: 'STYLE_GEN_RES';
  handler: (stylesheet: unknown) => void;
}
