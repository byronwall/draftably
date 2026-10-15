import { createMemo, onMount, Show } from 'solid-js';
import { clamp } from '../../model/geometry';
import { findEdge, findGroup, findNode, objectRect } from '../../model/graph';
import { nodeLabel } from '../../model/labels';
import {
  finishInlineEdit,
  inlineDraft,
  quickExtend,
  setInlineDraft,
  setTool,
} from '../../state/actions';
import { doc, setSelection } from '../../state/document';
import { focusCanvas, inlineEditId, stageSize } from '../../state/editor';
import { geometry, routesById } from '../../state/scene';

/** A text box over the canvas for editing a shape, container or connection label in place. */
export function InlineEditor() {
  return <Show when={inlineEditId()}>{id => <Editor id={id()} />}</Show>;
}

function Editor(props: { id: string }) {
  let input!: HTMLTextAreaElement;

  /** Screen box centered on the label, in canvas pixels. */
  const box = createMemo(() => {
    const k = doc.camera.k;
    let at,
      w = 180,
      h = 44;
    if (findEdge(doc, props.id)) {
      const route = routesById().get(props.id),
        points = route?.points ?? [{ x: 0, y: 0 }];
      at = route?.label ?? points[Math.floor(points.length / 2)];
    } else {
      const r = objectRect(doc, geometry, props.id),
        node = findNode(doc, props.id);
      const l = node
        ? nodeLabel(doc, props.id, node.title, r)
        : { x: r.w / 2, y: 17, width: r.w - 70, height: 20 };
      at = { x: r.x + l.x, y: r.y + l.y };
      w = clamp(l.width * k + 22, 140, 420);
      h = Math.max(42, l.height * k + 16);
    }
    const { width, height } = stageSize();
    return {
      w,
      h,
      left: clamp(at.x * k + doc.camera.x - w / 2, 5, Math.max(5, width - w - 5)),
      top: clamp(at.y * k + doc.camera.y - h / 2, 5, height - h - 5),
    };
  });

  const label = () =>
    findEdge(doc, props.id)
      ? 'Edit connection label'
      : findGroup(doc, props.id)
        ? 'Edit container title'
        : 'Edit node title';

  onMount(() => {
    input.focus();
    input.select();
  });

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.isComposing) return;
    if (e.key === 'Tab') {
      // Tab keeps going: commit and add the next connected shape (Shift: a sibling branch).
      e.preventDefault();
      const id = props.id;
      finishInlineEdit(true);
      setSelection([id]);
      if (findNode(doc, id) || findEdge(doc, id)) quickExtend({ sibling: e.shiftKey });
      else focusCanvas();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishInlineEdit(true);
      focusCanvas();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishInlineEdit(false);
      setTool('select');
    }
  };

  return (
    <textarea
      ref={input}
      class="inline-edit"
      aria-label={label()}
      value={inlineDraft()}
      onInput={e => setInlineDraft(e.currentTarget.value)}
      onKeyDown={onKeyDown}
      onBlur={() => finishInlineEdit(true)}
      style={{
        width: `${box().w}px`,
        height: `${box().h}px`,
        left: `${box().left}px`,
        top: `${box().top}px`,
      }}
    />
  );
}
