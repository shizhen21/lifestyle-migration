(function(global){
  'use strict';
  const model=global.LIFESTYLE_MODEL,msas=global.LIFESTYLE_MSAS||[],geo=new Map(msas.map(g=>[g.value,g]));
  const colors=['#71899a','#4c827c','#c2a67c','#bc7c6b','#a1a66d','#8fb1c2','#d9dcd8'];
  const names={sex:'Sex',education:'Education',race:'Race',hispanic_origin:'Hispanic / Latino origin',marital_status:'Marital status',family_income:'Annual family income (nominal USD)',immigration_status:'Nativity / citizenship',employment:'Employment',household_children:'Household children under 18'};
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:1});
  function demo(key,value='',id=''){return `<div class="field"><label for="${id}">${names[key]}</label><select id="${id}" data-demo="${key}"><option value="">Not specified</option>${model.options[key].map(o=>`<option value="${esc(o.value)}" ${o.value===value?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;}
  function places(value,id){return `<select id="${id}" class="msa-select">${msas.map(g=>`<option value="${g.value}" ${value===g.value?'selected':''}>${esc(g.label)}</option>`).join('')}</select>`;}
  function years(value,id){return `<select id="${id}">${model.years.map(y=>`<option value="${y}" ${y===value?'selected':''}>${y}</option>`).join('')}</select>`;}
  function composition(values){return `<div class="workflow-day" role="img" aria-label="${esc(values.map((m,k)=>model.activityLabels[k]+' '+number(m)+' minutes').join(', '))}">${values.map((m,k)=>`<span style="width:${m/1440*100}%;background:${colors[k]}" title="${esc(model.activityLabels[k])}: ${number(m)} min"><small>${m>190?Math.round(m)+'m':''}</small></span>`).join('')}</div>`;}
  function legend(){return model.activityLabels.map((l,k)=>`<span><i style="background:${colors[k]}"></i>${esc(l)}</span>`).join('');}
  function download(name,headers,rows){const csv='\ufeff'+[headers,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function compareLink(a,b,day='all'){const state={a,b,linked:false,day};return 'compare.html?s='+btoa(JSON.stringify(state));}
  async function copyLink(key,state){const url=new URL(location.href);url.searchParams.set(key,btoa(JSON.stringify(state)));history.replaceState(null,'',url.href);try{await navigator.clipboard.writeText(url.href);}catch(e){const t=document.createElement('textarea');t.value=url.href;document.body.append(t);t.select();document.execCommand('copy');t.remove();}return url.href;}
  function ageCharts(host,points,onSelect,references=[]){
    const W=360,H=230,L=43,R=13,T=20,B=36,min=points[0].year,max=points[points.length-1].year;
    host.innerHTML=model.activityLabels.slice(0,6).map((label,k)=>{
      const top=Math.max(1,...points.map(p=>p.minutes[k]),...references.flatMap(s=>s.points.map(p=>p.minutes[k]))),step=top>600?200:top>300?100:top>120?50:top>60?20:10,upper=Math.ceil(top*1.1/step)*step;
      const x=y=>L+(y-min)/Math.max(1,max-min)*(W-L-R),y=m=>H-B-m/upper*(H-T-B);let svg='';
      for(let tick=0;tick<=upper;tick+=step)svg+=`<line x1="${L}" x2="${W-R}" y1="${y(tick)}" y2="${y(tick)}" class="wf-grid"/><text x="${L-7}" y="${y(tick)+3}" text-anchor="end">${tick}</text>`;
      for(const tick of [...new Set([min,...[2010,2015,2020].filter(v=>v>min+1&&v<max-1),max])])svg+=`<text x="${x(tick)}" y="${H-15}" text-anchor="middle">${tick}</text>`;
      for(const reference of references){
        let d='';reference.points.forEach((p,i)=>d+=(i===0||p.year-reference.points[i-1].year>1?'M':'L')+x(p.year)+','+y(p.minutes[k])+' ');
        svg+=`<path class="profile-reference-line" data-reference="${reference.key}" d="${d}" fill="none" stroke="${reference.color}" stroke-width="2" stroke-dasharray="${reference.dash}"/>`;
        reference.points.forEach(p=>{const index=points.findIndex(v=>v.year===p.year);svg+=`<circle class="profile-reference-point" data-reference="${reference.key}" cx="${x(p.year)}" cy="${y(p.minutes[k])}" r="2.4" fill="white" stroke="${reference.color}" tabindex="0" role="button" data-index="${index}" aria-label="${reference.name}, ${p.year}, ${number(p.minutes[k])} minutes"><title>${reference.name} · ${p.year} · ${esc(p.referenceNote)}: ${number(p.minutes[k])} min</title></circle>`;});
      }
      let path='';points.forEach((p,i)=>path+=(i===0||p.year-points[i-1].year>1?'M':'L')+x(p.year)+','+y(p.minutes[k])+' ');
      svg+=`<path d="${path}" fill="none" stroke="${colors[k]}" stroke-width="2.7"/>`;
      points.forEach((p,i)=>{if(i&&(p.segments?p.segments.some((s,j)=>s.geo!==(j?p.segments[j-1].geo:points[i-1].segments?.at(-1)?.geo||points[i-1].geo)):p.geo!==points[i-1].geo))svg+=`<line x1="${x(p.year)}" x2="${x(p.year)}" y1="${T}" y2="${H-B}" stroke="#c8754380" stroke-dasharray="3 3"><title>Move to ${esc(p.label)} · ${p.year}</title></line>`;svg+=`<circle cx="${x(p.year)}" cy="${y(p.minutes[k])}" r="3.5" fill="${p.extrapolated?'white':colors[k]}" stroke="${colors[k]}" tabindex="0" role="button" data-index="${i}" aria-label="${p.year}, age ${p.age}, ${esc(p.label)}, ${number(p.minutes[k])} minutes"><title>${p.year} · age ${p.age} · ${esc(p.label)}: ${number(p.minutes[k])} min</title></circle>`;});
      return `<article class="wf-chart"><h3><i style="background:${colors[k]}"></i>${esc(label)}</h3><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(label)} across places and years, with selected population references"><text x="${L}" y="11">min / day</text>${svg}</svg></article>`;
    }).join('');
    host.querySelectorAll('circle[data-index]').forEach(c=>{const select=()=>onSelect(Number(c.dataset.index));c.addEventListener('click',select);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});
  }
  global.LifestyleUI={model,msas,geo,colors,names,esc,number,demo,places,years,composition,legend,download,compareLink,copyLink,ageCharts};
})(window);
