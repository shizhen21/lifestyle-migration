(function(){
  'use strict';
  const U=window.LifestyleUI,D=window.LIFESTYLE_PROFILE_REFERENCES,$=id=>document.getElementById(id);
  const spec=[{key:'national',name:'U.S. average (15+)',color:'#7b8589',dash:'7 4'},{key:'age',name:'Same age group',color:'#bd773c',dash:'3 4'},{key:'age_sex',name:'Same age group & sex',color:'#856a9b',dash:'9 3 2 3'}];
  const byKey=new Map(D.rows.map(r=>[[r.type,r.day,r.year,r.age_group||'',r.sex||''].join('|'),r]));
  const band=a=>a<18?'15–17':a<25?'18–24':a<35?'25–34':a<45?'35–44':a<55?'45–54':a<65?'55–64':a<75?'65–74':'75+';
  function selected(){return spec.filter(s=>$('profile-reference-'+s.key)?.checked);}
  function lookup(key,point,result,state){
    const age=key==='national'?'':band(point.age),sex=key==='age_sex'&&state.useDemographics!==false?state.common?.sex:'';
    if(key==='age_sex'&&!sex)return null;
    return byKey.get([key,result.day,point.year,age,sex||''].join('|'))||null;
  }
  function series(result,state){return selected().map(s=>({...s,isReference:true,points:result.points.map(p=>{const cell=lookup(s.key,p,result,state);return cell?{...p,minutes:cell.minutes,extrapolated:false,n:cell.n,effectiveN:cell.effective_n,referenceNote:(cell.age_group?'Ages '+cell.age_group+' · ':'')+(cell.sex?cell.sex+' · ':'')+cell.n.toLocaleString('en-US')+' diaries',referenceCell:cell}:null;}).filter(Boolean)})).filter(s=>s.points.length);}
  function legend(result,state){
    const host=$('profile-reference-legend');if(!host)return;
    host.innerHTML='<span><i style="background:var(--teal)"></i>Your modeled profile</span>'+series(result,state).map(s=>`<span><svg viewBox="0 0 32 12" aria-hidden="true"><path d="M0,6 L32,6" stroke="${s.color}" stroke-width="2.5" stroke-dasharray="${s.dash}"/></svg>${s.name}</span>`).join('');
    $('profile-reference-note').textContent='Reference lines are actual survey-weighted group averages for each year and the selected type of day. “Same age” means the age band shown below. Other demographics, places and the observed calendar can differ from your modeled profile.'+($('profile-reference-age_sex').checked&&(state.useDemographics===false||!state.common?.sex)?' Choose sex and enable demographics to show the age-and-sex line.':'');
  }
  function table(point,result,state){
    if(!point)return '<p class="wf-note">No original profile at this aligned point, so no main-profile reference is shown.</p>';
    const refs=selected().map(s=>({...s,cell:lookup(s.key,point,result,state)})).filter(s=>s.cell);
    if(!refs.length)return '';
    return `<div class="profile-reference-inspector"><p class="eyebrow">OBSERVED REFERENCE DAYS · ${point.year}</p><div class="profile-reference-cells">${refs.map(s=>`<span><b style="color:${s.color}">${s.name}</b><small>${s.cell.age_group?'Ages '+s.cell.age_group+' · ':''}${s.cell.sex?s.cell.sex+' · ':''}${s.cell.n.toLocaleString('en-US')} diaries · effective n ${Math.round(s.cell.effective_n).toLocaleString('en-US')}</small></span>`).join('')}</div><div class="wf-table-shell"><table class="profile-reference-table"><thead><tr><th>Activity · min / day</th><th>Your model</th>${refs.map(s=>`<th>${s.name}</th>`).join('')}</tr></thead><tbody>${U.model.activityLabels.map((label,k)=>`<tr><th>${U.esc(label)}</th><td>${U.number(point.minutes[k])}</td>${refs.map(s=>`<td>${U.number(s.cell.minutes[k])}<small>${point.minutes[k]-s.cell.minutes[k]>0?'+':''}${U.number(point.minutes[k]-s.cell.minutes[k])} your model − reference</small></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  for(const s of spec)$('profile-reference-'+s.key).addEventListener('change',()=>{
    const app=window.LIFESTYLE_TRACK_APP;if(app?.isReady())app.refreshCharts();window.dispatchEvent(new CustomEvent('lifestyle-reference-change'));
    const url=new URL(location.href);url.searchParams.set('refs',selected().map(s=>s.key).join(','));history.replaceState(null,'',url.href);
  });
  try{const params=new URL(location.href).searchParams;if(params.has('refs')){const active=params.get('refs').split(',');for(const s of spec)$('profile-reference-'+s.key).checked=active.includes(s.key);}}catch(e){}
  window.LifestyleReferences={series,legend,table,lookup,selected,band};
})();
