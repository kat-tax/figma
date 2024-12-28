import {emit, once} from '@create-figma-plugin/utilities';
import * as consts from 'config/consts';

import type {EventStyleGenReq, EventStyleGenRes} from 'types/events';
import type {ParseStyleSheet, ParseVariantData} from 'types/parse';

let _remoteStyleGenOnly = false;
const _cacheCSS: {[nodeId: string]: StyleClass} = {};

type StyleSheet = Record<string, StyleClass>;
type StyleClass = {[key: string]: string};

export async function getStyleSheet(
  nodes: Set<string>,
  variants?: ParseVariantData,
  skipCache: boolean = false,
): Promise<ParseStyleSheet> {
  //const _t1 = Date.now();

  // Generate CSS from nodes
  const css: StyleSheet = {};
  for await (const id of nodes) {
    css[id] = await getCSS(id, skipCache);
  }

  // Generate CSS from variant mappings
  if (variants?.mapping) {
    for await (const id of Object.keys(variants.mapping)) {
      for await (const [_, vid] of Object.entries(variants.mapping[id])) {
        css[vid] = await getCSS(vid, skipCache);
      }
    }
  }

  // Profile
  //console.log(`>> [styles] ${Date.now() - _t1}ms (${nodes.size} styles, ${Object.keys(variants?.mapping || {}).length} variants)`);
  //const _t2 = Date.now();

  // Convert CSS
  const output = await convertStyles(css);

  // Profile
  //console.log(`>> [styles/convert] ${Date.now() - _t2}ms`);

  // Build Stylesheet
  const stylesheet: ParseStyleSheet = {};

  for (const key in output) {
    const style = output[key];
    if (style) {
      const props = {};
      for (const k in style) {
        // TODO: handle this in css-to-rn
        if (k === 'display' && style[k] === 'flex') {
          if (!style['flexDirection']) {
            props['flexDirection'] = 'row';
          }
        } else {
          props[k] = style[k];
        }
      }
      stylesheet[key] = props;
    }
  }

  return stylesheet;
}

async function getCSS(id: string, skipCache: boolean = false): Promise<StyleClass> {  
  // Memory cache
  if (!skipCache && _cacheCSS[id]) {
    return _cacheCSS[id];
  }
  
  // Lookup node
  const node = figma.getNodeById(id);
  
  // Disk cache
  if (!skipCache) {
    const data = node.getSharedPluginData('f2rn', consts.F2RN_COMP_STYLES);
    if (data) {
      try {
        const css = JSON.parse(data) as StyleClass;
        _cacheCSS[id] = css;
        return css;
      } catch (e) {}
    }
  }

  // Generate CSS
  const css = await node.getCSSAsync();
  _cacheCSS[id] = css;

  // Cache disk
  node.setSharedPluginData('f2rn', consts.F2RN_COMP_STYLES, JSON.stringify(css));

  return css;
}

async function convertStyles(css: StyleSheet): Promise<Record<string, any>> {
  // Headless mode needs to use the remote api (or local mode failed)
  if (_remoteStyleGenOnly || figma.mode === 'codegen') {
    return await convertStylesRemote(css);
  // Attempt to use the local stylegen from the interface
  } else {
    try {
      return await convertStylesLocal(css);
    } catch (e) {
      console.warn('Failed to use local stylegen, falling back to remote');
      _remoteStyleGenOnly = true;
      return await convertStylesRemote(css);
    }
  }
}

async function convertStylesLocal(css: StyleSheet): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    try {
      const timeout = setTimeout(() => {
        _remoteStyleGenOnly = true;
        reject(new Error('STYLE_GEN_TIMEOUT'));
      }, 5000);
      once<EventStyleGenRes>('STYLE_GEN_RES', async (declarations) => {
        clearTimeout(timeout);
        resolve(declarations);
      });
      emit<EventStyleGenReq>('STYLE_GEN_REQ', css);
    } catch (e) {
      reject(e);
    }
  });
}

async function convertStylesRemote(css: StyleSheet): Promise<Record<string, any>> {
  const response = await fetch(consts.F2RN_STYLEGEN_API, {
    body: JSON.stringify(css),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}
