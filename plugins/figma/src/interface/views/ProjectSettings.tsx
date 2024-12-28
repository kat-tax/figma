import MonacoReact from '@monaco-editor/react';
import {AutoForm} from 'uniforms-unstyled';
import {LoadingIndicator} from 'figma-ui';
import {useMemo, useState, Fragment} from 'react';
import {F2RN_EDITOR_NS} from 'config/consts';
import {debounce} from 'common/delay';

import schema from 'interface/schemas/project';

import type {Theme} from '@monaco-editor/react';
import type {Monaco} from 'interface/utils/editor';
import type {SettingsData} from 'interface/hooks/useUserSettings';
import type {UserSettings} from 'types/settings';

const _path = `${F2RN_EDITOR_NS}settings.json`;

interface ProjectSettingsProps {
  monaco: Monaco,
  settings: SettingsData,
  editorOptions: UserSettings['monaco']['general'],
  editorTheme: Theme,
}

export function ProjectSettings(props: ProjectSettingsProps) {
  const update = useMemo(() => debounce(props.settings.update, 750), [props.settings.update]);
  const [isFormView] = useState(false);
  return (
    <Fragment>
      {isFormView
        ? <AutoForm schema={schema} onSubmit={console.log}/>
        : <MonacoReact
            language="json"
            path={_path}
            value={props.settings.raw}
            theme={props.editorTheme}
            options={{...props.editorOptions, readOnly: false}}
            loading={<LoadingIndicator/>}
            onChange={value => {
              update(value);
            }}
            onValidate={markers => {
              if (markers.length === 0) {
                const uri = props.monaco.Uri.parse(_path);
                const model = props.monaco.editor.getModel(uri);
                props.settings.update(model.getValue(), true);
                props.settings.locked.current = false;
              } else {
                props.settings.locked.current = true;
              }
            }}
          />
      }
    </Fragment>
  );
}
