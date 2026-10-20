import { SPECIES, SLOTS } from '../simulation/species.js';
import { conditionsFor } from '../simulation/simulation.js';
import { icon } from './icons.js';

export function createUI(root) {
  root.innerHTML = `
    <header class="masthead">
      <a class="brand" href="./" aria-label="Pocket Terrarium home">${icon('jar','brand-icon')}<div><h1>Pocket Terrarium</h1><p>A Tiny World Shaped by Your Choices</p></div></a>
      <div class="masthead-note"><span class="eyebrow">An interactive botanical study</span><p>A small space for curiosity.</p></div>
    </header>
    <main class="workspace">
      <aside class="collection panel" aria-labelledby="collection-title">
        <h2 id="collection-title">Plant Collection</h2><p class="section-description">Drag a plant into your terrarium.</p>
        <div class="eyebrow collection-eyebrow">Your botanical collection</div>
        <div class="plant-grid">${Object.entries(SPECIES).map(([id,s])=>`
          <button class="plant-card" data-species="${id}" aria-label="Select ${s.name}" aria-pressed="false" type="button">
            <span class="grip" aria-hidden="true">⠿</span><img class="plant-thumbnail" alt="Procedural 3D ${s.name}" draggable="false" />
            <strong>${s.name}</strong><span class="plant-availability">Available ↗</span>
            <span class="preferences"><span title="Water preference: ${s.water.join('–')}">${icon('drop')}Water: ${s.waterLabel}</span><span title="Light preference: ${s.light.join('–')}">${icon('sun')}Light: ${s.lightLabel}</span></span>
          </button>`).join('')}</div>
        <div class="collection-hint">${icon('hand')}<div><strong>Pick up a little possibility.</strong><p>Drag a plant to an empty spot.<br>Or select one, then choose a spot.</p></div></div>
        <p class="collection-footnote">One of each. Room for three.</p>
      </aside>
      <section class="terrarium-column" aria-labelledby="terrarium-title">
        <div class="scene-heading"><div><h2 id="terrarium-title">The Terrarium</h2><p class="section-description">A little world, in your hands.</p></div><span id="plant-count" class="mini-label">0 / 3 planted</span></div>
        <div id="scene-container" class="scene-container">
          <div class="lamp-control"><label for="lamp-slider">Drag lamp to adjust light <span>↔</span></label><input id="lamp-slider" type="range" min="-1.8" max="1.8" step="0.02" value="1.7" aria-label="Lamp horizontal position" /></div>
          <div id="placement-preview" class="placement-preview" role="status" hidden></div>
          <div class="scene-empty" id="scene-empty"><span class="eyebrow">A world of possibilities</span><p>Every little world<br>begins with a plant.</p></div>
          <button id="water-button" class="scene-water text-button" type="button">${icon('drop')}Click to water <span>+18</span></button>
          <button id="camera-reset" class="camera-reset text-button" type="button" aria-label="Reset camera view" title="Reset camera view">${icon('rotate')}</button>
          <div id="scene-loading" class="scene-loading">Growing your little world…</div>
        </div>
        <div class="scene-instructions">${icon('rotate')}<span>Drag to rotate view</span><span class="instruction-dot">·</span><span>Scroll to zoom</span></div>
        <div class="slot-picker" aria-label="Planting spots">${SLOTS.map((s,i)=>`<button type="button" data-slot="${i}" class="slot-button"><span>${i+1}</span>${s.name}</button>`).join('')}</div>
        <p id="selection-help" class="selection-help" role="status">Choose two plants to begin your experiment.</p>
        <div class="day-controls"><div class="day-counter"><span class="eyebrow">Your experiment</span><strong id="day-number">Day 01</strong></div><button id="next-day" class="primary-button" type="button" disabled><span>Next Day</span>${icon('arrow')}</button><button id="reset-button" class="text-button reset-button" type="button">${icon('reset')}Reset Experiment</button></div>
      </section>
      <aside class="environment-column" aria-labelledby="environment-title">
        <div class="environment panel"><h2 id="environment-title">Environment</h2>
          <section class="moisture-section"><div class="moisture-heading"><span>${icon('drop')}Soil Moisture</span><strong><span id="moisture-number">60</span>%</strong></div><div class="meter moisture-meter" role="meter" aria-label="Soil moisture" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"><div id="moisture-fill" style="width:60%"></div></div><p>One shared soil. A changing balance.</p></section>
          <section class="conditions-section"><div class="conditions-heading"><h3>Plant Conditions</h3><span class="live-label"><i></i>Live</span></div><div id="plant-conditions"></div><p class="conditions-note"><strong>Comfort</strong> responds as you adjust.<br><strong>Health</strong> updates after Next Day.</p></section>
          <section class="journal" aria-labelledby="journal-title"><h3 id="journal-title">${icon('leaf')}Observation Journal</h3><span id="journal-day" class="eyebrow">Day 1 · A fresh beginning</span><p id="journal-entry">An empty jar, a little light, and room to explore. Choose your first plants and see what feels right.</p><details id="journal-history"><summary>Earlier observations</summary><ol></ol></details></section>
        </div><button id="clear-button" class="text-button clear-button" type="button">${icon('trash')}<span>Clear Jar</span></button>
      </aside>
    </main>
    <footer><span>You shape the environment. The plants respond.</span><span class="eyebrow">Choose → Place → Rotate → Adjust → Observe</span></footer>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
    <div id="drag-cursor" class="drag-cursor" hidden><img alt=""/><span></span></div>
    <dialog id="confirm-dialog"><form method="dialog"><span class="eyebrow">A moment to pause</span><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="dialog-actions"><button class="secondary-button" value="cancel">Keep exploring</button><button id="confirm-action" class="primary-button" value="confirm">Reset</button></div></form></dialog>`;

  const $ = selector => root.querySelector(selector);
  let selected = null;
  let toastTimer;
  let pendingConfirmation;
  const numberAnimations = new Map();
  let numericFrame=0;
  const observed = new Map();
  const history = [];
  function animateNumber(element, value) {
    if (observed.get(element) === value) return;
    observed.set(element,value);
    numberAnimations.set(element,{ from:Number(element.textContent)||0, to:value, start:performance.now() });
    if (!numericFrame) numericFrame=requestAnimationFrame(tickNumbers);
  }
  function tickNumbers(now) {
    for (const [element,animation] of numberAnimations) {
      const t=Math.min((now-animation.start)/260,1);
      element.textContent=Math.round(animation.from+(animation.to-animation.from)*(1-(1-t)**3));
      if(t===1)numberAnimations.delete(element);
    }
    numericFrame=numberAnimations.size?requestAnimationFrame(tickNumbers):0;
  }
  function render(state, busy=false) {
    $('#day-number').textContent=`Day ${String(state.day).padStart(2,'0')}`;
    $('#plant-count').textContent=`${state.plants.length} / 3 planted`;
    animateNumber($('#moisture-number'),state.soilMoisture);
    $('#moisture-fill').style.width=`${state.soilMoisture}%`;
    $('.moisture-meter').setAttribute('aria-valuenow',state.soilMoisture);
    $('#lamp-slider').value=state.lampPosition.x;
    $('#scene-empty').hidden=state.plants.length>0 || !!selected;
    $('#next-day').disabled=state.plants.length<2 || busy;
    $('#next-day span').textContent=busy?'A new day…':'Next Day';
    $('#reset-button').disabled=busy;
    $('#clear-button').disabled=busy;
    $('#water-button').disabled=busy;
    $('#lamp-slider').disabled=busy;
    $('.workspace').classList.toggle('advancing',busy);
    for(const [id,species] of Object.entries(SPECIES)) {
      const card=$(`[data-species="${id}"]`);
      const planted=state.plants.some(p=>p.species===id);
      card.classList.toggle('planted',planted);
      card.classList.toggle('selected',selected===id);
      card.setAttribute('aria-pressed',String(selected===id));
      card.disabled=planted||busy;
      card.querySelector('.plant-availability').textContent=planted?'✓ Planted':selected===id?'Placing…':'Available ↗';
    }
    const conditions=$('#plant-conditions');
    for(const element of [...conditions.querySelectorAll('.condition-card')]) if(!state.plants.some(p=>p.species===element.dataset.condition))element.remove();
    conditions.querySelector('.conditions-empty')?.remove();
    if(!state.plants.length)conditions.innerHTML=`<div class="conditions-empty">${icon('leaf')}<p>Something lovely could grow here.</p><span>Plant a little possibility to see<br>how it feels in your world.</span></div>`;
    for(const plant of state.plants) {
      const c=conditionsFor(state,plant);
      let card=conditions.querySelector(`[data-condition="${plant.species}"]`);
      if(!card){
        card=document.createElement('article');
        card.className='condition-card';
        card.dataset.condition=plant.species;
        card.innerHTML=`<h4>${SPECIES[plant.species].name}<i></i></h4><div class="condition-values"><div class="comfort-value"><div><span>Live Comfort</span><strong><b>0</b>%</strong></div><div class="meter"><div></div></div><span class="status-badge"></span></div><div class="health-value"><span>Health</span><strong></strong></div></div><div class="condition-detail"><span class="light-value"></span><span class="growth-value"></span></div>`;
        conditions.append(card);
      }
      card.dataset.status=c.comfort>=0.8?'comfortable':c.comfort>=0.55?'adjust':'stressed';
      animateNumber(card.querySelector('.comfort-value b'),c.percent);
      card.querySelector('.comfort-value .meter div').style.width=`${c.percent}%`;
      card.querySelector('.status-badge').textContent=(c.comfort>=0.8?'✓ ':'')+c.status;
      card.querySelector('.health-value strong').textContent=plant.health;
      card.querySelector('.health-value').title='Updates after Next Day';
      card.querySelector('.light-value').textContent=`Light ${Math.round(c.light)}`;
      card.querySelector('.growth-value').textContent=`Growth ${plant.growth}%`;
    }
    for(const button of root.querySelectorAll('[data-slot]')) {
      const plant=state.plants.find(p=>p.slot===Number(button.dataset.slot));
      button.title=plant?`${SPECIES[plant.species].name} · ${SLOTS[plant.slot].name}`:SLOTS[button.dataset.slot].name;
      button.classList.toggle('occupied',!!plant);
      button.disabled=busy;
      button.setAttribute('aria-label',`${SLOTS[button.dataset.slot].name}${plant?`, ${SPECIES[plant.species].name}`:', empty'}`);
    }
    if(!selected)$('#selection-help').textContent=state.plants.length<2?'Choose two plants to begin your experiment.':'A change today. A little discovery tomorrow.';
  }
  $('#confirm-dialog').addEventListener('close',()=>{
    if($('#confirm-dialog').returnValue==='confirm')pendingConfirmation?.();
    pendingConfirmation=null;
  });
  return {
    $,render,
    thumbnails(images){ for(const [id,image]of Object.entries(images))$(`[data-species="${id}"] img`).src=image; },
    select(id){ selected=id;$('#selection-help').textContent=id?`${SPECIES[id].name} selected · click a spot below, or a ring inside the jar. Esc to cancel.`:''; },
    toast(message){ clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3200); },
    journal(state,message){
      history.unshift({day:state.day,message});
      history.length=Math.min(history.length,30);
      $('#journal-day').textContent=`Day ${state.day} · ${history.length===1?'A fresh beginning':'Field notes'}`;
      $('#journal-entry').textContent=message;
      const list=$('#journal-history ol');list.replaceChildren();
      for(const entry of history.slice(1,7)){ const item=document.createElement('li');item.textContent=`Day ${entry.day}: ${entry.message}`;list.append(item); }
      $('#journal-history').hidden=history.length<2;
    },
    clearJournal(){ history.length=0; },
    preview(species,slot,percent,position){
      const element=$('#placement-preview');
      element.hidden=slot<0;
      if(slot>=0){element.innerHTML=`<strong>${SPECIES[species].name} · ${percent}% comfort</strong><span>${SLOTS[slot].name} · release to plant</span>`;element.style.left=`${Math.max(100,Math.min($('#scene-container').clientWidth-110,position.x))}px`;element.style.top=`${Math.max(110,position.y-115)}px`;}
    },
    hidePreview(){ $('#placement-preview').hidden=true; },
    confirm(kind,action){
      pendingConfirmation=action;
      $('#confirm-title').textContent=kind==='clear'?'Make room for a new world?':'Begin this experiment again?';
      $('#confirm-description').textContent=kind==='clear'?'This removes all plants and returns the jar, water, light, and day to their starting state.':'Your plants stay in their spots. Day, moisture, light, health, and growth return to their starting values.';
      $('#confirm-action').textContent=kind==='clear'?'Clear Jar':'Reset Experiment';
      $('#confirm-dialog').returnValue='';
      $('#confirm-dialog').showModal();
    },
    dispose(){ clearTimeout(toastTimer);cancelAnimationFrame(numericFrame); },
  };
}
