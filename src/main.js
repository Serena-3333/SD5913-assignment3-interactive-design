import './styles/main.css';
import { createUI } from './ui/uiController.js';
import { createScene } from './scene/createScene.js';
import { createInteractions } from './interactions/plantDrag.js';
import { createInitialState, plantAt, movePlant, waterSoil, setLamp, nextDay, resetExperiment, conditionsFor } from './simulation/simulation.js';
import { SPECIES, SLOTS } from './simulation/species.js';
import { dailyObservation, movementObservation } from './ui/journal.js';

const ui=createUI(document.querySelector('#app'));
let state=createInitialState();
let busy=false;
let dayTimer;
let lampJournalTimer;
let world,interactions;
const controller=new AbortController();
const getState=()=>state;
const isBusy=()=>busy;

function update(next,message){
  state=next;
  world.sync();
  ui.render(state,busy);
  if(message)ui.journal(state,message);
}
function onPlace(species,slot){
  if(busy)return;
  const existing=state.plants.find(p=>p.species===species);
  const previous=state;
  if(existing){
    const swapped=state.plants.some(p=>p.slot===slot&&p!==existing);
    const next=movePlant(state,species,slot);
    if(next===state){ui.toast('This plant is already in that spot.');return;}
    update(next,movementObservation(previous,next,species,swapped));
    ui.toast(swapped?'A little change of places. Plants swapped.':`${SPECIES[species].name} moved to ${SLOTS[slot].name}.`);
  }else{
    const next=plantAt(state,species,slot);
    if(next===state){ui.toast(state.plants.length>=3?'Your jar has room for three. Clear the jar to try a new combination.':'That spot is occupied. Choose an empty planting ring.');return;}
    const plant=next.plants.find(p=>p.species===species);
    update(next,`${SPECIES[species].name} planted in ${SLOTS[slot].name}. Live comfort is ${conditionsFor(next,plant).percent}%. Try adjusting the light and see how it responds.`);
    ui.toast(`${SPECIES[species].name} has a little place to grow.`);
  }
}
function onLamp(x,commit=true){
  if(busy)return;
  update(setLamp(state,x));
  clearTimeout(lampJournalTimer);
  const log=()=>ui.journal(state,'The lamp has moved. Plants closer to it receive more light. Comfort responds now; health and growth respond after Next Day.');
  if(commit)log();else lampJournalTimer=setTimeout(log,450);
}
function onWater(){
  if(busy)return;
  if(state.soilMoisture===100){ui.toast('The soil is fully watered (100%). Let a little time pass.');return;}
  const before=state.soilMoisture;
  world.pour();
  update(waterSoil(state),`Soil moisture increased from ${before}% to ${Math.min(100,before+18)}%. Check each plant’s live comfort: more water suits some species better than others.`);
  ui.toast(`A little rain. Soil moisture is now ${state.soilMoisture}%.`);
}

try{
  world=createScene(ui.$('#scene-container'),getState);
  ui.thumbnails(world.thumbnails);
  interactions=createInteractions(world,ui,{getState,isBusy,onPlace,onLamp,onWater});
  ui.$('#scene-loading').hidden=true;
  ui.render(state,busy);
  const listen=(id,event,handler)=>ui.$(id).addEventListener(event,handler,{signal:controller.signal});
  listen('#water-button','click',onWater);
  listen('#lamp-slider','input',event=>onLamp(Number(event.target.value),false));
  listen('#lamp-slider','change',event=>onLamp(Number(event.target.value),true));
  listen('#camera-reset','click',()=>world.resetCamera());
  listen('#next-day','click',()=>{
    if(busy||state.plants.length<2)return;
    interactions.cancel();
    clearTimeout(lampJournalTimer);
    busy=true;
    const previous=state;
    state=nextDay(state);
    world.sync();
    ui.render(state,busy);
    ui.journal(state,dailyObservation(state,previous));
    dayTimer=setTimeout(()=>{busy=false;ui.render(state,busy);},800);
  });
  listen('#reset-button','click',()=>{
    if(busy)return;
    interactions.cancel();
    ui.confirm('reset',()=>{
      clearTimeout(lampJournalTimer);
      ui.clearJournal();
      update(resetExperiment(state),'A fresh start with familiar plants. Day, water, light, health, and growth have been restored. Your planting arrangement stays.');
      world.resetCamera();
      ui.toast('Experiment reset. Your plants stay in their spots.');
    });
  });
  listen('#clear-button','click',()=>{
    if(busy)return;
    interactions.cancel();
    ui.confirm('clear',()=>{
      clearTimeout(lampJournalTimer);
      ui.clearJournal();
      update(createInitialState(),'An empty jar, a little light, and room to explore. Choose your first plants and see what feels right.');
      world.resetCamera();
      ui.toast('A fresh little world, ready for something new.');
    });
  });
  world.renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    ui.$('#scene-loading').hidden=false;
    ui.$('#scene-loading').textContent='The 3D view paused. Reload the page to restart your experiment.';
  },{signal:controller.signal});
}catch(error){
  console.error('Terrarium could not start:',error);
  ui.$('#scene-loading').textContent='The 3D view could not start. Please enable hardware acceleration or try a browser with WebGL support.';
}

function dispose(){
  clearTimeout(dayTimer);clearTimeout(lampJournalTimer);
  controller.abort();interactions?.dispose();world?.dispose();ui.dispose();
}
window.addEventListener('pagehide',dispose,{once:true});
if(import.meta.hot)import.meta.hot.dispose(dispose);
