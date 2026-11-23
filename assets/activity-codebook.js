(function(){
  'use strict';
  const root=document.getElementById('activity-codebook');if(!root)return;
  const $=id=>document.getElementById(id),data=window.LIFESTYLE_ACTIVITY_CODEBOOK;
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const query=$('codebook-search').value.trim().toLowerCase(),group=$('codebook-group').value;
    const terms=query.split(/\s+/).filter(Boolean);
    const rows=data.rows.filter(r=>{
      if(group&&r.group!==group)return false;
      const words=[r.code,r.label,r.groupLabel,...r.keywords].join(' ').toLowerCase().split(/[^a-z0-9]+/);
      return terms.every(term=>words.some(word=>word.startsWith(term)));
    });
    $('codebook-count').textContent=rows.length+' of '+data.rows.length+' codes shown · study classification applied to the BLS lexicon and historical sample codes.';
    $('codebook-rows').innerHTML=rows.length?rows.map(r=>`<tr><td>${r.code}</td><td>${esc(r.label)}${r.historicalNote?`<small>${esc(r.historicalNote)}</small>`:''}</td><td>${esc(r.groupLabel)}</td><td>${r.page?`<a href="downloads/ATUS_activity_lexicon_2003_2025.pdf#page=${r.page}" target="_blank" rel="noopener" aria-label="Open BLS lexicon PDF page ${r.page} for code ${r.code}">PDF p. ${r.page} ↗</a>`:'Historical code'}</td></tr>`).join(''):'<tr><td colspan="4">No codes match. Try “sleep”, “eating”, “cooking”, “commute” or a code such as 010101.</td></tr>';
  }
  $('codebook-search').addEventListener('input',render);$('codebook-group').addEventListener('change',render);render();
  window.LIFESTYLE_CODEBOOK_APP={rows:data.rows,render};
})();
