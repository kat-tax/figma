import * as random from 'common/random';
import * as string from 'common/string';
import * as consts from 'config/consts';

import {NodeAttrGroup, NodeAttrType} from 'types/node';
import {getPage, getSection} from './traverse';
import {getFillToken} from './colors';

import type {ParseIconData} from 'types/parse';
import type {ComponentInfo} from 'types/component';
import type {NodeAttrData} from 'types/node';
import type {TypeScriptComponentProps} from 'interface/utils/editor/lib/language';

export function isNodeVisible(node: SceneNode) {
  const isVariant = !!(node as SceneNode & VariantMixin).variantProperties;
  const masterNode = (isVariant ? node?.parent : node);
  const propRefs = (masterNode as ComponentNode)?.componentPropertyReferences;
  return node.visible || propRefs?.visible;
}

export function isNodeIcon(node: BaseNode) {
  if (!node.name.includes(':')) return;
  const isInstance = node.type === 'INSTANCE';
  const masterNode = isInstance ? node.mainComponent : node;
  return getPage(masterNode)?.name === consts.PAGES_SPECIAL.ICONS;
}

export function getIconData(node: SceneNode): ParseIconData {
  const vector = (node as ChildrenMixin).children.find(c => c.type === 'VECTOR') as VectorNode;
  const color = getFillToken(vector);
  const size = Math.max(node.width, node.height);
  const name = (node as InstanceNode)?.mainComponent?.name;
  return {name, color, size};
}

export function getNodeAttrs(node: BaseNode, nodeSrc: string): NodeAttrData {
  // TODO: fix this
  // const props = JSON.parse(figma.root.getSharedPluginData('f2rn', consts.F2RN_COMP_PROPS) || '{}');
  const props = {};
  const attrs: NodeAttrData = {
    [NodeAttrGroup.Properties]: props?.[nodeSrc]?.props?.map((p: TypeScriptComponentProps) => ({
      uuid: random.uuid(),
      data: null,
      name: p.name,
      type: p.type,
      desc: p.docs,
      opts: p.opts,
    })),
    [NodeAttrGroup.Animations]: [
      {uuid: random.uuid(), data: null, name: 'loop', type: NodeAttrType.Motion, desc: ''},
      {uuid: random.uuid(), data: null, name: 'hover', type: NodeAttrType.Motion, desc: ''},
      {uuid: random.uuid(), data: null, name: 'press', type: NodeAttrType.Motion, desc: ''},
      {uuid: random.uuid(), data: null, name: 'enter', type: NodeAttrType.Motion, desc: ''},
      {uuid: random.uuid(), data: null, name: 'exit', type: NodeAttrType.Motion, desc: ''},
    ],
    [NodeAttrGroup.Interactions]: [
      // ...
    ],
    [NodeAttrGroup.Visibilities]: [
      //{uuid: random.uuid(), data: null, name: 'breakpoint', type: NodeAttrType.Enum, opts: ['XS', 'SM', 'MD', 'LG', 'XL'], desc: ''},
      //{uuid: random.uuid(), data: null, name: 'container', type: NodeAttrType.Tuple, opts: ['W', 'H'], desc: ''},
      {uuid: random.uuid(), data: null, name: 'platform', type: NodeAttrType.Enum, opts: ['Web', 'iOS', 'Android', 'macOS', 'Windows'], desc: ''},
      {uuid: random.uuid(), data: null, name: 'native', type: NodeAttrType.Boolean, desc: ''},
      {uuid: random.uuid(), data: null, name: 'touch', type: NodeAttrType.Boolean, desc: ''},
    ],
    [NodeAttrGroup.Dynamics]: [
      // ...
    ],
  };

  try {
    const data = node.getSharedPluginData('f2rn', consts.F2RN_NODE_ATTRS);
    const json = data ? JSON.parse(data) : attrs;
    return json;
  } catch (e) {
    return attrs;
  }
}

export function getComponentInfo(node: BaseNode): ComponentInfo | null {
  if (node.type !== 'COMPONENT'
    && node.type !== 'INSTANCE'
    && node.type !== 'COMPONENT_SET') return null;

  const isVariant = node?.parent?.type === 'COMPONENT_SET';
  const isInstance = node?.type === 'INSTANCE';
  const target = isVariant
    ? node.parent
    : isInstance
      ? node.mainComponent
      : node;

  const name = string.createIdentifierPascal(target.name);
  const section = getSection(target);
  const page = getPage(target);

  // TODO: fix this, remote components not supported
  if (!page) {
    console.log('>> warning, remote components not supported', target);
  }

  const path = 'components/'
    + string.createPathKebab(page?.name || 'common')
    + '/'
    + string.createPathKebab(section?.name || 'base')
    + '/'
    + string.createPathKebab(target.name);
  
  // Find the selected variant (if applicable)
  // TODO: fix this?, it should use the node target?
  const selectedVariant = (isVariant
    ? target.children.filter((n) => figma.currentPage.selection.includes(n)).pop()
    : undefined) as VariantMixin;
    
  // Override propDefs values with selected variant values
  const propDefs = target.componentPropertyDefinitions;
  if (selectedVariant) {
    Object.entries(selectedVariant?.variantProperties).forEach((v: any) => {
      propDefs[v[0]].defaultValue = v[1];
    });
  }

  return {target, name, page, section, path, propDefs, isVariant, isInstance};
}

export function getComponentInstanceInfo(node: InstanceNode) {
  const isInstance = node.type === 'INSTANCE';
  const isVariant = !!node.variantProperties;
  const main = isVariant ? node.mainComponent.parent : node.mainComponent;
  const props = node.componentProperties;
  const propId = node.componentPropertyReferences?.mainComponent;
  const propName = propId ? getComponentPropName(propId) : null;
  return {node, main, props, propName, isInstance};
}

export function getComponentFrameSize(node: ComponentNode, frame: FrameNode) {
  const ref = frame || node;
  return {
    width: ref.layoutSizingHorizontal === 'HUG' ? 0 : ref.width,
    height: ref.layoutSizingVertical === 'HUG' ? 0 : ref.height,
  };
}

export function getComponentPropName(value: string) {
  if (!value) return '';
  return string.createIdentifierCamel(value.split('#').shift());
}

export function sortComponentProps(a: any, b: any) {
  // Booleans are always first
  if (a[1].type === 'BOOLEAN' && b[1].type !== 'BOOLEAN') {
    return -1;
  // Otherwise sort alphabetically
  }
  return a[0]?.localeCompare(b[0]);
}

export function sortComponentPropsDef(a: any, b: any) {
  const isCondA = a[1].type === 'BOOLEAN' || a[1].type === 'INSTANCE_SWAP';
  const isCondB = b[1].type === 'BOOLEAN' || b[1].type === 'INSTANCE_SWAP';
  // Conditional types are last if different
  if (isCondA !== isCondB)
    return isCondA ? 1 : -1;
  // Sort by type alphabetically if different
  if (a[1].type !== b[1].type)
    return a[1].type?.localeCompare(b[1].type);
  // Otherwise sort prop name alphabetically
  return a[0]?.localeCompare(b[0]);
}

/** @deprecated */
export function getComponentCustomReaction(node: ComponentNode | InstanceNode) {
  return node.reactions
    ?.filter(r => r.trigger?.type === 'ON_CLICK'
      && r.action?.type === 'URL')[0]?.action;
}

/** @deprecated */
export function getComponentPressReaction(node: ComponentNode | InstanceNode) {
  return node.reactions?.filter(r => r.trigger?.type === 'ON_PRESS')?.[0];
}