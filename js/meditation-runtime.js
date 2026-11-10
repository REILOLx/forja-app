import * as store from './store.js';

// O relógio usa instantes persistidos. O som depende da execução do navegador,
// portanto não é apresentado como alarme garantido com o celular bloqueado.
let running=false,interval=null,audio=null,wakeLock=null,wakeAttemptedFor=null;
export async function prepareMeditationAudio() {
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return false;
    audio ||= new Audio();
    await audio.resume();
    return audio.state==='running';
  }catch{return false;}
}
function chime() {
  if(!audio||audio.state!=='running')return false;
  try {
    [528,660,528].forEach((frequency,i)=>{
      const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.65;
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.16,start+.04);gain.gain.exponentialRampToValueAtTime(.001,start+.6);
      oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.65);
    });return true;
  }catch{return false;}
}
export async function testMeditationSound() {return await prepareMeditationAudio()&&chime();}
function releaseScreen() {
  const lock=wakeLock;wakeLock=null;
  if(lock)void lock.release().catch(()=>{});
}
async function keepScreen(timer) {
  if(wakeLock||wakeAttemptedFor===timer.id||!navigator.wakeLock||document.visibilityState!=='visible')return;
  wakeAttemptedFor=timer.id;
  try {
    const lock=await navigator.wakeLock.request('screen');
    if(!running||store.getState().selfCare.active?.id!==timer.id||Date.now()>=timer.endsAt){await lock.release();return;}
    wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;});
  }catch{/* O aviso visual e a recuperação por horário continuam disponíveis. */}
}
function tick() {
  if(!running)return;
  const timer=store.getState().selfCare.active;
  if(!timer||Date.now()>=timer.endsAt)releaseScreen();else void keepScreen(timer);
  if(store.markMeditationFinished()) {
    const sounded=store.getState().selfCare.sound&&chime();
    window.dispatchEvent(new CustomEvent('forja:meditation-finished',{detail:{sounded:!!sounded}}));
  }
}
export function syncMeditationRuntime(enabled) {
  running=enabled;
  if(enabled&&!interval)interval=setInterval(tick,500);
  if(!enabled){clearInterval(interval);interval=null;releaseScreen();wakeAttemptedFor=null;}
}
function returnToApp() {if(document.visibilityState==='visible'){wakeAttemptedFor=null;tick();}}
document.addEventListener('visibilitychange',returnToApp);
window.addEventListener('focus',returnToApp);
