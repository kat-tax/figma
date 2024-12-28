import sync from 'sync';
import {Doc} from 'yjs';

import type {Text} from 'yjs';
import type {SyncProvider, SyncSettings} from 'sync';

export const doc = new Doc();

/* Connection */

export let settings: SyncSettings;
export let provider: SyncProvider;

export function connect(user: User) {
  settings = sync.getSettings();
  console.log('>> [sync]', settings);
  provider = sync.createProvider(doc, settings);
  provider.awareness.setLocalState({user});
  return () => provider.disconnect();
}

/* Schema */

export type SyncProject = {
  index: Text,
  theme: Text,
}

export type SyncComponent = {
  id: string,
  key: string,
  name: string,
  page: string,
  path: string,
  props: string,
  imports: string,
  width: number,
  height: number,
}

/* Helpers */

export const project = doc.getMap<SyncProject>('project');

export const projectFiles = {
  get: () => doc.getArray<string>('files'),
  set: (files: string[]) => {
    const $files = doc.getArray<string>('files');
    $files.delete(0, $files.length);
    for (const file of files) {
      $files.push([file]);
    }
  }
}

export const projectTheme = {
  get: () => doc.getText('theme'),
  set: (theme: string) => {
    const text = doc.getText('theme');
    text.delete(0, text.length);
    text.insert(0, theme);
  }
}

export const projectIndex = {
  get: () => doc.getText('index'),
  set: (index: string) => {
    const text = doc.getText('index');
    text.delete(0, text.length);
    text.insert(0, index);
  }
}

export const components = doc.getMap<SyncComponent>('components');

export const component = {
  code: (key: string) => ({
    get: () => doc.getText(`code::${key}`),
    set: (code: string) => {
      const text = doc.getText(`code::${key}`);
      text.delete(0, text.length);
      text.insert(0, code);
    }
  }),

  index: (key: string) => ({
    get: () => doc.getText(`index::${key}`),
    set: (code: string) => {
      const text = doc.getText(`index::${key}`);
      text.delete(0, text.length);
      text.insert(0, code);
    }
  }),

  story: (key: string) => ({
    get: () => doc.getText(`story::${key}`),
    set: (code: string) => {
      const text = doc.getText(`story::${key}`);
      text.delete(0, text.length);
      text.insert(0, code);
    }
  }),

  docs: (key: string) => ({
    get: () => doc.getText(`docs::${key}`),
    set: (code: string) => {
      const text = doc.getText(`docs::${key}`);
      text.delete(0, text.length);
      text.insert(0, code);
    }
  }),
}

export const assets = doc.getMap<Uint8Array>('assets');
