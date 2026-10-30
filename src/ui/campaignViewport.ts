import type {NodePosition} from '../campaign/layout';
export function cameraTarget(node:NodePosition,view:{width:number;height:number},world:{width:number;height:number}){return{left:Math.max(0,Math.min(world.width-view.width,node.x-view.width/2)),top:Math.max(0,Math.min(world.height-view.height,node.y-view.height/2))};}
/** Native bounded scrolling keeps SVG trails, decorations and buttons in the same coordinate space. */
export class CampaignViewport {
  private abort=new AbortController();private observer:ResizeObserver;private gesture?:{id:number;x:number;y:number;left:number;top:number;dragging:boolean};private suppressUntil=0;
  constructor(readonly element:HTMLElement,private world:{width:number;height:number},private reduced:()=>boolean,onScroll:()=>void,onResize:()=>void){
    const signal=this.abort.signal;
    element.addEventListener('wheel',event=>{if(event.ctrlKey)return;event.preventDefault();const unit=event.deltaMode===1?24:event.deltaMode===2?element.clientWidth:1;if(event.shiftKey)element.scrollTop+=event.deltaY*unit;else element.scrollLeft+=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*unit;},{passive:false,signal});
    element.addEventListener('pointerdown',event=>{if(event.button!==0)return;this.gesture={id:event.pointerId,x:event.clientX,y:event.clientY,left:element.scrollLeft,top:element.scrollTop,dragging:false};},{signal});
    element.addEventListener('pointermove',event=>{const g=this.gesture;if(!g||g.id!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(!g.dragging&&Math.hypot(dx,dy)<6)return;if(!g.dragging){g.dragging=true;element.setPointerCapture(g.id);element.classList.add('is-dragging');}element.scrollLeft=g.left-dx;element.scrollTop=g.top-dy;},{signal});
    const end=()=>{if(this.gesture?.dragging)this.suppressUntil=performance.now()+100;this.gesture=undefined;element.classList.remove('is-dragging');};
    element.addEventListener('pointerup',end,{signal});element.addEventListener('pointercancel',end,{signal});
    element.addEventListener('click',event=>{if(performance.now()<this.suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,signal});
    element.addEventListener('scroll',onScroll,{passive:true,signal});this.observer=new ResizeObserver(onResize);this.observer.observe(element);
  }
  focus(node:NodePosition,smooth=true){const destination=cameraTarget(node,{width:this.element.clientWidth,height:this.element.clientHeight},this.world);this.element.scrollTo({...destination,behavior:smooth&&!this.reduced()?'smooth':'instant'});}
  visible(node:NodePosition){return node.x-node.width/2>=this.element.scrollLeft+8&&node.x+node.width/2<=this.element.scrollLeft+this.element.clientWidth-8&&node.y-node.height/2>=this.element.scrollTop+8&&node.y+node.height/2<=this.element.scrollTop+this.element.clientHeight-8;}
  destroy(){this.abort.abort();this.observer.disconnect();this.gesture=undefined;}
}
