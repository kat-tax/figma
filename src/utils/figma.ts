import type {TargetNode} from 'types/figma';

export function getSelectedComponent() {
  const {selection} = figma.currentPage;
  if (selection.length === 0)
    return null;
  let root: TargetNode = selection[0];
  if (root.type === 'COMPONENT')
    return selection[0];
  while (root.parent && root.parent.type !== 'PAGE') {
    root = root.parent;
    if (root.type === 'COMPONENT')
    return root;
  }
  return null;
}

export function getLayout(node: SceneNode) {
  if (isGroupNode(node) && node.children?.length === 1)
    return 'column';
  if ((node as FrameNode).layoutMode === 'VERTICAL')
    return 'column';
  if ((node as FrameNode).layoutMode === 'HORIZONTAL')
    return 'row';
  return 'unknown';
}

export const isGroupNode = (node: unknown): node is GroupNode =>
  !!(node && (node as any).type === 'GROUP');

export const hasChildren = (node: unknown): node is ChildrenMixin =>
  !!(node && (node as any).children);
