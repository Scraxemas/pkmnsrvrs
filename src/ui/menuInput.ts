export type Direction='up'|'down'|'left'|'right';
export interface MenuInputOptions {initialFocus?:()=>HTMLElement|undefined;move?:(direction:Direction)=>boolean;focusOnHover?:boolean;}
function gamepad(){try{return typeof navigator.getGamepads==='function'?[...navigator.getGamepads()].find(Boolean):undefined;}catch{return undefined;}}
export interface FocusBox {left:number;top:number;width:number;height:number;}
export function spatialFocus(boxes:FocusBox[],current:number,direction:Direction){
  const origin=boxes[current];if(!origin)return 0;const horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
  const x=origin.left+origin.width/2,y=origin.top+origin.height/2;let best=current,score=Infinity;
  boxes.forEach((box,i)=>{if(i===current)return;const dx=box.left+box.width/2-x,dy=box.top+box.height/2-y,along=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);if(along<8)return;const gap=horizontal?Math.max(0,origin.top-box.top-box.height,box.top-origin.top-origin.height):Math.max(0,origin.left-box.left-box.width,box.left-origin.left-origin.width);const cost=(gap>0?1e6+gap*2.5:0)+along+cross*.001;if(cost<score){score=cost;best=i;}});return best;
}
export class MenuInput {
  static activeCount=0;
  private controller=new AbortController();private frame=0;private active=true;private padDirection='';private padConfirm=false;private padBack=false;private nextRepeat=0;
  private pointerX=NaN;private pointerY=NaN;
  constructor(private root:HTMLElement,private back?:()=>void,private options:MenuInputOptions={}){
    MenuInput.activeCount++;
    const held=gamepad();
    this.padConfirm=!!held&&(!!held.buttons[0]?.pressed||!!held.buttons[9]?.pressed);this.padBack=!!held?.buttons[1]?.pressed;
    root.addEventListener('focusin',event=>{for(const node of this.buttons())node.classList.toggle('is-focused',node===event.target);},{signal:this.controller.signal});
    // Layout changes under a stationary pointer must not steal restored focus.
    root.addEventListener('pointermove',event=>{if(this.options.focusOnHover===false||event.clientX===this.pointerX&&event.clientY===this.pointerY)return;this.pointerX=event.clientX;this.pointerY=event.clientY;const button=(event.target as HTMLElement).closest<HTMLElement>('[data-nav]');if(button)button.focus({preventScroll:true});},{signal:this.controller.signal});
    window.addEventListener('keydown',event=>{
      if(event.target instanceof HTMLSelectElement&&event.key!=='Escape')return;
      if((event.key==='Enter'||event.key===' ')&&event.repeat){event.preventDefault();return;}
      const directions:Record<string,Direction>={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
      if(directions[event.key]){event.preventDefault();this.move(directions[event.key]);}
      else if(event.key==='Escape'&&this.back){event.preventDefault();this.back();}
    },{signal:this.controller.signal});
    queueMicrotask(()=>{if(this.active)(this.options.initialFocus?.()??this.buttons()[0])?.focus({preventScroll:true});});this.frame=requestAnimationFrame(this.poll);
  }
  buttons(){return [...this.root.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('[data-nav]')].filter(node=>!node.disabled&&node.getClientRects().length>0);}
  move(direction:Direction){if(this.options.move?.(direction))return;const buttons=this.buttons(),current=Math.max(0,buttons.indexOf(document.activeElement as HTMLButtonElement)),next=spatialFocus(buttons.map(button=>button.getBoundingClientRect()),current,direction);buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView({block:'nearest',inline:'nearest'});}
  private poll=(time:number)=>{
    if(!this.active)return;const pad=gamepad();
    if(pad){
      const pressed=(i:number)=>!!pad.buttons[i]?.pressed,x=pad.axes[0]??0,y=pad.axes[1]??0;
      const direction=pressed(12)?'up':pressed(13)?'down':pressed(14)?'left':pressed(15)?'right':Math.max(Math.abs(x),Math.abs(y))>.55?(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up'):'';
      if(direction&&(direction!==this.padDirection||time>=this.nextRepeat)){this.move(direction);this.nextRepeat=time+(direction===this.padDirection?160:450);}
      const confirm=pressed(0)||pressed(9),back=pressed(1);
      if(confirm&&!this.padConfirm)(document.activeElement as HTMLElement)?.click();if(back&&!this.padBack)this.back?.();
      this.padDirection=direction;this.padConfirm=confirm;this.padBack=back;this.root.dataset.input='controller';
    }else{this.padDirection='';this.padConfirm=false;this.padBack=false;}
    if(this.active)this.frame=requestAnimationFrame(this.poll);
  };
  destroy(){if(!this.active)return;this.active=false;this.controller.abort();cancelAnimationFrame(this.frame);MenuInput.activeCount--;}
}
