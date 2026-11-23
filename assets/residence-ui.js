(function(){
  'use strict';
  const U=LifestyleUI,keys=['education','employment','marital_status','household_children'];
  function coverage(p){return p.extrapolated?'At least one residence has no diaries in this year; its pooled place effect is extrapolated.':p.mixed?'All component MSA-years have diary observations.':U.number(U.geo.get(p.geo).yearCounts[p.year])+' diaries for this MSA and year.';}
  function details(p){
    return (p.segments||[p]).map(s=>`<span class="residence-detail">${p.mixed?`<b>${U.esc(s.label)} · ${U.number(s.months)} months · ${U.number(100*s.share)}%</b><br>`:''}${keys.map(k=>U.esc(s.profile?.[k]||'Reference population')).join(' · ')}${p.mixed&&s.extrapolated?' · extrapolated':''}</span>`).join('<br>')+(p.mixed?'<br><small>Annual minutes are residence-weighted model averages. The last residence continues into later years.</small>':'');
  }
  window.LifestyleResidence={coverage,details};
})();
