import {JoystickState, type JoystickConfig} from './movementVector';

export interface PointerMovementOptions {
  config?:Partial<JoystickConfig>;
  isEnabled:()=>boolean;
  overControl:(clientX:number,clientY:number)=>boolean;
  onInterrupt?:()=>void;
}

/** Native screen-space input; Phaser continues to own all canvas UI events. */
export class PointerMovementController {
  readonly joystick:JoystickState;
  private readonly listeners=new AbortController();
  private readonly layer=document.createElement('div');
  private readonly base=document.createElement('div');
  private readonly handle=document.createElement('div');
  private readonly observer?:ResizeObserver;
  private left=0;
  private top=0;
  private destroyed=false;
  private lastTouchAt=Number.NEGATIVE_INFINITY;

  constructor(private readonly surface:HTMLCanvasElement,private readonly options:PointerMovementOptions){
    this.joystick=new JoystickState(options.config);
    const config=this.joystick.config;
    this.layer.className='movement-joystick-layer';this.layer.setAttribute('aria-hidden','true');
    this.base.className='movement-joystick';this.base.dataset.active='false';
    this.handle.className='movement-joystick-handle';
    this.base.style.setProperty('--joystick-radius',`${config.radius}px`);
    this.base.style.setProperty('--joystick-handle-radius',`${config.handleRadius}px`);
    this.base.style.setProperty('--joystick-opacity',String(config.opacity));
    this.base.style.setProperty('--joystick-fade',`${config.fadeDurationMs}ms`);
    this.base.append(this.handle);this.layer.append(this.base);document.body.append(this.layer);
    surface.classList.add('gameplay-surface');
    const {signal}=this.listeners;
    if(typeof window.PointerEvent==='function'){
      surface.addEventListener('pointerdown',this.pointerDown,{signal});
      // Window listeners also cover browsers that cannot grant pointer capture.
      window.addEventListener('pointermove',this.pointerMove,{signal,passive:false});
      window.addEventListener('pointerup',this.pointerEnd,{signal});
      window.addEventListener('pointercancel',this.pointerEnd,{signal});
      surface.addEventListener('lostpointercapture',this.pointerEnd,{signal});
    }else{
      surface.addEventListener('touchstart',this.touchStart,{signal,passive:false});
      window.addEventListener('touchmove',this.touchMove,{signal,passive:false});
      window.addEventListener('touchend',this.touchEnd,{signal});
      window.addEventListener('touchcancel',this.touchEnd,{signal});
      surface.addEventListener('mousedown',this.mouseDown,{signal});
      window.addEventListener('mousemove',this.mouseMove,{signal});
      window.addEventListener('mouseup',this.mouseEnd,{signal});
    }
    surface.addEventListener('contextmenu',this.preventSurfaceGesture,{signal});
    surface.addEventListener('selectstart',this.preventSurfaceGesture,{signal});
    surface.addEventListener('dragstart',this.preventSurfaceGesture,{signal});
    window.addEventListener('blur',this.interrupt,{signal});
    window.addEventListener('pagehide',this.interrupt,{signal});
    document.addEventListener('visibilitychange',this.visibilityChanged,{signal});
    window.addEventListener('resize',this.refreshLayout,{signal});
    window.addEventListener('scroll',this.refreshLayout,{signal,capture:true,passive:true});
    document.addEventListener('fullscreenchange',this.refreshLayout,{signal});
    if(typeof ResizeObserver==='function'){this.observer=new ResizeObserver(this.refreshLayout);this.observer.observe(surface);}
    this.refreshLayout();
  }

  private start(id:number,x:number,y:number):boolean {
    if(this.destroyed||this.joystick.activePointerId!==null||!this.options.isEnabled()||this.options.overControl(x,y))return false;
    this.refreshLayout();
    if(!this.joystick.start(id,x,y))return false;
    this.draw();this.base.dataset.active='true';return true;
  }
  private move(id:number,x:number,y:number):void {
    if(id!==this.joystick.activePointerId)return;
    if(!this.options.isEnabled()){this.reset();return;}
    if(this.joystick.move(id,x,y))this.draw();
  }
  private readonly pointerDown=(event:PointerEvent):void=>{
    if(event.button!==0||!this.start(event.pointerId,event.clientX,event.clientY))return;
    // Prevent compatibility mouse gestures only after accepting a gameplay drag.
    event.preventDefault();
    try{this.surface.setPointerCapture(event.pointerId);}catch{/* Window listeners retain the gesture. */}
  };
  private readonly pointerMove=(event:PointerEvent):void=>{
    if(event.pointerId!==this.joystick.activePointerId)return;
    if(event.pointerType==='mouse'&&(event.buttons&1)===0){this.reset();return;}
    if(event.cancelable)event.preventDefault();
    this.move(event.pointerId,event.clientX,event.clientY);
  };
  private readonly pointerEnd=(event:PointerEvent):void=>{
    if(event.pointerId===this.joystick.activePointerId)this.reset();
  };
  private readonly touchStart=(event:TouchEvent):void=>{
    // Touch compatibility mouse events must never start a second gesture.
    this.lastTouchAt=performance.now();
    if(!event.changedTouches.length)return;
    const touch=event.changedTouches[0];
    if(this.start(touch.identifier,touch.clientX,touch.clientY)&&event.cancelable)event.preventDefault();
  };
  private readonly touchMove=(event:TouchEvent):void=>{
    for(let i=0;i<event.changedTouches.length;i++){
      const touch=event.changedTouches[i];if(touch.identifier!==this.joystick.activePointerId)continue;
      if(event.cancelable)event.preventDefault();this.move(touch.identifier,touch.clientX,touch.clientY);break;
    }
  };
  private readonly touchEnd=(event:TouchEvent):void=>{
    this.lastTouchAt=performance.now();
    for(let i=0;i<event.changedTouches.length;i++)if(event.changedTouches[i].identifier===this.joystick.activePointerId){this.reset();break;}
  };
  private readonly mouseDown=(event:MouseEvent):void=>{
    if(performance.now()-this.lastTouchAt<800)return;
    if(event.button===0&&this.start(-1,event.clientX,event.clientY))event.preventDefault();
  };
  private readonly mouseMove=(event:MouseEvent):void=>{
    if(this.joystick.activePointerId!==-1)return;
    if((event.buttons&1)===0)this.reset();else this.move(-1,event.clientX,event.clientY);
  };
  private readonly mouseEnd=(event:MouseEvent):void=>{if(event.button===0&&this.joystick.activePointerId===-1)this.reset();};
  private readonly preventSurfaceGesture=(event:Event):void=>{if(this.options.isEnabled())event.preventDefault();};
  private readonly visibilityChanged=():void=>{if(document.hidden)this.interrupt();};
  private readonly interrupt=():void=>{this.reset();this.options.onInterrupt?.();};

  /** Immediately zero input; CSS alone handles the visual fade. */
  reset():void {
    const id=this.joystick.activePointerId;
    this.joystick.reset();this.base.dataset.active='false';
    if(id!==null)try{if(this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);}catch{/* Already cancelled. */}
  }
  private readonly refreshLayout=():void=>{
    const rect=this.surface.getBoundingClientRect();this.left=rect.left;this.top=rect.top;
    Object.assign(this.layer.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    this.draw();
  };
  private draw():void {
    // The origin is in viewport CSS pixels, never world or backing-canvas pixels.
    const joystick=this.joystick;
    this.base.style.left=`${joystick.originX-this.left}px`;this.base.style.top=`${joystick.originY-this.top}px`;
    this.handle.style.transform=`translate(${joystick.handleX}px,${joystick.handleY}px)`;
  }
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.reset();
    this.listeners.abort();this.observer?.disconnect();this.layer.remove();this.surface.classList.remove('gameplay-surface');
  }
}
