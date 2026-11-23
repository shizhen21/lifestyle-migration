(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const model = window.LIFESTYLE_MODEL;
  if (!model || !window.LifestylePredictor) {
    $("error").textContent = "The model could not load. Keep the assets folder beside these pages.";
    $("error").hidden = false;
    $("loading").hidden = true;
    return;
  }
  const predictor = new window.LifestylePredictor(model);
  const colors = ["#71899a", "#4c827c", "#c2a67c", "#bc7c6b", "#a1a66d", "#8fb1c2", "#d9dcd8"];
  const names = {sex:"Sex",education:"Education",race:"Race",hispanic_origin:"Hispanic / Latino origin",marital_status:"Marital status",
    family_income:"Annual family income (nominal USD)",immigration_status:"Nativity / citizenship",employment:"Employment",household_children:"Household children under 18"};
  const clone = x => JSON.parse(JSON.stringify(x));
  const escape = text => String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const blank = { sex:"Male", education:null, race:null, hispanic_origin:null, marital_status:null,
    family_income:null, immigration_status:null, employment:null, household_children:null,
    model_geography:"MSA_14460" };
  const defaults = { a:{...blank,year:2015,age:25}, b:{...blank,year:2025,age:35}, linked:true, day:"all" };
  let state = clone(defaults), last = null, updateTimer = null, toastTimer = null;
  const boundaryMSAs=new Set((window.LIFESTYLE_MSAS||[]).map(g=>g.value));
  const selectableGeographies=model.geographies.filter(g=>boundaryMSAs.has(g.value));
  const geoByValue = new Map(selectableGeographies.map(x => [x.value,x]));
  const geoShort = value => value ? (geoByValue.get(value)?.label || value) : "United States (no place specified)";
  const priorities = ["MSA_14460","MSA_35620","MSA_31080","MSA_39580","MSA_47900","MSA_41860","MSA_16980","MSA_42660"];
  const geographies = [{value:null,label:"United States (no place specified)",diaries:model.diaries},
    ...[...selectableGeographies].sort((a,b) => {
      const pa = priorities.includes(a.value) ? priorities.indexOf(a.value) : 99;
      const pb = priorities.includes(b.value) ? priorities.indexOf(b.value) : 99;
      return pa-pb || a.label.localeCompare(b.label);
    })];
  function toast(message) {
    clearTimeout(toastTimer); $("toast").textContent=message; $("toast").hidden=false;
    toastTimer=setTimeout(()=>$("toast").hidden=true,4200);
  }
  function cleanProfile(input) {
    const output={year:Number(input.year),age:input.age===null || input.age==="" ? null:Number(input.age)};
    for(const key of [...model.demographics,"model_geography"]) output[key]=input[key] || null;
    predictor.validate(output); if(output.model_geography&&!boundaryMSAs.has(output.model_geography))throw Error("Choose an MSA with a mapped boundary."); return output;
  }
  try {
    const encoded=new URL(location.href).searchParams.get("s");
    const saved=encoded ? JSON.parse(atob(encoded)) : null;
    if(saved) state={a:cleanProfile(saved.a),b:cleanProfile(saved.b),linked:!!saved.linked,day:saved.day || "all"};
    if(!["all","weekday","weekend"].includes(state.day)) state.day="all";
    if(state.linked && (state.a.age===null || state.b.age===null || state.a.year-state.a.age!==state.b.year-state.b.age)) state.linked=false;
  } catch(error) { state=clone(defaults); setTimeout(()=>toast("The saved choices could not be read. The default comparison has been restored."),100); }
  function demographicSelect(side,key) {
    const options=[`<option value="">Not specified</option>`,...model.options[key].map(o=>`<option value="${escape(o.value)}">${escape(o.label)}</option>`)];
    return `<div class="field"><label for="${side}-${key}">${names[key]}</label><select id="${side}-${key}" data-side="${side}" data-field="${key}">${options.join("")}</select></div>`;
  }
  function createCard(side) {
    const card=$("scenario-"+side), letter=side.toUpperCase();
    card.innerHTML=`<div class="scenario-header"><div class="scenario-title"><span class="scenario-letter">${letter}</span><div><h2>Scenario ${letter}</h2><p class="scenario-meta" id="${side}-meta"></p></div></div><span class="scenario-date" id="${side}-date"></span></div><div class="fields"><div class="field"><label for="${side}-year">Year</label><select id="${side}-year" data-side="${side}" data-field="year">${model.years.map(y=>`<option value="${y}">${y}</option>`).join("")}</select></div><div class="field"><label for="${side}-age">Age</label><select id="${side}-age" data-side="${side}" data-field="age"><option value="">Not specified</option>${Array.from({length:71},(_,i)=>i+15).map(a=>`<option value="${a}">${a===85?"85 years and older":a+" years"}</option>`).join("")}</select></div><div class="field field-wide"><label for="${side}-city">Metro area (MSA) <span class="more-count">Search MSA name</span></label><div class="city-wrap"><input id="${side}-city" type="search" role="combobox" aria-autocomplete="list" aria-controls="${side}-cities" aria-expanded="false" autocomplete="off" placeholder="United States, Boston, or another MSA…"><div id="${side}-cities" class="city-results" role="listbox" hidden></div></div></div>${demographicSelect(side,"sex")}${demographicSelect(side,"employment")}</div><p class="geo-coverage" id="${side}-coverage"></p><details class="more" id="${side}-more"><summary><span>More demographics <span class="more-count" id="${side}-more-count"></span></span></summary><div class="fields">${model.demographics.filter(x=>x!=="sex" && x!=="employment").map(x=>demographicSelect(side,x)).join("")}</div></details>`;
    card.querySelectorAll("select[data-field]").forEach(element=>element.addEventListener("change",()=>change(side,element.dataset.field,element.value)));
    setupCity(side);
  }
  function setupCity(side) {
    const input=$(side+"-city"), list=$(side+"-cities"); let active=-1;
    function close(restore=true) {list.hidden=true;input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");if(restore) input.value=geoShort(state[side].model_geography);}
    function choose(value) {state[side].model_geography=value;close();sync();schedule();}
    function highlight() {
      const buttons=[...list.querySelectorAll("button")];
      buttons.forEach((button,i)=>{button.dataset.active=String(i===active);button.setAttribute("aria-selected",String(i===active));});
      if(buttons[active]) {input.setAttribute("aria-activedescendant",buttons[active].id);buttons[active].scrollIntoView({block:"nearest"});}
    }
    function populate() {
      const query=input.value.trim().toLowerCase();
      const results=geographies.filter(g=>!query || g.label.toLowerCase().includes(query) || (g.value || "").toLowerCase().includes(query)).slice(0,35);
      list.replaceChildren();active=-1;const hint=document.createElement("div");hint.className="city-result-hint";hint.textContent=query?`${results.length} matching MSAs · choose a name`:"Type a city or state name to search 300 mapped MSAs";list.append(hint);
      for(const [i,g] of results.entries()) {
        const button=document.createElement("button");button.type="button";button.id=`${side}-city-option-${i}`;button.setAttribute("role","option");button.setAttribute("aria-selected","false");
        const label=document.createElement("span");label.textContent=g.label;button.append(label);
        if(g.value) {const small=document.createElement("small");small.textContent=`${g.diaries.toLocaleString()} diaries, pooled`;button.append(small);}
        button.addEventListener("mousedown",e=>e.preventDefault());button.addEventListener("click",()=>choose(g.value));list.append(button);
      }
      if(!results.length) {const p=document.createElement("div");p.className="no-result";p.textContent="No match. Try an MSA name.";list.append(p);}
      list.hidden=false;input.setAttribute("aria-expanded","true");
    }
    input.addEventListener("focus",()=>{input.select();const saved=input.value;input.value="";populate();input.value=saved;});
    input.addEventListener("input",populate);
    input.addEventListener("keydown",event=>{
      const buttons=[...list.querySelectorAll("button")];
      if(event.key==="Escape") {close();return;}
      if(event.key==="ArrowDown" || event.key==="ArrowUp") {event.preventDefault();if(list.hidden)populate();const count=list.querySelectorAll("button").length;if(count){active=(active+(event.key==="ArrowDown"?1:-1)+count)%count;highlight();}}
      if(event.key==="Enter") {event.preventDefault();if(buttons.length) buttons[active>=0?active:0].click();}
    });
    input.addEventListener("blur",()=>setTimeout(()=>close(),120));
    document.addEventListener("pointerdown",event=>{if(!input.parentElement.contains(event.target)) close();});
  }
  function sync() {
    for(const side of ["a","b"]) {
      const p=state[side];
      for(const element of $("scenario-"+side).querySelectorAll("select[data-field]")) element.value=p[element.dataset.field]==null?"":String(p[element.dataset.field]);
      if(document.activeElement!==$(side+"-city")) $(side+"-city").value=geoShort(p.model_geography);
      $(side+"-date").textContent=p.year;
      const geo=geoByValue.get(p.model_geography), coverage=$(side+"-coverage");
      coverage.classList.remove("sparse");
      if(geo){
        coverage.textContent=`${geo.diaries.toLocaleString()} diaries · observed ${geo.firstYear}–${geo.lastYear}`;
        if(geo.smallSample){coverage.textContent+=" · Sparse pooled sample: interpret with care.";coverage.classList.add("sparse");}
        if(p.year<geo.firstYear || p.year>geo.lastYear){coverage.textContent+=" This year is outside the code’s observed span; the pooled place effect is extrapolated.";coverage.classList.add("sparse");}
      } else coverage.textContent="All public and undisclosed geographies are retained in the national reference.";

      const sex=p.sex ? model.options.sex.find(x=>x.value===p.sex)?.label : "Sex unspecified";
      $(side+"-meta").textContent=(p.age===null?"Reference age distribution":p.age+" years")+" · "+sex;
      const selected=model.demographics.filter(key=>key!=="sex" && key!=="employment" && p[key]).length;
      $(side+"-more-count").textContent=selected?`${selected} selected`:"Unspecified features averaged";
    }
    $("link-age").checked=state.linked;$("day-type").value=state.day;
  }
  function change(side,key,value) {
    const p=state[side], other=state[side==="a"?"b":"a"];
    const next=key==="year"?Number(value):key==="age"?(value===""?null:Number(value)):(value || null);
    if(state.linked && key==="year" && p.age!==null) {
      const age=p.age+next-p.year;
      if(age<15 || age>85){toast("The linked age would be outside 15–85. Unlink age and year to compare freely.");sync();return;}
      p.age=age;
    }
    if(state.linked && key==="age") {
      if(next===null) state.linked=false;
      else {
        const otherAge=next+other.year-p.year;
        if(otherAge<15 || otherAge>85){toast("The other age would be outside 15–85. Unlink age and year first.");sync();return;}
        other.age=otherAge;
      }
    }
    p[key]=next;sync();schedule();
  }
  function roundedDay(values) {
    const result=values.map(Math.floor);let left=1440-result.reduce((a,b)=>a+b,0);
    const order=values.map((v,i)=>({i,f:v-result[i]})).sort((a,b)=>b.f-a.f);
    for(let i=0;i<left;i++)result[order[i%7].i]++;
    return result;
  }
  function time(n) {const h=Math.floor(n/60),min=n%60;return h?(h+"h"+(min?" "+min+"m":"")):min+" min";}
  function delta(n) {return (n>0?"+":n<0?"−":"")+Math.abs(n)+" min";}
  function row(k,a,b,foot=false) {
    const difference=b[k]-a[k],description=model.activityDescriptions[k];
    return `<tr data-activity="${model.activities[k]}"><td><span class="activity-name"><i style="background:${colors[k]}"></i>${escape(model.activityLabels[k])}</span>${foot?"":`<span class="activity-help">${escape(description)}</span>`}</td><td data-label="A · ${state.a.year}" data-minutes="${a[k]}"><span class="time-value">${time(a[k])}</span>${foot?"":`<small class="minute-value">${a[k]} min</small>`}</td><td data-label="B · ${state.b.year}" data-minutes="${b[k]}"><span class="time-value">${time(b[k])}</span>${foot?"":`<small class="minute-value">${b[k]} min</small>`}</td><td data-label="Change B − A" data-difference="${difference}"><span class="delta ${difference>0?"positive":difference<0?"negative":""}">${delta(difference)}</span>${foot?"":`<span class="delta-caption">${difference>0?"More time":difference<0?"Less time":"Same"}</span>`}</td></tr>`;
  }
  function renderResults(a,b) {
    const ra=roundedDay(a),rb=roundedDay(b);
    for(const side of ["a","b"]) {
      const values=side==="a"?a:b, rounded=side==="a"?ra:rb, p=state[side];
      $("bar-"+side).innerHTML=values.map((v,k)=>`<div class="day-segment" style="width:${v/1440*100}%;background:${colors[k]}" title="${escape(model.activityLabels[k])}: ${time(rounded[k])}"><span>${v/1440>.08?escape(model.activityLabels[k]):""}</span></div>`).join("");
      $("bar-"+side+"-caption").textContent=p.year+" · "+(p.age===null?"All ages":p.age+" years");
      $("bar-"+side).setAttribute("aria-label",`Scenario ${side.toUpperCase()}, ${p.year}. `+values.map((v,k)=>model.activityLabels[k]+time(rounded[k])).join("; "));
      $("column-"+side).textContent=`${side.toUpperCase()} · ${p.year}`;
    }
    $("activity-rows").innerHTML=Array.from({length:6},(_,k)=>row(k,ra,rb)).join("");
    $("activity-footer").innerHTML=row(6,ra,rb,true)+`<tr class="total-row"><td>Total day</td><td>24 hours</td><td>24 hours</td><td>0 min</td></tr>`;
    const changes=ra.slice(0,6).map((v,k)=>({k,d:rb[k]-v}));
    const increase=[...changes].sort((a,b)=>b.d-a.d)[0],decrease=[...changes].sort((a,b)=>a.d-b.d)[0];
    const parts=[];
    if(increase.d>0)parts.push(`<span class="up">${escape(model.activityLabels[increase.k])}: +${increase.d} min</span>`);
    if(decrease.d<0)parts.push(`<span class="down">${escape(model.activityLabels[decrease.k])}: −${Math.abs(decrease.d)} min</span>`);
    $("insight").innerHTML=parts.length?"Largest daily changes in B relative to A: "+parts.join("; ")+".":"The predictions are the same at whole-minute display precision.";
    $("insight").hidden=false;$("composition").hidden=false;$("loading").hidden=true;
    $("error").hidden=true;$("results").classList.remove("pending");
    last={a:[...a],b:[...b],roundedA:ra,roundedB:rb,state:clone(state)};
  }
  function schedule() {
    clearTimeout(updateTimer);$("results").classList.add("pending");
    updateTimer=setTimeout(()=>{
      try {const a=predictor.predict(state.a,state.day),b=predictor.predict(state.b,state.day);renderResults(a,b);}
      catch(error){$("error").textContent=error.message;$("error").hidden=false;$("loading").hidden=true;$("results").classList.remove("pending");}
    },40);
  }
  $("ten-years").addEventListener("click",()=>{
    const year=state.b.year-10,age=state.b.age===null?null:state.b.age-10;
    if(!model.years.includes(year) || (age!==null && age<15)){toast("Ten years earlier is outside the data or age range. Use a later year and age 25 or older in B.");return;}
    state.a={...state.b,year,age};state.linked=age!==null;sync();schedule();
    toast(`Comparing ${year} with ${state.b.year}, with other demographics held equal.`);
  });
  $("copy-a").addEventListener("click",()=>{state.b=clone(state.a);sync();schedule();toast("All choices copied. Change one feature in B to isolate a comparison.");});
  $("swap").addEventListener("click",()=>{[state.a,state.b]=[state.b,state.a];sync();schedule();});
  $("place-only").addEventListener("click",()=>{
    const place=state.b.model_geography;state.b={...state.a,model_geography:place};state.linked=false;sync();schedule();
    $("b-city").focus();toast("Year, age and demographics now match. Choose a place for B.");
  });
  $("link-age").addEventListener("change",event=>{
    if(event.target.checked) {
      const a=state.b.age===null?null:state.b.age+state.a.year-state.b.year;
      if(a===null || a<15 || a>85){event.target.checked=false;toast("Choose valid ages to link age with year.");return;}
      state.a.age=a;
    }
    state.linked=event.target.checked;sync();schedule();
  });
  $("day-type").addEventListener("change",event=>{state.day=event.target.value;schedule();});
  $("download").addEventListener("click",()=>{
    if(!last)return;
    const fields=["year","age",...model.demographics,"model_geography"];
    const headers=["Activity","A_minutes","B_minutes","B_minus_A_minutes","Day_type",...fields.map(x=>"A_"+x),...fields.map(x=>"B_"+x)];
    const rows=model.activities.map((_,k)=>[model.activityLabels[k],last.a[k].toFixed(4),last.b[k].toFixed(4),(last.b[k]-last.a[k]).toFixed(4),last.state.day,...fields.map(x=>last.state.a[x]??"Unspecified"),...fields.map(x=>last.state.b[x]??"Unspecified")]);
    const csv="\ufeff"+[headers,...rows].map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`lifestyle_${last.state.a.year}_vs_${last.state.b.year}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $("share").addEventListener("click",async()=>{
    const url=new URL(location.href);url.searchParams.set("s",btoa(JSON.stringify(state)));
    try {await navigator.clipboard.writeText(url.href);toast("Comparison link copied.");}
    catch(error){const field=document.createElement("textarea");field.value=url.href;document.body.append(field);field.select();const ok=document.execCommand("copy");field.remove();toast(ok?"Comparison link copied.":"Copy was blocked. Use the link in the address bar.");}
    history.replaceState(null,"",url.href);
  });
  createCard("a");createCard("b");sync();
  $("chart-legend").innerHTML=model.activityLabels.map((label,k)=>`<span><i class="legend-dot" style="background:${colors[k]}"></i>${escape(label)}</span>`).join("");
  $("sample-description").textContent=`ATUS 2005–2025: ${model.diaries.toLocaleString()} complete diaries, excluding 2020. All ${model.geographies.filter(g=>g.value.startsWith("MSA_")).length} observed metro codes enter the model. Interactive place choices use the ${selectableGeographies.length} MSAs with mapped boundaries; no ACS OD filter is applied.`;
  window.LIFESTYLE_APP={predictor,getState:()=>clone(state),getResults:()=>last?clone(last):null,
    setScenario:(side,profile)=>{state[side]=cleanProfile(profile);state.linked=false;sync();schedule();}};
  schedule();
})();
