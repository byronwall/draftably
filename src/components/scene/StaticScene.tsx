import { For } from 'solid-js';
import type { StaticScene as Scene } from '../../model/static-scene';
import { EdgeView } from './EdgeView';
import { GroupView } from './GroupView';
import { NodeView } from './NodeView';

/** A read-only drawing, used for comparison candidates. */
export function StaticScene(props: {
  scene: Scene;
  idPrefix: string;
  focusId?: string;
  focusable?: boolean;
}) {
  return (
    <>
      <For each={props.scene.vg.groups}>
        {g => (
          <GroupView
            doc={props.scene.doc}
            id={g.id}
            rect={props.scene.rects.get(g.id)!}
            focused={g.id === props.focusId}
          />
        )}
      </For>
      <For each={props.scene.routes}>
        {route => <EdgeView doc={props.scene.doc} route={route} idPrefix={props.idPrefix} />}
      </For>
      <For each={props.scene.vg.nodes}>
        {n => (
          <NodeView
            doc={props.scene.doc}
            id={n.id}
            rect={props.scene.rects.get(n.id)!}
            focused={n.id === props.focusId}
            idPrefix={props.idPrefix}
            focusable={props.focusable}
          />
        )}
      </For>
    </>
  );
}
