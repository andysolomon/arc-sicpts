import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

/**
 * The stepper's "current node" highlight. It is one absolutely positioned box
 * behind the text rather than a mark decoration, so that it can slide from one
 * node to the next with a CSS transition.
 */

export interface HighlightRange {
  from: number;
  to: number;
}

export const setStepHighlight = StateEffect.define<HighlightRange | null>();

const highlightField = StateField.define<HighlightRange | null>({
  create: () => null,
  update(value, transaction) {
    // Positions from a trace are meaningless once the text changes.
    let next = transaction.docChanged ? null : value;
    for (const effect of transaction.effects) {
      if (effect.is(setStepHighlight)) next = effect.value;
    }
    return next;
  },
});

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD_X = 2;

class HighlightLayer {
  private readonly dom: HTMLDivElement;

  constructor(view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'cm-step-highlight';
    this.dom.setAttribute('aria-hidden', 'true');
    this.dom.style.display = 'none';
    view.scrollDOM.appendChild(this.dom);
    this.schedule(view);
  }

  update(update: ViewUpdate): void {
    const changed = update.startState.field(highlightField) !== update.state.field(highlightField);
    if (changed || update.docChanged || update.geometryChanged || update.viewportChanged) {
      this.schedule(update.view);
    }
  }

  destroy(): void {
    this.dom.remove();
  }

  private schedule(view: EditorView): void {
    view.requestMeasure<Box | null>({
      key: this,
      read: (v) => this.measure(v),
      write: (box) => this.place(box),
    });
  }

  private measure(view: EditorView): Box | null {
    const range = view.state.field(highlightField);
    if (range === null) return null;
    const to = Math.min(range.to, view.state.doc.length);
    const start = view.coordsAtPos(Math.min(range.from, to), 1);
    const end = view.coordsAtPos(to, -1);
    if (start === null || end === null) return null;

    const scroller = view.scrollDOM.getBoundingClientRect();
    const offsetX = view.scrollDOM.scrollLeft - scroller.left;
    const offsetY = view.scrollDOM.scrollTop - scroller.top;

    if (Math.abs(start.top - end.top) < 1) {
      return {
        left: start.left + offsetX - PAD_X,
        top: start.top + offsetY,
        width: end.right - start.left + 2 * PAD_X,
        height: start.bottom - start.top,
      };
    }
    // A node that spans lines is boxed from its first line to its last.
    const content = view.contentDOM.getBoundingClientRect();
    return {
      left: content.left + offsetX - PAD_X,
      top: start.top + offsetY,
      width: content.width - 12,
      height: end.bottom - start.top,
    };
  }

  private place(box: Box | null): void {
    const { style } = this.dom;
    if (box === null) {
      style.display = 'none';
      return;
    }
    // When appearing, jump into place; only moves between nodes animate.
    const appearing = style.display === 'none';
    if (appearing) style.transition = 'none';
    style.display = 'block';
    style.left = `${box.left}px`;
    style.top = `${box.top}px`;
    style.width = `${box.width}px`;
    style.height = `${box.height}px`;
    if (appearing) {
      void this.dom.offsetWidth;
      style.transition = '';
    }
  }
}

export const stepHighlight: Extension = [
  highlightField,
  ViewPlugin.fromClass(HighlightLayer),
  EditorView.baseTheme({
    '.cm-step-highlight': {
      position: 'absolute',
      zIndex: '-1',
      boxSizing: 'border-box',
      backgroundColor: 'var(--color-accent-soft)',
      outline: '1.5px solid var(--color-accent)',
      borderRadius: '3px',
      pointerEvents: 'none',
      transition: 'left 160ms ease, top 160ms ease, width 160ms ease, height 160ms ease',
    },
  }),
];
