(function () {
  "use strict";
  const $ = id => document.getElementById(id), data = window.LIFESTYLE_PATTERNS;
  if (!data) { $("pattern-error").hidden=false; $("pattern-error").textContent="The pattern data could not load. Keep the assets folder beside these pages."; return; }
  const colors=["#71899a","#4c827c","#c2a67c","#bc7c6b","#a1a66d","#8fb1c2","#d9dcd8"];
  const seriesColors=["#247b78","#c87543","#647fa1","#b59251","#997a9c","#7b8b4d","#ad6662","#5e929e"];
  const escape=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clone=x=>JSON.parse(JSON.stringify(x));
  const geoIndex=new Map(data.geographies.map((g,i)=>[g.value,i]));
  const dims=new Map(data.dimensions.map((d,i)=>[d.value,{...d,index:i}]));
  const key=(g,y,d,l)=>((g*32+y-2005)*16+d)*64+l;
  const cells=new Map(data.cells.map(c=>[key(c[0],c[1],c[2],c[3]),c]));
  const boundaryMSAs=new Set((window.LIFESTYLE_MSAS||[]).map(g=>g.value));
  const defaults={geo:"national",start:2005,end:2025,focus:2025,activity:5,dimension:"all",groups:[0],ageYears:[2005,2015,2025],demoDimension:"sex",demoPeriod:"focus",mapPeriod:"focus",placeGroup:0,order:"name",filter:""};
  let state=clone(defaults), displayed={}, renderTimer, toastTimer;
  let metroMap=null,playTimer=null,ready=false,renderGeneration=0;
  const loadedChunks=new Set(data.loadedChunks||[]),pendingChunks=new Map();
  const mapGeometry=window.LIFESTYLE_MAP;
  function toast(message){clearTimeout(toastTimer);$("pattern-toast").textContent=message;$("pattern-toast").hidden=false;toastTimer=setTimeout(()=>$("pattern-toast").hidden=true,4000);}
  function validState(input){
    const s={...clone(defaults),...input};
    if(!geoIndex.has(s.geo)||(s.geo!=="national"&&!boundaryMSAs.has(s.geo))||!data.years.includes(s.start)||!data.years.includes(s.end)||s.start>s.end)throw Error("Invalid place or years");
    const years=data.years.filter(y=>y>=s.start&&y<=s.end);
    if(!years.includes(s.focus))s.focus=years[years.length-1];
    if(!Number.isInteger(s.activity)||s.activity<0||s.activity>5)throw Error("Invalid activity");
    if(!dims.has(s.dimension)||!dims.has(s.demoDimension)||["all","age_band"].includes(s.demoDimension))throw Error("Invalid dimension");
    const dim=dims.get(s.dimension);
    s.groups=[...new Set(s.groups)].filter(g=>Number.isInteger(g)&&g>=0&&g<dim.levels.length);
    if(!s.groups.length)s.groups=[0];
    if(!Number.isInteger(s.placeGroup)||s.placeGroup<0||s.placeGroup>=dim.levels.length)s.placeGroup=s.groups[0];
    s.ageYears=[...new Set(s.ageYears)].filter(y=>years.includes(y)).sort((a,b)=>a-b).slice(0,4);
    if(!s.ageYears.length)s.ageYears=[s.focus];
    if(!["focus","pooled"].includes(s.demoPeriod))s.demoPeriod="focus";
    if(!["focus","pooled"].includes(s.mapPeriod))s.mapPeriod="focus";
    if(!["name","high","low","sample"].includes(s.order))s.order="name";
    s.filter=String(s.filter||"");return s;
  }
  try{const saved=new URL(location.href).searchParams.get("p");if(saved)state=validState(JSON.parse(atob(saved)));}catch(error){state=clone(defaults);setTimeout(()=>toast("Saved choices could not be read. Showing the national view."),100);}
  function years(){return data.years.filter(y=>y>=state.start&&y<=state.end);}
  function geo(){return data.geographies[geoIndex.get(state.geo)];}
  function pooled(place,selectedYears,dimension="all",level=0){
    const gi=typeof place==="number"?place:geoIndex.get(place), di=dims.get(dimension).index;
    const rows=selectedYears.map(y=>cells.get(key(gi,y,di,level))).filter(Boolean);
    if(!rows.length)return null;
    const weight=rows.reduce((s,c)=>s+c[5],0),n=rows.reduce((s,c)=>s+c[4],0);
    const w2=rows.reduce((s,c)=>s+c[5]**2/c[6],0);
    return {minutes:Array.from({length:7},(_,k)=>rows.reduce((s,c)=>s+c[5]*c[7+k],0)/weight),n,neff:weight**2/w2,weight,years:rows.map(c=>c[1])};
  }
  function observed(place,year,dimension="all",level=0){return pooled(place,[year],dimension,level);}
  const pretty=x=>Number(x).toLocaleString("en-US",{maximumFractionDigits:1});
  function sample(x){return x?`${x.n.toLocaleString("en-US")} diaries${x.n<30?" · sparse sample":""}`:"No observations";}
  function addExport(panel,place,period,dimension,group,summary){
    if(!summary)return;
    displayed.rows.push({panel,place,period,dimension,group,diaries:summary.n,effectiveN:summary.neff,minutes:summary.minutes});
  }
  function options(select,values,current){select.innerHTML=values.map(v=>`<option value="${escape(v.value)}">${escape(v.label)}</option>`).join("");select.value=String(current);}
  function dimensionDefault(value){const d=dims.get(value);return value==="age_band"?[1,3,6]:d.levels.map((_,i)=>i);}
  function sync(){
    $("pattern-place-title").textContent=geo().label;
    if(document.activeElement!==$("pattern-place"))$("pattern-place").value=geo().label;
    $("year-start").value=state.start;$("year-end").value=state.end;
    options($("focus-year"),years().map(y=>({value:y,label:y})),state.focus);
    $("pattern-activity").value=state.activity;$("trend-dimension").value=state.dimension;
    $("demo-dimension").value=state.demoDimension;$("demo-period").value=state.demoPeriod;
    syncMapControls();
    $("metro-order").value=state.order;$("metro-filter").value=state.filter;
    const dim=dims.get(state.dimension);
    $("trend-groups").innerHTML='<legend class="sr-only">Groups shown in annual trends</legend>'+dim.levels.map((label,i)=>`<label><input type="checkbox" value="${i}" ${state.groups.includes(i)?"checked":""}><i class="series-swatch" style="background:${seriesColors[i%8]}"></i>${escape(label)}</label>`).join("");
    $("trend-groups").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
      const selected=[...$("trend-groups").querySelectorAll("input:checked")].map(e=>Number(e.value));
      if(!selected.length){input.checked=true;toast("Keep at least one group selected.");return;}
      state.groups=selected;schedule();
    }));
    $("age-years").innerHTML='<legend class="sr-only">Years shown in age profiles</legend>'+years().map(y=>`<label><input type="checkbox" value="${y}" ${state.ageYears.includes(y)?"checked":""}>${y}${state.ageYears.includes(y)?`<i class="series-swatch" style="background:${seriesColors[state.ageYears.indexOf(y)]}"></i>`:""}</label>`).join("");
    $("age-years").querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
      const selected=[...$("age-years").querySelectorAll("input:checked")].map(e=>Number(e.value));
      if(!selected.length||selected.length>4){input.checked=!input.checked;toast("Select between one and four years.");return;}
      state.ageYears=selected;sync();schedule();
    }));
    options($("place-group"),dim.levels.map((label,i)=>({value:i,label})),state.placeGroup);
  }
  function setupPlace(){
    const input=$("pattern-place"),list=$("pattern-places");let active=-1;
    const ordered=data.geographies.filter(g=>g.value==="national"||boundaryMSAs.has(g.value)).sort((a,b)=>a.value==="national"?-1:b.value==="national"?1:a.label.localeCompare(b.label));
    function close(){list.hidden=true;input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");input.value=geo().label;}
    function populate(query=""){
      const search=query.toLowerCase().trim();
      const matches=ordered.filter(g=>g.label.toLowerCase().includes(search)||g.value.toLowerCase().includes(search)).slice(0,60);
      list.replaceChildren();active=-1;
      for(const [i,g] of matches.entries()){
        const button=document.createElement("button");button.type="button";button.id="pattern-geo-option-"+i;button.setAttribute("role","option");button.setAttribute("aria-selected","false");
        button.innerHTML=`<span>${escape(g.label)}</span><small>${g.diaries.toLocaleString("en-US")} diaries · ${g.firstYear}–${g.lastYear}</small>`;
        button.addEventListener("mousedown",event=>event.preventDefault());
        button.addEventListener("click",()=>{state.geo=g.value;close();sync();schedule();});list.append(button);
      }
      if(!matches.length)list.innerHTML='<div class="no-result">No match. Try an MSA name.</div>';
      list.hidden=false;input.setAttribute("aria-expanded","true");
    }
    input.addEventListener("focus",()=>{input.select();populate();});input.addEventListener("input",()=>populate(input.value));
    input.addEventListener("blur",()=>setTimeout(close,150));
    input.addEventListener("keydown",event=>{
      if(event.key==="Escape"){close();return;}
      if(["ArrowDown","ArrowUp"].includes(event.key)){
        event.preventDefault();if(list.hidden)populate(input.value);const buttons=[...list.querySelectorAll("button")];if(!buttons.length)return;
        active=(active+(event.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length;
        buttons.forEach((b,i)=>{b.dataset.active=String(i===active);b.setAttribute("aria-selected",String(i===active));});
        input.setAttribute("aria-activedescendant",buttons[active].id);buttons[active].scrollIntoView({block:"nearest"});
      }
      if(event.key==="Enter"){event.preventDefault();const buttons=[...list.querySelectorAll("button")];if(buttons.length)buttons[active<0?0:active].click();}
    });
    document.addEventListener("pointerdown",event=>{if(!input.parentElement.contains(event.target))close();});
  }
  function chart(container,series,xs,k,age=false){
    const valid=series.flatMap(s=>s.points.filter(Boolean).map(p=>p.minutes[k]));
    if(!valid.length){container.innerHTML='<div class="empty-chart">No observations for this selection.</div>';return;}
    const W=360,H=210,L=43,R=12,T=22,B=31;
    const maximum=Math.max(1,...valid),step=maximum>600?200:maximum>300?100:maximum>120?50:maximum>60?20:maximum>30?10:5;
    const ymax=Math.ceil(maximum*1.12/step)*step;
    const x=v=>L+(age?v/(xs.length-1):(v-state.start)/Math.max(1,state.end-state.start))*(W-L-R);
    const y=v=>H-B-v/ymax*(H-T-B);
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(data.activityLabels[k])}, ${age?"by age group":"by survey year"}, minutes per day"><text class="chart-axis" x="${L}" y="11">min / day</text>`;
    for(let tick=0;tick<=ymax;tick+=step){const py=y(tick);svg+=`<line class="chart-grid" x1="${L}" x2="${W-R}" y1="${py}" y2="${py}"/><text class="chart-axis" x="${L-7}" y="${py+3}" text-anchor="end">${tick}</text>`;}
    if(age){xs.forEach((label,i)=>{svg+=`<text class="chart-axis" x="${x(i)}" y="${H-11}" text-anchor="middle" style="font-size:9px">${escape(label)}</text>`;});}
    else{
      const ticks=state.start===state.end?[state.start]:[state.start,...[2010,2015,2020].filter(v=>v>state.start&&v<state.end),state.end];
      const kept=ticks.filter((v,i)=>i===0||v-ticks[i-1]>=2||i===ticks.length-1&&v-ticks[i-1]>=2);
      if(kept[kept.length-1]!==state.end&&state.end-kept[kept.length-1]>=2)kept.push(state.end);
      for(const tick of kept)svg+=`<text class="chart-axis" x="${x(tick)}" y="${H-11}" text-anchor="middle">${tick}</text>`;
    }
    series.forEach(s=>{
      let path="",previous=null;
      s.points.forEach((p,i)=>{
        if(!p){previous=null;return;}
        const xv=age?i:xs[i],gap=!age&&previous!==null&&xv-previous>1;
        path+=(previous===null||gap?"M":"L")+x(xv).toFixed(2)+","+y(p.minutes[k]).toFixed(2)+" ";previous=xv;
      });
      svg+=`<path class="chart-line" stroke="${s.color}" d="${path}"/>`;
      s.points.forEach((p,i)=>{
        if(!p)return;const title=`${s.label} · ${xs[i]}${age?" years":""}: ${pretty(p.minutes[k])} min/day · ${sample(p)}`;
        svg+=`<circle class="chart-point" cx="${x(age?i:xs[i])}" cy="${y(p.minutes[k])}" r="${p.n<30?3.6:2.8}" stroke="${s.color}" stroke-width="1.6" fill="${p.n<30?"white":s.color}" tabindex="0" data-point-index="${i}" role="button" aria-label="${escape(title+". Activate to select this year and activity.")}"><title>${escape(title)}</title></circle>`;
      });
    });
    container.innerHTML=svg+'</svg>';
    for(const point of container.querySelectorAll('.chart-point')){
      const i=Number(point.dataset.pointIndex);
      if(!age)point.setAttribute('aria-pressed',String(Number(xs[i])===state.focus));
      const activate=()=>{
        stopPlayback();state.activity=k;
        if(age){state.focus=Number(series.find(s=>s.points[i]&&s.color===point.getAttribute('stroke')).label);state.dimension="age_band";state.groups=[i];state.placeGroup=i;}
        else state.focus=Number(xs[i]);
        state.mapPeriod="focus";sync();schedule();
      };
      point.addEventListener('click',activate);
      point.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
    }
  }
  function renderCharts(target,series,xs,age=false){
    $(target).innerHTML=data.activityLabels.slice(0,6).map((label,k)=>`<article class="mini-chart ${state.activity===k?"focused":""}"><h3><i style="background:${colors[k]}"></i>${escape(label)}</h3><div id="${target}-${k}"></div></article>`).join("");
    for(let k=0;k<6;k++)chart($(target+"-"+k),series,xs,k,age);
  }
  function stopPlayback(){
    if(playTimer!==null)clearInterval(playTimer);playTimer=null;
    const button=$("map-play");if(button){button.textContent="Play years ▶";button.setAttribute("aria-pressed","false");}
  }
  function syncMapControls(){
    if(!$("map-dimension"))return;
    options($("map-dimension"),data.dimensions.map(d=>({value:d.value,label:d.label})),state.dimension);
    options($("map-group"),dims.get(state.dimension).levels.map((label,i)=>({value:i,label})),state.placeGroup);
    $("map-period").value=state.mapPeriod;
    const ys=years(),index=ys.indexOf(state.focus),pooled=state.mapPeriod==="pooled";
    $("map-year").min=0;$("map-year").max=ys.length-1;$("map-year").value=index;
    $("map-year").setAttribute("aria-valuetext",String(state.focus));$("map-year").disabled=pooled;
    $("map-prev").disabled=pooled||index===0;$("map-next").disabled=pooled||index===ys.length-1;$("map-play").disabled=pooled||ys.length<2;
    $("map-year-label").textContent=pooled?`${state.start}–${state.end}`:state.focus;
  }
  function setMapYear(year){state.focus=year;state.mapPeriod="focus";sync();schedule();}
  function setupMap(){
    if(!mapGeometry||!window.LifestyleMetroMap)throw Error("Map files could not load. Keep map-data.js and metro-map.js in assets.");
    metroMap=new window.LifestyleMetroMap($("metro-map"),mapGeometry,value=>{state.geo=value;sync();schedule();});
    $("map-dimension").addEventListener("change",e=>{state.dimension=e.target.value;state.groups=dimensionDefault(state.dimension);state.placeGroup=state.groups[0];sync();schedule();});
    $("map-group").addEventListener("change",e=>{state.placeGroup=Number(e.target.value);sync();schedule();});
    $("map-period").addEventListener("change",e=>{stopPlayback();state.mapPeriod=e.target.value;sync();schedule();});
    $("map-national").addEventListener("click",()=>{state.geo="national";sync();schedule();});
    $("map-year").addEventListener("input",e=>{stopPlayback();setMapYear(years()[Number(e.target.value)]);});
    $("map-prev").addEventListener("click",()=>{stopPlayback();const ys=years(),i=ys.indexOf(state.focus);if(i>0)setMapYear(ys[i-1]);});
    $("map-next").addEventListener("click",()=>{stopPlayback();const ys=years(),i=ys.indexOf(state.focus);if(i<ys.length-1)setMapYear(ys[i+1]);});
    $("map-play").addEventListener("click",()=>{
      if(playTimer!==null){stopPlayback();return;}
      const ys=years();if(state.focus===ys[ys.length-1])setMapYear(ys[0]);
      $("map-play").textContent="Pause years ❚❚";$("map-play").setAttribute("aria-pressed","true");
      playTimer=setInterval(()=>{const available=years(),i=available.indexOf(state.focus);if(i<available.length-1)setMapYear(available[i+1]);else stopPlayback();},1100);
    });
    $("map-zoom-in").addEventListener("click",()=>metroMap.setZoom(metroMap.zoom*1.5));
    $("map-zoom-out").addEventListener("click",()=>metroMap.setZoom(metroMap.zoom/1.5));
    $("map-reset").addEventListener("click",()=>metroMap.reset());
    document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPlayback();});
  }
  function renderMap(){
    const dim=dims.get(state.dimension),group=dim.levels[state.placeGroup],ys=state.mapPeriod==="focus"?[state.focus]:years();
    const period=state.mapPeriod==="focus"?String(state.focus):`${state.start}–${state.end}, pooled`;
    const values=new Map(),scaleValues=[];
    for(const polygon of mapGeometry.metros){
      const summary=pooled(polygon.value,ys,state.dimension,state.placeGroup);
      values.set(polygon.value,{label:polygon.label,summary,minutes:summary?summary.minutes[state.activity]:null,period,group});
      for(const year of years()){
        const cell=cells.get(key(geoIndex.get(polygon.value),year,dim.index,state.placeGroup));if(cell)scaleValues.push(cell[7+state.activity]);
      }
      addExport("Map snapshot",polygon.value,ys.join(";"),state.dimension,group,summary);
    }
    scaleValues.sort((a,b)=>a-b);
    const low=scaleValues.length?scaleValues[Math.floor((scaleValues.length-1)*.05)]:0;
    const high=scaleValues.length?scaleValues[Math.floor((scaleValues.length-1)*.95)]:1;
    metroMap.update(values,state.geo,low,high);
    $("map-low").textContent=pretty(low);$("map-high").textContent=pretty(high);
    $("map-scale-note").textContent=`${data.activityLabels[state.activity]} · ${group}. Color scale is fixed across selected years; values beyond the displayed limits use the endpoint color.`;
    const observedCount=[...values.values()].filter(v=>v.summary).length;
    $("map-coverage").textContent=`${period} · ${observedCount} of 300 mapped MSAs have observations for this population. Gray = no observations; dashed boundary = fewer than 30 diaries. Regions are selected by their MSA names and actual boundaries.`;
    const selected=pooled(state.geo,ys,state.dimension,state.placeGroup),g=geo(),mapped=metroMap.paths.has(state.geo);
    const details=selected?selected.minutes.slice(0,6).map((m,k)=>`<div class="map-detail-row ${k===state.activity?"active":""}"><div><span>${escape(data.activityLabels[k])}</span><strong>${pretty(m)} min</strong></div><div class="map-detail-track"><i style="background:${colors[k]};width:${m/1440*100}%"></i></div></div>`).join(""):'<p class="map-detail-note">No observations for this place, year and population group. Try another year or pool the selected years.</p>';
    $("map-details").innerHTML=`<p class="eyebrow">${state.geo==="national"?"NATIONAL REFERENCE":"SELECTED METRO"}</p><h3>${escape(g.label)}</h3><p class="map-detail-period">${period}</p><p class="map-detail-sample">${escape(group)}<br>${selected?sample(selected):"No observations"}</p>${details}${state.geo!=="national"&&!mapped?'<p class="map-detail-note">This historical code has no matching reference polygon. Its observations remain available in the charts.</p>':""}<a href="#over-time">See this place over time ↓</a>`;
    syncMapControls();
    displayed.map={period,year:state.focus,dimension:state.dimension,group,selected:state.geo,observedMappedCodes:observedCount,selectedSummary:selected,low,high};
  }
  function renderOverview(){
    const summary=pooled(state.geo,years()),g=geo();
    const dim=dims.get(state.dimension),first=observed(state.geo,state.start,state.dimension,state.placeGroup),last=observed(state.geo,state.end,state.dimension,state.placeGroup);
    $("pattern-coverage").textContent=`${summary?sample(summary):"No observations in selected years"} · selected ${state.start}–${state.end}. ${g.value==="national"?"All respondents are retained, including undisclosed geography.":`This public code is observed in ${g.firstYear}–${g.lastYear}.`}`;
    $("pattern-coverage").classList.toggle("sparse",!summary||summary.n<30||state.start<g.firstYear||state.end>g.lastYear);
    const selected=last||pooled(state.geo,years(),state.dimension,state.placeGroup);
    const change=first&&last?last.minutes[state.activity]-first.minutes[state.activity]:null;
    $("pattern-kpis").innerHTML=`<article class="pattern-kpi"><p>Diaries in selected years</p><strong>${summary?summary.n.toLocaleString("en-US"):"—"}</strong><span class="kpi-change">${state.start}–${state.end} · ${summary?summary.years.length:0} observed years</span></article><article class="pattern-kpi"><p>${escape(data.activityLabels[state.activity])} · ${last?state.end:"pooled years"}</p><strong>${selected?pretty(selected.minutes[state.activity]):"—"}<small> min / day</small></strong><span class="kpi-change">${escape(dim.levels[state.placeGroup])}</span></article><article class="pattern-kpi"><p>${escape(data.activityLabels[state.activity])} · change</p><strong>${change===null?"—":(change>0?"+":"")+pretty(change)}<small>${change===null?"":" min / day"}</small></strong><span class="kpi-change">${state.start} → ${state.end} · ${change===null?"endpoint observations missing":"observed means"}</span></article>`;
  }
  function renderTime(){
    const dim=dims.get(state.dimension),ys=years();
    const series=state.groups.map(level=>({label:dim.levels[level],color:seriesColors[level%8],points:ys.map(y=>observed(state.geo,y,state.dimension,level))}));
    $("time-caption").textContent=`${geo().label} · ${state.start}–${state.end} · ${dim.label.toLowerCase()} comparisons. Click a point to select its year and activity on the map; hover for minutes and diary counts.`;
    renderCharts("time-charts",series,ys);
    series.forEach(s=>s.points.forEach((p,i)=>addExport("Annual trend",state.geo,String(ys[i]),state.dimension,s.label,p)));
    displayed.time=series;
  }
  function renderAge(){
    const age=dims.get("age_band");
    const series=state.ageYears.map((year,i)=>({label:String(year),color:seriesColors[i],points:age.levels.map((_,level)=>observed(state.geo,year,"age_band",level))}));
    $("age-caption").textContent=`${geo().label} · compare ${state.ageYears.join(", ")} · all other demographic groups included.`;
    renderCharts("age-charts",series,age.levels,true);
    series.forEach(s=>s.points.forEach((p,i)=>addExport("Age profile",state.geo,s.label,"age_band",age.levels[i],p)));
    displayed.age=series;
  }
  function renderDemographics(){
    const dim=dims.get(state.demoDimension),ys=state.demoPeriod==="focus"?[state.focus]:years();
    $("demographic-caption").textContent=`${geo().label} · ${state.demoPeriod==="focus"?state.focus:`${state.start}–${state.end}, pooled`} · all ${dim.label.toLowerCase()} groups.`;
    $("profile-activity-label").textContent=data.activityLabels[state.activity];
    const profiles=dim.levels.map((label,level)=>({label,summary:pooled(state.geo,ys,state.demoDimension,level)}));
    $("demographic-profiles").innerHTML=profiles.map(({label,summary:p})=>{
      if(!p)return `<div class="demographic-profile"><div class="demographic-label">${escape(label)}<small>No observations</small></div><div class="no-observations">No observations for this selection</div><div class="demographic-value">—</div></div>`;
      const segments=p.minutes.map((m,k)=>`<div class="day-segment" style="width:${m/1440*100}%;background:${colors[k]}" title="${escape(data.activityLabels[k])}: ${pretty(m)} min/day"><span>${m/1440>.14?Math.round(m)+"m":""}</span></div>`).join("");
      return `<div class="demographic-profile"><div class="demographic-label">${escape(label)}<small class="${p.n<30?"sparse-label":""}">${sample(p)}</small></div><div class="day-bar" role="img" aria-label="${escape(label+': '+p.minutes.map((m,k)=>data.activityLabels[k]+' '+pretty(m)+' minutes').join(', '))}">${segments}</div><div class="demographic-value">${pretty(p.minutes[state.activity])}<small>min / day · ${escape(data.activityLabels[state.activity])}</small></div></div>`;
    }).join("");
    profiles.forEach(p=>addExport("Demographic comparison",state.geo,ys.join(";"),state.demoDimension,p.label,p.summary));displayed.demographics=profiles;
  }
  function renderPlaces(){
    const dim=dims.get(state.dimension),group=dim.levels[state.placeGroup],ys=years();
    const rows=data.geographies.map((g,i)=>({...g,summary:pooled(i,ys,state.dimension,state.placeGroup)})).filter(g=>boundaryMSAs.has(g.value));
    const national=pooled("national",ys,state.dimension,state.placeGroup),activity=data.activityLabels[state.activity];
    $("place-caption").textContent=`${activity} · ${state.start}–${state.end}, pooled · ${group}. The national reference uses the same population group and years.`;
    $("national-reference").innerHTML=national?`United States · <b>${pretty(national.minutes[state.activity])} minutes / day</b> in ${escape(activity.toLowerCase())} · ${sample(national)}`:"No national observations for this group and period.";
    const maximum=Math.max(1,...rows.filter(g=>g.summary).map(g=>g.summary.minutes[state.activity]));
    const filtered=rows.filter(g=>(g.label+" "+g.value).toLowerCase().includes(state.filter.toLowerCase()));
    filtered.sort((a,b)=>{
      if(!a.summary!==!b.summary)return a.summary?-1:1;
      if(state.order==="name")return a.label.localeCompare(b.label);
      if(!a.summary||!b.summary)return a.label.localeCompare(b.label);
      return state.order==="sample"?b.summary.n-a.summary.n:state.order==="high"?b.summary.minutes[state.activity]-a.summary.minutes[state.activity]:a.summary.minutes[state.activity]-b.summary.minutes[state.activity];
    });
    const actual=rows.filter(g=>g.value.startsWith("MSA_")&&g.summary).length;
    $("metro-count").textContent=`${actual} of 300 MSAs with mapped boundaries have observations in this selection. ${filtered.length} MSAs shown. Click any row to explore it.`;
    $("metro-list").innerHTML=filtered.map(g=>{
      const p=g.summary;
      return `<button type="button" class="metro-row ${g.value===state.geo?"selected":""} ${!p?"missing":p.n<30?"sparse":""}" data-geo="${escape(g.value)}" aria-label="${escape(g.label)}: ${p?pretty(p.minutes[state.activity])+" minutes per day, "+sample(p):"no observations in selected years"}"><span class="metro-name">${escape(g.label)}<small>Observed ${g.firstYear}–${g.lastYear}</small></span><span class="metro-track"><i class="metro-fill" style="width:${p?p.minutes[state.activity]/maximum*100:0}%;background:${colors[state.activity]}"></i></span><span class="metro-value">${p?pretty(p.minutes[state.activity])+" min":"—"}<small class="${p&&p.n<30?"sparse-label":""}">${p?sample(p):"No observations"}</small></span></button>`;
    }).join("")||'<div class="no-observations">No matching MSA name.</div>';
    $("metro-list").querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{state.geo=button.dataset.geo;sync();schedule();}));
    filtered.forEach(g=>addExport("Place comparison",g.value,ys.join(";"),state.dimension,group,g.summary));
    displayed.places=rows;displayed.national=national;
  }
  function loadChunk(chunk){
    if(loadedChunks.has(chunk))return Promise.resolve();
    if(pendingChunks.has(chunk))return pendingChunks.get(chunk);
    const file=data.chunkFiles?.[chunk];if(!file)return Promise.resolve();
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src=file+"?v=20261119-v5-1";script.async=true;
      script.onload=()=>{
        const rows=window.LIFESTYLE_PATTERN_CHUNKS?.[chunk];
        if(!rows){reject(Error("The selected data did not load completely. Reload this page."));return;}
        for(const cell of rows)cells.set(key(cell[0],cell[1],cell[2],cell[3]),cell);
        loadedChunks.add(chunk);delete window.LIFESTYLE_PATTERN_CHUNKS[chunk];resolve();
      };
      script.onerror=()=>reject(Error("Could not load the selected MSA or population data. Please reload."));
      document.head.append(script);
    });
    pendingChunks.set(chunk,promise);promise.catch(()=>pendingChunks.delete(chunk));return promise;
  }
  async function render(){
    const generation=++renderGeneration;ready=false;$("pattern-download").disabled=true;
    const loading=$("pattern-loading");if(loading){loading.hidden=false;loading.textContent="Loading observed patterns for "+geo().label+"…";}
    try{
      await Promise.all([loadChunk("geo:"+geoIndex.get(state.geo)),loadChunk("dimension:"+dims.get(state.dimension).index)]);
      if(generation!==renderGeneration)return false;
      displayed={rows:[]};renderOverview();renderMap();renderTime();renderAge();renderDemographics();renderPlaces();$("pattern-error").hidden=true;
      ready=true;$("pattern-download").disabled=false;if(loading)loading.hidden=true;return true;
    }catch(error){$("pattern-error").textContent=error.message;$("pattern-error").hidden=false;if(loading)loading.hidden=true;return false;}
  }
  function schedule(){clearTimeout(renderTimer);ready=false;$("pattern-download").disabled=true;renderTimer=setTimeout(render,35);}
  for(const id of ["year-start","year-end"]){options($(id),data.years.map(y=>({value:y,label:y})),id==="year-start"?state.start:state.end);}
  options($("pattern-activity"),data.activityLabels.slice(0,6).map((label,i)=>({value:i,label})),state.activity);
  options($("trend-dimension"),data.dimensions.map(d=>({value:d.value,label:d.label})),state.dimension);
  options($("demo-dimension"),data.dimensions.filter(d=>!["all","age_band"].includes(d.value)).map(d=>({value:d.value,label:d.label})),state.demoDimension);
  $("pattern-legend").innerHTML=data.activityLabels.map((label,k)=>`<span><i class="legend-dot" style="background:${colors[k]}"></i>${escape(label)}</span>`).join("");
  $("year-start").addEventListener("change",e=>{state.start=Number(e.target.value);if(state.start>state.end)state.end=state.start;state=validState(state);sync();schedule();});
  $("year-end").addEventListener("change",e=>{state.end=Number(e.target.value);if(state.end<state.start)state.start=state.end;state=validState(state);sync();schedule();});
  $("focus-year").addEventListener("change",e=>{state.focus=Number(e.target.value);schedule();});
  $("pattern-activity").addEventListener("change",e=>{state.activity=Number(e.target.value);schedule();});
  $("trend-dimension").addEventListener("change",e=>{state.dimension=e.target.value;state.groups=dimensionDefault(state.dimension);state.placeGroup=state.groups[0];sync();schedule();});
  $("demo-dimension").addEventListener("change",e=>{state.demoDimension=e.target.value;schedule();});
  $("demo-period").addEventListener("change",e=>{state.demoPeriod=e.target.value;schedule();});
  $("place-group").addEventListener("change",e=>{state.placeGroup=Number(e.target.value);schedule();});
  $("metro-filter").addEventListener("input",e=>{state.filter=e.target.value;schedule();});
  $("metro-order").addEventListener("change",e=>{state.order=e.target.value;schedule();});
  $("reset-patterns").addEventListener("click",()=>{stopPlayback();state=clone(defaults);sync();schedule();});
  $("pattern-download").addEventListener("click",()=>{
    const header=["panel","public_geography_code","years","dimension","group","diaries","weighting_effective_n",...data.activities.map(a=>a+"_minutes")];
    const rows=displayed.rows.map(r=>[r.panel,r.place,r.period,r.dimension,r.group,r.diaries,r.effectiveN.toFixed(4),...r.minutes.map(m=>m.toFixed(4))]);
    const csv="\ufeff"+[header,...rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`lifestyle_patterns_${state.start}_${state.end}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $("pattern-share").addEventListener("click",async()=>{
    const url=new URL(location.href);url.searchParams.set("p",btoa(JSON.stringify(state)));history.replaceState(null,"",url.href);
    try{await navigator.clipboard.writeText(url.href);toast("View link copied.");}
    catch(error){const field=document.createElement("textarea");field.value=url.href;document.body.append(field);field.select();const copied=document.execCommand("copy");field.remove();toast(copied?"View link copied.":"Use the view link in the address bar.");}
  });
  window.LIFESTYLE_PATTERN_APP={getState:()=>clone(state),getData:()=>clone(displayed),isReady:()=>ready,pooled,
    ensurePlace:value=>loadChunk("geo:"+geoIndex.get(value)),
    setState:patch=>{state=validState({...state,...patch});sync();return render();}};
  setupPlace();setupMap();sync();render();
})();
