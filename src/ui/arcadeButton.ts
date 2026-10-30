import {element} from './dom';
import {pixelIcon} from './pixelIcons';
export function arcadeButton(label:string,onClick:()=>void,kind:'play'|'pokedex'|'research'|'settings'|'single'|'multi'|'back'){
  const button=element('button',`arcade-button arcade-button--${kind}`);button.type='button';button.dataset.nav='';button.setAttribute('aria-label',label);
  const rim=element('span','arcade-button__rim'),face=element('span','arcade-button__face');face.append(pixelIcon(kind),element('span','arcade-button__label',label));rim.append(face);button.append(rim);button.addEventListener('click',onClick);return button;
}
