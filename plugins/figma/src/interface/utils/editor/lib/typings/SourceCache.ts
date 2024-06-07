import type {SourceCache as SourceCacheBase} from 'monaco-editor-auto-typings/custom-editor';

export class SourceCache implements SourceCacheBase {
  static NS = 'at-cache::';
  static _ = new Map<string, string>();

  constructor() {
    //Object.keys(localStorage).forEach((key) => {
    //  if (key.startsWith(AutoTypeCache.NS)) {
    //    const uri = key.replace(AutoTypeCache.NS, '');
        //AutoTypeCache._.set(uri, localStorage.getItem(key));
    //  }
    //});
  }

  async getFile(uri: string) {
    return SourceCache._.get(uri);
  }

  async storeFile(uri: string, content: string) {
    //console.log('[at-cache]', uri, content.length);
    SourceCache._.set(uri, content);
  }

  async clear() {
    SourceCache._.clear();
  }
}
