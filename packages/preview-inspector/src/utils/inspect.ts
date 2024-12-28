import {
  getFiberName,
  getElementFiberUpward,
  getDirectParentFiber,
  isReactSymbolFiber,
  isNativeTagFiber,
  isForwardRef,
} from './fiber';

import type {Fiber, Source} from 'react-reconciler';
import type {CodeInfo, CodeDataAttribute} from '../types';

/**
 * react fiber property `_debugSource` created by `@babel/plugin-transform-react-jsx-source`
 *     https://github.com/babel/babel/blob/v7.16.4/packages/babel-plugin-transform-react-jsx-source/src/index.js
 *
 * and injected `__source` property used by `React.createElement`, then pass to `ReactElement`
 *     https://github.com/facebook/react/blob/v18.0.0/packages/react/src/ReactElement.js#L189
 *     https://github.com/facebook/react/blob/v18.0.0/packages/react/src/ReactElement.js#L389
 *     https://github.com/facebook/react/blob/v18.0.0/packages/react/src/ReactElement.js#L447
 *
 * finally, used by `createFiberFromElement` to become a fiber property `_debugSource`.
 *     https://github.com/facebook/react/blob/v18.0.0/packages/react-reconciler/src/ReactFiber.new.js#L648-L649
 */
export const getCodeInfoFromDebugSource = (fiber?: Fiber): CodeInfo | undefined => {
  if (!fiber) return undefined;

  /**
   * Only find forward with 2 level _debugOwner, otherwise to normal `fiber.return`
   */
  const debugSource = (
    fiber._debugSource
    ?? fiber._debugOwner?._debugSource
    ?? fiber._debugOwner?._debugOwner?._debugSource
  ) as Source & {columnNumber?: number};

  if (!debugSource) return undefined

  const {fileName, lineNumber, columnNumber} = debugSource;
  if (fileName && lineNumber) {
    return {
      lineNumber: String(lineNumber),
      columnNumber: String(columnNumber ?? 1),
      /**
       * `fileName` in `_debugSource` is absolutely
       * ---
       *
       * Compatible with the incorrect `fileName: "</xxx/file>"` by [rspack](https://github.com/web-infra-dev/rspack)
       */
      absolutePath: fileName.match(/^<.*>$/)
        ? fileName.replace(/^<|>$/g, '')
        : fileName,
    };
  }

  return undefined
}

/**
 * Code location data-attribute props inject by `@react-dev-inspector/babel-plugin`
 */
export const getCodeInfoFromProps = (fiber?: Fiber): CodeInfo | undefined => {
  if (!fiber?.pendingProps) return undefined

  const {
    'data-inspector-line': lineNumber,
    'data-inspector-column': columnNumber,
    'data-inspector-relative-path': relativePath,
  } = fiber.pendingProps as CodeDataAttribute

  if (lineNumber && columnNumber && relativePath) {
    return {
      lineNumber,
      columnNumber,
      relativePath,
    };
  }

  return undefined;
}

export const getCodeInfoFromFiber = (fiber?: Fiber): CodeInfo | undefined => {
  const codeInfos = [
    getCodeInfoFromDebugSource(fiber),
    getCodeInfoFromProps(fiber),
  ].filter(Boolean) as CodeInfo[];

  if (!codeInfos.length) return undefined;
  return Object.assign({}, ...codeInfos);
}

/**
 * give a `base` dom fiber,
 * and will try to get the human friendly react component `reference` fiber from it;
 *
 * rules and examples see below:
 * *******************************************************
 *
 * if parent is html native tag, `reference` is considered to be as same as `base`
 *
 *  div                                       div
 *    └─ h1                                     └─ h1  (<--base) <--reference
 *      └─ span  (<--base) <--reference           └─ span
 *
 * *******************************************************
 *
 * if parent is NOT html native tag,
 *   and parent ONLY have one child (the `base` itself),
 *   then `reference` is considered to be the parent.
 *
 *  Title  <--reference                       Title
 *    └─ h1  (<--base)                          └─ h1  (<--base) <--reference
 *      └─ span                                 └─ span
 *                                              └─ div
 *
 * *******************************************************
 *
 * while follow the last one,
 *   "parent" is considered to skip continuous Provider/Customer/ForwardRef components
 *
 *  Title  <- reference                       Title  <- reference
 *    └─ TitleName [ForwardRef]                 └─ TitleName [ForwardRef]
 *      └─ Context.Customer                       └─ Context.Customer
 *         └─ Context.Customer                      └─ Context.Customer
 *          └─ h1  (<- base)                          └─ h1  (<- base)
 *            └─ span                             └─ span
 *                                                └─ div
 *
 *  Title
 *    └─ TitleName [ForwardRef]
 *      └─ Context.Customer
 *         └─ Context.Customer
 *          └─ h1  (<- base) <- reference
 *    └─ span
 *    └─ div
 */
export const getReferenceFiber = (baseFiber?: Fiber): Fiber | undefined => {
  if (!baseFiber) return undefined;

  const directParent = getDirectParentFiber(baseFiber);
  if (!directParent) return undefined;

  const isParentNative = isNativeTagFiber(directParent);
  const isOnlyOneChild = !directParent.child!.sibling;

  let referenceFiber = (!isParentNative && isOnlyOneChild)
    ? directParent
    : baseFiber;

  // Fallback for cannot find code-info fiber when traverse to root
  const originReferenceFiber = referenceFiber;

  while (referenceFiber) {
    if (getCodeInfoFromFiber(referenceFiber))
      return referenceFiber;
    referenceFiber = referenceFiber.return!;
  }

  return originReferenceFiber;
}

export const getElementCodeInfo = (element: HTMLElement): CodeInfo | undefined => {
  const fiber: Fiber | undefined = getElementFiberUpward(element);
  const referenceFiber = getReferenceFiber(fiber);
  return getCodeInfoFromFiber(referenceFiber);
}

export const getNamedFiber = (baseFiber?: Fiber): Fiber | undefined => {
  let fiber = baseFiber;
  let originNamedFiber: Fiber | undefined;

  while (fiber) {
    let parent = fiber.return ?? undefined;
    let forwardParent: Fiber | undefined;

    while (isReactSymbolFiber(parent)) {
      if (isForwardRef(parent)) {
        forwardParent = parent;
      }
      parent = parent?.return ?? undefined;
    }

    if (forwardParent) {
      fiber = forwardParent;
    }

    if (getFiberName(fiber)) {
      if (!originNamedFiber)
        originNamedFiber = fiber;
      if (getCodeInfoFromFiber(fiber))
        return fiber;
    }

    fiber = parent!
  }

  return originNamedFiber;
}

export const getElementInspect = (element: HTMLElement): {
  fiber?: Fiber,
  name: string,
  title: string,
} => {
  const fiber = getElementFiberUpward(element);
  const refFiber = getReferenceFiber(fiber);
  const namedFiber = getNamedFiber(refFiber);
  const nodeName = element.nodeName.toLowerCase();
  let fiberName = getFiberName(namedFiber);
  if (fiberName === nodeName) {
    fiberName = getFiberName(namedFiber?.return);
  }
  return {
    fiber: refFiber,
    name: nodeName,
    title: fiberName || nodeName,
  };
}
