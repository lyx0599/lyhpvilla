import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildConstructionPackageData, constructionPackageToCsv, constructionPackageToHtml } from '../lib/construction-package-export.ts';
import { evaluateOutputDrawings } from '../lib/output-drawings.ts';

const workspace = JSON.parse(await readFile(new URL('../data/default-workspace.json', import.meta.url), 'utf8'));
const structure = workspace.houseStructuresByFloor['1F'];
const furniture = workspace.furniture.filter((item) => item.floorId === '1F');
const items = workspace.drawingItems.filter((item) => item.floorId === '1F');
const baseContext = { structure, furniture, drawingItems: items, stairSystems: [], stairLandings: [], stairOpenings: [], errorCount: 0, warningCount: 0, geometryCheckStatus: 'executed', geometryIssues: [], dimensionCheckStatus: 'clear' };
const ready = evaluateOutputDrawings(baseContext);
assert.ok(ready.some((drawing) => drawing.id === 'layout-plan'));
const blocked = evaluateOutputDrawings({ ...baseContext, geometryIssues: [{ furnitureId: furniture[0]?.id, severity: 'error', message: '实体重叠测试' }] });
assert.equal(blocked.find((drawing) => drawing.id === 'layout-plan')?.geometryStatus, 'blocked');
assert.equal(blocked.find((drawing) => drawing.id === 'furniture-position-plan')?.status, 'incomplete');
assert.equal(evaluateOutputDrawings({ ...baseContext, dimensionCheckStatus: 'not-run' }).find((drawing) => drawing.id === 'lighting-plan')?.status, 'incomplete');
const warningOnly = evaluateOutputDrawings({ ...baseContext, geometryIssues: [{ furnitureId: furniture[0]?.id, severity: 'warning', message: '仅提醒' }] });
assert.equal(warningOnly.find((drawing) => drawing.id === 'layout-plan')?.geometryStatus, 'clear');

const rotated = structuredClone(workspace);
const rotatedItem = rotated.furniture.find((item) => item.position.rotation !== 0 && item.floorId === '1F') ?? rotated.furniture.find((item) => item.floorId === '1F');
assert.ok(rotatedItem);
rotatedItem.position.rotation = 90;
rotatedItem.position.x = 20;
rotatedItem.position.y = 30;
const rotatedHtml = constructionPackageToHtml(rotated);
assert.match(rotatedHtml, new RegExp(`data-furniture-id="${rotatedItem.id}"`));
assert.match(rotatedHtml, /data-rotation="90"/);
assert.match(rotatedHtml, /data-opening-kind="door"/);
assert.match(rotatedHtml, /A [0-9.]+ [0-9.]+ 0 0 [01]/);

const hidden = structuredClone(workspace);
const hiddenItem = hidden.furniture.find((item) => item.floorId === '1F');
hiddenItem.hidden = true;
let hiddenData = buildConstructionPackageData(hidden);
assert.ok(!hiddenData.tables.furniturePlacement.some((record) => record.objectId === hiddenItem.id));
assert.ok(hiddenData.tables.exportReview.some((record) => record.objectId === hiddenItem.id));
hiddenItem.exportScope = 'include';
hiddenData = buildConstructionPackageData(hidden);
assert.ok(hiddenData.tables.furniturePlacement.some((record) => record.objectId === hiddenItem.id));
hiddenItem.exportScope = 'exclude';
hiddenData = buildConstructionPackageData(hidden);
assert.ok(!hiddenData.tables.furniturePlacement.some((record) => record.objectId === hiddenItem.id));
const linkedPoint = hidden.drawingItems.find((item) => item.relatedFurnitureId === hiddenItem.id);
if (linkedPoint) assert.ok(!hiddenData.tables.lighting.concat(hiddenData.tables.socketAndNetwork, hiddenData.tables.waterSupply, hiddenData.tables.drainage).some((record) => record.objectId === linkedPoint.id));

const csv = constructionPackageToCsv(workspace);
for (const field of ['positionMm', 'rotationDeg', 'widthMm', 'depthMm', 'heightMm', 'dimensionUnit', 'exportDisposition']) assert.ok(csv.split('\n')[0].includes(field), field);
console.log('Luna drawing logic regression checks passed.');
