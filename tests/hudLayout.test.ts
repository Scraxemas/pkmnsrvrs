import {describe,expect,it} from 'vitest';
import {gameplayHudLayout,hpBarColor,experienceProgress,formatSurvivalTimer} from '../src/hudLayout';

describe('compact combat HUD layout',()=>{
 it.each([[1280,720],[1920,1080],[2560,1440],[3440,1440]])('places thin experience bar and distinct HUD regions at %ix%i',(width,height)=>{
  const layout=gameplayHudLayout(width,height);
  expect(layout.experience.width/width).toBeGreaterThan(.94);
  expect(layout.experience.height).toBeGreaterThanOrEqual(8);
  expect(layout.experience.height).toBeLessThanOrEqual(12);
  expect(layout.experience.x).toBeGreaterThan(0);
  expect(layout.timer.x).toBe(width/2);
  expect(layout.moves.x).toBeLessThan(layout.boss.x);
  expect(layout.boss.x+layout.boss.width).toBeLessThan(layout.character.x);
  expect(layout.boss.y).toBeGreaterThan(layout.moves.y);
  expect(layout.boss.y).toBeGreaterThan(layout.timer.y+20);
  expect(layout.items.y).toBeGreaterThan(layout.moves.y+46);
  expect(layout.objective.x).toBeLessThanOrEqual(width);
  expect(layout.research.y).toBeGreaterThan(layout.objective.y);
 });
 it('keeps readable health states',()=>{expect(hpBarColor(1)).not.toBe(hpBarColor(.4));expect(hpBarColor(.4)).not.toBe(hpBarColor(.1));});
 it('clamps XP and formats the survival clock without changing simulation time',()=>{
  expect(experienceProgress(2,19,20)).toMatchObject({ratio:.95,label:'LEVEL 2 — EXP 19 / 20'});
  expect(experienceProgress(3,-10,20).ratio).toBe(0);
  expect(formatSurvivalTimer(57.9)).toBe('00:57');
  expect(formatSurvivalTimer(1800)).toBe('30:00');
  expect(formatSurvivalTimer(-8)).toBe('00:00');
 });
});
