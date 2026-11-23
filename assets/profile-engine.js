(function(global){
  'use strict';
  const model=global.LIFESTYLE_MODEL,registry=global.LIFESTYLE_MSAS||[],byGeo=new Map(registry.map(g=>[g.value,g]));
  const predictor=new global.LifestylePredictor(model),basisCache=new Map();
  const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
  function profile(value){
    if(value.age===null||value.age===undefined||value.age==='')throw Error('Enter an age for this profile.');
    const p={year:Number(value.year),age:Number(value.age)};
    for(const k of model.demographics)p[k]=value[k]||null;
    p.model_geography=value.model_geography||null;predictor.validate(p);return p;
  }
  function validGeo(value){if(!byGeo.has(value))throw Error('Choose an MSA with a mapped boundary.');return byGeo.get(value);}
  function basis(input,day){
    const p=profile({...input,model_geography:registry[0].value}),key=JSON.stringify([p,day]);
    if(basisCache.has(key))return basisCache.get(key);
    const fields=['age',...model.demographics],missing=fields.filter(k=>p[k]===null||p[k]===undefined||p[k]==='');
    const backgrounds=missing.length?model.referenceProfiles:[{weight:1}],groups=new Map();
    for(const bg of backgrounds){const filled={...p};for(const k of missing)filled[k]=bg[k];const key=fields.map(k=>filled[k]).join('\u001f');if(groups.has(key))groups.get(key).weight+=bg.weight;else groups.set(key,{p:filled,weight:bg.weight});}
    const baseEffect=model.effects.model_geography[p.model_geography],result=[];
    for(const group of groups.values()){
      const base=predictor.baseScores(group.p).map((s,k)=>s-baseEffect[k]);
      for(const cell of predictor.calendar(group.p.employment,day))result.push({score:base.map((s,k)=>s+cell.score[k]),weight:group.weight*cell.weight});
    }
    if(basisCache.size>3)basisCache.clear();basisCache.set(key,result);return result;
  }
  async function acrossPlaces(input,places,day='all',progress=()=>{}){
    if(!['all','weekday','weekend'].includes(day))throw Error('Choose an average day, weekday or weekend.');
    const components=basis(input,day),result=[];
    for(let i=0;i<places.length;i++){
      const value=typeof places[i]==='string'?places[i]:places[i].value;validGeo(value);
      const g=model.effects.model_geography[value],minutes=[0,0,0,0,0,0,0];
      for(const c of components){
        const z0=c.score[0]+g[0],z1=c.score[1]+g[1],z2=c.score[2]+g[2],z3=c.score[3]+g[3],z4=c.score[4]+g[4],z5=c.score[5]+g[5];
        const m=Math.max(0,z0,z1,z2,z3,z4,z5),e0=Math.exp(z0-m),e1=Math.exp(z1-m),e2=Math.exp(z2-m),e3=Math.exp(z3-m),e4=Math.exp(z4-m),e5=Math.exp(z5-m),e6=Math.exp(-m);
        const factor=1440*c.weight/(e0+e1+e2+e3+e4+e5+e6);
        minutes[0]+=factor*e0;minutes[1]+=factor*e1;minutes[2]+=factor*e2;minutes[3]+=factor*e3;minutes[4]+=factor*e4;minutes[5]+=factor*e5;minutes[6]+=factor*e6;
      }
      if(!minutes.every(Number.isFinite)||Math.abs(minutes.reduce((a,b)=>a+b,0)-1440)>1e-6)throw Error('The prediction budget could not be verified.');
      result.push({value,minutes});if(i%10===0||i===places.length-1){progress({done:i+1,total:places.length});await yieldUI();}
    }
    return result;
  }
  function residenceStages(raw){
    const stages=raw.map((s,i)=>({...s,year:Number(s.year),sequence:i})).sort((a,b)=>a.year-b.year||a.sequence-b.sequence);
    for(const year of new Set(stages.map(s=>s.year))){
      const group=stages.filter(s=>s.year===year),blank=group.filter(s=>s.months===null||s.months===undefined||s.months==='');
      let used=0;
      for(const s of group)if(!blank.includes(s)){s.months=Number(s.months);if(!Number.isFinite(s.months)||s.months<=0||s.months>12)throw Error(year+': each residence duration must be more than 0 and at most 12 months.');used+=s.months;}
      if(used>12+1e-8||(!blank.length&&Math.abs(used-12)>1e-8)||(blank.length&&used>=12))throw Error(year+': residence durations must fill exactly 12 months. Leave months blank to split the remaining time.');
      for(const s of blank)s.months=(12-used)/blank.length;
      for(const s of group)s.share=s.months/12;
    }
    return stages;
  }
  async function track(job,progress){
    const birth=Number(job.birthYear),end=Number(job.endYear),day=job.day||'all';
    if(!Number.isInteger(birth)||birth<1900||birth>2010)throw Error('Choose a birth year from 1900 to 2010.');
    if(!model.years.includes(end))throw Error('Choose an observed end year, excluding 2020.');
    if(!['all','weekday','weekend'].includes(day))throw Error('Choose an average day, weekday or weekend.');
    if(!Array.isArray(job.stages)||!job.stages.length||job.stages.length>10)throw Error('Add between one and ten residence stages.');
    const stages=residenceStages(job.stages);
    for(const s of stages){validGeo(s.geo);if(!model.years.includes(s.year))throw Error('Residence stages must use observed years, excluding 2020.');if(s.year-birth<15)throw Error('Each residence stage must start at age 15 or older.');if(s.year>end)throw Error('A residence stage is later than the profile end year.');}
    if(job.useDemographics!==false){for(const k of ['sex','race'])if(!job.common?.[k])throw Error('Choose sex and race in the shared background, or turn demographic details off.');for(const s of stages)for(const k of ['education','employment','marital_status','household_children'])if(!s.demographics?.[k])throw Error('Each chapter needs education, employment, marital status and children when demographic details are enabled.');}
    const years=model.years.filter(y=>y>=stages[0].year&&y<=end),points=[];
    function segment(s,year,months,carried){
      const actualAge=year-birth,p=profile({...(job.useDemographics===false?{}:{...job.common,...s.demographics}),year,age:Math.min(85,actualAge),model_geography:s.geo}),g=validGeo(s.geo);
      return {year,age:actualAge,geo:s.geo,label:g.label,months,share:months/12,profile:p,minutes:predictor.predict(p,day),extrapolated:!g.yearCounts[String(year)],stageYear:s.year,sequence:s.sequence,carried};
    }
    for(let i=0;i<years.length;i++){
      const year=years[i],current=stages.filter(s=>s.year===year),previous=[...stages].reverse().find(s=>s.year<year);
      const segments=current.length?current.map(s=>segment(s,year,s.months,false)):[segment(previous,year,12,true)];
      const minutes=Array.from({length:7},(_,k)=>segments.reduce((sum,s)=>sum+s.share*s.minutes[k],0)),single=segments.length===1;
      if(!minutes.every(Number.isFinite)||Math.abs(minutes.reduce((a,b)=>a+b,0)-1440)>1e-6)throw Error('The weighted annual 24-hour budget could not be verified.');
      points.push({year,age:year-birth,geo:single?segments[0].geo:null,label:single?segments[0].label:segments.map(s=>s.label).join(' + '),minutes,profile:single?segments[0].profile:null,segments,mixed:!single,extrapolated:segments.some(s=>s.extrapolated),ageTopCoded:year-birth>=85,stageYear:segments.at(-1).stageYear});
      progress({done:i+1,total:years.length});if(i%3===0)await yieldUI();
    }
    const moves=[];
    for(let i=1;i<stages.length;i++)if(stages[i].geo!==stages[i-1].geo){
      const s=stages[i],destination=points.find(p=>p.year===s.year).segments.find(p=>p.sequence===s.sequence),origin=predictor.predict({...destination.profile,model_geography:stages[i-1].geo},day);
      moves.push({year:s.year,sequence:s.sequence,from:stages[i-1].geo,to:s.geo,profile:destination.profile,origin,destination:destination.minutes,delta:destination.minutes.map((m,k)=>m-origin[k]),extrapolated:destination.extrapolated||!validGeo(stages[i-1].geo).yearCounts[String(s.year)]});
    }
    return {residenceVersion:2,birthYear:birth,endYear:end,day,stages,points,moves,first:points[0],last:points.at(-1),lastResidence:points.at(-1).segments.at(-1)};
  }
  function quantile(values,p){const a=[...values].sort((x,y)=>x-y),i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l);}
  async function move(job,progress){
    const input=profile(job.profile),origin=validGeo(job.origin);input.model_geography=job.origin;
    const meta=global.LIFESTYLE_MOVE_CONSTRAINTS;if(!meta)throw Error('The MSA region and population file could not load.');
    const constraints=job.constraints||{region:'all',size:'all'},byMeta=new Map(meta.metros.map(g=>[g.value,g]));
    if(!['all',...meta.regions.map(r=>r.value)].includes(constraints.region)||!['all',...meta.sizes.map(r=>r.value)].includes(constraints.size))throw Error('Choose an available region and city size.');
    const rawGoals=job.goals||[],ranks=rawGoals.map(g=>Number(g.rank));
    if(rawGoals.length!==6||new Set(ranks).size!==6||ranks.some(r=>!Number.isInteger(r)||r<1||r>6)||rawGoals.some(g=>!['low','medium','high'].includes(g.intensity)))throw Error('Choose Low, Medium or High and a unique priority from 1 to 6 for every activity.');
    const predictions=await acrossPlaces(input,registry,job.day||'all',progress),baseline=predictions.find(p=>p.value===job.origin).minutes;
    const eligible=predictions.filter(p=>{const g=byGeo.get(p.value),a=byMeta.get(p.value);return (job.includeHistorical||!!g.yearCounts[String(input.year)])&&(constraints.region==='all'||a.regions.includes(constraints.region))&&(constraints.size==='all'||(constraints.size==='under1m'?a.population<1000000:a.size===constraints.size));});
    if(!eligible.length)throw Error('No mapped MSAs match these region, size and year-coverage choices. Broaden the filters or include historical coverage.');
    const goals=rawGoals.map((g,k)=>{const values=eligible.map(p=>p.minutes[k]),low=quantile(values,.25),mid=quantile(values,.5),high=quantile(values,.75),target={low,medium:mid,high}[g.intensity],scale=Math.max(1,high-low);return {activity:k,intensity:g.intensity,rank:Number(g.rank),weight:7-Number(g.rank),target,delta:target-baseline[k],scale,low,median:mid,high};});
    const weight=goals.reduce((s,g)=>s+g.weight,0);
    const ranked=eligible.map(p=>{const g=byGeo.get(p.value),a=byMeta.get(p.value),distance=Math.sqrt(goals.reduce((s,t)=>s+t.weight*((p.minutes[t.activity]-t.target)/t.scale)**2,0)/weight);return {...p,label:g.label,distance,differences:p.minutes.map((m,k)=>m-baseline[k]),observedThisYear:!!g.yearCounts[String(input.year)],diaries:g.diaries,referenceYearDiaries:g.yearCounts[String(input.year)]||0,population:a.population,populationYear:a.populationYear,regions:a.regions,size:a.size,states:a.states};}).sort((a,b)=>a.distance-b.distance||a.label.localeCompare(b.label));
    return {preferenceVersion:2,profile:input,origin:origin.value,originLabel:origin.label,baseline,goals,constraints,ranked,allPredictions:predictions,day:job.day||'all',eligible:ranked.length,includeHistorical:!!job.includeHistorical,scoreUnit:'Priority-weighted distance in candidate interquartile ranges (minimum scale: 1 minute). Lower is closer.'};
  }
  async function ageEvidence(job,progress){const ages=[21,30,40,50,60,70],points=[];for(let i=0;i<ages.length;i++){const p=profile({year:job.year,age:ages[i],model_geography:null});points.push({age:ages[i],minutes:predictor.predict(p,'all')});progress({done:i+1,total:ages.length});await yieldUI();}return points;}
  async function run(job,progress=()=>{}){return job.type==='track'?track(job,progress):job.type==='move'?move(job,progress):job.type==='ageEvidence'?ageEvidence(job,progress):Promise.reject(Error('Unknown profile task.'));}
  global.LifestyleEngine={run,acrossPlaces,predictor};
})(typeof window!=='undefined'?window:self);
