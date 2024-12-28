import {Fragment} from 'react';
import {LoadingIndicator} from 'figma-ui';
import {ScreenWarning} from 'interface/base/ScreenWarning';
import {F2RN_EDITOR_NS} from 'config/consts';
import MonacoReact from '@monaco-editor/react';
import * as $ from 'store';

import type {Theme} from '@monaco-editor/react';
import type {UserSettings} from 'types/settings';

interface ComponentStoryProps {
  compKey: string;
  editorOptions: UserSettings['monaco']['general'];
  editorTheme: Theme;
}

export function ComponentStory(props: ComponentStoryProps) {
  const component = $.components.get(props.compKey);
  const story = $.component.story(props.compKey);
  return (
    <Fragment>
      {!story &&
        <ScreenWarning message="Component not found"/>
      }
      <MonacoReact
        language="typescript"
        path={`${F2RN_EDITOR_NS}${component?.path}.story.ts`}
        value={story.get().toString()}
        theme={props.editorTheme}
        options={{...props.editorOptions, readOnly: true}}
        loading={<LoadingIndicator/>}
      />
    </Fragment>
  );
}
