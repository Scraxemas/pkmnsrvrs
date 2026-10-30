import {describe,expect,it} from 'vitest';
import {combineMovement,DEFAULT_JOYSTICK_CONFIG,JoystickState,readGamepadMovement} from '../src/movementVector';

describe('floating joystick vector',()=>{
  it('establishes a neutral screen origin without moving toward the touch',()=>{
    const stick=new JoystickState();expect(stick.start(8,410,280)).toBe(true);
    expect([stick.originX,stick.originY]).toEqual([410,280]);
    expect(stick.vector).toEqual({x:0,y:0});
    expect([stick.handleX,stick.handleY]).toEqual([0,0]);
    expect(stick.config).toEqual(DEFAULT_JOYSTICK_CONFIG);
  });

  it.each([[0,-65,0,-1],[0,65,0,1],[-65,0,-1,0],[65,0,1,0],
    [65,65,Math.SQRT1_2,Math.SQRT1_2],[-65,-65,-Math.SQRT1_2,-Math.SQRT1_2]])(
    'maps offset (%s,%s) to a bounded direction',(dx,dy,x,y)=>{
      const stick=new JoystickState();stick.start(1,200,300);stick.move(1,200+dx,300+dy);
      expect(stick.vector.x).toBeCloseTo(x);expect(stick.vector.y).toBeCloseTo(y);
      expect(Math.hypot(stick.vector.x,stick.vector.y)).toBeCloseTo(1);
      expect(Math.hypot(stick.handleX,stick.handleY)).toBeCloseTo(65);
    });

  it('remaps smoothly from the dead zone to full speed and clamps distant drags',()=>{
    const stick=new JoystickState();stick.start(1,0,0);
    for(const distance of [0,5,10]){stick.move(1,distance,0);expect(stick.vector).toEqual({x:0,y:0});}
    stick.move(1,10.055,0);expect(stick.vector.x).toBeCloseTo(.001);
    stick.move(1,37.5,0);expect(stick.vector.x).toBeCloseTo(.5);
    stick.move(1,10000,0);expect(stick.vector).toEqual({x:1,y:0});expect(stick.handleX).toBe(65);
  });

  it('changes direction around the original anchor without allocating another vector',()=>{
    const stick=new JoystickState(),vector=stick.vector;stick.start(3,90,120);
    for(const [x,y] of [[65,0],[0,-65],[-65,0],[0,65]]){
      stick.move(3,90+x,120+y);expect(stick.vector).toBe(vector);
      expect([stick.originX,stick.originY]).toEqual([90,120]);
      expect(vector.x).toBeCloseTo(x/65);expect(vector.y).toBeCloseTo(y/65);
    }
  });

  it('ignores other fingers and releases immediately without adopting an existing touch',()=>{
    const stick=new JoystickState();stick.start(4,80,100);stick.move(4,145,100);
    expect(stick.start(5,400,500)).toBe(false);expect(stick.move(5,0,0)).toBe(false);expect(stick.end(5)).toBe(false);
    expect(stick.vector).toEqual({x:1,y:0});expect(stick.end(4)).toBe(true);
    expect(stick.vector).toEqual({x:0,y:0});expect(stick.activePointerId).toBeNull();
    expect(stick.move(5,400,500)).toBe(false);expect(stick.start(6,400,500)).toBe(true);
    expect([stick.originX,stick.originY,stick.handleX,stick.handleY]).toEqual([400,500,0,0]);
  });

  it('clears cancellation input while keeping the last position for a visual fade',()=>{
    const stick=new JoystickState();stick.start(2,30,40);stick.move(2,95,40);stick.reset();
    expect(stick.activePointerId).toBeNull();expect(stick.vector).toEqual({x:0,y:0});
    expect([stick.originX,stick.originY,stick.handleX,stick.handleY]).toEqual([30,40,65,0]);
  });

  it('supports custom CSS-pixel distances and visual settings',()=>{
    const stick=new JoystickState({radius:90,deadZone:20,handleRadius:30,opacity:.4,fadeDurationMs:200});
    stick.start(1,0,0);stick.move(1,55,0);expect(stick.vector.x).toBeCloseTo(.5);
    expect(stick.config.handleRadius).toBe(30);expect(stick.config.opacity).toBe(.4);
  });

  it.each([{radius:0},{radius:Infinity},{deadZone:-1},{deadZone:65},{opacity:1.01},
    {handleRadius:0},{handleRadius:66},{fadeDurationMs:-1},{radius:NaN}])('rejects unsafe settings %j',config=>{
    expect(()=>new JoystickState(config)).toThrow(RangeError);
  });

  it('rejects invalid event coordinates without corrupting movement',()=>{
    const stick=new JoystickState();expect(stick.start(1,NaN,0)).toBe(false);
    stick.start(1,0,0);stick.move(1,65,0);expect(stick.move(1,Infinity,0)).toBe(false);
    expect(stick.vector).toEqual({x:1,y:0});
  });
});

describe('shared movement source selection',()=>{
  const zero={x:0,y:0};
  it('normalizes keyboard diagonals and lets deliberate keys override analog input',()=>{
    const target={x:0,y:0};expect(combineMovement(target,1,-1,{x:-.5,y:0},{x:0,y:1})).toBe(target);
    expect(target.x).toBeCloseTo(Math.SQRT1_2);expect(target.y).toBeCloseTo(-Math.SQRT1_2);
  });
  it('preserves analog strength without summing different devices above maximum speed',()=>{
    const target={x:0,y:0};combineMovement(target,0,0,{x:.25,y:0},{x:0,y:-1});
    expect(target).toEqual({x:.25,y:0});combineMovement(target,0,0,zero,{x:0,y:-.75});
    expect(target).toEqual({x:0,y:-.75});combineMovement(target,0,0,zero,zero);
    expect(target).toEqual(zero);
  });
});

function pad(axes:number[]=[0,0],pressed:number[]=[],connected=true):Gamepad {
  return {axes,buttons:Array.from({length:16},(_,index)=>({pressed:pressed.includes(index)})),connected} as unknown as Gamepad;
}

describe('gamepad movement',()=>{
  it('ignores stick drift and remaps analog strength radially',()=>{
    const target={x:99,y:99};expect(readGamepadMovement([pad([.1,.1])],target)).toBe(target);
    expect(target).toEqual({x:0,y:0});readGamepadMovement([pad([.575,0])],target);
    expect(target.x).toBeCloseTo(.5);expect(target.y).toBe(0);
    readGamepadMovement([pad([1,1])],target);
    expect(target.x).toBeCloseTo(Math.SQRT1_2);expect(target.y).toBeCloseTo(Math.SQRT1_2);
  });
  it('uses the D-pad at full speed, normalizing diagonals over stick input',()=>{
    const target={x:0,y:0};readGamepadMovement([pad([1,0],[12,14])],target);
    expect(target.x).toBeCloseTo(-Math.SQRT1_2);expect(target.y).toBeCloseTo(-Math.SQRT1_2);
    readGamepadMovement([pad([0,0],[13])],target);expect(target).toEqual({x:0,y:1});
  });
  it('finds an active connected pad despite holes, idle pads, or disconnected devices',()=>{
    const target={x:0,y:0};readGamepadMovement([null,pad([1,0],[],false),pad(),pad([0,-1])],target);
    expect(target).toEqual({x:0,y:-1});readGamepadMovement([],target);expect(target).toEqual({x:0,y:0});
  });
  it('tolerates incomplete pad data and invalid axes',()=>{
    const target={x:0,y:0};readGamepadMovement([{axes:[NaN,Infinity],buttons:[]} as unknown as Gamepad,{} as Gamepad],target);
    expect(target).toEqual({x:0,y:0});
  });
  it('supports a configurable dead zone and rejects invalid ones',()=>{
    const target={x:0,y:0};readGamepadMovement([pad([.6,0])],target,.2);expect(target.x).toBeCloseTo(.5);
    expect(()=>readGamepadMovement([],target,1)).toThrow(RangeError);
  });
});
