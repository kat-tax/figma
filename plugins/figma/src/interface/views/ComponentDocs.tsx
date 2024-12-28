import {Fragment} from 'react';
import {LoadingIndicator} from 'figma-ui';
import {ScreenWarning} from 'interface/base/ScreenWarning';
import {F2RN_EDITOR_NS} from 'config/consts';
import MonacoReact from '@monaco-editor/react';
import * as $ from 'store';

import type {Theme} from '@monaco-editor/react';
import type {UserSettings} from 'types/settings';

interface ComponentDocsProps {
  compKey: string;
  editorOptions: UserSettings['monaco']['general'];
  editorTheme: Theme;
}

export function ComponentDocs(props: ComponentDocsProps) {
  const $info = $.components.get(props.compKey);
  const $docs = $.component.docs(props.compKey);
  return (
    <Fragment>
      {!$info &&
        <ScreenWarning message="Component not found"/>
      }
      <MonacoReact
        language="mdx"
        path={`${F2RN_EDITOR_NS}${$info?.path}.docs.mdx`}
        value={$docs.get().toString()}
        theme={props.editorTheme}
        options={{...props.editorOptions, readOnly: true}}
        loading={<LoadingIndicator/>}
      />
    </Fragment>
  );
}
