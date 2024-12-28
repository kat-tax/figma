import * as Y from 'yjs';
import * as monaco from 'monaco-editor';
import * as error from 'lib0/error';
import {createMutex} from 'lib0/mutex';

import type {Awareness} from 'y-protocols/awareness';
import type {mutex} from 'lib0/mutex';

class RelativeSelection {
  start: Y.RelativePosition;
  end: Y.RelativePosition;
  direction: monaco.SelectionDirection;
  constructor (
    start: Y.RelativePosition,
    end: Y.RelativePosition,
    direction: monaco.SelectionDirection,
  ) {
    this.start = start;
    this.end = end;
    this.direction = direction;
  }
}

const createRelativeSelection = (
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoModel: monaco.editor.ITextModel,
  type: Y.Text,
) => {
  const sel = editor.getSelection();
  if (sel !== null) {
    const startPos = sel.getStartPosition();
    const endPos = sel.getEndPosition();
    const start = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(startPos));
    const end = Y.createRelativePositionFromTypeIndex(type, monacoModel.getOffsetAt(endPos));
    return new RelativeSelection(start, end, sel.getDirection());
  }
  return null
}

const createMonacoSelectionFromRelativeSelection = (
  editor: monaco.editor.IStandaloneCodeEditor,
  type: Y.Text,
  relSel: RelativeSelection,
  doc: Y.Doc,
): null | monaco.Selection => {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (start !== null && end !== null && start.type === type && end.type === type) {
    const model = editor.getModel();
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    return monaco.Selection.createWithDirection(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column,
      relSel.direction,
    );
  }
  return null;
}

export class MonacoBinding {
  mux: mutex;
  doc: Y.Doc;
  ytext: Y.Text;
  monacoModel: monaco.editor.ITextModel;
  editors: Set<monaco.editor.IStandaloneCodeEditor>;
  awareness: Awareness;

  _savedSelections: Map<monaco.editor.IStandaloneCodeEditor, RelativeSelection>;
  _decorations: Map<any, any>;
  _monacoChangeHandler: any;
  _monacoDisposeHandler: any;
  _beforeTransaction: () => void;
  _rerenderDecorations: () => void;
  _ytextObserver: (event: any) => void;

  constructor (
    ytext: Y.Text,
    monacoModel: monaco.editor.ITextModel,
    editors = new Set<monaco.editor.IStandaloneCodeEditor>(),
    awareness: Awareness = null,
  ) {
    // Setup
    this.mux = createMutex();
    this.doc = ytext.doc;
    this.ytext = ytext;
    this.editors = editors;
    this.monacoModel = monacoModel;
    this._savedSelections = new Map<monaco.editor.IStandaloneCodeEditor, RelativeSelection>();
    
    // Transactions
    this._beforeTransaction = () => {
      this.mux(() => {
        this._savedSelections = new Map();
        editors.forEach(editor => {
          if (editor.getModel() === monacoModel) {
            const rel = createRelativeSelection(editor, monacoModel, ytext);
            if (rel !== null) {
              this._savedSelections.set(editor, rel);
            }
          }
        })
      })
    }
    this.doc.on('beforeAllTransactions', this._beforeTransaction);
  
    // Decorations
    this._decorations = new Map();
    this._rerenderDecorations = () => {
      editors.forEach(editor => {
        if (awareness && editor.getModel() === monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations: Array<monaco.editor.IModelDeltaDecoration> = [];
          awareness.getStates().forEach((state, clientID) => {
            if (clientID !== this.doc.clientID
              && state.selection != null
              && state.selection.anchor != null
              && state.selection.head != null) {
              const anchorAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.anchor, this.doc);
              const headAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.head, this.doc);
              if (anchorAbs !== null
                && headAbs !== null
                && anchorAbs.type === ytext
                && headAbs.type === ytext) {
                let start, end, afterContentClassName, beforeContentClassName;
                if (anchorAbs.index < headAbs.index) {
                  start = monacoModel.getPositionAt(anchorAbs.index);
                  end = monacoModel.getPositionAt(headAbs.index);
                  afterContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID;
                  beforeContentClassName = null;
                } else {
                  start = monacoModel.getPositionAt(headAbs.index);
                  end = monacoModel.getPositionAt(anchorAbs.index);
                  afterContentClassName = null;
                  beforeContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID;
                }
                newDecorations.push({
                  range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                  options: {
                    className: 'yRemoteSelection yRemoteSelection-' + clientID,
                    afterContentClassName,
                    beforeContentClassName,
                  },
                });
              }
            }
          });
          this._decorations.set(editor, editor.deltaDecorations(currentDecorations, newDecorations));
        } else {
          this._decorations.delete(editor);
        }
      })
    }
  
    // YText Observer
    this._ytextObserver = (event: Y.YTextEvent) => {
      this.mux(() => {
        let index = 0
        event.delta.forEach(op => {
          if (op.retain !== undefined) {
            index += op.retain
          } else if (op.insert !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const range = new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
            const insert = (op.insert) as string;
            monacoModel.applyEdits([{range, text: insert}]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const endPos = monacoModel.getPositionAt(index + op.delete);
            const range = new monaco.Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
            monacoModel.applyEdits([{range, text: ''}]);
          } else {
            throw error.unexpectedCase();
          }
        })
        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(editor, ytext, rsel, this.doc);
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      });
      this._rerenderDecorations();
    }
    ytext.observe(this._ytextObserver);
    {
      const ytextValue = ytext.toString();
      if (monacoModel.getValue() !== ytextValue) {
        monacoModel.setValue(ytextValue);
      }
    }
  
    // Editor Change Handler
    // (apply changes from right to left)
    this._monacoChangeHandler = monacoModel.onDidChangeContent(event => {
      this.mux(() => {
        this.doc.transact(() => {
          event.changes.sort((change1, change2) =>
            change2.rangeOffset - change1.rangeOffset).forEach(change => {
              ytext.delete(change.rangeOffset, change.rangeLength);
              ytext.insert(change.rangeOffset, change.text);
            });
        }, this);
      });
    });
  
    // Editor Dispose Handler
    this._monacoDisposeHandler = monacoModel.onWillDispose(() => {
      this.destroy();
    })
  
    // Selection Awareness
    if (awareness) {
      editors.forEach(editor => {
        editor.onDidChangeCursorSelection(() => {
          if (editor.getModel() === monacoModel) {
            const sel = editor.getSelection();
            if (sel === null) {
              return;
            }
            let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
            let head = monacoModel.getOffsetAt(sel.getEndPosition());
            if (sel.getDirection() === monaco.SelectionDirection.RTL) {
              const tmp = anchor;
              anchor = head;
              head = tmp;
            }
            awareness.setLocalStateField('selection', {
              anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
              head: Y.createRelativePositionFromTypeIndex(ytext, head),
            });
          }
        })
        awareness.on('change', this._rerenderDecorations);
      })
      this.awareness = awareness;
    }
  }

  destroy () {
    this._monacoChangeHandler.dispose();
    this._monacoDisposeHandler.dispose();
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness) {
      this.awareness.off('change', this._rerenderDecorations);
    }
  }
}
