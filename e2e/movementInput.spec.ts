import {test,expect,Page,CDPSession} from '@playwright/test';

async function start(page:Page){
  await page.goto('http://127.0.0.1:5197/?seed=1337');
  await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__);
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',seed:1337}));
  await page.waitForFunction(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.pointerMovement&&s.player?.active&&s.state.time>0;});
  await page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    s.state.enemies=[];s.state.projectiles=[];s.state.moveSlots=[];s.state.pickups=[];
    s.nextSpawn=Infinity;s.miniIndex=99;s.state.hp=s.state.maxHp=100000;
  });
}

async function sample(page:Page){
  return page.evaluate(()=>{
    const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),j=s.pointerMovement.joystick;
    return{id:j.activePointerId,time:s.state.time,origin:{x:j.originX,y:j.originY},handle:{x:j.handleX,y:j.handleY},vector:{...j.vector},movement:{...s.moveInput()},position:{x:s.state.player.x,y:s.state.player.y},velocity:{x:s.state.player.vx,y:s.state.player.vy},camera:{x:s.cameras.main.scrollX,y:s.cameras.main.scrollY}};
  });
}

async function point(page:Page,x=.5,y=.5){
  const bounds=(await page.locator('#app canvas').boundingBox())!;
  return{x:bounds.x+bounds.width*x,y:bounds.y+bounds.height*y};
}

type Contact={id:number;x:number;y:number};
async function touch(cdp:CDPSession,type:'touchStart'|'touchMove'|'touchEnd'|'touchCancel',contacts:Contact[]){
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:contacts.map(contact=>({...contact,radiusX:6,radiusY:6,force:1}))});
}

test('mouse joystick uses a dead zone, proportional speed, a clamped handle and all eight directions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await start(page);
  const origin=await point(page),before=await sample(page);
  await page.mouse.move(origin.x,origin.y);await page.mouse.down();
  await expect(page.locator('.movement-joystick')).toHaveAttribute('data-active','true');
  await page.waitForTimeout(80);expect((await sample(page)).position).toEqual(before.position);
  await page.mouse.move(origin.x+7,origin.y+7);await page.waitForTimeout(80);
  expect((await sample(page)).vector).toEqual({x:0,y:0});expect((await sample(page)).position).toEqual(before.position);
  await page.mouse.move(origin.x+37.5,origin.y);
  expect((await sample(page)).vector.x).toBeCloseTo(.5,5);
  for(const [x,y] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]]){
    await page.mouse.move(origin.x+x*100,origin.y+y*100);
    const current=await sample(page),length=Math.hypot(x,y);
    expect(current.vector.x).toBeCloseTo(x/length,5);expect(current.vector.y).toBeCloseTo(y/length,5);
    expect(Math.hypot(current.handle.x,current.handle.y)).toBeCloseTo(65,5);
    expect(Math.hypot(current.movement.x,current.movement.y)).toBeCloseTo(1,5);
    expect(current.origin).toEqual(origin);
  }
  await page.mouse.up();expect((await sample(page)).vector).toEqual({x:0,y:0});
  await expect(page.locator('.movement-joystick')).toHaveAttribute('data-active','false');
  await expect(page.locator('.movement-joystick')).toHaveCSS('opacity','0');
});

test('held dragging moves through the existing simulation, reverses fluidly, stays screen anchored, and stops on release',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await start(page);
  const origin=await point(page),before=await sample(page);
  await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x+100,origin.y);
  await expect.poll(async()=>(await sample(page)).position.x).toBeGreaterThan(before.position.x+8);
  const right=await sample(page);expect(right.velocity.x).toBeGreaterThan(0);
  const visual=(await page.locator('.movement-joystick').boundingBox())!;
  expect(visual.x+visual.width/2).toBeCloseTo(origin.x,1);expect(visual.y+visual.height/2).toBeCloseTo(origin.y,1);
  expect(Math.abs(right.camera.x-before.camera.x)).toBeGreaterThan(0);
  await page.mouse.move(origin.x-100,origin.y);
  await expect.poll(async()=>(await sample(page)).velocity.x).toBeLessThan(0);
  await page.mouse.up();await expect.poll(async()=>(await sample(page)).velocity).toEqual({x:0,y:0});
  const stopped=(await sample(page)).position;await page.waitForTimeout(120);expect((await sample(page)).position).toEqual(stopped);
  const next=await point(page,.7,.65);await page.mouse.move(next.x,next.y);await page.mouse.down();
  expect((await sample(page)).origin).toEqual(next);expect((await sample(page)).vector).toEqual({x:0,y:0});await page.mouse.up();
});

test('keyboard, arrows, analog controller and D-pad share capped movement with the mouse',async({page})=>{
  await page.addInitScript(()=>{
    const pad={connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
    (window as any).__MOVEMENT_PAD__=pad;Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
  });
  await start(page);
  await page.evaluate(()=>{(window as any).__MOVEMENT_PAD__.axes=[.575,0];});
  expect((await sample(page)).movement.x).toBeCloseTo(.5,5);
  await page.evaluate(()=>{const p=(window as any).__MOVEMENT_PAD__;p.axes=[0,0];p.buttons[12].pressed=p.buttons[15].pressed=true;});
  let movement=(await sample(page)).movement;
  expect(movement.x).toBeCloseTo(Math.SQRT1_2,5);expect(movement.y).toBeCloseTo(-Math.SQRT1_2,5);
  const origin=await point(page);await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x-65,origin.y);
  expect((await sample(page)).movement).toEqual({x:-1,y:0});
  await page.keyboard.down('d');await page.keyboard.down('w');movement=(await sample(page)).movement;
  expect(movement.x).toBeCloseTo(Math.SQRT1_2,5);expect(movement.y).toBeCloseTo(-Math.SQRT1_2,5);
  await page.keyboard.up('d');await page.keyboard.up('w');await page.mouse.up();
  await page.evaluate(()=>{const p=(window as any).__MOVEMENT_PAD__;p.buttons.forEach((button:any)=>button.pressed=false);});
  await page.keyboard.down('ArrowLeft');expect((await sample(page)).movement).toEqual({x:-1,y:0});await page.keyboard.up('ArrowLeft');
  expect((await sample(page)).movement).toEqual({x:0,y:0});
});

test('HUD controls and paused upgrade selections never begin movement',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await start(page);
  for(const [x,y] of [[70,140],[45,670]]){
    await page.mouse.move(x,y);await page.mouse.down();expect((await sample(page)).id).toBeNull();await page.mouse.up();
  }
  const origin=await point(page);await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x+65,origin.y);
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.showChoices('TOUCH INPUT PAUSE',[{kind:'vitamin',id:'protein',label:'Protein'}]);});
  await page.waitForFunction(()=>{const g=(window as any).__POKEMON_SURVIVORS__;return g.scene.isPaused('game')&&g.scene.getScene('upgrade').cards.length>0;});
  expect((await sample(page)).id).toBeNull();expect((await sample(page)).movement).toEqual({x:0,y:0});
  await page.mouse.up();await page.mouse.move(640,400);await page.mouse.down();expect((await sample(page)).id).toBeNull();await page.mouse.up();
  await page.waitForFunction(()=>!(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').overlay);
  expect((await sample(page)).movement).toEqual({x:0,y:0});
  expect(await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').state.vitamins.protein)).toBe(1);
});

test('lost capture, browser blur, scene pause and scene replacement clear gestures without duplicate controls',async({page})=>{
  await start(page);const origin=await point(page);
  const begin=async()=>{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x+65,origin.y);expect((await sample(page)).id).not.toBeNull();};
  await begin();
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game'),canvas=s.game.canvas;canvas.releasePointerCapture(s.pointerMovement.joystick.activePointerId);});
  await page.mouse.move(origin.x+66,origin.y);
  await expect.poll(async()=>(await sample(page)).id).toBeNull();await page.mouse.up();
  await begin();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect((await sample(page)).id).toBeNull();await page.mouse.up();
  await begin();await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.scene.manager.pause(s);});
  expect((await sample(page)).id).toBeNull();expect((await sample(page)).movement).toEqual({x:0,y:0});await page.mouse.up();
  await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.scene.manager.resume(s);});
  await begin();await page.evaluate(()=>{const g=(window as any).__POKEMON_SURVIVORS__;g.scene.stop('game');g.scene.start('menu');});await page.mouse.up();
  await expect(page.locator('.movement-joystick-layer')).toHaveCount(0);await expect(page.locator('.frontend--menu')).toBeVisible();
  await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByRole('button',{name:'Single Player',exact:true})).toBeVisible();
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.start('game',{pokemon:'bulbasaur',seed:1337}));
  await expect(page.locator('.movement-joystick-layer')).toHaveCount(1);await page.waitForFunction(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').pointerMovement?.joystick.activePointerId===null);
  const fresh=await point(page);await page.mouse.move(fresh.x,fresh.y);await page.mouse.down();await page.mouse.move(fresh.x,fresh.y-65);
  expect((await sample(page)).movement).toEqual({x:0,y:-1});await page.mouse.up();
  await page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.remove('game'));
  await expect(page.locator('.movement-joystick-layer')).toHaveCount(0);
  await expect(page.locator('#app canvas')).not.toHaveClass(/gameplay-surface/);
});

for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  test(`trusted touch uses CSS-pixel sensitivity at DPR 2 in ${viewport.width}×${viewport.height}, with no browser scrolling or zoom`,async({browser})=>{
    const context=await browser.newContext({viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true});
    try{
      const page=await context.newPage();await start(page);const cdp=await context.newCDPSession(page),origin=await point(page,.5,.55),contact={id:1,...origin};
      const before=await sample(page);await touch(cdp,'touchStart',[contact]);await page.waitForTimeout(70);
      expect((await sample(page)).position).toEqual(before.position);
      await touch(cdp,'touchMove',[{...contact,x:origin.x+37.5}]);expect((await sample(page)).vector.x).toBeCloseTo(.5,3);
      await touch(cdp,'touchMove',[{...contact,x:origin.x+100,y:origin.y-50}]);
      const active=await sample(page);expect(active.vector.x).toBeCloseTo(2/Math.sqrt(5),3);expect(active.vector.y).toBeCloseTo(-1/Math.sqrt(5),3);
      expect(Math.hypot(active.handle.x,active.handle.y)).toBeCloseTo(65,3);
      const visual=(await page.locator('.movement-joystick').boundingBox())!;
      expect(visual.x+visual.width/2).toBeCloseTo(origin.x,1);expect(visual.y+visual.height/2).toBeCloseTo(origin.y,1);
      await page.screenshot({path:`test-results/screenshots/movement-touch-${viewport.width}.png`});
      await page.setViewportSize({...viewport,width:viewport.width+20});
      expect((await sample(page)).id).toBe(active.id);expect((await sample(page)).vector).toEqual(active.vector);
      const resized=(await page.locator('.movement-joystick').boundingBox())!;
      expect(resized.x+resized.width/2).toBeCloseTo(origin.x,1);expect(resized.y+resized.height/2).toBeCloseTo(origin.y,1);
      await touch(cdp,'touchEnd',[]);expect((await sample(page)).id).toBeNull();
      await expect.poll(async()=>(await sample(page)).velocity).toEqual({x:0,y:0});
      expect(await page.evaluate(()=>({x:scrollX,y:scrollY,scale:visualViewport?.scale,dpr:devicePixelRatio,touchAction:getComputedStyle(document.querySelector('#app canvas')!).touchAction,bodyTouchAction:getComputedStyle(document.body).touchAction}))).toEqual({x:0,y:0,scale:1,dpr:2,touchAction:'none',bodyTouchAction:'auto'});
    }finally{await context.close();}
  });
}

test('multitouch retains its movement owner while another finger activates a gameplay control; cancellation stops input',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  try{
    const page=await context.newPage();await start(page);
    await page.evaluate(()=>{
      (window as any).__MOVEMENT_POINTER_EVENTS__=[];
      for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.querySelector('#app canvas')!.addEventListener(type,event=>{const e=event as PointerEvent;(window as any).__MOVEMENT_POINTER_EVENTS__.push({type:e.type,id:e.pointerId,x:e.clientX,y:e.clientY});});
    });
    await page.evaluate(()=>{
      const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');s.touchControlPresses=0;
      s.add.zone(1080,560,160,100).setScrollFactor(0).setDepth(25000).setInteractive().on('pointerdown',()=>s.touchControlPresses++);
    });
    // Allow Phaser to register the new interactive object before the next input event.
    await page.waitForTimeout(60);
    const cdp=await context.newCDPSession(page),origin=await point(page,.4,.55),button=await point(page,1080/1280,560/720),first={id:1,...origin},second={id:2,...button};
    await touch(cdp,'touchStart',[first]);await touch(cdp,'touchMove',[{...first,x:first.x+65}]);
    const owner=await sample(page);expect(owner.vector.x).toBeCloseTo(1,3);
    await touch(cdp,'touchStart',[{...first,x:first.x+65},second]);
    await expect.poll(()=>page.evaluate(()=>(window as any).__POKEMON_SURVIVORS__.scene.getScene('game').touchControlPresses)).toBe(1);
    expect((await sample(page)).id).toBe(owner.id);expect((await sample(page)).vector).toEqual(owner.vector);
    await touch(cdp,'touchEnd',[{...first,x:first.x+65}]);
    expect((await sample(page)).id,JSON.stringify(await page.evaluate(()=>(window as any).__MOVEMENT_POINTER_EVENTS__))).toBeNull();
    await touch(cdp,'touchMove',[{...second,x:second.x-40}]);expect((await sample(page)).id).toBeNull();await touch(cdp,'touchEnd',[]);
    await touch(cdp,'touchStart',[second]);expect((await sample(page)).id).toBeNull();await touch(cdp,'touchEnd',[]);
    await touch(cdp,'touchStart',[first]);await touch(cdp,'touchMove',[{...first,y:first.y-65}]);expect((await sample(page)).id).not.toBeNull();
    await touch(cdp,'touchCancel',[]);expect((await sample(page)).id).toBeNull();expect((await sample(page)).vector).toEqual({x:0,y:0});
    await expect.poll(async()=>(await sample(page)).velocity).toEqual({x:0,y:0});
  }finally{await context.close();}
});

test('captured drag stays responsive outside the canvas during a 400-enemy wave',async({page})=>{
  await page.setViewportSize({width:1280,height:900});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await start(page);
  await page.evaluate(async()=>{
    const path='/src/simulation.ts',{spawnSpecies}=await import(path),s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');
    spawnSpecies(s.state,'caterpie',200);spawnSpecies(s.state,'weedle',200);
  });
  const before=await sample(page),origin=await point(page);
  await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(origin.x,40);
  let current=await sample(page);expect(current.id).not.toBeNull();expect(current.vector).toEqual({x:0,y:-1});
  expect(await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return s.game.canvas.hasPointerCapture(s.pointerMovement.joystick.activePointerId);})).toBe(true);
  await expect.poll(async()=>(await sample(page)).velocity.y).toBeLessThan(0);
  expect((await sample(page)).position.y).toBeLessThan(before.position.y);
  await page.mouse.move(origin.x,860);current=await sample(page);expect(current.id).not.toBeNull();expect(current.vector).toEqual({x:0,y:1});
  await expect.poll(async()=>(await sample(page)).velocity.y).toBeGreaterThan(0);
  const wave=await page.evaluate(()=>{const s=(window as any).__POKEMON_SURVIVORS__.scene.getScene('game');return{time:s.state.time,enemies:s.state.enemies.length,velocity:[s.state.player.vx,s.state.player.vy]};});
  expect(wave.enemies).toBe(400);expect(wave.velocity.every(Number.isFinite)).toBe(true);expect(wave.time).toBeGreaterThan(before.time);
  await page.mouse.up();await expect.poll(async()=>(await sample(page)).velocity).toEqual({x:0,y:0});expect(errors).toEqual([]);
});
