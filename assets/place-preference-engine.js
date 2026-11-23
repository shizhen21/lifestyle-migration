(function(global){
  'use strict';
  const M=global.LIFESTYLE_MODEL,registry=global.LIFESTYLE_MSAS,C=global.LIFESTYLE_MOVE_CONSTRAINTS;
  const geos=new Map(registry.map(g=>[g.value,g])),meta=new Map(C.metros.map(g=>[g.value,g]));
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  function quantile(a,p){const s=[...a].sort((x,y)=>x-y),at=(s.length-1)*p,lo=Math.floor(at),hi=Math.ceil(at);return s[lo]+(s[hi]-s[lo])*(at-lo);}
  function normalize(predictions,year){
    const observed=predictions.filter(p=>geos.get(p.value).yearCounts[String(year)]);
    const pool=observed.length?observed:predictions;
    const center=Array.from({length:6},(_,k)=>quantile(pool.map(p=>p.minutes[k]),.5));
    const scale=Array.from({length:6},(_,k)=>Math.max(1,quantile(pool.map(p=>p.minutes[k]),.75)-quantile(pool.map(p=>p.minutes[k]),.25)));
    return {center,scale,n:pool.length};
  }
  function zscore(minutes,norm){return minutes.slice(0,6).map((v,k)=>(v-norm.center[k])/norm.scale[k]);}
  function solve(matrix,vector){
    const a=matrix.map((row,i)=>[...row,vector[i]]),n=vector.length;
    for(let k=0;k<n;k++){
      let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
      if(Math.abs(a[pivot][k])<1e-12)throw Error('The preference model could not be solved.');
      [a[k],a[pivot]]=[a[pivot],a[k]];const div=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=div;
      for(let i=0;i<n;i++)if(i!==k){const factor=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=factor*a[k][j];}
    }
    return a.map(row=>row[n]);
  }
  function rankOf(matrix){
    const a=matrix.map(r=>[...r]);let rank=0;
    for(let col=0;col<6&&rank<a.length;col++){
      let pivot=rank;for(let i=rank+1;i<a.length;i++)if(Math.abs(a[i][col])>Math.abs(a[pivot][col]))pivot=i;
      if(Math.abs(a[pivot][col])<1e-7)continue;[a[rank],a[pivot]]=[a[pivot],a[rank]];
      for(let i=rank+1;i<a.length;i++){const f=a[i][col]/a[rank][col];for(let j=col;j<6;j++)a[i][j]-=f*a[rank][j];}rank++;
    }
    return rank;
  }
  function ridge(rows,lambda=1){
    const n=rows.length,mx=Array.from({length:6},(_,k)=>mean(rows.map(r=>r.z[k]))),my=mean(rows.map(r=>(r.rating-3)/2));
    const x=rows.map(r=>r.z.map((v,k)=>v-mx[k])),y=rows.map(r=>(r.rating-3)/2-my);
    const a=Array.from({length:6},(_,k)=>Array.from({length:6},(_,j)=>mean(x.map(r=>r[k]*r[j]))+(k===j?lambda:0)));
    const b=Array.from({length:6},(_,k)=>mean(x.map((r,i)=>r[k]*y[i]))),beta=solve(a,b);
    return {beta,intercept:my-beta.reduce((s,v,k)=>s+v*mx[k],0),rank:rankOf(x),lambda};
  }
  function fitRatings(examples){
    const rated=examples.filter(e=>e.rating>0),uniquePlaces=new Set(rated.map(r=>r.geo)).size;
    const highs=rated.filter(r=>r.rating>=4),lows=rated.filter(r=>r.rating<=3);
    if(rated.length<4||uniquePlaces<3||!highs.length||!lows.length||Math.max(...rated.map(r=>r.rating))-Math.min(...rated.map(r=>r.rating))<2){
      return {available:false,rated: rated.length,uniquePlaces,reason:'Different ratings are needed to separate preference directions: add at least four rated examples from three metros, including a liked place and a neutral or disliked place, with at least a two-point rating difference.'};
    }
    const fit=ridge(rated),magnitude=fit.beta.reduce((s,v)=>s+Math.abs(v),0);
    if(magnitude<1e-8)return {available:false,rated:rated.length,uniquePlaces,reason:'The supplied profiles do not separate the ratings. Similarity matching is still available.'};
    const loo=rated.map((_,i)=>ridge(rated.filter((_,j)=>j!==i)).beta);
    const sensitivity=[.25,1,4].map(lambda=>ridge(rated,lambda).beta);
    const consistency=fit.beta.map((v,k)=>loo.filter(beta=>Math.abs(v)>1e-8&&beta[k]*v>0).length/loo.length);
    const penaltyConsistency=fit.beta.map((v,k)=>sensitivity.filter(beta=>Math.abs(v)>1e-8&&beta[k]*v>0).length/sensitivity.length);
    const weights=fit.beta.map(v=>Math.abs(v)/magnitude);
    return {...fit,available:true,rated:rated.length,uniquePlaces,weights,consistency,penaltyConsistency,interpretation:'Regularized rating associations, not identified personal utility weights or causal effects. Percentages are normalized absolute coefficients; signs indicate conditional direction. Leave-one-example-out and penalty checks describe sensitivity, not confidence intervals.'};
  }
  function recommend(result,mode='similarity',custom=null){
    if(!['similarity','preference','custom'].includes(mode))throw Error('Choose a supported recommendation method.');
    if(mode==='preference'&&!result.fit.available)mode='similarity';
    const beta=mode==='custom'?custom:result.fit.beta;
    if(mode==='custom'&&(!Array.isArray(beta)||beta.length!==6||!beta.every(Number.isFinite)||beta.some(v=>Math.abs(v)>100)||beta.every(v=>Math.abs(v)<1e-12)))throw Error('Give at least one activity a nonzero priority between −100 and +100.');
    const abs=beta?.reduce((s,v)=>s+Math.abs(v),0)||0,weights=mode==='similarity'?Array(6).fill(1/6):beta.map(v=>Math.abs(v)/abs);
    const ranked=result.candidates.map(p=>{
      const differences=p.minutes.map((v,k)=>v-result.baseline[k]);
      const distance=Math.sqrt(p.z.reduce((s,v,k)=>s+(v-result.prototype[k])**2/6,0));
      const contributions=mode==='similarity'?[]:p.z.map((v,k)=>v*beta[k]/abs);
      const utility=mode==='similarity'?null:contributions.reduce((s,v)=>s+v,0);
      return {...p,differences,distance,utility,contributions};
    }).sort((a,b)=>(mode==='similarity'?a.distance-b.distance:b.utility-a.utility)||a.label.localeCompare(b.label));
    return {...result,mode,custom:mode==='custom'?[...custom]:null,rankingWeights:weights,ranked};
  }
  async function run(job,progress=()=>{}){
    const shared=job.shared,input={...shared.profile,model_geography:shared.origin},day=shared.day||'all';
    global.LifestyleEngine.predictor.validate(input);
    if(!Number.isInteger(input.age)||input.age<15||input.age>85)throw Error('Choose a comparison age between 15 and 85.');
    if(!geos.has(shared.origin))throw Error('Choose a mapped current MSA.');
    if(!['all','weekday','weekend'].includes(day))throw Error('Choose a valid type of day.');
    if(!job.examples?.length||job.examples.length>12)throw Error('Add between one and twelve place examples.');
    const seen=new Set(),cache=new Map(),examples=[];
    async function get(profile){
      const key=JSON.stringify(profile);
      if(!cache.has(key)){
        const values=await global.LifestyleEngine.acrossPlaces(profile,registry,day,p=>progress({phase:'examples',done:examples.length,total:job.examples.length,metros:p.done}));
        cache.set(key,{values,normalization:normalize(values,profile.year)});
      }
      return cache.get(key);
    }
    for(let i=0;i<job.examples.length;i++){
      const e=job.examples[i],profile={...shared.profile,year:Number(e.year),age:Number(e.age),model_geography:shared.origin};
      if(e.useDetails)for(const k of M.demographics)profile[k]=e.demographics?.[k]||null;
      if(!geos.has(e.geo))throw Error('Example '+(i+1)+' needs an available MSA.');
      if(!Number.isInteger(e.rating)||e.rating<0||e.rating>5)throw Error('Example '+(i+1)+' needs a valid rating.');
      if(!Number.isInteger(profile.age)||profile.age<15||profile.age>85)throw Error('Example '+(i+1)+' age must be 15–85; use 85 for ages 85+.');
      global.LifestyleEngine.predictor.validate(profile);
      const duplicate=JSON.stringify([e.geo,profile]);if(seen.has(duplicate))throw Error('The same place, year and profile appears twice. Keep one rating per identical example.');seen.add(duplicate);
      const batch=await get(profile),p=batch.values.find(v=>v.value===e.geo);
      examples.push({...e,profile,minutes:p.minutes,z:zscore(p.minutes,batch.normalization),normalization:batch.normalization,label:geos.get(e.geo).label,diaries:geos.get(e.geo).yearCounts[e.year]||0});
      progress({phase:'examples',done:i+1,total:job.examples.length});
    }
    const liked=examples.filter(e=>e.rating>=4);
    if(!liked.length)throw Error('Rate at least one example 4 or 5 to define the places you like. Lived here / no rating does not count as a preference.');
    const positiveWeight=liked.reduce((s,e)=>s+e.rating-3,0);
    const prototype=Array.from({length:6},(_,k)=>liked.reduce((s,e)=>s+(e.rating-3)*e.z[k],0)/positiveWeight);
    const batch=await get(input),constraints=shared.constraints||{region:'all',size:'all'};
    if(!['all',...C.regions.map(r=>r.value)].includes(constraints.region)||!['all',...C.sizes.map(r=>r.value)].includes(constraints.size))throw Error('Choose a valid region and metropolitan size.');
    const excluded=new Set(job.excludeExamples?examples.map(e=>e.geo):[]);
    const candidates=batch.values.filter(p=>{const g=geos.get(p.value),m=meta.get(p.value);return !excluded.has(p.value)&&(shared.includeHistorical||!!g.yearCounts[input.year])&&(constraints.region==='all'||m.regions.includes(constraints.region))&&(constraints.size==='all'||(constraints.size==='under1m'?m.population<1000000:m.size===constraints.size));}).map(p=>({...p,z:zscore(p.minutes,batch.normalization),label:geos.get(p.value).label,diaries:geos.get(p.value).yearCounts[input.year]||0,population:meta.get(p.value).population,regions:meta.get(p.value).regions,size:meta.get(p.value).size}));
    if(!candidates.length)throw Error('No candidates remain. Broaden the region, population or year-coverage filters, or include your example places.');
    const fit=fitRatings(examples),result={profile:input,day,origin:shared.origin,originLabel:geos.get(shared.origin).label,baseline:batch.values.find(p=>p.value===shared.origin).minutes,constraints,includeHistorical:!!shared.includeHistorical,excludeExamples:!!job.excludeExamples,examples,prototype,normalization:batch.normalization,candidates,fit,allPredictions:batch.values};
    return recommend(result,job.mode==='auto'?(fit.available?'preference':'similarity'):job.mode||'similarity',job.custom);
  }
  global.LifestylePlacePreferences={run,ridge,fitRatings,normalize,zscore,recommend};
})(typeof window!=='undefined'?window:self);
