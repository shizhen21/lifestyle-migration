"""Private, explicitly opted-in scenario records; no public export or visitor tracking."""
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import threading

CONSENT_VERSION='2026-11-21-v1'
CONSENT_TEXT='I agree to contribute this exploration for academic research. It contains my own information or a hypothetical scenario, and no other person’s details.'
SCOPES={'patterns','compare','profiles','move_goals','place_examples','validation'}
LOCK=threading.Lock()

def keys(value,required,optional=()):
    if not isinstance(value,dict) or not set(required)<=value.keys() or value.keys()-set(required)-set(optional):raise ValueError('Unexpected or missing fields.')

def number(value,low,high):
    if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:raise ValueError('A numeric field is outside its range.')

def boolean(value):
    if not isinstance(value,bool):raise ValueError('Expected a boolean.')

def enum(value,allowed):
    if value not in allowed:raise ValueError('An unavailable category was supplied.')

def array(value,low,high):
    if not isinstance(value,list) or not low<=len(value)<=high:raise ValueError('Unexpected array length.')

def load_script(path):return json.loads(path.read_text().split('=',1)[1].strip().rstrip(';'))

class Collector:
    def __init__(self,site,directory):
        self.site=Path(site).resolve();self.directory=Path(directory).resolve()
        if self.directory==self.site or self.site in self.directory.parents:raise ValueError('Research records must be outside the public website folder.')
        self.directory.mkdir(parents=True,exist_ok=True,mode=0o700);self.directory.chmod(0o700)
        self.model=load_script(self.site/'assets/model-data.js')
        self.patterns=load_script(self.site/'assets/pattern-data.js')
        self.geos=set(self.model['effects']['model_geography']);self.years=set(self.model['years'])
        self.options={k:{v['value'] for v in self.model['options'][k]} for k in self.model['demographics']}
    def year(self,y):enum(y,self.years)
    def geo(self,g,nullable=False):enum(g,self.geos|({None} if nullable else set()))
    def demos(self,d):
        keys(d,[],self.options)
        for k,v in d.items():enum(v,self.options[k]|{None})
    def profile(self,p,include):
        keys(p,['year','age','geography'],['demographics'] if include else [])
        self.year(p['year']);self.geo(p['geography'],True)
        if p['age'] is not None:number(p['age'],15,125)
        if 'demographics' in p:self.demos(p['demographics'])
    def minutes(self,m):
        array(m,7,7)
        for v in m:number(v,0,1440)
        if abs(sum(m)-1440)>1e-5:raise ValueError('The activity budget does not sum to 1,440.')
    def validate(self,r):
        keys(r,['schema_version','record_id','created_at','scope','scenario_kind','include_demographics','consent','payload'])
        if r['schema_version']!=1:raise ValueError('Unsupported schema.')
        if not isinstance(r['record_id'],str) or not re.fullmatch('[0-9a-f]{32}',r['record_id']):raise ValueError('Invalid receipt identifier.')
        if not isinstance(r['created_at'],str) or len(r['created_at'])>40:raise ValueError('Invalid timestamp.')
        try:
            dt=datetime.fromisoformat(r['created_at'].replace('Z','+00:00'))
            if dt.tzinfo is None:raise ValueError()
        except (ValueError,TypeError):raise ValueError('Invalid timestamp.')
        enum(r['scope'],SCOPES);enum(r['scenario_kind'],{'own','hypothetical'});boolean(r['include_demographics'])
        keys(r['consent'],['agreed','version','text'])
        if r['consent'].get('agreed') is not True or r['consent']!={'agreed':True,'version':CONSENT_VERSION,'text':CONSENT_TEXT}:raise ValueError('Explicit current consent is required.')
        p=r['payload'];scope=r['scope'];include=r['include_demographics']
        if scope=='validation':
            keys(p,['error_threshold']);number(p['error_threshold'],0,1440);return
        if scope=='patterns':
            keys(p,['view']);v=p['view'];keys(v,['geo','start','end','focus','activity','dimension','groups','ageYears','demoDimension','demoPeriod','mapPeriod','placeGroup','order'])
            enum(v['geo'],self.geos|{'national'})
            for k in ['start','end','focus']:self.year(v[k])
            if v['start']>v['end']:raise ValueError('Reversed period.')
            number(v['activity'],0,5)
            dimensions={x['value']:len(x['levels']) for x in self.patterns['dimensions']}
            for k in ['dimension','demoDimension']:enum(v[k],dimensions)
            array(v['groups'],1,30)
            for g in v['groups']:number(g,0,dimensions[v['dimension']]-1)
            array(v['ageYears'],1,21)
            for y in v['ageYears']:self.year(y)
            for k in ['demoPeriod','mapPeriod']:enum(v[k],{'focus','pooled'})
            number(v['placeGroup'],0,dimensions[v['dimension']]-1);enum(v['order'],{'name','high','low','sample'})
            return
        enum(p.get('day'),{'all','weekday','weekend'})
        if scope=='profiles':
            keys(p,['day','stages','annual']);array(p['stages'],1,10);array(p['annual'],1,21)
            totals={}
            for s in p['stages']:
                keys(s,['year','age','geography','months','share','sequence'],['demographics'] if include else [])
                self.year(s['year']);self.geo(s['geography']);number(s['age'],15,125);number(s['sequence'],0,9);number(s['months'],.000001,12);number(s['share'],0,1)
                if abs(s['months']/12-s['share'])>1e-8:raise ValueError('Invalid residence share.')
                totals[s['year']]=totals.get(s['year'],0)+s['months']
                if 'demographics'in s:self.demos(s['demographics'])
            if any(abs(v-12)>1e-8 for v in totals.values()):raise ValueError('Each residence year must total 12 months.')
            for a in p['annual']:
                keys(a,['year','age','segments'],['minutes'] if include else []);self.year(a['year']);number(a['age'],15,125);array(a['segments'],1,10)
                for s in a['segments']:
                    keys(s,['geography','months','share']);self.geo(s['geography']);number(s['months'],.000001,12);number(s['share'],0,1)
                    if abs(s['share']-s['months']/12)>1e-8:raise ValueError('Invalid annual residence share.')
                if abs(sum(s['share'] for s in a['segments'])-1)>1e-8:raise ValueError('Annual shares must sum to one.')
                if 'minutes'in a:self.minutes(a['minutes'])
            return
        if scope=='compare':
            keys(p,['day','profile'],['minutes'] if include else []);self.profile(p['profile'],include)
            if 'minutes'in p:self.minutes(p['minutes'])
            return
        required=['day','profile','origin','constraints','includeHistorical']
        keys(p,required+(['goals'] if scope=='move_goals' else ['examples','excludeExamples','mode','custom']))
        self.profile(p['profile'],include);self.geo(p['origin']);boolean(p['includeHistorical']);keys(p['constraints'],['region','size'])
        meta=load_script(self.site/'assets/move-constraints.js')
        enum(p['constraints']['region'],{'all'}|{r['value'] for r in meta['regions']});enum(p['constraints']['size'],{'all'}|{s['value'] for s in meta['sizes']})
        if scope=='move_goals':
            array(p['goals'],6,6)
            for g in p['goals']:
                keys(g,['intensity','rank']);enum(g['intensity'],{'low','medium','high'});enum(g['rank'],set(range(1,7)))
            if len({g['rank'] for g in p['goals']})!=6:raise ValueError('Priorities must have unique ranks.')
        else:
            boolean(p['excludeExamples']);enum(p['mode'],{'auto','similarity','inferred','manual','custom','ratings','preference'})
            array(p['examples'],1,12)
            for e in p['examples']:
                keys(e,['geography','year','age','rating'],['demographics'] if include else []);self.geo(e['geography']);self.year(e['year']);number(e['age'],15,85);enum(e['rating'],set(range(6)))
                if 'demographics'in e:self.demos(e['demographics'])
            if p['custom'] is not None:
                array(p['custom'],6,6)
                for v in p['custom']:number(v,-100,100)
    def save(self,record):
        self.validate(record);path=self.directory/(record['record_id']+'.json')
        with LOCK:
            if path.exists():
                old=json.loads(path.read_text());old.pop('received_at',None)
                if old!=record:raise ValueError('This receipt already belongs to a different record. Reload the page.')
                return record['record_id']
            value={**record,'received_at':datetime.now(timezone.utc).isoformat()};temp=self.directory/('.'+record['record_id']+'.tmp')
            fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            try:
                with os.fdopen(fd,'w') as stream:json.dump(value,stream,ensure_ascii=False,indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
                os.replace(temp,path)
            finally:temp.unlink(missing_ok=True)
        return record['record_id']
