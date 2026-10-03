import assert from 'node:assert/strict';
import { fitCamera, visibleReadyCells } from '../src/explorer-fit.ts';

const cells=Array.from({length:6},(_,i)=>({status:'ready',scene:{bounds:{x:-800+i*120,y:-260,w:1540,h:860}}}));
const expanded=visibleReadyCells(cells,0);
assert.deepEqual(expanded.map(({i})=>i),[0]);

for(const viewport of [{width:720,height:560},{width:1150,height:700}]){
 const {cell}=expanded[0],camera=fitCamera(cell.scene.bounds,viewport);
 assert.ok(camera.k>.015,`expanded fit should be visible at ${viewport.width}x${viewport.height}`);
 assert.ok(cell.scene.bounds.w*camera.k<=viewport.width-36+1e-9);
 assert.ok(cell.scene.bounds.h*camera.k<=viewport.height-36+1e-9);
}

const grid=visibleReadyCells(cells,null);
assert.equal(grid.length,6,'returning to grid restores every ready candidate');
assert.equal(fitCamera(cells[0].scene.bounds,{width:0,height:0}),null,'hidden cards are not fitted');
console.log('[explorer fit] PASS expanded candidate fit and grid restore');
