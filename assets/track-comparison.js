(function(){
  'use strict';
  const $=id=>document.getElementById(id),U=window.LifestyleUI,M=U.model,esc=U.esc,num=U.number;
  const stageKeys=['education','employment','marital_status','household_children','family_income'];
  const commonKeys=['sex','race','hispanic_origin','immigration_status'];
  const styles=[{color:'#247b78',dash:''},{color:'#c87543',dash:'7 4'},{color:'#8269a0',dash:'2 4'},{color:'#426786',dash:'9 3 2 3'}];
  const clone=x=>JSON.parse(JSON.stringify(x));
  let peers=[],serial=0,busy=false,primaryBusy=false,dirty=true,results=null,selected=null;
  const encode=x=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(x)),c=>String.fromCharCode(c)).join(''));
  const decode=x=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(x),c=>c.charCodeAt(0))));
  const axis=()=>$('track-comparison-axis').value;
  function error(e){$('track-comparison-error').textContent=e.message||String(e);$('track-comparison-error').hidden=false;}
  function invalidate(){
    dirty=true;$('track-comparison-results').classList.add('pending');$('track-comparison-download').disabled=true;
    $('track-comparison-status').textContent=peers.length?'Choices changed. Build the comparison to update all lines.':'Add a person or copy your track to explore another path.';
  }
  function getPeer(id){return peers.find(p=>p.id===Number(id));}
  function syncButtons(){
    $('track-comparison-add').disabled=busy||primaryBusy||peers.length>=3;
    $('track-comparison-run').disabled=busy||primaryBusy||!peers.length;
    $('track-comparison-empty').hidden=!!peers.length;
  }
  function readEditor(){
    for(const p of peers){
      const prefix='peer-'+p.id;
      p.name=$(prefix+'-name').value.trim().slice(0,60)||'Person / path '+String.fromCharCode(66+peers.indexOf(p));
      p.state.birthYear=Number($(prefix+'-birth').value);p.state.endYear=Number($(prefix+'-end').value);
      p.state.useDemographics=$(prefix+'-use').checked;
      p.state.common={};for(const k of commonKeys)p.state.common[k]=$(prefix+'-common-'+k).value||null;
    }
  }
  function addPeer(state,name){
    if(peers.length>=3||busy||primaryBusy)return;
    readEditor();const p={id:++serial,name:name||(!peers.length?'Alternative path':'Person / path '+String.fromCharCode(66+peers.length)),state:clone(state||window.LIFESTYLE_TRACK_APP.getState())};
    peers.push(p);renderEditors();invalidate();
  }
  function renderEditors(){
    $('track-comparison-people').innerHTML=peers.map((p,index)=>{
      const prefix='peer-'+p.id,s=p.state,style=styles[index+1];
      return `<details class="wf-panel tc-person" data-peer="${p.id}" style="--tc-color:${style.color}" open><summary><span data-peer-title>${esc(p.name)}</span> · <span class="tc-muted">independent background &amp; chapters</span></summary><div class="tc-controls"><div class="field"><label for="${prefix}-name">Person or path name</label><input id="${prefix}-name" data-name type="text" maxlength="60" value="${esc(p.name)}"></div><div class="field"><label for="${prefix}-birth">Birth year</label><input id="${prefix}-birth" data-birth type="number" min="1900" max="2010" value="${s.birthYear}"></div><div class="field"><label for="${prefix}-end">Track through year</label>${U.years(Number(s.endYear),prefix+'-end')}</div></div><label class="wf-detail-toggle"><input id="${prefix}-use" data-use type="checkbox" ${s.useDemographics!==false?'checked':''}> Include demographic details for this person / path</label><div class="wf-background-grid tc-background" data-background ${s.useDemographics===false?'hidden':''}>${commonKeys.map(k=>U.demo(k,s.common?.[k]||'',prefix+'-common-'+k)).join('')}</div><p class="wf-note">Sex and race apply to this whole path. Education, employment, marriage, children and optional family income can change in each chapter. All paths use your selected type of day above.</p><div class="wf-stages">${s.stages.map((stage,i)=>`<article class="wf-stage" data-peer-stage="${i}"><div class="wf-stage-heading"><div><h3>Chapter ${i+1}</h3><p class="wf-stage-age">Age ${stage.year-s.birthYear} at start</p></div></div><div class="wf-controls"><div class="field"><label for="${prefix}-stage-${i}-year">From year</label>${U.years(Number(stage.year),prefix+'-stage-'+i+'-year')}</div><div class="field"><label for="${prefix}-stage-${i}-geo">MSA</label>${U.places(stage.geo,prefix+'-stage-'+i+'-geo')}</div><div class="field"><label for="${prefix}-stage-${i}-months">Months in this year (optional)</label><input type="number" min="0.01" max="12" step="any" placeholder="Auto share" id="${prefix}-stage-${i}-months" value="${stage.months??''}"></div></div><div class="wf-stage-demographics ${s.useDemographics===false?'wf-demographics-off':''}"><p class="required-mark">THIS CHAPTER · FOUR LIFE-STAGE DETAILS</p><div class="wf-controls">${stageKeys.filter(k=>k!=='family_income').map(k=>U.demo(k,stage.demographics?.[k]||'',prefix+'-stage-'+i+'-'+k)).join('')}</div><details class="wf-advanced"><summary>Family income (optional)</summary>${U.demo('family_income',stage.demographics?.family_income||'',prefix+'-stage-'+i+'-family_income')}</details></div><div class="wf-stage-actions"><button type="button" data-action="up-stage" ${i===0?'disabled':''}>Earlier in order ↑</button><button type="button" data-action="remove-stage" ${s.stages.length===1?'disabled':''}>Remove chapter</button></div></article>`).join('')}</div><div class="tc-actions"><button type="button" data-action="add-stage" ${s.stages.length>=10?'disabled':''}>Add a chapter +</button><button type="button" data-action="copy">Copy my current track</button><button type="button" data-action="remove">Remove this comparison</button></div></details>`;
    }).join('');
    for(const p of peers)applyMode(p);
    syncButtons();
  }
  function applyMode(p){
    const root=$('peer-'+p.id+'-use').closest('[data-peer]'),use=p.state.useDemographics!==false;
    root.querySelector('[data-background]').hidden=!use;
    root.querySelectorAll('[data-background] select,.wf-stage-demographics select').forEach(e=>e.disabled=!use);
    root.querySelectorAll('.wf-stage-demographics').forEach(e=>e.classList.toggle('wf-demographics-off',!use));
  }
  $('track-comparison-people').addEventListener('change',event=>{
    const e=event.target,card=e.closest('[data-peer]');if(!card||busy)return;const p=getPeer(card.dataset.peer),stage=e.closest('[data-peer-stage]');
    if(stage){const s=p.state.stages[Number(stage.dataset.peerStage)];if(e.id.endsWith('-year'))s.year=Number(e.value);else if(e.id.endsWith('-months'))s.months=e.value===''?null:Number(e.value);else if(e.id.endsWith('-geo'))s.geo=e.value;else if(e.dataset.demo){s.demographics=s.demographics||{};s.demographics[e.dataset.demo]=e.value||null;}}
    readEditor();card.querySelector('[data-peer-title]').textContent=p.name;
    card.querySelectorAll('[data-peer-stage]').forEach((s,i)=>s.querySelector('.wf-stage-age').textContent='Age '+(p.state.stages[i].year-p.state.birthYear)+' at start');
    applyMode(p);invalidate();
  });
  $('track-comparison-people').addEventListener('input',event=>{
    if(event.target.matches('[data-name],[data-birth]')){readEditor();invalidate();}
  });
  $('track-comparison-people').addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||busy||primaryBusy)return;
    readEditor();const p=getPeer(button.closest('[data-peer]').dataset.peer);
    switch(button.dataset.action){
      case 'remove':peers=peers.filter(peer=>peer!==p);break;
      case 'copy':p.state=clone(window.LIFESTYLE_TRACK_APP.getState());break;
      case 'up-stage':{const i=Number(button.closest('[data-peer-stage]').dataset.peerStage);[p.state.stages[i-1],p.state.stages[i]]=[p.state.stages[i],p.state.stages[i-1]];break;}
      case 'remove-stage':p.state.stages.splice(Number(button.closest('[data-peer-stage]').dataset.peerStage),1);break;
      case 'add-stage':{
        const last=p.state.stages.at(-1);p.state.stages.push({...clone(last),months:null});break;
      }
    }
    renderEditors();invalidate();
    if(!peers.length){results=null;$('track-comparison-results').hidden=true;}
  });
  function coordinate(p){return axis()==='age'?p.age:p.year;}
  function alignedValues(){return [...new Set(results.flatMap(r=>r.result.points.map(coordinate)))].sort((a,b)=>a-b);}
  function inspect(value){
    if(!results)return;selected=Number(value);$('track-comparison-inspect').value=selected;
    const matches=results.map(r=>({...r,point:r.result.points.find(p=>coordinate(p)===selected)}));
    $('track-comparison-inspect-title').textContent=(axis()==='age'?'Age ':'Year ')+selected;
    $('track-comparison-profiles').innerHTML=matches.map((r,i)=>`<article class="tc-profile" style="--tc-color:${styles[i].color}"><h4>${esc(r.name)}</h4>${r.point?`<p>${r.point.year} · age ${r.point.age}${r.point.ageTopCoded?' (85+ in model)':''} · ${esc(r.point.label)}<br>${LifestyleResidence.coverage(r.point)}</p>${U.composition(r.point.minutes)}<p style="margin-top:10px">${LifestyleResidence.details(r.point)}</p>`:'<p>No profile at this '+(axis()==='age'?'age':'year')+'. Nothing is interpolated or carried beyond this path.</p>'}</article>`).join('');
    const a=matches[0].point;
    $('track-comparison-values').innerHTML=`<table class="tc-values"><thead><tr><th>Activity · min / day</th>${matches.map(r=>`<th>${esc(r.name)}</th>`).join('')}</tr></thead><tbody>${M.activityLabels.map((label,k)=>`<tr><th>${esc(label)}</th>${matches.map((r,i)=>`<td>${r.point?num(r.point.minutes[k]):'—'}${i&&r.point&&a?`<small>${r.point.minutes[k]-a.minutes[k]>0?'+':''}${num(r.point.minutes[k]-a.minutes[k])} vs your track</small>`:''}</td>`).join('')}</tr>`).join('')}<tr><th>Total</th>${matches.map(r=>`<td class="tc-total">${r.point?'1,440':'—'}</td>`).join('')}</tr></tbody></table>`;
    $('track-comparison-reference-values').innerHTML=LifestyleReferences.table(matches[0].point,results[0].result,window.LIFESTYLE_TRACK_APP.getState());
  }
  function drawCharts(){
    const reference=window.LifestyleReferences.series(results[0].result,window.LIFESTYLE_TRACK_APP.getState());
    const display=[...results.map((r,i)=>({...r,style:styles[i]})),...reference.map(s=>({name:s.name,result:{points:s.points},style:s,isReference:true}))];
    const xs=alignedValues(),min=xs[0],max=xs.at(-1),W=360,H=230,L=45,R=14,T=22,B=39;
    const x=value=>L+(value-min)/Math.max(1,max-min)*(W-L-R);
    const tickStep=max-min>16?5:max-min>8?2:1;
    const ticks=[...new Set([min,...Array.from({length:Math.max(0,Math.floor(max/tickStep)-Math.ceil(min/tickStep)+1)},(_,i)=>(Math.ceil(min/tickStep)+i)*tickStep).filter(v=>v>min+1&&v<max-1),max])];
    $('track-comparison-charts').innerHTML=M.activityLabels.slice(0,6).map((label,k)=>{
      const top=Math.max(1,...display.flatMap(r=>r.result.points.map(p=>p.minutes[k]))),step=top>600?200:top>300?100:top>120?50:top>60?20:10,upper=Math.ceil(top*1.12/step)*step;
      const y=value=>H-B-value/upper*(H-T-B);let svg='';
      for(let tick=0;tick<=upper;tick+=step)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(tick)}" y2="${y(tick)}" class="wf-grid"/><text x="${L-7}" y="${y(tick)+3}" text-anchor="end">${tick}</text>`;
      for(const tick of ticks)svg+=`<text x="${x(tick)}" y="${H-19}" text-anchor="middle">${tick}</text>`;
      display.forEach((r,j)=>{
        const style=r.style;let path='';
        r.result.points.forEach((p,i)=>path+=(i===0||p.year-r.result.points[i-1].year>1?'M':'L')+x(coordinate(p))+','+y(p.minutes[k])+' ');
        svg+=`<path class="tc-chart-line" data-series="${j}" d="${path}" fill="none" stroke="${style.color}" stroke-width="2.3" ${style.dash?`stroke-dasharray="${style.dash}"`:''}/>`;
        r.result.points.forEach(p=>{svg+=`<circle class="tc-chart-point" data-coordinate="${coordinate(p)}" cx="${x(coordinate(p))}" cy="${y(p.minutes[k])}" r="3.2" fill="${p.extrapolated?'white':style.color}" stroke="${style.color}" tabindex="0" role="button" aria-label="${esc(r.name)}, ${p.year}, age ${p.age}, ${esc(p.label)}, ${esc(label)} ${num(p.minutes[k])} minutes"><title>${esc(r.name)} · ${p.year} · age ${p.age} · ${esc(p.label)}: ${num(p.minutes[k])} min${p.extrapolated?' · extrapolated':''}</title></circle>`;});
      });
      return `<article class="wf-chart"><h3><i style="background:${U.colors[k]}"></i>${esc(label)}</h3><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(label)} comparison by ${axis()}"><text x="${L}" y="12">min / day</text>${svg}<text x="${(L+W-R)/2}" y="${H-3}" text-anchor="middle">${axis()==='age'?'Age':'Calendar year'}</text></svg></article>`;
    }).join('');
    $('track-comparison-charts').querySelectorAll('[data-coordinate]').forEach(c=>{const select=()=>inspect(c.dataset.coordinate);c.addEventListener('click',select);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});
    $('track-comparison-inspect').innerHTML=xs.map(v=>`<option value="${v}">${axis()==='age'?'Age ':'Year '}${v}</option>`).join('');
    const common=xs.filter(v=>results.every(r=>r.result.points.some(p=>coordinate(p)===v)));
    const chosen=xs.includes(selected)?selected:(common.at(-1)??xs.at(-1));
    $('track-comparison-axis-note').textContent=(axis()==='age'?'The same age can refer to different calendar years. Both ages and years appear below.':'At the same calendar year, people can be different ages. Both appear below.')+' Gaps preserve the missing 2020 survey. Hollow points mark MSA-years without observed diaries. '+(common.length?common.length+' '+(axis()==='age'?'ages':'years')+' are shared by every path.':'The paths have no coordinate shared by all; unmatched values remain blank.');
    $('track-comparison-legend').innerHTML=display.map(r=>`<span><svg viewBox="0 0 32 12" aria-hidden="true"><path d="M0,6 L32,6" stroke="${r.style.color}" stroke-width="2.5" ${r.style.dash?`stroke-dasharray="${r.style.dash}"`:''}/></svg>${esc(r.name)}${r.isReference?' · main profile reference':''}</span>`).join('');
    inspect(chosen);
  }
  function renderResults(){
    $('track-comparison-results').hidden=false;$('track-comparison-results').classList.remove('pending');
    $('track-comparison-legend').innerHTML=results.map((r,i)=>`<span><svg viewBox="0 0 32 12" aria-hidden="true"><path d="M0,6 L32,6" stroke="${styles[i].color}" stroke-width="2.5" ${styles[i].dash?`stroke-dasharray="${styles[i].dash}"`:''}/></svg>${esc(r.name)}</span>`).join('');
    const extras=results.map(r=>({name:r.name,years:r.result.points.filter(p=>p.extrapolated).map(p=>p.year)})).filter(r=>r.years.length);
    $('track-comparison-warnings').innerHTML=extras.map(r=>`<p class="wf-warning">${esc(r.name)} · no observed MSA-year diaries in ${r.years.join(', ')}. These points use extrapolated pooled place effects.</p>`).join('')+(results.some(r=>r.result.points.some(p=>p.ageTopCoded))?'<p class="wf-warning">Ages 85 and older use the model’s 85+ category.</p>':'')+(peers.some(p=>p.state.useDemographics===false)||window.LIFESTYLE_TRACK_APP.getState().useDemographics===false?'<p class="wf-warning">At least one path has demographic details off; its unspecified traits average over the shared reference population. Birth year still determines age.</p>':'');
    drawCharts();$('track-comparison-download').disabled=false;
  }
  async function run(){
    if(busy||primaryBusy||!peers.length)return;readEditor();busy=true;syncButtons();$('track-comparison-error').hidden=true;
    let locked=[];const localEnabled=[...$('track-comparison').querySelectorAll('input,select,button')].filter(e=>!e.disabled);localEnabled.forEach(e=>e.disabled=true);
    try{
      const app=window.LIFESTYLE_TRACK_APP;
      if(!app.isReady())await app.run();
      if(!app.isReady())throw Error('Build a valid original track first. Check its background and chapters above.');
      locked=[...document.querySelectorAll('main input,main select,main button')].filter(e=>!e.disabled);locked.forEach(e=>e.disabled=true);
      const primary=app.getState(),answers=[{name:'Your track',result:clone(app.getResult())}];
      for(let i=0;i<peers.length;i++){
        const p=peers[i];p.state.day=primary.day;
        try{
          const answer=await window.LifestyleJobs.run({...clone(p.state),type:'track',day:primary.day},progress=>{$('track-comparison-status').textContent='Building '+p.name+' · '+progress.done+' / '+progress.total+' years';});
          answers.push({name:p.name,result:answer});
        }catch(e){throw Error(p.name+': '+(e.message||String(e)));}
      }
      results=answers;dirty=false;renderResults();$('track-comparison-status').textContent=results.length+' paths ready · switch between calendar year and age, then select a point to compare minutes.';
    }catch(e){dirty=true;error(e);$('track-comparison-status').textContent='Check the choices and build the comparison again.';$('track-comparison-download').disabled=true;$('track-comparison-results').classList.add('pending');}
    finally{busy=false;locked.forEach(e=>e.disabled=false);localEnabled.forEach(e=>e.disabled=false);for(const p of peers)applyMode(p);syncButtons();$('track-comparison-download').disabled=dirty;}
  }
  $('track-comparison-add').onclick=()=>addPeer();$('track-comparison-run').onclick=run;
  $('track-comparison-axis').onchange=()=>{selected=null;if(results&&!dirty)drawCharts();};
  $('track-comparison-inspect').onchange=e=>inspect(e.target.value);
  $('track-comparison-download').onclick=()=>{
    if(dirty||!results)return error(Error('Build the updated comparison before downloading.'));
    const rows=[];
    for(const [index,r]of results.entries())for(const p of r.result.points){
      const ref=results[0].result.points.find(a=>coordinate(a)===coordinate(p));
      rows.push([r.name,axis(),coordinate(p),p.year,p.age,p.label,p.geo,p.extrapolated?'extrapolated':'observed_msa_year',r.result.day,...M.demographics.map(k=>p.profile?.[k]),...p.minutes,...p.minutes.map((m,k)=>index&&ref?m-ref.minutes[k]:index?'':0),JSON.stringify(p.segments)]);
    }
    U.download('lifestyle_track_comparison.csv',['person_or_path','alignment','aligned_value','year','age','msa_name','public_geography_code','coverage','type_of_day',...M.demographics,...M.activities.map(a=>a+'_minutes'),...M.activities.map(a=>a+'_difference_from_your_track_minutes'),'residence_segments_json'],rows);
  };
  $('track-comparison-share').onclick=async()=>{
    if(busy||primaryBusy)return;
    try{
      readEditor();const url=new URL(location.href);url.searchParams.set('t',btoa(JSON.stringify(window.LIFESTYLE_TRACK_APP.getState())));
      url.searchParams.set('c',encode({version:1,axis:axis(),peers:peers.map(p=>({name:p.name,state:p.state}))}));history.replaceState(null,'',url.href);
      try{await navigator.clipboard.writeText(url.href);}catch(e){const field=document.createElement('textarea');field.value=url.href;document.body.append(field);field.select();document.execCommand('copy');field.remove();}
      $('track-comparison-status').textContent='The comparison link is in the address bar and copied when allowed. It includes every path’s settings.';
    }catch(e){error(e);}
  };
  window.addEventListener('lifestyle-track-change',()=>{if(!busy)invalidate();});
  window.addEventListener('lifestyle-track-building',()=>{primaryBusy=true;syncButtons();if(!busy)invalidate();});
  window.addEventListener('lifestyle-track-ready',()=>{primaryBusy=false;syncButtons();if(!busy&&peers.length)invalidate();});
  window.addEventListener('lifestyle-reference-change',()=>{if(results&&!dirty)drawCharts();});
  window.LIFESTYLE_TRACK_COMPARISON={getState:()=>{readEditor();return {axis:axis(),peers:clone(peers)};},getResults:()=>results,isReady:()=>!!results&&!busy&&!dirty,add:(state,name)=>addPeer(state,name),run,inspect};
  try{
    const saved=new URL(location.href).searchParams.get('c');
    if(saved){const data=decode(saved);if(data.version!==1||!Array.isArray(data.peers)||data.peers.length>3)throw Error('Unsupported comparison link.');
      if(['year','age'].includes(data.axis))$('track-comparison-axis').value=data.axis;
      for(const p of data.peers){const s=p.state;if(!s||!Array.isArray(s.stages)||!s.stages.length||s.stages.length>10||s.stages.some(v=>!U.geo.has(v.geo)))throw Error('The saved comparison includes an unavailable stage.');addPeer(s,String(p.name||'Another path').slice(0,60));}
      $('track-comparison-status').textContent='Saved paths restored. Build the comparison to calculate their profiles.';
    }
  }catch(e){error(Error('The comparison link could not be restored. '+e.message));}
  syncButtons();
})();
