import {useEffect} from 'preact/hooks';
import {useMonaco} from '@monaco-editor/react';
import schemaSettings from 'templates/settings/schema.json';

// import AutoImport, {regexTokeniser} from '@blitz/monaco-auto-import'
// import {AutoTypings, LocalStorageCache} from 'monaco-editor-auto-typings';

import type {Settings} from 'types/settings';
import type {EditorLibrary, EditorLinks} from 'types/editor';

export function useEditor(settings: Settings, links?: EditorLinks, libs?: EditorLibrary[]) {
  const monaco = useMonaco();

  // Setup linking to components
  useEffect(() => {
    return monaco?.languages.registerDefinitionProvider('typescript', {
      provideDefinition: (model, position) => {
        const link = links?.[model.getWordAtPosition(position).word];
        if (link) {
          parent.postMessage({pluginMessage: {type: 'focus', payload: link}}, '*');
          return [];
        }
        return [];
      }
    }).dispose;
  }, [links]);
    
  // Setup JSON schema
  useEffect(() => {
    const json = monaco?.languages.json.jsonDefaults;
    json?.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        schema: schemaSettings,
        fileMatch: [monaco?.Uri.parse('Settings.json').toString()],
        uri: 'http://ult.dev/figaro-settings-schema.json',
      }],
    });
  }, [monaco]);

  // Setup typescript user options + libraries
  useEffect(() => {
    const typescript = monaco?.languages.typescript.typescriptDefaults;
    typescript?.setCompilerOptions(settings.monaco.compiler);
    typescript?.setInlayHintsOptions(settings.monaco.inlayHints);
    typescript?.setDiagnosticsOptions(settings.monaco.diagnostics);
    if (libs) {
      typescript?.setExtraLibs(libs);
      libs.forEach((lib) => {
        monaco?.editor.createModel(lib.content, 'typescript', monaco.Uri.parse(lib.path))
      });
    }
  }, [monaco, settings, libs]);

  /*
    // Automatic types for packages (EXPERIMENTAL)
    AutoTypings.create(editor, {sourceCache: new LocalStorageCache()});
    const completor = new AutoImport({monaco, editor})

    completor.imports.saveFiles([{
      path: './node_modules/left-pad/index.js',
      aliases: ['left-pad'],
      imports: regexTokeniser(`
        export const PAD = ''
        export function leftPad() {}
        export function rightPad() {}
      `)
    }]);
  */

  return monaco;
}
