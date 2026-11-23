(function(){
  'use strict';
  const $=id=>document.getElementById(id),U=LifestyleUI,M=U.model,esc=U.esc,num=U.number;
  const clone=x=>JSON.parse(JSON.stringify(x)),signed=x=>(x>0?'+':'')+num(x);
  const encode=x=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(x)),c=>String.fromCharCode(c)).join(''));
  const decode=x=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(x),c=>c.charCodeAt(0))));
  const ratingLabels=['Lived here / no rating','1 · Strongly dislike','2 · Dislike','3 · Neutral','4 · Like','5 · Love / would love'];
  let examples=[],serial=0,result=null,busy=false,forwardBusy=!window.LIFESTYLE_MOVE_APP.isReady(),dirty=true,shown=8,map=null,selected=null,worker=null,lastSignature='',activeMethod='direct',restored=null;
  function shared(){const s=window.LIFESTYLE_MOVE_APP.getState();return {profile:s.profile,origin:s.origin,day:s.day,constraints:s.constraints,includeHistorical:s.includeHistorical};}
  function signature(){return JSON.stringify(shared());}
  function error(e){$('infer-error').textContent=e.message||String(e);$('infer-error').hidden=false;}
  function invalidate(){dirty=true;$('infer-results').classList.add('pending');$('infer-download').disabled=true;$('infer-download-profile').disabled=true;$('infer-status').textContent='Choices changed. Rebuild to update the pattern and recommendations.';}
  function chooseMethod(method){
    activeMethod=method;$('move-direct').hidden=method!=='direct';$('infer-lifestyle').hidden=method!=='places';
    for(const [id,key]of [['move-method-direct','direct'],['move-method-places','places']]){$(id).setAttribute('aria-selected',String(method===key));$(id).tabIndex=method===key?0:-1;}
    if(method==='places'&&map&&result&&!dirty)paintMap();
  }
  $('move-method-direct').onclick=()=>chooseMethod('direct');$('move-method-places').onclick=()=>chooseMethod('places');
  for(const id of ['move-method-direct','move-method-places'])$(id).onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();chooseMethod(activeMethod==='direct'?'places':'direct');$(activeMethod==='direct'?'move-method-direct':'move-method-places').focus();}};
  function read(){
    for(const e of examples){const p='infer-example-'+e.id;e.geo=$(p+'-geo').value;e.year=Number($(p+'-year').value);e.age=Number($(p+'-age').value);e.rating=Number($(p+'-rating').value);e.useDetails=$(p+'-details').checked;e.demographics={};for(const k of M.demographics)e.demographics[k]=$(p+'-'+k).value||null;}
    return {examples:clone(examples),excludeExamples:$('infer-exclude').checked,mode:result?.mode||'auto',custom:result?.custom||null};
  }
  function renderExamples(){
    $('infer-examples').innerHTML=examples.map((e,index)=>{
      const p='infer-example-'+e.id;
      return `<article class="ip-example" data-example="${e.id}"><div class="ip-example-header"><h3>Place ${index+1}</h3><button type="button" data-remove-example="${e.id}" ${examples.length===1?'disabled':''}>Remove</button></div><div class="ip-example-fields"><div class="field"><label for="${p}-geo">MSA</label>${U.places(e.geo,p+'-geo')}</div><div class="field"><label for="${p}-year">Year</label>${U.years(e.year,p+'-year')}</div><div class="field"><label for="${p}-age">Age for this example</label><input type="number" min="15" max="85" id="${p}-age" value="${e.age}"></div><div class="field"><label for="${p}-rating">How do you feel about it?</label><select id="${p}-rating">${ratingLabels.map((label,i)=>`<option value="${i}" ${i===e.rating?'selected':''}>${label}</option>`).join('')}</select></div></div><details class="wf-advanced"><summary>Demographics for this example</summary><label class="wf-detail-toggle"><input type="checkbox" id="${p}-details" ${e.useDetails?'checked':''}> Use separate demographics here</label><p class="wf-note">If off, use the shared comparison profile above. If on, unspecified fields use the common reference population. Ages 85+ use 85.</p><div class="wf-background-grid" data-example-demographics ${e.useDetails?'':'hidden'}>${M.demographics.map(k=>U.demo(k,e.demographics?.[k]||'',p+'-'+k)).join('')}</div></details></article>`;
    }).join('');
    for(const e of examples)applyExampleMode(e);$('infer-add').disabled=examples.length>=12||busy;
  }
  function applyExampleMode(e){const root=$('infer-example-'+e.id+'-details').closest('[data-example]'),host=root.querySelector('[data-example-demographics]');host.hidden=!e.useDetails;host.querySelectorAll('select').forEach(s=>s.disabled=!e.useDetails);}
  function addExample(data){if(busy||examples.length>=12)return;read();const s=shared();examples.push({id:++serial,geo:s.origin,year:s.profile.year,age:s.profile.age,rating:0,useDetails:false,demographics:{},...clone(data||{})});examples.at(-1).id=serial;renderExamples();invalidate();}
  $('infer-examples').addEventListener('change',e=>{if(busy)return;read();const row=e.target.closest('[data-example]');if(row)applyExampleMode(examples.find(v=>v.id===Number(row.dataset.example)));invalidate();});
  $('infer-examples').addEventListener('input',e=>{if(e.target.type==='number'&&!busy)invalidate();});
  $('infer-examples').addEventListener('click',e=>{const b=e.target.closest('[data-remove-example]');if(!b||busy)return;read();examples=examples.filter(v=>v.id!==Number(b.dataset.removeExample));renderExamples();invalidate();});
  $('infer-add').onclick=()=>addExample();$('infer-exclude').onchange=invalidate;
  $('infer-use-profiles').onclick=()=>{
    try{
      const raw=sessionStorage.getItem('lifestyle-profile-chapters');if(!raw)throw Error('Build your Lifestyle Profiles first, then use its chapters here.');
      const saved=JSON.parse(raw),state=saved.state;
      examples=state.stages.slice(0,12).map(stage=>({id:++serial,geo:stage.geo,year:stage.year,age:Math.min(85,stage.year-state.birthYear),rating:0,useDetails:true,demographics:state.useDemographics===false?{}:{...state.common,...stage.demographics}}));
      renderExamples();invalidate();$('infer-status').textContent='Your saved chapters are loaded without preference ratings. Rate the places you liked or disliked before building. Residence durations are not used as preference weights.';
    }catch(e){error(e);}
  };
  function compute(job,progress){
    if(location.protocol==='file:'||!window.Worker)return LifestylePlacePreferences.run(job,progress);
    return new Promise((resolve,reject)=>{worker=new Worker('assets/place-preference-worker.js?v=20261121-v10');worker.onmessage=e=>{if(e.data.kind==='progress')progress(e.data.progress);else{worker.terminate();worker=null;if(e.data.kind==='result')resolve(e.data.result);else reject(Error(e.data.message));}};worker.onerror=()=>{worker?.terminate();worker=null;reject(Error('The preference worker could not load. Reload and try again.'));};worker.postMessage(job);});
  }
  function scaleWord(z){return z>.15?'More':z<-.15?'Less':'Near the median';}
  function weightSummary(){
    if(!result.fit.available)return `<p class="eyebrow">PRIORITIES NEED A CONTRAST</p><h2>A shared pattern, with no identified importance yet.</h2><p>${esc(result.fit.reason)} Until then, similarity uses equal weights across the six activities. A place’s distinctive activity is not automatically the activity you value most.</p>`;
    const fit=result.fit,ordered=fit.weights.map((weight,k)=>({weight,k})).sort((a,b)=>b.weight-a.weight);
    return `<p class="eyebrow">TENTATIVE PRIORITIES FROM ${fit.rated} RATINGS</p><h2>What separates higher and lower ratings?</h2><p>This considers all six activities together. A feature shared by liked places can receive little weight if it also occurs in disliked places. The directions and percentage shares below are a starting point to check and adjust; a few ratings cannot establish your true priorities.</p><div class="wf-table-shell"><table class="ip-weight-table"><thead><tr><th>Activity</th><th>Suggested direction</th><th>Tentative share</th><th>When one example is left out</th></tr></thead><tbody>${ordered.map(({weight,k})=>`<tr><td>${esc(M.activityLabels[k])}</td><td>${fit.beta[k]>=0?'More':'Less'}</td><td>${num(weight*100)}%<div class="ip-weight-bar"><span style="width:${weight*100}%"></span></div></td><td>Same direction in ${Math.round(fit.consistency[k]*fit.rated)} of ${fit.rated} checks<small>Shows sensitivity to your examples.</small></td></tr>`).join('')}</tbody></table></div><p class="wf-note">Based on ${fit.uniquePlaces} distinct metros. Percentages summarize the regularized rating model; they are not confidence levels. <a href="appendix.html#place-preferences">How the weights are calculated →</a></p>`;
  }
  function renderPattern(){
    const higher=result.prototype.map((z,k)=>({z,k})).filter(v=>v.z>.15).sort((a,b)=>b.z-a.z),lower=result.prototype.map((z,k)=>({z,k})).filter(v=>v.z<-.15).sort((a,b)=>a.z-b.z);
    const fragments=[];if(higher.length)fragments.push('more '+higher.slice(0,2).map(v=>M.activityLabels[v.k].toLowerCase()).join(' and '));if(lower.length)fragments.push('less '+lower.slice(0,2).map(v=>M.activityLabels[v.k].toLowerCase()).join(' and '));
    const liked=result.examples.filter(e=>e.rating>=4);
    $('infer-summary').innerHTML=`<h3>${fragments.length?'Your liked places tend toward '+esc(fragments.join(', and '))+'.':'Your liked places are close to the metropolitan median.'}</h3><p>Based on ${liked.length} examples rated Like or Love. This describes the modeled places you chose. It does not show that lifestyle caused your choice or that you personally spent this amount of time.</p>`;
    $('infer-patterns').innerHTML=result.prototype.map((z,k)=>{
      const pool=result.allPredictions.filter(p=>U.geo.get(p.value).yearCounts[result.profile.year]);
      const percentile=Math.round(100*pool.filter(p=>(p.minutes[k]-result.normalization.center[k])/result.normalization.scale[k]<=z).length/pool.length);
      return `<article class="ip-pattern" style="--activity-color:${U.colors[k]}"><h3>${esc(M.activityLabels[k])}</h3><strong>${scaleWord(z)}</strong><p>This level is above about <b>${percentile}%</b> of reference-year metros for your comparison profile.<br>${esc(M.activityDescriptions[k])}</p></article>`;
    }).join('');
    const extras=result.examples.filter(e=>!e.diaries);
    $('infer-warnings').innerHTML=(extras.length?`<p class="wf-warning">${extras.length} example MSA-year${extras.length===1?' has':'s have'} no observed diaries under that public code. Those examples use extrapolated pooled place effects.</p>`:'')+(result.examples.some(e=>e.age===85)?'<p class="wf-warning">Example age 85 represents the model’s 85+ group.</p>':'');
    $('infer-weights').innerHTML=weightSummary();
    const initial=result.custom||result.fit.beta?.map(v=>100*v/Math.max(...result.fit.beta.map(Math.abs)))||Array(6).fill(0);
    $('infer-adjustments').innerHTML=`<table class="ip-weight-table"><thead><tr><th>Activity</th><th>Signed priority · −100 to +100</th></tr></thead><tbody>${M.activityLabels.slice(0,6).map((l,k)=>`<tr><td>${esc(l)}</td><td><label class="sr-only" for="infer-custom-${k}">${esc(l)} signed priority</label><input id="infer-custom-${k}" type="number" min="-100" max="100" step="1" value="${Math.round(initial[k])}"></td></tr>`).join('')}</tbody></table>`;
    $('infer-example-values').innerHTML=`<table class="ip-example-table"><thead><tr><th>Place / year / age</th><th>Rating</th>${M.activityLabels.slice(0,6).map(l=>`<th>${esc(l)} · min</th>`).join('')}</tr></thead><tbody>${result.examples.map(e=>`<tr><td>${esc(e.label)}<br>${e.year} · age ${e.age}${e.diaries?'':' · extrapolated'}</td><td>${e.rating||'Not rated'}</td>${e.minutes.slice(0,6).map(m=>`<td>${num(m)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function paintMap(){
    const byValue=new Map(result.ranked.map((p,i)=>[p.value,{...p,rank:i+1}])),values=new Map();
    for(const g of U.msas){const p=byValue.get(g.value);values.set(g.value,{label:g.label,period:String(result.profile.year),group:result.mode==='similarity'?'Similarity to liked places':'Activity priority score',summary:p?{n:g.diaries}:null,minutes:p?result.ranked.length-p.rank+1:null,displayValue:p?'Match '+p.rank+' · '+(result.mode==='similarity'?num(p.distance)+' distance':num(p.utility)+' priority score'):'Excluded by filters or example-place choices',sampleText:p?(p.diaries?num(p.diaries)+' diaries in '+result.profile.year:'No reference-year diaries · extrapolated'):'Not in the active candidate pool',actionText:'Click to inspect'});}
    map.update(values,selected,1,Math.max(2,result.ranked.length));
  }
  function select(value){
    if(dirty||!result)return;selected=value;const p=result.ranked.find(v=>v.value===value),g=U.geo.get(value);
    if(!p){$('infer-selected').innerHTML=`<h3>${esc(g.label)}</h3><p class="wf-note">Outside the active candidates. Change the region, size, coverage or example-place exclusion above to include it.</p>`;paintMap();return;}
    const a={...result.profile,model_geography:result.origin},b={...result.profile,model_geography:p.value};
    $('infer-selected').innerHTML=`<p class="eyebrow">MATCH ${result.ranked.indexOf(p)+1} · ${result.profile.year} · AGE ${result.profile.age===85?'85+':result.profile.age}</p><h3>${esc(p.label)}</h3><p class="wf-note">${num(p.population)} residents (2022) · ${p.diaries?num(p.diaries)+' diaries in '+result.profile.year:'No reference-year diaries · extrapolated'}. ${result.mode==='similarity'?'Lifestyle distance '+num(p.distance)+'; lower is closer.':'Priority score '+num(p.utility)+'; higher ranks first.'}</p>${U.composition(p.minutes)}<div class="workflow-legend">${U.legend()}</div><div class="wf-minute-grid">${p.minutes.slice(0,6).map((m,k)=>`<span>${esc(M.activityLabels[k])}<b>${num(m)} <small>min</small></b><small>${signed(p.differences[k])} vs current MSA</small></span>`).join('')}</div><p class="wf-note"><a href="${esc(U.compareLink(a,b,result.day))}">Compare with ${esc(result.originLabel)} →</a></p>`;
    paintMap();document.querySelectorAll('#infer-rankings [data-value]').forEach(e=>e.classList.toggle('selected',e.dataset.value===value));
  }
  function rankings(){
    $('infer-rankings').innerHTML=result.ranked.slice(0,shown).map((p,i)=>`<article class="ip-match ${selected===p.value?'selected':''}" data-value="${p.value}"><p class="eyebrow">MATCH ${i+1}${p.value===result.origin?' · CURRENT MSA':''}</p><h3>${esc(p.label)}</h3><p>${result.mode==='similarity'?num(p.distance)+' lifestyle distance · lower is closer':num(p.utility)+' priority score · higher ranks first'}<br>${num(p.population)} metropolitan residents (2022)</p><div class="wf-place-changes">${p.minutes.slice(0,6).map((m,k)=>`<span>${esc(M.activityLabels[k])}: <b>${num(m)} min</b></span>`).join('')}</div><div class="wf-place-links"><button type="button" data-infer-pick="${p.value}">Inspect on map ↑</button><span>${p.diaries?num(p.diaries)+' diaries':'Extrapolated place-year'}</span></div></article>`).join('');
    $('infer-more').hidden=shown>=result.ranked.length;
    $('infer-rankings').querySelectorAll('[data-infer-pick]').forEach(b=>b.onclick=()=>{select(b.dataset.inferPick);$('infer-selected').scrollIntoView({behavior:'smooth',block:'center'});});
  }
  function renderRanking(){
    $('infer-rank-mode').value=result.mode;$('infer-rank-mode').querySelector('[value=preference]').disabled=!result.fit.available;$('infer-rank-mode').querySelector('[value=custom]').disabled=!result.custom;
    $('infer-matches-heading').textContent=result.ranked.length+' places to explore';
    $('infer-match-note').textContent=(result.mode==='similarity'?'Equal-weight distance to the place-relative pattern of your liked examples. Lower is closer.':result.mode==='custom'?'Ranks use the signed activity priorities you adjusted. Higher scores are preferred under those inputs.':'Ranks use the signed coefficients from your rated examples. These are exploratory preference scores, not a predicted probability or confirmed preference.')+' All candidates use the same comparison age '+result.profile.age+', year '+result.profile.year+', demographics and '+(result.day==='all'?'average-day':result.day)+' calendar.';
    $('infer-current').innerHTML=`<p class="eyebrow">YOUR CURRENT REFERENCE</p><h3>${esc(result.originLabel)}</h3><p>${result.profile.year} · age ${result.profile.age===85?'85+':result.profile.age} · ${result.day==='all'?'average day':result.day}</p>${U.composition(result.baseline)}<div class="workflow-legend">${U.legend()}</div>`;
    if(!map){map=new LifestyleMetroMap($('infer-map'),LIFESTYLE_MAP,value=>select(value));map.svg.id='infer-metro-map-svg';map.tooltip.id='infer-metro-map-tooltip';}
    shown=8;selected=result.ranked[0].value;rankings();select(selected);
  }
  function render(){
    $('infer-results').hidden=false;$('infer-results').classList.remove('pending');renderPattern();renderRanking();$('infer-download').disabled=false;$('infer-download-profile').disabled=false;
  }
  async function run(){
    if(busy||forwardBusy)return;const own=read(),comparison=shared(),job={...own,shared:comparison};lastSignature=JSON.stringify(comparison);
    busy=true;$('infer-error').hidden=true;const enabled=[...document.querySelectorAll('main input,main select,main button')].filter(e=>!e.disabled);enabled.forEach(e=>e.disabled=true);
    $('infer-status').textContent='Measuring each example against comparable metropolitan profiles…';
    try{result=await compute(job,p=>{$('infer-status').textContent='Measuring example profiles · '+p.done+' / '+p.total+(p.metros?' · '+p.metros+' metros':'');});dirty=false;render();$('infer-status').textContent=result.examples.length+' examples measured · '+result.ranked.length+' candidate metros. '+(result.fit.available?'Tentative rating weights are available.':'Similarity matching is ready; add contrasting ratings to explore weights.');}
    catch(e){dirty=true;error(e);$('infer-results').classList.add('pending');$('infer-status').textContent='Check the examples and filters, then rebuild.';}
    finally{busy=false;enabled.forEach(e=>e.disabled=false);for(const e of examples)applyExampleMode(e);$('infer-add').disabled=examples.length>=12;$('infer-download').disabled=dirty;$('infer-download-profile').disabled=dirty;}
  }
  $('infer-run').onclick=run;
  $('infer-rank-mode').onchange=()=>{if(dirty||!result)return;result=LifestylePlacePreferences.recommend(result,$('infer-rank-mode').value,result.custom);renderRanking();};
  $('infer-apply').onclick=()=>{try{if(dirty||!result)throw Error('Rebuild before adjusting priorities.');const values=Array.from({length:6},(_,k)=>Number($('infer-custom-'+k).value));result=LifestylePlacePreferences.recommend(result,'custom',values);renderRanking();$('infer-status').textContent='Recommendations now use your adjusted priorities. The original rating-weight table stays available for comparison.';}catch(e){error(e);}};
  $('infer-reset').onclick=()=>{if(dirty||!result)return;result=LifestylePlacePreferences.recommend(result,result.fit.available?'preference':'similarity');renderPattern();renderRanking();};
  $('infer-more').onclick=()=>{shown+=12;rankings();};
  $('infer-zoom-in').onclick=()=>map?.setZoom(map.zoom*1.5);$('infer-zoom-out').onclick=()=>map?.setZoom(map.zoom/1.5);$('infer-zoom-reset').onclick=()=>map?.reset();
  $('infer-download').onclick=()=>{
    if(dirty||!result)return;U.download('place_based_lifestyle_matches.csv',['rank','msa_name','public_geography_code','method','year','age','diary_calendar',...M.demographics,'region_filter','size_filter','include_historical','exclude_example_places','population_2022','reference_year_diaries','similarity_distance','priority_score',...M.activities.map(a=>a+'_minutes'),...M.activities.slice(0,6).map(a=>a+'_ranking_weight')],result.ranked.map((p,i)=>[i+1,p.label,p.value,result.mode,result.profile.year,result.profile.age,result.day,...M.demographics.map(k=>result.profile[k]),result.constraints.region,result.constraints.size,result.includeHistorical,result.excludeExamples,p.population,p.diaries,p.distance,p.utility,...p.minutes,...result.rankingWeights]));
  };
  $('infer-download-profile').onclick=()=>{
    if(dirty||!result)return;
    const data={version:1,description:'Exploratory lifestyle preference profile from self-reported place ratings; no personal utility identification.',shared:shared(),examples:read().examples,pattern:result.prototype,fit:result.fit,activeMethod:result.mode,adjustedPriorities:result.custom,rankingWeights:result.rankingWeights};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='my_exploratory_lifestyle_preferences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  $('infer-share').onclick=async()=>{
    try{const own=read(),url=new URL(location.href);url.searchParams.set('m',btoa(JSON.stringify(window.LIFESTYLE_MOVE_APP.getState())));url.searchParams.set('ip',encode({version:1,...own}));url.hash='infer-lifestyle';history.replaceState(null,'',url.href);try{await navigator.clipboard.writeText(url.href);}catch(e){const input=document.createElement('textarea');input.value=url.href;document.body.append(input);input.select();document.execCommand('copy');input.remove();}$('infer-status').textContent='The place-example link is in the address bar and copied when allowed. Its examples and ratings are visible to anyone with the link.';}catch(e){error(e);}
  };
  window.addEventListener('lifestyle-move-change',()=>{const next=signature();if(next!==lastSignature){lastSignature=next;invalidate();}});
  window.addEventListener('lifestyle-move-building',()=>{forwardBusy=true;$('infer-run').disabled=true;});
  window.addEventListener('lifestyle-move-ready',()=>{forwardBusy=false;if(!busy)$('infer-run').disabled=false;});
  try{const saved=new URL(location.href).searchParams.get('ip');if(saved){restored=decode(saved);if(restored.version!==1||!Array.isArray(restored.examples)||!restored.examples.length||restored.examples.length>12)throw Error('Unsupported saved place examples.');for(const e of restored.examples){if(!U.geo.has(e.geo))throw Error('Unavailable saved MSA.');examples.push({...e,id:++serial});}$('infer-exclude').checked=restored.excludeExamples!==false;chooseMethod('places');}}
  catch(e){examples=[];error(Error('The saved examples could not be read. '+e.message));}
  if(!examples.length){const s=shared();examples=[{id:++serial,geo:s.origin,year:s.profile.year,age:s.profile.age,rating:0,useDetails:false,demographics:{}}];}
  renderExamples();lastSignature=signature();$('infer-run').disabled=forwardBusy;if(location.hash==='#infer-lifestyle')chooseMethod('places');
  // Preserve saved ranking choices only after a successful recomputation.
  if(restored){const original=run;run=async function(){await original();if(!dirty&&restored){const saved=restored;restored=null;try{result=LifestylePlacePreferences.recommend(result,saved.mode==='auto'?(result.fit.available?'preference':'similarity'):saved.mode,saved.custom);renderPattern();renderRanking();}catch(e){error(e);}}};$('infer-run').onclick=run;}
  window.LIFESTYLE_PLACE_APP={getState:()=>({shared:shared(),...read()}),getResult:()=>result,isReady:()=>!!result&&!busy&&!dirty,run,add:addExample,select,setExamples:values=>{if(busy)return;examples=values.map(e=>({...clone(e),id:++serial}));renderExamples();invalidate();},chooseMethod};
})();
