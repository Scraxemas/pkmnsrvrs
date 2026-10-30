import {actionButton,element,icon} from './dom';
import {LocationCardData,menuAsset} from './menuData';

/** A single component for featured milestones, stage selection, and later chapters. */
export function locationCard(data:LocationCardData,onSelect:()=>void,compact=false){
  const card=actionButton('',onSelect,`location-card${compact?' location-card--compact':''}`);
  card.replaceChildren();card.dataset.stageId=data.id;card.dataset.unlocked=String(data.unlocked);card.dataset.completed=String(data.completed);card.dataset.featured=String(data.featured);
  card.setAttribute('aria-label',`${data.title}${compact?' — Explore milestone':''}`);card.setAttribute('aria-pressed','false');
  const art=element('div','location-card__art');
  if(data.artwork){const image=element('img');image.src=menuAsset(data.artwork);image.alt=`${data.title} location artwork`;image.draggable=false;art.append(image);}
  else{art.classList.add('location-card__art--future');art.append(icon(data.symbol),element('span','future-art-label','Future destination'));}
  const badge=element('span','location-card__badge',data.completed?'CLEARED':!data.unlocked?'LOCKED':data.milestone??'IN DEVELOPMENT');badge.prepend(icon(data.completed?'check':data.unlocked?'forest':'lock'));art.append(badge);
  const body=element('div','location-card__body'),meta=element('div','eyebrow',`${data.region} / ${data.chapter}`);
  body.append(meta,element('h3','',data.title),element('p','location-card__subtitle',data.subtitle));
  const footer=element('div','location-card__footer');footer.append(element('span','',data.bossName?`BOSS · ${data.bossName}`:data.unlocked?'Unlocked · Coming later':'Clear earlier milestones'),icon('play'));body.append(footer);
  card.append(art,body);return card;
}
