export interface MovementVector {x:number;y:number;}

/** Distances are CSS pixels, independent of canvas resolution and camera zoom. */
export interface JoystickConfig {
  radius:number;
  deadZone:number;
  opacity:number;
  handleRadius:number;
  fadeDurationMs:number;
}

export const DEFAULT_JOYSTICK_CONFIG:Readonly<JoystickConfig>=Object.freeze({
  radius:65,deadZone:10,opacity:.5,handleRadius:24,fadeDurationMs:140,
});
export const GAMEPAD_DEAD_ZONE=.15;

export class JoystickState {
  readonly config:Readonly<JoystickConfig>;
  readonly vector:MovementVector={x:0,y:0};
  activePointerId:number|null=null;
  originX=0;
  originY=0;
  handleX=0;
  handleY=0;

  constructor(config:Partial<JoystickConfig>={}){
    const resolved={...DEFAULT_JOYSTICK_CONFIG,...config};
    if(!Object.values(resolved).every(Number.isFinite)||resolved.radius<=0||
      resolved.deadZone<0||resolved.deadZone>=resolved.radius||
      resolved.opacity<0||resolved.opacity>1||resolved.handleRadius<=0||
      resolved.handleRadius>resolved.radius||resolved.fadeDurationMs<0){
      throw new RangeError('Invalid joystick configuration');
    }
    this.config=Object.freeze(resolved);
  }

  start(pointerId:number,clientX:number,clientY:number):boolean {
    if(this.activePointerId!==null||!Number.isFinite(pointerId)||
      !Number.isFinite(clientX)||!Number.isFinite(clientY))return false;
    this.activePointerId=pointerId;
    this.originX=clientX;this.originY=clientY;
    this.handleX=0;this.handleY=0;
    this.vector.x=0;this.vector.y=0;
    return true;
  }

  move(pointerId:number,clientX:number,clientY:number):boolean {
    if(pointerId!==this.activePointerId||!Number.isFinite(clientX)||!Number.isFinite(clientY))return false;
    const dx=clientX-this.originX,dy=clientY-this.originY,distance=Math.hypot(dx,dy);
    const {radius,deadZone}=this.config,handleScale=distance>radius?radius/distance:1;
    this.handleX=dx*handleScale;this.handleY=dy*handleScale;
    if(distance<=deadZone){this.vector.x=0;this.vector.y=0;}
    else {
      const scale=Math.min(1,(distance-deadZone)/(radius-deadZone))/distance;
      this.vector.x=dx*scale;this.vector.y=dy*scale;
    }
    return true;
  }

  end(pointerId:number):boolean {
    if(pointerId!==this.activePointerId)return false;
    this.reset();return true;
  }

  /** Keep the last visual position available while the released joystick fades. */
  reset():void {
    this.activePointerId=null;
    this.vector.x=0;this.vector.y=0;
  }
}

/** A deliberate keyboard direction wins; otherwise pointer input wins over a pad. */
export function combineMovement(target:MovementVector,keyboardX:number,keyboardY:number,
  pointer:MovementVector,gamepad:MovementVector):MovementVector {
  let x=keyboardX,y=keyboardY;
  if(x===0&&y===0){x=pointer.x;y=pointer.y;if(x===0&&y===0){x=gamepad.x;y=gamepad.y;}}
  const divisor=Math.max(1,Math.hypot(x,y));
  target.x=x/divisor;target.y=y/divisor;
  return target;
}

/** Read standard left-stick / D-pad input into a reusable vector. */
export function readGamepadMovement(pads:ArrayLike<Gamepad|null>,target:MovementVector,
  deadZone=GAMEPAD_DEAD_ZONE):MovementVector {
  if(!Number.isFinite(deadZone)||deadZone<0||deadZone>=1)throw new RangeError('Invalid gamepad dead zone');
  target.x=0;target.y=0;
  for(let index=0;index<pads.length;index++){
    const pad=pads[index];if(!pad||pad.connected===false)continue;
    const buttons=pad.buttons;
    let x=(buttons?.[15]?.pressed?1:0)-(buttons?.[14]?.pressed?1:0);
    let y=(buttons?.[13]?.pressed?1:0)-(buttons?.[12]?.pressed?1:0);
    const dpadLength=Math.hypot(x,y);
    if(dpadLength){target.x=x/dpadLength;target.y=y/dpadLength;return target;}
    x=pad.axes?.[0]??0;y=pad.axes?.[1]??0;
    if(!Number.isFinite(x))x=0;if(!Number.isFinite(y))y=0;
    const length=Math.hypot(x,y);
    if(length<=deadZone)continue;
    const scale=Math.min(1,(length-deadZone)/(1-deadZone))/length;
    target.x=x*scale;target.y=y*scale;
    return target;
  }
  return target;
}
