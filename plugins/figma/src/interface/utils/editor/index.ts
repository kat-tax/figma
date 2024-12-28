import {F2RN_EDITOR_NS} from 'config/consts';
import {componentPathNormalize} from 'common/string';
import {emit} from '@create-figma-plugin/utilities';
import schema from 'interface/schemas/user/schema.json';
import * as $ from 'store';

import imports from './lib/imports';
import copilot from './lib/copilot';
import typings from './lib/typings';
import prompts from './lib/prompts';
import language from './lib/language';

import type * as monaco from 'monaco-editor';
import type {UserSettings} from 'types/settings';
import type {EventFocusNode} from 'types/events';
import type {ComponentLinks} from 'types/component';
import type {TypeScriptComponents} from './lib/language';

export type Editor = monaco.editor.IStandaloneCodeEditor;
export type Monaco = typeof monaco;

export function initTypescript(monaco: Monaco, settings: UserSettings) {
  const exo = `${F2RN_EDITOR_NS}node_modules/react-exo`;
  const ts = monaco.languages.typescript.typescriptDefaults;
  ts?.setInlayHintsOptions(settings.monaco.inlayHints);
  ts?.setDiagnosticsOptions(settings.monaco.diagnostics);
  ts?.setCompilerOptions({
    ...settings.monaco.compiler,
    jsx: monaco.languages.typescript.JsxEmit.ReactNative,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    paths: {
      'theme': [`${F2RN_EDITOR_NS}theme.ts`],
      'components/*': [`${F2RN_EDITOR_NS}*`],
      'react-exo/*': [`${exo}`],
    }
  });

  // Add theme file
  const theme = $.projectTheme.toString();
  if (theme) {
    const uri = monaco.Uri.parse(`${F2RN_EDITOR_NS}theme.ts`);
    const model = monaco.editor.getModel(uri);
    if (!model) {
      monaco.editor.createModel(theme, 'typescript', uri);
    } else {
      model.setValue(theme);
    }
  }

  // Add library files
  for (const key of Object.keys(imports)) {
    const uri = monaco.Uri.parse(key);
    if (!monaco.editor.getModel(uri)) {
      monaco.editor.createModel(imports[key], 'typescript', uri);
    }
  }
}

export function initFileOpener(monaco: Monaco, links?: ComponentLinks) {
  // Example 1: testID={props.testID ?? "1034:553"}
  // Example 2: testID="1034:553"
  const regexTestId = /testID=(?:"(\d+:\d+)"|{props\.testID \?\? "(\d+:\d+)"})/;
  return monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource) {
      let nodeId: string | undefined;
      const base = `${resource.scheme}://${resource.authority}/`;
      if (base === F2RN_EDITOR_NS) {
        // Foreign model, search for path in component links
        const isOriginFile = resource.path !== source.getModel().uri.path;
        if (isOriginFile) {
          nodeId = links?.[componentPathNormalize(resource.path)];
        }

        // Search for test ids if no component name found
        if (!nodeId) {
          const sel = source.getSelection();
          const model = source.getModel();
          for (let i = sel.startLineNumber; i <= sel.endLineNumber; i++) {
            const line = model?.getLineContent(i);
            const match = line?.match(regexTestId);
            if (match?.length) {
              const [_, literal, prop] = match;
              nodeId = prop ? links?.[componentPathNormalize(model.uri.path)] : literal;
            }
          }
        }
      }
      // Focus node in editor
      // TODO: support multiple nodes
      if (nodeId) {
        emit<EventFocusNode>('NODE_FOCUS', nodeId);
      }
      console.debug('[open file]', {resource, base, nodeId, links, source});
      return false;
    }
  }).dispose;
}

export function initSettingsSchema(monaco: Monaco) {
  const json = monaco.languages.json.jsonDefaults;
  json?.setDiagnosticsOptions({
    validate: true,
    schemas: [{
      schema,
      uri: 'http://fig.run/schema-settings.json',
      fileMatch: [
        monaco?.Uri.parse(`${F2RN_EDITOR_NS}settings.json`).toString(),
      ],
    }],
  });
}

export async function initComponentEditor(
  editor: Editor,
  monaco: Monaco,
  onPrompt: () => void,
  onComponents: (components: TypeScriptComponents) => void,
) {
  // console.log('[init editor]', editor, monaco);
  typings.init(monaco, editor);
  copilot.init(monaco, editor);
  prompts.init(monaco, editor, onPrompt);
  await language.onTypeScriptWorkerReady(monaco, editor.getModel());
  editor.onDidChangeModel(async (e) => {
    onComponents(await language.getTypeScriptComponents(monaco, editor.getModel()));
  });
}

