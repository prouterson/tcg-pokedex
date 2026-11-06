/* Approved mockup layouts connected to the original app. */
window.DesignLab = (() => {
  const mascots={gengar:'gengar',play:'pikachu',charmander:'charmander',mew:'mew'};
  const localCards={'4':['Charizard','charizard-card.webp'],'2':['Blastoise','blastoise-card.webp'],'15':['Venusaur','base1-15.webp'],'44':['Bulbasaur','base1-44.webp'],'58':['Pikachu','base1-58.webp']};
  const RECENT_KEY='tcgPokedexDesignLab.designRecent';
  let installed=false,catalogue=false,pendingCard=null;
  const currentTheme=()=>document.documentElement.dataset.theme||'binder';
  const node=(tag,cls,text)=>el(tag,cls,text);
  function themeChanged(theme){
    const picker=$('designTheme');if(picker)picker.value=theme;
    document.querySelectorAll('.design-theme-select').forEach(s=>s.value=theme);
    document.querySelectorAll('.design-theme-gallery button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.look===theme)));
    document.querySelectorAll('.design-mascot').forEach(img=>{const key=mascots[theme];img.hidden=!key;if(key){img.src='design-assets/'+key+'.png';img.alt='';}else img.removeAttribute('src');});
  }
  function pullChrome(){const header=document.querySelector('#designApp > header');['controls','bar','stats'].forEach(id=>{const part=$(id);if(part&&part.parentElement!==header)header.appendChild(part);});}
  function withFocus(work){const active=document.activeElement,field=active?.matches('input[type="search"]')?active:null,start=field?.selectionStart,end=field?.selectionEnd;work();if(field?.isConnected){field.focus({preventScroll:true});try{field.setSelectionRange(start,end);}catch(e){}}}
  function heading(title,sub){const n=node('div','design-page-heading');n.append(node('h2','',title),node('p','',sub));return n;}
  function goSet(id,card){ui.q='';pendingCard=card?{setId:id,localId:card}:null;const hash='#/set/'+id;if(location.hash===hash)viewSet(id);else location.hash=hash;}
  function readRecent(){try{return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');}catch(e){return [];}}
  function remember(pid,key,id){const rows=readRecent().filter(c=>!(c.pid===pid&&c.key===key&&c.id===id));rows.unshift({pid,key,id,at:Date.now()});try{localStorage.setItem(RECENT_KEY,JSON.stringify(rows.slice(0,50)));}catch(e){}}
  function infoFor(setId,id,language='en'){
    if(setId==='base1'&&localCards[id])return {name:localCards[id][0],image:'design-assets/'+localCards[id][1]};
    let cached;try{cached=JSON.parse(localStorage.getItem(CACHE_PFX+language+':sets/'+setId)||'null');}catch(e){}
    const card=cached?.cards?.find(c=>c.localId===id);return {name:card?.name||('#'+id),image:card?.image?lowSrc(card.image):null};
  }
  function recentSection(){
    const owned=allOwnedCards().filter(c=>c.pid===state.current);
    let chosen=readRecent().filter(r=>r.pid===state.current&&state.owned[r.pid]?.[r.key]?.[r.id]).slice(0,3).map(r=>{const m=r.key.match(/^([a-z]{2}(?:-[a-z]{2})?)\/(.+)$/);return {setId:m?m[2]:r.key,localId:r.id,lang:m?m[1]:'en'};});
    const hasRecent=chosen.length>0;if(!chosen.length)chosen=owned.slice(-3).reverse();if(!chosen.length)chosen=['44','58','4'].map(id=>({setId:'base1',localId:id,lang:'en'}));
    const section=node('section','design-recent');section.appendChild(node('h2','design-section-title',hasRecent?'Recent additions':owned.length?'In your collection':'Discover cards'));
    const row=node('div','design-recent-row');chosen.forEach(c=>{const info=infoFor(c.setId,c.localId,c.lang),b=makeButton('',()=>goSet(c.setId,c.localId));b.className='design-recent-card';b.setAttribute('aria-label','Open '+info.name);if(info.image){const img=node('img');img.src=info.image;img.alt=info.name;b.appendChild(img);}else b.appendChild(node('span','design-art-placeholder',info.name));b.appendChild(node('span','design-recent-name',info.name));row.appendChild(b);});section.appendChild(row);return section;
  }
  function featuredSet(sets){
    const started=sets.filter(s=>ownedCount(s.id)>0);const last=(()=>{try{return localStorage.getItem('tcgPokedexDesignLab.lastSet');}catch(e){return '';}})();
    const s=started.find(s=>s.id===last)||started.sort((a,b)=>ownedCount(b.id)-ownedCount(a.id))[0]||sets.find(s=>s.id==='base1')||sets[0];if(!s)return node('div','note','Loading the card catalogue…');
    const have=ownedCount(s.id),total=s.cardCount?.total||s.cardCount?.official||0,b=makeButton('',()=>goSet(s.id));b.className='design-featured';
    b.innerHTML='<div class="design-featured-copy"><h3></h3><div class="design-featured-count">'+have+' / '+total+'</div><div class="design-featured-progress"><i style="width:'+(total?Math.round(have/total*100):0)+'%"></i></div><span class="design-featured-left">'+Math.max(0,total-have)+' left to find</span></div><div class="design-featured-art" aria-hidden="true"></div>';
    b.querySelector('h3').textContent=s.name;const fan=b.querySelector('.design-featured-art');const fill=images=>{fan.innerHTML='';images.slice(0,3).forEach(src=>{const img=node('img');img.src=src;img.alt='';fan.appendChild(img);});};
    if(s.id==='base1')fill(['design-assets/blastoise-card.webp','design-assets/charizard-card.webp','design-assets/base1-15.webp']);else getJSON('sets/'+s.id).then(data=>{if(b.isConnected)fill(data.cards.filter(c=>c.image).slice(0,3).map(c=>lowSrc(c.image)));}).catch(()=>{});return b;
  }
  function homeLayout(){
    const main=$('main'),sets=window._sets||[],p=me();main.innerHTML='';
    const ownSets=Object.values(state.owned[state.current]||{}).filter(x=>Object.keys(x||{}).length).length,wishes=allWishes().filter(w=>w.pid===state.current).length;
    const hero=node('section','design-hero');hero.setAttribute('aria-label','Your collection overview');hero.innerHTML='<div class="design-hero-copy"><h2>Your collection</h2><p class="design-tagline">Every card has a story.</p></div><img class="design-mascot" alt=""><div class="design-binder-ball" aria-hidden="true"></div><div class="design-summary"><div><b>'+myCards(p).toLocaleString()+'</b><span>Cards</span></div><div><b>'+ownSets+'</b><span>Sets</span></div><div><b>'+wishes+'</b><span>Wanted</span></div></div>';main.append(hero,$('controls'));
    const section=node('section','design-collecting'),title=node('div','design-section-row');title.appendChild(node('h2','design-section-title','Keep collecting'));const all=makeButton('All sets ›',()=>{catalogue=true;renderHome();window.scrollTo(0,0);});all.className='design-text-button';title.appendChild(all);section.append(title,featuredSet(sets));main.append(section,recentSection());
    const browse=makeButton(ico('sets')+' Browse all sets & series',()=>{catalogue=true;renderHome();window.scrollTo(0,0);});browse.className='design-browse-button';main.appendChild(browse);themeChanged(currentTheme());
  }
  function updateSetSummary(){const line=document.querySelector('.design-set-summary > div');if(!line||!window._set)return;const t=setTotals();line.innerHTML='<span><b>'+t.have+'</b> collected</span><span><b>'+Math.max(0,t.total-t.have)+'</b> missing</span><strong>'+Math.round(t.total?t.have/t.total*100:0)+'%</strong>';}
  function mountSetChrome(){
    const main=$('main'),set=window._set;if(!set)return;const t=setTotals(),box=node('section','design-set-chrome'),summary=node('div','design-set-summary');summary.innerHTML='<div><span><b>'+t.have+'</b> collected</span><span><b>'+Math.max(0,t.total-t.have)+'</b> missing</span><strong>'+Math.round(t.total?t.have/t.total*100:0)+'%</strong></div>';summary.appendChild($('bar'));box.append(summary,$('controls'));const extra=node('details','design-set-extra');extra.append(node('summary','','Value & family details'),$('stats'));box.appendChild(extra);main.prepend(box);
  }
  function labelCard(n,c){if(!n.classList.contains('card'))return n;const tag=n.querySelector('.tick b')?.textContent,status=n.classList.contains('owned')?(n.classList.contains('partial')?'Part collected':'✓ Owned'):'Missing';n.appendChild(node('span','design-card-status',status+(tag?' · '+tag:'')));n.setAttribute('aria-label',c.name+' · '+status);n.tabIndex=0;n.addEventListener('keydown',e=>{if(e.target===n&&(e.key==='Enter'||e.key===' ')){e.preventDefault();n.click();}});return n;}
  async function exampleCollection(){
    const button=$('designExample');button.disabled=true;button.textContent='Preparing…';
    try{let person=state.people.find(p=>p.id==='design-demo');if(!person){const set=await getJSON('sets/base1');person={id:'design-demo',name:'Demo Trainer',c:1};state.people.push(person);savePerson(person);const selection=set.cards.filter(c=>c.localId!=='58').slice(0,64),final=['4','2','15'];selection.sort((a,b)=>Number(final.includes(a.localId))-Number(final.includes(b.localId)));selection.forEach(c=>setCard(person.id,'base1',c.localId,true,Number(c.localId)<=16?'h':'n'));const have=new Set(selection.map(c=>c.localId));set.cards.filter(c=>!have.has(c.localId)).slice(0,14).forEach(c=>setWish(person.id,'base1',c.localId,true));}state.current=person.id;saveState();catalogue=false;ui.q='';if((location.hash||'#/')==='#/')route();else location.hash='#/';}catch(e){alert('Could not prepare the example collection. Try again when the catalogue is available.');}finally{button.disabled=false;button.textContent='Example collection';}
  }
  function init(){
    if(installed)return;installed=true;const picker=$('designTheme');picker.innerHTML=THEMES.map(([id,name])=>'<option value="'+id+'">'+esc(name)+'</option>').join('');picker.onchange=()=>{try{localStorage.setItem(THEME_KEY,picker.value);}catch(e){}applyTheme(picker.value);};$('designWidth').onchange=()=>document.body.dataset.designWidth=$('designWidth').value;$('designExample').onclick=exampleCollection;
    const brand=node('div','design-brand');brand.innerHTML='<i class="design-pokeball" aria-hidden="true"></i><span>TCG Pokédex</span><i class="design-lights" aria-hidden="true"><i></i><i></i><i></i></i>';document.querySelector('#designApp > header').prepend(brand);
    const baseHeader=setHeader;setHeader=function(options){pullChrome();baseHeader(options);const view=(location.hash||'#/').split('/')[1]||'home';document.body.dataset.view=view;if(!options.title)$('title').textContent='TCG Pokédex';if(view==='home'){const search=$('controls').querySelector('input');if(search){search.placeholder='Search sets or Pokémon';search.setAttribute('aria-label','Search sets, Pokémon or card numbers');}}};
    const baseHome=renderHome;renderHome=function(){withFocus(()=>{pullChrome();baseHome();if(!ui.q&&!catalogue)homeLayout();else{const top=heading(catalogue&&!ui.q?'Browse sets':'Find your next card',catalogue&&!ui.q?'Every series, language and edition.':'Search the full card catalogue.');$('main').prepend(top);top.after($('controls'));const back=makeButton('‹ Your collection',()=>{catalogue=false;ui.q='';const field=$('controls').querySelector('input');if(field)field.value='';renderHome();});back.className='design-text-button';top.prepend(back);}});};
    const baseCount=renderCount;renderCount=function(){baseCount();updateSetSummary();};
    const baseCards=renderCards;renderCards=function(){withFocus(()=>{pullChrome();baseCards();mountSetChrome();});};
    const baseCard=makeCard;makeCard=function(card){return labelCard(baseCard(card),card);};
    let lastRoute='';const baseRoute=route;route=function(){pullChrome();const next=location.hash||'#/';if(next!==lastRoute){window.scrollTo({top:0,behavior:'instant'});lastRoute=next;}return baseRoute();};
    const baseViewHome=viewHome;viewHome=function(){pullChrome();return baseViewHome();};
    const baseLookout=viewLookout;viewLookout=function(){pullChrome();return baseLookout();};
    const baseViewSet=viewSet;viewSet=async function(id){pullChrome();await baseViewSet(id);if(pendingCard?.setId===id&&window._set?.id===id){const c=window._set.cards.find(c=>c.localId===pendingCard.localId);pendingCard=null;if(c)openCardSheet(c);}};
    const baseSetCard=setCard;setCard=function(pid,key,id,on,variant){baseSetCard(pid,key,id,on,variant);if(on)remember(pid,key,id);};
    $('tabs').addEventListener('click',e=>{if(e.target.closest('[data-tab="sets"]'))catalogue=false;},true);
    const baseMore=viewMore;viewMore=function(){baseMore();$('main').prepend(heading('Make it yours','Five looks. Your whole collection.'));const choices=node('div','design-theme-gallery');choices.setAttribute('aria-label','Choose your theme');THEMES.forEach(([id,name])=>{const b=makeButton('<span class="design-swatch" data-look="'+id+'"></span><span>'+esc(name)+'</span>',()=>{try{localStorage.setItem(THEME_KEY,id);}catch(e){}applyTheme(id);});b.dataset.look=id;b.setAttribute('aria-pressed',String(id===currentTheme()));choices.appendChild(b);});$('main').querySelector('.design-page-heading').after(choices);};
    const baseValue=viewValue;viewValue=function(){baseValue();$('main').prepend(heading('Your collection value','Prices, printings and family totals.'));};
    const baseSync=viewSync;viewSync=function(){baseSync();$('main').prepend(node('div','design-isolation-note','Design Lab families only. These test records are separate from the working app’s family.'));};
    const observer=new MutationObserver(()=>{if($('scan').classList.contains('open')&&!scanner.stream&&/camera not available|type the number below/i.test($('scanStatus').textContent))$('moreBox').hidden=false;});observer.observe($('scanStatus'),{childList:true,characterData:true,subtree:true});$('scan').querySelector('.cam').appendChild(node('div','design-camera-label','DESIGN LAB · SCAN'));$('foot').insertAdjacentHTML('beforeend','<div class="design-footer">Separate test data · Design Lab</div>');
  }
  return {init,themeChanged};
})();
