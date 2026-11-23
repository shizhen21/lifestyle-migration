(function(){
  'use strict';
  function warn(message){
    const id=location.pathname.endsWith('evidence.html')?'evidence-error':location.pathname.endsWith('track.html')?'track-error':location.pathname.endsWith('move.html')?'move-error':location.pathname.endsWith('patterns.html')?'pattern-error':'error';
    let box=document.getElementById(id);if(!box){box=document.createElement('div');box.className='error';box.setAttribute('role','alert');const main=document.querySelector('main');if(!main)return;main.prepend(box);}box.hidden=false;box.textContent=message;
  }
  window.addEventListener('error',event=>{
    if(event.target?.tagName==='SCRIPT')warn('A website data file could not load. Reload this page; if you downloaded the preview, extract the entire ZIP with its assets folder.');
    else if(event.error)warn('The interactive page could not finish loading. Please reload. '+event.error.message);
  },true);
  window.addEventListener('unhandledrejection',event=>warn('The interactive page could not finish loading. '+(event.reason?.message||'Please reload.')));
})();
