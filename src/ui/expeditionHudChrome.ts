import type Phaser from 'phaser';
import {gameplayHudLayout} from '../hudLayout';

/** Low-noise framing behind the existing compact HUD.
 * Does not add extra hit areas or cover the battlefield.
 */
export function createExpeditionHudChrome(scene:Phaser.Scene){
 const width=scene.scale.width,height=scene.scale.height,layout=gameplayHudLayout(width,height);
 const g=scene.add.graphics().setName('expedition-hud-chrome').setDepth(19970).setScrollFactor(0);
 const panel=(x:number,y:number,w:number,h:number)=>{
  g.fillStyle(0x071c19,.82).fillRoundedRect(x,y,w,h,8);
  g.lineStyle(1,0x80b598,.68).strokeRoundedRect(x+.5,y+.5,w-1,h-1,8);
  g.fillStyle(0xd7d68a,.8).fillRect(x+12,y+2,31,2);
  g.lineStyle(1,0x315949,.9).lineBetween(x+9,y+h-8,x+w-9,y+h-8);
 };
 // Five move slots and four item slots, with space preserved around tooltips.
 panel(layout.moves.x-8,layout.moves.y-5,279,111);
 panel(layout.character.x-148,layout.character.y-9,220,61);
 panel(layout.timer.x-91,layout.timer.y-21,182,49);
 const details=scene.add.text(layout.timer.x,layout.timer.y+29,'VIRIDIAN · 30 MIN SURVIVAL',{
  fontFamily:'"Pokemon Pixel Font", monospace',fontSize:'9px',color:'#e5dcaf',
  stroke:'#0a1d17',strokeThickness:2
 }).setName('expedition-timer-caption').setDepth(19980).setOrigin(.5).setScrollFactor(0);
 return{graphics:g,details};
}
