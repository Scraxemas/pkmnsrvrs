export function element<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text?:string){
  const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;return node;
}
const symbols:Record<string,string>={
  play:'M9 5 21 14 9 23Z',book:'M4 5h8l3 3 3-3h8v20h-8l-3 2-3-2H4ZM15 8v19',
  flask:'M11 3h8M13 3v9L5 24v3h20v-3l-8-12V3M9 19h12',
  settings:'m12 3 1 4h4l1-4 4 2-2 4 3 3 4-1 1 5-4 1-1 4 3 3-4 3-3-3-4 1-1 4-5-1 1-4-3-3-4 2-2-4 4-2v-4L3 12l2-4 4 2 3-3ZM12 15a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
  back:'M19 6 9 15l10 9M9 15h18',forest:'M15 2 4 17h6l-7 9h24l-7-9h6ZM15 26v4',
  mountain:'M2 27 12 8l6 9 5-7 8 17ZM9 14l3 3 3-3',ship:'M3 20h26l-6 9H9ZM15 3v17M17 5v11h10ZM13 8v9H6',
  check:'m5 16 7 7L27 8',lock:'M8 14V9a8 8 0 0 1 16 0v5M5 14h22v15H5ZM16 20v4',
  expand:'M3 12V3h9M20 3h9v9M29 20v9h-9M12 29H3v-9',
};
export function icon(name:string){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.classList.add('ui-icon');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',symbols[name]??symbols.play);svg.append(path);return svg;}
export function actionButton(label:string,onClick:()=>void,className='ui-button',symbol?:string){
  const button=element('button',className);button.type='button';button.dataset.nav='';
  if(symbol)button.append(icon(symbol));button.append(element('span','button-label',label));button.addEventListener('click',onClick);return button;
}
