self.window=self;
importScripts('model-data.js?v=20261119-v5-1','msa-registry.js?v=20261119-v5-1','move-constraints.js?v=20261119-v5-1','predictor.js?v=20261119-v5-1','profile-engine.js?v=20261121-v11');
self.onmessage=async event=>{
  try{const result=await self.LifestyleEngine.run(event.data,progress=>self.postMessage({kind:'progress',progress}));self.postMessage({kind:'result',result});}
  catch(error){self.postMessage({kind:'error',message:error.message});}
};
