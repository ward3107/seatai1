import { test, expect } from '@playwright/test';
import { openApp, createSampleClass, runOptimization, flushStorage } from './helpers';

async function openEditor(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__ZUSTAND_STORE__.getState().setSidebarOpen(true));
  await page.getByRole('tab', { name: 'Room', exact: true }).click();
  const toggle = page.locator('button[aria-controls="layout-panel-body"]');
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  await page.getByTestId('room-plan-editor').scrollIntoViewIfNeeded();
  return page.getByTestId('room-plan-editor');
}

test('room features share the seating chart, keep physical sides in RTL, and fit the export', async ({ page }) => {
  await openApp(page); await createSampleClass(page, 24);
  await page.evaluate(() => {
    const s = window.__ZUSTAND_STORE__.getState();
    s.setLayoutDef({type:'rows',rows:4,cols:8,roomFeatures:[
      ...[0.2,0.4,0.6,0.8].map((y,i)=>({id:`w${i}`,kind:'window' as const,x:0,y})),
      {id:'door',kind:'door',x:1,y:0.5},{id:'teacher',kind:'teacher',x:0.5,y:0.1},
    ]});
    s.setSidebarOpen(false); s.setUiLanguage('he'); s.setViewMode('pairs');
  });
  await runOptimization(page);
  await expect(page.getByTestId('room-plan')).toHaveCount(1);
  await expect(page.locator('#seating-grid-export [data-seat-key]')).toHaveCount(32);
  for (const language of ['he','ar','en'] as const) {
    await page.evaluate(lang=>window.__ZUSTAND_STORE__.getState().setUiLanguage(lang),language);
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="room-seating-canvas"]')!.getBoundingClientRect();
      const exported = document.getElementById('seating-grid-export')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll<HTMLElement>('#seating-grid-export [data-room-feature]')).every(feature => {
        const box = feature.getBoundingClientRect();
        const fits = box.left >= exported.left && box.right <= exported.right && box.top >= exported.top && box.bottom <= exported.bottom;
        const side = feature.dataset.featureKind === 'window' ? canvas.left : canvas.right;
        return fits && (feature.dataset.featureKind === 'teacher' || Math.abs(box.left + box.width / 2 - side) < 4);
      });
    })).toBe(true);
  }
  await page.screenshot({path:test.info().outputPath('room-plan-desktop.png'),fullPage:true});
});

test('reserved cells remain visible and relationship lines meet seats at reduced zoom', async({page})=>{
  await openApp(page);await createSampleClass(page);
  await page.evaluate(()=>{
    const s=window.__ZUSTAND_STORE__.getState();
    s.setLayoutDef({type:'rows',rows:4,cols:5,blockedCells:Array.from({length:5},(_,col)=>({row:0,col,kind:col===0?'desk' as const:'obstacle' as const})),roomFeatures:[]});
    s.updateStudent('student-0',{friends_ids:['student-1']});s.setSidebarOpen(false);s.setZoomLevel(0.75);s.setShowRelations(true);
  });
  await runOptimization(page);
  await expect(page.locator('#seating-grid-export').getByRole('img',{name:"Teacher's desk",exact:true})).toBeVisible();
  await expect(page.locator('#seating-grid-export').getByRole('img',{name:'Obstacle',exact:true})).toHaveCount(4);
  const key=await page.evaluate(()=>{const s=window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s=>s.student_id==='student-0')!;return `${s.position.row}-${s.position.col}`;});
  const card=page.locator(`[data-seat-key="${key}"]`);await card.scrollIntoViewIfNeeded();await card.click();
  const dot=page.locator('#seating-grid-export > svg circle').first();await expect(dot).toBeVisible();
  const a=(await card.boundingBox())!,b=(await dot.boundingBox())!;
  expect(Math.abs(a.x+a.width/2-b.x-b.width/2)).toBeLessThan(3);
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(3);
});

test('editor adds distinct windows, supports wall selection, keyboard movement and removal', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  const editor = await openEditor(page);
  for(let i=0;i<4;i++) await editor.getByRole('button',{name:'+ Window',exact:true}).click();
  const features = await page.evaluate(()=>window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures!);
  expect(new Set(features.map(f=>f.y)).size).toBe(4);
  const selected = editor.getByRole('button',{name:'Window',exact:true}).filter({has:page.locator('span.ring-2')});
  await editor.getByRole('combobox',{name:'Wall',exact:true}).selectOption('front');
  await selected.focus(); await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures!.at(-1))).toMatchObject({x:0.55,y:0});
  await editor.getByRole('button',{name:'Remove item',exact:true}).click();
  await expect(editor.locator('[data-room-feature]')).toHaveCount(3);
  await page.screenshot({path:test.info().outputPath('room-plan-editor.png'),fullPage:true});
});

test('dragging a door snaps to the back wall and persists after reload', async ({page}) => {
  await openApp(page); await createSampleClass(page);
  const editor = await openEditor(page);
  await editor.getByRole('button',{name:'+ Door',exact:true}).click();
  const door = editor.getByRole('button',{name:'Door',exact:true});
  await door.scrollIntoViewIfNeeded();
  const a = (await door.boundingBox())!, canvas = (await editor.getByTestId('room-plan-canvas').boundingBox())!;
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2); await page.mouse.down();
  await page.mouse.move(canvas.x+canvas.width*0.6,canvas.y+canvas.height,{steps:10});
  await expect(editor.locator('[data-feature-kind="door"]')).toHaveAttribute('data-wall','back');
  await page.mouse.up();
  const saved = await page.evaluate(()=>window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures![0]);
  expect(saved.y).toBe(1); expect(saved.x).toBeCloseTo(0.6,1);
  await flushStorage(page); await page.reload();
  await page.waitForFunction(()=>window.__ZUSTAND_STORE__?.persist.hasHydrated());
  expect(await page.evaluate(()=>window.__ZUSTAND_STORE__.getState().layoutDef.roomFeatures![0])).toEqual(saved);
});

for(const zoom of [0.75,1.25]) test(`student drag remains aligned in the integrated room at zoom ${zoom}`,async({page})=>{
  await openApp(page); await createSampleClass(page);
  await page.evaluate(z=>{const s=window.__ZUSTAND_STORE__.getState();s.setLayoutDef({...s.layoutDef,roomFeatures:[{id:'w',kind:'window',x:0,y:0.5}]});s.setSidebarOpen(false);s.setZoomLevel(z);},zoom);
  await runOptimization(page);
  const keys=await page.evaluate(()=>window.__ZUSTAND_STORE__.getState().result!.layout.seats.filter(s=>s.student_id).slice(0,2).map(s=>`${s.position.row}-${s.position.col}`));
  const a=page.locator(`[data-seat-key="${keys[0]}"]`),b=page.locator(`[data-seat-key="${keys[1]}"]`);
  const id=await page.evaluate(key=>window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s=>`${s.position.row}-${s.position.col}`===key)!.student_id,keys[0]);
  await a.scrollIntoViewIfNeeded(); await a.hover(); const rect=(await a.boundingBox())!;
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
  const x=rect.x+rect.width/2+12,y=rect.y+rect.height/2+12;
  await page.mouse.move(x,y,{steps:5});await expect(page.getByTestId('drag-ghost')).toBeVisible();
  const ghost=(await page.getByTestId('drag-ghost').boundingBox())!;
  expect(x).toBeGreaterThanOrEqual(ghost.x-2);expect(x).toBeLessThanOrEqual(ghost.x+ghost.width+2);
  expect(y).toBeGreaterThanOrEqual(ghost.y-2);expect(y).toBeLessThanOrEqual(ghost.y+ghost.height+2);
  const target=(await b.boundingBox())!;await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:8});
  await expect(b.getByText(/^[✓✕]$/)).toBeVisible();await page.mouse.up();
  await expect.poll(()=>page.evaluate(key=>window.__ZUSTAND_STORE__.getState().result!.layout.seats.find(s=>`${s.position.row}-${s.position.col}`===key)!.student_id,keys[1])).toBe(id);
});
