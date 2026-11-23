(function(global){
  let active=null;
  function run(job,progress=()=>{}){
    if(active){const previous=active;active=null;previous.worker.terminate();previous.reject(new DOMException('A newer calculation replaced this one.','AbortError'));}
    if(location.protocol==='file:'||!global.Worker)return global.LifestyleEngine.run(job,progress);
    return new Promise((resolve,reject)=>{
      const worker=new Worker('assets/profile-worker.js?v=20261121-v11');const entry={worker,reject};active=entry;
      worker.onmessage=event=>{const data=event.data;if(data.kind==='progress')progress(data.progress);else{worker.terminate();if(active===entry)active=null;if(data.kind==='result')resolve(data.result);else reject(Error(data.message));}};
      worker.onerror=()=>{worker.terminate();if(active===entry)active=null;reject(Error('The model worker could not load. Reload this page and try again.'));};worker.postMessage(job);
    });
  }
  global.LifestyleJobs={run};
})(window);
