'use client';

import {useEffect, useRef} from 'react';
import {domInspectAgent} from '../agent';
import {
  useHotkeyToggle,
  useEffectEvent,
  useRecordPointer,
  useControlledActive,
} from '../hooks';

import type {Fiber} from 'react-reconciler';
import type {ReactNode} from 'react';
import type {CodeInfo, InspectAgent} from '../types';

const defaultInspectAgents: InspectAgent<HTMLElement>[] = [
  domInspectAgent,
]

/**
 * The inspect meta info that is sent to the callback when an element is hovered over or clicked.
 */
export interface InspectParams<Element = HTMLElement> {
  /** hover / click event target dom element */
  element: Element;
  /** nearest named react component fiber for dom element */
  fiber?: Fiber;
  /** source file line / column / path info for react component */
  codeInfo?: CodeInfo;
  /** react component name for dom element */
  name?: string;
  /** pointer event that triggered hover / click */
  pointer?: PointerEvent;
}

export interface InspectorProps<Element> {
  /**
   * Inspector Component toggle hotkeys,
   *
   * supported keys see: https://github.com/jaywcjlove/hotkeys#supported-keys
   *
   * @default - `['Ctrl', 'Shift', 'Command', 'C']` on macOS, `['Ctrl', 'Shift', 'Alt', 'C']` on other platforms.
   *
   * Setting `keys={null}` explicitly means that disable use hotkeys to trigger it.
   */
  keys?: string[] | null;

  /**
   * If setting `active` prop, the Inspector will be a Controlled React Component,
   *   you need to control the `true`/`false` state to active the Inspector.
   *
   * If not setting `active` prop, this only a Uncontrolled component that
   *   will activate/deactivate by hotkeys.
   */
  active?: boolean;

  /**
   * Whether to disable all behavior include hotkeys listening or trigger,
   * will automatically disable in production environment by default.
   *
   * @default `true` if `NODE_ENV` is 'production', otherwise is `false`.
   */
  disable?: boolean;

  /**
   * Agent for get inspection info in different React renderer with user interaction
   * @default [domInspectAgent]
   */
  inspectAgents?: InspectAgent<Element>[];

  /**
   * Trigger by `active` state change, includes:
   * - hotkeys toggle, before activate/deactivate Inspector
   * - Escape / Click, before deactivate Inspector
   *
   * will NOT trigger by `active` prop change.
   */
  onActiveChange?: (active: boolean) => void;

  /**
   * Callback when all react elements with testIds are loaded.
   */
  onLoadAllElements?: (params: {[testId: string]: InspectParams<Element>}) => void;

  /**
   * Callback when left-clicking on an element, with ensuring the source code info is found.
   */
  onInspectElement?: (params: Required<InspectParams<Element>>) => void;

  /**
   * Callback when hovering on an element.
   */
  onHoverElement?: (params: InspectParams<Element>) => void;

  /**
   * Callback when left-clicking on an element.
   */
  onClickElement?: (params: InspectParams<Element>) => void;

  /** any children of react nodes */
  children?: ReactNode;
}

export const Inspector = function<Element>(props: InspectorProps<Element>) {
  const {
    keys,
    children,
    inspectAgents = defaultInspectAgents as InspectAgent<Element>[],
    disable = (process.env.NODE_ENV !== 'development'),
    active: controlledActive,
    onLoadAllElements,
    onInspectElement,
    onActiveChange,
    onHoverElement,
    onClickElement,
  } = props;

  const pointerRef = useRecordPointer({disable});
  const agentRef = useRef<InspectAgent<Element>>();

  const startInspecting = useEffectEvent(() => {
    inspectAgents.forEach(agent => {
      agent.activate({
        pointer: pointerRef.current,
        onHover: (params) => handleHoverElement({...params, agent}),
        onClick: (params) => handleClickElement({...params, agent}),
        onPointerDown: (params) => handlePointerDown({...params, agent}),
      });
    });
  });

  const stopInspecting = useEffectEvent(() => {
    agentRef.current?.removeIndicate();
    inspectAgents.forEach(agent => {
      agent.deactivate();
    });
    agentRef.current = undefined;
  });

  const handleLoadElements = useEffectEvent(({agent, elements}: {
    agent: InspectAgent<Element>,
    elements: Element[],
  }) => {
    const nodes: {[testId: string]: InspectParams<Element>} = {};
    elements.forEach(element => {
      const nameInfo = agent.getNameInfo(element);
      const codeInfo = agent.findCodeInfo(element);
      const fiber = (element instanceof HTMLElement)
        ? domInspectAgent.getElementFiber(element)
        : undefined;
      const testId = fiber?.memoizedProps?.['data-testid'];
      if (testId) {
        nodes[testId] = {
          element,
          fiber,
          codeInfo,
          name: nameInfo?.title ?? '',
        };
      }
    });
    if (Object.keys(nodes).length > 0) {
      onLoadAllElements?.(nodes);
    }
  })

  const handleHoverElement = useEffectEvent(({agent, element, pointer}: {
    agent: InspectAgent<Element>,
    element: Element,
    pointer: PointerEvent,
  }) => {
    if (agent !== agentRef.current) {
      agentRef.current?.removeIndicate();
      agentRef.current = agent;
    }

    const nameInfo = agent.getNameInfo(element);
    agent.indicate({
      element,
      pointer,
      name: nameInfo?.name,
      title: nameInfo?.title,
    });

    if (!onHoverElement) return;

    const codeInfo = agent.findCodeInfo(element);
    const fiber = (element instanceof HTMLElement)
      ? domInspectAgent.getElementFiber(element)
      : undefined;

    onHoverElement({
      pointer,
      element,
      fiber,
      codeInfo,
      name: nameInfo?.name ?? '',
    })
  })

  const handlePointerDown = useEffectEvent(({agent, element, pointer}: {
    agent: InspectAgent<Element>,
    element?: Element,
    pointer: PointerEvent,
  }) => {
    if (agent !== agentRef.current) return;

    // Only need to stop event when triggered by the current agent
    pointer.preventDefault();
    pointer.stopPropagation();
    pointer.stopImmediatePropagation();

    if (element) {
      handleHoverElement({
        agent,
        element,
        pointer,
      });
    }
  })

  const handleClickElement = useEffectEvent(({agent, element, pointer}: {
    agent: InspectAgent<Element>,
    element?: Element,
    pointer: PointerEvent,
  }) => {
    if (agent !== agentRef.current) return;

    // Only need to stop event when triggered by the current agent
    pointer.preventDefault();
    pointer.stopPropagation();
    pointer.stopImmediatePropagation();
    agent.removeIndicate();

    if (!element) return;

    const nameInfo = agent.getNameInfo(element);
    const codeInfo = agent.findCodeInfo(element);
    const fiber = (element instanceof HTMLElement)
      ? domInspectAgent.getElementFiber(element)
      : undefined;

    deactivate();
    onClickElement?.({
      pointer,
      element,
      fiber,
      codeInfo,
      name: nameInfo?.title ?? '',
    });

    if (fiber && codeInfo) {
      onInspectElement?.({
        pointer,
        element,
        fiber,
        codeInfo,
        name: nameInfo?.title ?? '',
      });
    }
  })

  const {activate, deactivate, activeRef} = useControlledActive({
    disable,
    controlledActive,
    onActivate: startInspecting,
    onDeactivate: stopInspecting,
    onActiveChange,
  });

  useHotkeyToggle({
    keys,
    disable,
    activeRef,
    deactivate,
    activate,
  });

  useEffect(() => {
    inspectAgents.forEach(agent => handleLoadElements({
      agent,
      elements: agent.load(),
    }));
    return () => {
      agentRef.current = undefined;
      inspectAgents.forEach(agent => {
        agent.deactivate();
      });
    }
  }, [inspectAgents]);

  useEffect(() => {
    if (disable) return;

    const root = document.getElementById('component');
    if (!root) return;

    const update = () => {
      inspectAgents.forEach(agent => handleLoadElements({
        agent,
        elements: agent.load(),
      }));
    }
  
    // Update elements when window size changes
    const resizer = new ResizeObserver(update);
    resizer.observe(document.body);

    // Update elements when component children change
    const observer = new MutationObserver(update);
    observer.observe(root, {childList: true, subtree: true});

    // Update elements when position changes
    const intersector = new IntersectionObserver(update, {threshold: 0, root: null});
    intersector.observe(root);

    return () => {
      resizer.disconnect();
      observer.disconnect();
      intersector.disconnect();
    };
  }, [inspectAgents, disable]);

  return (<>{children ?? null}</>);
}
