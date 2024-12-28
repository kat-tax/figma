import {showUI, emit, on, once} from '@create-figma-plugin/utilities';
import {focusNode, getNodeAttrs, getTopFill, getColor} from 'backend/parser/lib';
import {F2RN_UI_WIDTH_MIN} from 'config/consts';

import * as project from 'backend/generator/project';
import * as service from 'backend/generator/service';
import * as codegen from 'backend/generator/codegen';

import * as themes from 'backend/importer/themes';
import * as icons from 'backend/importer/icons';
import * as exo from 'backend/importer/exo';

import * as config from 'backend/utils/config';
import * as mode from 'backend/utils/mode';
import * as drop from 'backend/utils/drop';
import * as nav from 'backend/utils/nav';

import type * as T from 'types/events';

// Show interface if not in codegen mode
// Note: must be called immediately, not in an async function
if (!mode.isCodegen) {
  const width = F2RN_UI_WIDTH_MIN;
  const height = 999999;
  const x = Math.round(figma.viewport.bounds.x);
  const y = Math.round(figma.viewport.bounds.y) - 20;
  showUI({width, height, position: {x, y}});
}

export default async function() {
  // Load config (backend only)
  await config.load(true);

  // Headless codegen mode
  if (mode.isCodegen) {
    figma.codegen.on('generate', (e) => {
      codegen.handleConfigChange();
      return codegen.render(e.node);
    });
    return;
  }

  // Wait for interface to be ready
  once<T.EventAppReady>('APP_READY', async () => {
    // Load all pages into memory
    await figma.loadAllPagesAsync();

    // Handle update page (which tab the user is on)
    on<T.EventAppNavigate>('APP_NAVIGATE', (page) => {
      console.log('>> [navigate]', page);
    });

    // Handle update config from interface
    on<T.EventConfigUpdate>('CONFIG_UPDATE', (newConfig) => {
      config.update(newConfig);
    });

    // Handle export project
    on<T.EventProjectExport>('PROJECT_EXPORT', (newConfig) => {
      project.build(newConfig);
    });

    // Handle import themes
    on<T.EventProjectImportTheme>('PROJECT_IMPORT_THEME', (theme, scale, radius) => {
      themes.importTheme(theme, scale, radius);
    });

    // Handle import icons
    on<T.EventProjectImportIcons>('PROJECT_IMPORT_ICONS', (name, svgs) => {
      icons.importIcons(name, svgs);
    });

    // Handle import components
    on<T.EventProjectImportComponents>('PROJECT_IMPORT_COMPONENTS', (iconSet) => {
      exo.importComponents(iconSet);
    });

    // Handle focus node
    on<T.EventFocusNode>('NODE_FOCUS', (nodeId) => {
      if (nodeId === null) {
        figma.currentPage.selection = [];
      } else {
        focusNode(nodeId);
      }
    });

    // Handle loading node attributes
    on<T.EventNodeAttrReq>('NODE_ATTR_REQ', (nodeId, nodeSrc) => {
      const node = figma.getNodeById(nodeId);
      const data = node && getNodeAttrs(node, nodeSrc);
      if (data) {
        emit<T.EventNodeAttrRes>('NODE_ATTR_RES', nodeId, data);
      }
    });

    // Handle notify event
    on<T.EventNotify>('NOTIFY', (message, error) => {
      figma.notify(message, {error});
    });

    // Handle open link event
    on<T.EventOpenLink>('OPEN_LINK', (link) => {
      figma.openExternal(link);
    });

    // Handle resize event
    on('RESIZE_WINDOW', (size: {width: number; height: number}) => {
      figma.ui.resize(size.width, size.height);
    });

    // Send event to show interface (remove spinner)
    emit<T.EventAppStart>(
      'APP_START',
      figma.currentUser,
      mode.isVSCode,
      mode.isInspect,
    );

    // Load config from storage (for frontend)
    await config.load(false);

    // Load project config from storage
    project.loadConfig();

    // Handle dropping of components, icons, and assets
    figma.on('drop', drop.importNode);

    // Handle component selection change
    figma.on('selectionchange', () => {
      nav.targetSelectedComponent();
      nav.targetSelectedComponentVariant();
      const node = figma.currentPage.selection?.[0];
      if (node) emit<T.EventFocusedNode>('NODE_FOCUSED', node.id);
    });

    // If there is a selected component, target it on init
    setTimeout(() => {
      nav.targetSelectedComponent();
    }, 1000);

    // Start generation services
    service.watchTheme(config.state);
    service.watchIcons();
    service.watchLocales();
    service.watchComponents(
      nav.targetSelectedComponent,
      () => {
        const page = figma.currentPage;
        const fill = getTopFill(page.backgrounds);
        const color = getColor(fill?.color, fill?.opacity);
        emit<T.EventProjectBackground>('PROJECT_BACKGROUND', color);
      }
    );
  });
}
