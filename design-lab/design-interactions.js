/* Interaction additions for the separate Design Lab app. */
window.DesignInteractions = (() => {
  let collectionJob = 0;
  const viewerCards = new WeakMap();
  function registerCard(node, card, language, setId, setName) {
    viewerCards.set(node, {card, language, setId, setName});
  }
  const collectionRoute = () => ['#/collected', '#/started'].includes(location.hash);

  function wireSummary() {
    const actions = [
      ['View your collected cards', () => { location.hash = '#/collected'; }],
      ['View your started sets', () => { location.hash = '#/started'; }],
      ['Open your wishlist', () => { lookoutWho = state.current; lookoutBuy = 'all'; location.hash = '#/lookout'; }]
    ];
    document.querySelectorAll('.design-summary > div').forEach((tile, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = tile.innerHTML;
      button.title = actions[i][0];
      button.setAttribute('aria-label', tile.querySelector('b').textContent + ' ' + tile.querySelector('span').textContent + ' — ' + actions[i][0]);
      button.onclick = actions[i][1];
      tile.replaceWith(button);
    });
  }

  function openOwnedSet(group) {
    ui.q = ''; ui.filter = 'all';
    if (lang !== group.lang) {
      lang = group.lang;
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      window._sets = window._series = null;
    }
    location.hash = '#/set/' + group.id;
  }

  async function viewCollection() {
    const started = location.hash === '#/started', hash = location.hash;
    const job = ++collectionJob, pid = state.current;
    const groups = Object.entries(state.owned[pid] || {}).filter(([,cards]) => Object.keys(cards).length).map(([key,cards]) => {
      const match = key.match(/^([a-z]{2}(?:-[a-z]{2})?)\/(.+)$/);
      return { id: match ? match[2] : key, lang: match ? match[1] : 'en', cards };
    });
    let loaded = false;
    const draw = () => {
      const main = $('main'); main.innerHTML = '';
      const intro = el('p', 'design-collection-intro');
      intro.textContent = me().name + ' · ' + (started ? groups.length + (groups.length === 1 ? ' set started' : ' sets started') : myCards(me()) + ' cards collected');
      main.appendChild(intro);
      if (!groups.length) {
        main.appendChild(el('div','note','Mark a card owned in any set and your collection will appear here.'));
        return;
      }
      if (!loaded) { main.appendChild(el('div','note','Loading your collection…')); return; }
      const q = ui.q.toLowerCase();
      let found = 0;
      const rows = el('div','rows');
      if (started) main.appendChild(rows);
      groups.forEach(group => {
        const set = group.set;
        const name = set?.name || group.id;
        const subtitle = langName(group.lang);
        if (started) {
          if (q && ![name,group.id,subtitle].some(s => s.toLowerCase().includes(q))) return;
          const row = makeButton('', () => openOwnedSet(group));
          row.className = 'row';
          row.dataset.set = group.id;
          const have = Object.keys(group.cards).length, total = set?.cardCount?.total || set?.cards?.length || 0;
          row.innerHTML = (set ? setArt(set) : '') + '<div class="t"><b></b><small></small><div class="mini"><i></i></div></div><div class="pct"></div>';
          row.querySelector('b').textContent = name;
          row.querySelector('small').textContent = subtitle + ' · ' + have + ' collected';
          row.querySelector('.pct').textContent = have + (total ? '/' + total : ' cards');
          row.querySelector('.mini i').style.width = (total ? Math.min(100,have / total * 100) : 0) + '%';
          rows.appendChild(row); found++;
          return;
        }
        const cards = Object.keys(group.cards).map(id => set?.cards?.find(c => c.localId === id) || {localId:id, name:customIn(group.id)[id] || '#' + id});
        const visible = cards.filter(c => !q || [c.name,c.localId,name].some(s => s.toLowerCase().includes(q)));
        if (!visible.length) return;
        const title = el('h2'); title.textContent = name + ' · ' + subtitle;
        const grid = el('div','grid design-owned-grid');
        visible.forEach(card => {
          const button = makeButton('', () => card.image ? viewCard(card,group.lang,group.id,name) : openOwnedSet(group));
          button.className = 'card owned design-owned-card';
          registerCard(button,card,group.lang,group.id,name);
          button.setAttribute('aria-label', 'View ' + card.name);
          if (card.image) {
            const img = document.createElement('img'); img.src = lowSrc(card.image); img.alt = card.name; img.loading = 'lazy'; button.appendChild(img);
          } else { const ph = el('span','design-art-placeholder'); ph.textContent = card.name; button.appendChild(ph); }
          const label = el('span','name'); label.textContent = card.name;
          button.append(label, el('span','design-card-status','✓ Owned'));
          grid.appendChild(button); found++;
        });
        main.append(title,grid);
      });
      if (!found) main.appendChild(el('div','note','No matches in your collection.'));
    };
    viewLang = null;
    const search = makeSearch(started ? 'Search your sets' : 'Search your cards', draw);
    search.setAttribute('aria-label', search.placeholder);
    setHeader({title:started ? 'Your started sets' : 'Your cards',back:'#/',controls:[search]});
    draw();
    await Promise.all(groups.map(async group => {
      if (started && lang === group.lang) group.set = window._sets?.find(s => s.id === group.id);
      if (!group.set) { try { group.set = await getJSONL(group.lang,'sets/' + group.id); } catch (e) {} }
    }));
    if (job !== collectionJob || location.hash !== hash || state.current !== pid) return;
    loaded = true; draw();
  }

  function installCardSwipe() {
    const card = $('lbFlip'), viewer = $('lb');
    let gesture = null, suppressClickUntil = 0, opener = null, browseCards = [], browseIndex = 0;
    const close = makeButton('× Close', () => {
      gesture = null;
      lbCloseNow();
      if (opener?.isConnected) opener.focus({preventScroll:true});
    });
    close.id = 'designCardClose';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close card viewer');
    viewer.prepend(close);
    const controls = el('div','design-viewer-controls');
    const previous = makeButton('‹ Previous', () => move(-1));
    const next = makeButton('Next ›', () => move(1));
    previous.type = next.type = 'button';
    previous.id = 'designCardPrevious'; next.id = 'designCardNext';
    previous.setAttribute('aria-label', 'Previous card');
    next.setAttribute('aria-label', 'Next card');
    controls.append(previous,$('lbBtn'),next);
    const position = el('div','design-viewer-position');
    position.id = 'designCardPosition';
    position.setAttribute('role','status');
    position.setAttribute('aria-live','polite');
    position.setAttribute('aria-atomic','true');
    viewer.append(controls,position);
    const hint = el('div','design-swipe-hint','Swipe left or right to flip');
    hint.id = 'designSwipeHint';
    viewer.appendChild(hint);
    card.setAttribute('aria-describedby', hint.id);
    $('lbImg').draggable = false;
    card.addEventListener('dragstart', e => e.preventDefault());
    card.addEventListener('pointerdown', e => {
      if (!e.isPrimary) { gesture = null; return; }
      if (e.button !== 0 || !viewer.classList.contains('open')) return;
      gesture = {id:e.pointerId,x:e.clientX,y:e.clientY,horizontal:false};
    });
    card.addEventListener('pointermove', e => {
      if (!gesture || gesture.id !== e.pointerId) return;
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (!gesture.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        gesture.horizontal = true;
        if (!card.hasPointerCapture(e.pointerId)) card.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    card.addEventListener('pointerup', e => {
      if (!gesture || gesture.id !== e.pointerId) return;
      const swipe = gesture; gesture = null;
      if (!swipe.horizontal) return;
      // A drag also produces a click; consuming it prevents an immediate second flip or a shop-link tap.
      suppressClickUntil = performance.now() + 500;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      const threshold = Math.max(40, card.offsetWidth * .12);
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.3 && viewer.classList.contains('open')) lbToggle();
    });
    card.addEventListener('pointercancel', () => { gesture = null; });
    card.addEventListener('lostpointercapture', () => { gesture = null; });
    card.addEventListener('click', e => {
      if (e.detail && performance.now() < suppressClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    const baseView = viewCard;
    function showCurrent() {
      const entry = browseCards[browseIndex];
      gesture = null; suppressClickUntil = 0;
      baseView(entry.card,entry.language,entry.setId,entry.setName);
      $('lbImg').alt = entry.card.name;
      previous.disabled = browseIndex === 0;
      next.disabled = browseIndex === browseCards.length - 1;
      position.textContent = entry.card.name + ' · ' + (browseIndex + 1) + ' / ' + browseCards.length;
    }
    function move(direction) {
      const index = browseIndex + direction;
      if (!viewer.classList.contains('open') || index < 0 || index >= browseCards.length) return;
      browseIndex = index;
      showCurrent();
    }
    viewer.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    viewCard = function(item, language, setId, setName) {
      const active = document.activeElement;
      opener = active && active !== document.body && active.getClientRects().length ? active : document.querySelector('#cards [data-id="' + CSS.escape(item.localId || '') + '"]');
      // Snapshot the visible list so search, ownership filters and wishlist order carry into the viewer.
      browseCards = [...document.querySelectorAll('#main .card, #main .line')].map(node => viewerCards.get(node)).filter(entry => entry?.card.image);
      browseIndex = browseCards.findIndex(entry => entry.language === language && entry.setId === setId && entry.card.localId === item.localId);
      if (browseIndex < 0) { browseCards = [{card:item,language,setId,setName}]; browseIndex = 0; }
      showCurrent();
      close.focus({preventScroll:true});
    };
  }

  function init() {
    const baseCard = makeCard;
    makeCard = function(item) {
      const node = baseCard(item);
      registerCard(node,item,lang,window._set.id,window._set.name);
      return node;
    };
    const baseHome = renderHome;
    renderHome = function(...args) { const result = baseHome(...args); wireSummary(); return result; };
    const baseRoute = route;
    route = function(...args) {
      if (!collectionRoute()) { collectionJob++; return baseRoute(...args); }
      detailJob++; document.body.classList.remove('colourall');
      window.scrollTo({top:0,behavior:'instant'});
      return viewCollection();
    };
    const baseRender = rerender;
    rerender = function(...args) { return collectionRoute() ? viewCollection() : baseRender(...args); };
    installCardSwipe();
  }
  return {init,registerCard};
})();
