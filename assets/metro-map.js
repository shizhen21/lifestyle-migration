(function(global){
  "use strict";
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  class LifestyleMetroMap{
    constructor(host,geometry,onSelect){
      this.host=host;this.geometry=geometry;this.onSelect=onSelect;this.zoom=1;this.panX=0;this.panY=0;this.drag=null;this.dragged=false;this.values=new Map();
      host.innerHTML=`<svg id="metro-map-svg" viewBox="${geometry.viewBox.join(' ')}" aria-label="Interactive U.S. metro map. Click an MSA boundary to select its named region." role="group"><g class="map-transform"><g class="map-states">${geometry.states.map(s=>`<path d="${s.d}" fill-rule="evenodd"><title>${esc(s.name)}</title></path>`).join('')}</g><g class="map-metros">${geometry.metros.map(g=>`<path d="${g.d}" data-geo="${g.value}" tabindex="0" role="button" aria-label="${esc(g.label)}" fill-rule="evenodd"><title>${esc(g.label)}</title></path>`).join('')}</g>${geometry.insets.map(i=>`<text class="map-inset-label" x="${i.x}" y="${i.y}">${i.label}</text>`).join('')}</g></svg><div id="metro-map-tooltip" class="metro-map-tooltip" role="status" hidden></div>`;
      this.svg=host.querySelector('svg');this.group=host.querySelector('.map-transform');this.tooltip=host.querySelector('.metro-map-tooltip');
      this.paths=new Map([...host.querySelectorAll('[data-geo]')].map(p=>[p.dataset.geo,p]));
      for(const [value,path] of this.paths){
        path.addEventListener('click',()=>{if(!this.dragged){this.hide();this.onSelect(value);}});
        path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onSelect(value);}});
        path.addEventListener('pointerenter',e=>this.show(value,e));path.addEventListener('pointermove',e=>{if(!this.drag)this.show(value,e);});
        path.addEventListener('pointerleave',()=>this.hide());path.addEventListener('focus',()=>this.show(value));path.addEventListener('blur',()=>this.hide());
      }
      this.svg.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,px:this.panX,py:this.panY};this.dragged=false;});
      this.svg.addEventListener('pointermove',e=>{
        if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
        if(Math.hypot(dx,dy)>5){this.dragged=true;this.hide();this.svg.setPointerCapture(e.pointerId);}
        if(this.dragged){const scale=1000/this.svg.getBoundingClientRect().width;this.panX=this.drag.px+dx*scale;this.panY=this.drag.py+dy*scale;this.transform();}
      });
      const stop=()=>{this.drag=null;setTimeout(()=>this.dragged=false,80);};
      this.svg.addEventListener('pointerup',stop);this.svg.addEventListener('pointercancel',stop);
      this.svg.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();this.setZoom(this.zoom*(e.deltaY<0?1.2:1/1.2));},{passive:false});
    }
    transform(){
      const limitX=1000*(this.zoom-1)/2,limitY=640*(this.zoom-1)/2;
      this.panX=Math.max(-limitX,Math.min(limitX,this.panX));this.panY=Math.max(-limitY,Math.min(limitY,this.panY));
      this.group.setAttribute('transform',`translate(${500*(1-this.zoom)+this.panX} ${320*(1-this.zoom)+this.panY}) scale(${this.zoom})`);
    }
    setZoom(value){this.zoom=Math.max(1,Math.min(8,value));this.transform();this.hide();}
    reset(){this.zoom=1;this.panX=this.panY=0;this.transform();this.hide();}
    hide(){this.tooltip.hidden=true;}
    show(value,event){
      const cell=this.values.get(value);if(!cell)return;
      this.tooltip.innerHTML=`<b>${esc(cell.label)}</b><span>${esc(cell.period)} · ${esc(cell.group)}</span><strong>${esc(cell.displayValue||(cell.summary?cell.minutes.toFixed(1)+' min / day':'No observations'))}</strong><span>${esc(cell.sampleText||(cell.summary?cell.summary.n.toLocaleString('en-US')+' diaries'+(cell.summary.n<30?' · sparse sample':''):'No survey cell for this selection'))}</span><small>${esc(cell.actionText||"Click to explore this metro")}</small>`;
      this.tooltip.hidden=false;
      const box=this.host.getBoundingClientRect(),point=this.paths.get(value).getBoundingClientRect();
      const x=event?event.clientX-box.left:point.left-box.left+point.width/2;
      const y=event?event.clientY-box.top:point.top-box.top;
      this.tooltip.style.left=Math.max(8,Math.min(box.width-this.tooltip.offsetWidth-8,x+13))+'px';
      this.tooltip.style.top=Math.max(8,Math.min(box.height-this.tooltip.offsetHeight-8,y+13))+'px';
    }
    update(values,selected,low,high){
      this.values=values;this.hide();
      for(const [value,path] of this.paths){
        const item=values.get(value),p=item?.summary;
        let fill='#e1e5df';
        if(p){const t=Math.max(0,Math.min(1,(item.minutes-low)/Math.max(.001,high-low)));const a=[224,239,228],b=[30,112,112];fill='rgb('+a.map((v,k)=>Math.round(v+(b[k]-v)*t)).join(',')+')';}
        path.setAttribute('fill',fill);path.classList.toggle('selected',value===selected);path.classList.toggle('sparse',!!p&&p.n<30);path.classList.toggle('missing',!p);
        path.setAttribute('aria-pressed',String(value===selected));
        const title=`${item?.label||value}: ${item?.displayValue||(p?item.minutes.toFixed(1)+' minutes per day, '+p.n+' diaries':'no observations')}, ${item?.period||''}. Activate to select this place.`;
        path.setAttribute('aria-label',title);path.querySelector('title').textContent=title;
      }
      if(this.paths.has(selected))this.paths.get(selected).parentElement.append(this.paths.get(selected));
    }
  }
  global.LifestyleMetroMap=LifestyleMetroMap;
})(window);
