import {registerCompletion} from 'monacopilot';
import type {Monaco, Editor} from '../';

function init(monaco: Monaco, editor: Editor) {
  const completion = registerCompletion(monaco, editor, {
    endpoint: 'https://f2rn-copilot.deno.dev/1',
    language: 'typescript',
    trigger: 'onTyping',
    technologies: ['typescript', 'react', 'react-native'],
    maxContextLines: 60,
    enableCaching: true,
    onError: (error) => {
      console.error('[copilot error]', error);
    },
  });

  monaco.editor.addEditorAction({
    id: 'monacopilot.triggerCompletion',
    label: 'Trigger Copilot',
    contextMenuGroupId: 'navigation',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space,
    ],
    run: () => {
      completion.trigger();
    },
  });
}

export default {
  init,
};
