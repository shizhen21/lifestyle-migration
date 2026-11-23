(function(){
  'use strict';
  const VERSION='2026-11-21-v1',TEXT='I agree to contribute this exploration for academic research. It contains my own information or a hypothetical scenario, and no other person’s details.';
  const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
  const model=window.LIFESTYLE_MODEL,demographics=model?.demographics||[];
  const title={patterns:'Lifestyle Patterns',compare:'Compare Your Day · scenario A only',profiles:'Lifestyle Profiles · main person only',move_goals:'From lifestyle goals',place_examples:'From places I like',validation:'Predictive Validation'};
  const descriptions={patterns:'Your chosen place, years, activity and group-view settings. Search text is excluded.',compare:'Scenario A’s year, age, metropolitan area and type of day. Scenario B is excluded.',profiles:'The main person’s residence years, ages, metropolitan areas, months and annual shares. Every comparison person/path is excluded. Ages and years can imply your birth year.',move_goals:'Your comparison age, year, current metro, destination filters, six activity targets and priorities.',place_examples:'Your comparison age, year, current metro, destination filters, example places, years, ages and ratings, plus any priorities you manually confirmed.',validation:'Your selected prediction-error threshold. No personal profile is included.'};
  let mode='download';const cards=[];
  function id(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
  function profile(p,include){const out={year:p.year,age:p.age??null,geography:p.model_geography||null};if(include)out.demographics=Object.fromEntries(demographics.map(k=>[k,p[k]||null]));return out;}
  function ready(scope){
    if(scope==='patterns')return window.LIFESTYLE_PATTERN_APP?.isReady();
    if(scope==='compare'){const a=window.LIFESTYLE_APP,last=a?.getResults();return last&&JSON.stringify(last.state)===JSON.stringify(a.getState());}
    return {profiles:window.LIFESTYLE_TRACK_APP,move_goals:window.LIFESTYLE_MOVE_APP,place_examples:window.LIFESTYLE_PLACE_APP,validation:window.LIFESTYLE_VALIDATION_APP}[scope]?.isReady();
  }
  function payload(scope,include){
    if(!ready(scope))throw Error('Update this exploration and calculate a valid result before contributing.');
    if(scope==='patterns'){
      const s=LIFESTYLE_PATTERN_APP.getState(),keys=['geo','start','end','focus','activity','dimension','groups','ageYears','demoDimension','demoPeriod','mapPeriod','placeGroup','order'];
      return {view:Object.fromEntries(keys.map(k=>[k,s[k]]))};
    }
    if(scope==='compare'){const s=LIFESTYLE_APP.getState(),r=LIFESTYLE_APP.getResults();return {day:s.day,profile:profile(s.a,include),...(include?{minutes:r.a}:{})};}
    if(scope==='profiles'){
      const s=LIFESTYLE_TRACK_APP.getState(),r=LIFESTYLE_TRACK_APP.getResult();
      return {day:r.day,stages:r.stages.map(v=>({year:v.year,age:v.year-s.birthYear,geography:v.geo,months:v.months,share:v.share,sequence:v.sequence,...(include?{demographics:s.useDemographics===false?{}:{...s.common,...v.demographics}}:{})})),annual:r.points.map(p=>({year:p.year,age:p.age,segments:p.segments.map(v=>({geography:v.geo,months:v.months,share:v.share})),...(include?{minutes:p.minutes}:{})}))};
    }
    const s=scope==='move_goals'?LIFESTYLE_MOVE_APP.getState():LIFESTYLE_PLACE_APP.getState(),shared=s.shared||s;
    if(scope==='move_goals')return {day:s.day,profile:profile(s.profile,include),origin:s.origin,constraints:s.constraints,includeHistorical:s.includeHistorical,goals:s.goals};
    if(scope==='place_examples')return {day:shared.day,profile:profile(shared.profile,include),origin:shared.origin,constraints:shared.constraints,includeHistorical:shared.includeHistorical,examples:s.examples.map(e=>({geography:e.geo,year:e.year,age:e.age,rating:e.rating,...(include?{demographics:e.useDetails?e.demographics:shared.profile}:{} )})).map(e=>{if(include)e.demographics=Object.fromEntries(demographics.map(k=>[k,e.demographics[k]||null]));return e;}),excludeExamples:s.excludeExamples,mode:s.mode,custom:s.custom};
    throw Error('Unknown exploration.');
  }
  function build(card){
    if(!card.type.value)throw Error('Choose whether this is your own information or a hypothetical scenario.');
    return {schema_version:1,record_id:card.recordId,created_at:card.created,scope:card.scope,scenario_kind:card.type.value,include_demographics:card.demo?.checked||false,consent:{agreed:true,version:VERSION,text:TEXT},payload:card.scope==='validation'?{error_threshold:Number($('error-threshold').value)}:payload(card.scope,card.demo?.checked||false)};
  }
  function record(card){const v=build(card);if(card.scope==='validation'&&!ready('validation'))throw Error('Wait for the validation charts to load.');return v;}
  function reset(card,clear=true){card.reviewed=null;card.agree.checked=false;card.preview.textContent='Choose a scenario type, then open this preview to review the exact record.';card.recordId=id();card.created=new Date().toISOString();if(clear)card.status.textContent='Nothing has been contributed from this exploration.';sync(card);}
  function sync(card){card.button.disabled=!card.agree.checked||!card.type.value||card.busy;card.button.textContent=card.busy?'Saving…':mode==='collector'?'Contribute this exploration →':'Download this research record ↓';}
  function modeText(card){card.mode.textContent=mode==='collector'?'With your agreement, the record will be saved on the researcher’s computer.':'This copy has no research receiver. Download saves to your device only; nothing is sent to the research team.';sync(card);}
  for(const root of document.querySelectorAll('[data-research-scope]')){
    const scope=root.dataset.researchScope,p='research-'+scope,personal=!['patterns','validation'].includes(scope);
    root.innerHTML=`<p class="eyebrow">${title[scope]}</p><h3>Contribute to academic research <span>(optional)</span></h3><p>${descriptions[scope]}</p>${personal?'<p>No name, street address or other person’s details are included. Age, metro and demographic combinations can still be identifying.</p>':''}<div class="research-controls"><label for="${p}-type">This exploration represents<select id="${p}-type"><option value="">Choose one</option><option value="own">My own information</option><option value="hypothetical">A hypothetical scenario</option></select></label>${personal?`<label class="research-check"><input id="${p}-demographics" type="checkbox"> Also include my selected demographic categories and model estimates (optional).<small>If off, both are excluded.</small></label>`:''}</div><details class="research-preview"><summary>Review exactly what would be shared</summary><pre id="${p}-preview"></pre></details><label class="research-check research-agreement"><input id="${p}-agree" type="checkbox">${TEXT}</label><p class="research-mode" id="${p}-mode"></p><button id="${p}-submit" type="button" disabled>Download this research record ↓</button><p id="${p}-status" role="status" aria-live="polite"></p><small>Choose separately for each Explore. Using the tools never requires a contribution. <a href="appendix.html#research-contributions">Details &amp; research contacts</a></small>`;
    const card={scope,root,type:$(p+'-type'),demo:$(p+'-demographics'),agree:$(p+'-agree'),button:$(p+'-submit'),preview:$(p+'-preview'),mode:$(p+'-mode'),status:$(p+'-status'),busy:false};cards.push(card);reset(card);modeText(card);
    card.type.onchange=()=>reset(card);if(card.demo)card.demo.onchange=()=>reset(card);
    card.agree.onchange=()=>{sync(card);if(card.agree.checked){try{const value=record(card);card.reviewed=JSON.stringify(value);card.preview.textContent=JSON.stringify(value,null,2);}catch(e){card.status.textContent=e.message;card.agree.checked=false;sync(card);}}};
    root.querySelector('details').addEventListener('toggle',e=>{if(e.target.open)try{card.preview.textContent=JSON.stringify(record(card),null,2);}catch(e){card.preview.textContent=e.message;}});
    card.button.onclick=async()=>{
      if(!card.agree.checked||card.busy)return;card.busy=true;sync(card);
      try{
        const value=record(card);if(JSON.stringify(value)!==card.reviewed){reset(card);throw Error("This exploration changed. Review it and agree again before contributing.");}card.preview.textContent=JSON.stringify(value,null,2);
        if(mode==='collector'){
          const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let response;
          try{response=await fetch('api/research/contributions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:controller.signal,credentials:'omit',cache:'no-store'});}finally{clearTimeout(timer);}
          const answer=await response.json();if(!response.ok||!answer.saved)throw Error(answer.message||'The researcher’s computer did not confirm a save.');
          card.status.textContent='Saved on the researcher’s computer. Receipt: '+answer.record_id+'. Keep this receipt if you contact the team to withdraw your record.';
        }else{
          const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='lifestyle_research_'+scope+'_'+value.record_id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
          card.status.textContent='Download prepared on this device. Nothing was sent to the research team.';
        }
        reset(card,false);
      }catch(e){card.status.textContent='Not saved: '+(e.name==='AbortError'?'No confirmation received. Retry with the same receipt to avoid duplicates.':e.message);}
      finally{card.busy=false;sync(card);}
    };
  }
  // Consent applies to the reviewed exploration only, never to subsequent edits.
  for(const event of ['input','change','click'])document.addEventListener(event,e=>{if(e.target.closest('.research-contribution'))return;for(const card of cards)if(!card.busy)reset(card);});
  for(const name of ['lifestyle-track-change','lifestyle-move-change','lifestyle-track-building','lifestyle-move-building'])window.addEventListener(name,()=>cards.forEach(c=>{if(!c.busy)reset(c);}));
  if(location.protocol!=='file:'){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
    fetch('api/research/status',{credentials:'omit',cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(s=>{if(s?.enabled&&s.schema_version===1){mode='collector';cards.forEach(c=>{reset(c);modeText(c);});}}).catch(()=>{}).finally(()=>clearTimeout(timer));
  }
  window.LIFESTYLE_RESEARCH={getMode:()=>mode,scopes:()=>cards.map(c=>c.scope),preview:scope=>clone(record(cards.find(c=>c.scope===scope)))};
})();
