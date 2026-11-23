self.window=self;
importScripts('model-data.js?v=20261121-v10','msa-registry.js?v=20261121-v10','move-constraints.js?v=20261121-v10','predictor.js?v=20261121-v10','profile-engine.js?v=20261121-v11','place-preference-engine.js?v=20261121-v10');
self.onmessage=async event=>{
  try{const result=await self.LifestylePlacePreferences.run(event.data,p=>self.postMessage({kind:'progress',progress:p}));self.postMessage({kind:'result',result});}
  catch(e){self.postMessage({kind:'error',message:e.message});}
};
