import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
/** Historical release design regressions. Current5900 acceptance runs separately. */
export function readHistoricalWorkspace() {
 const bytes=fs.readFileSync(new URL('./fixtures/public377-workspace.json',import.meta.url));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'5e977e465599e84839a104aa33bf7a2f8d66991e2ba02c01c4a41e98157a662a');
 console.log('Historical public377 fixture; not current5900 design acceptance');
 return JSON.parse(bytes);
}
