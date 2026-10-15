const $=id=>document.getElementById(id);
const TOPICS={cognitive:'Cognition & language',fossils:'Human origins',tools:'Tools & technology',art:'Art & symbolism',genetics:'Ancient genetics',behavior:'Behavior & society'};
let params=new URLSearchParams(location.search),saved=[],currentRequest,stats={},toastTimer,searchTimer;
function readPreference(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function preference(key,value){try{localStorage.setItem(key,value);}catch{notify('Your browser could not save this preference.');}}
try {const value=JSON.parse(readPreference('archive-saved','[]'));saved=Array.isArray(value)?value.filter(x=>/^[\da-f-]{36}$/i.test(x)):[];}catch{}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function anchor(text,url,className){const a=el('a',text,className);a.href=url;return a;}
function date(value){if(!value)return 'Date unavailable';const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(d):'Date unavailable';}
function updateSaved(){ $('savedCount').textContent=saved.length; }
function syncControls(){
 $('searchInput').value=params.get('q')||'';$('sortSelect').value=params.get('sort')||'newest';
 document.querySelectorAll('[data-filter]').forEach(input=>input.value=params.get(input.dataset.filter)||'');
 document.querySelectorAll('[data-topic]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.topic===(params.get('topic')||''))));
 $('archiveTitle').textContent=params.has('saved')?'Your saved research.':'A deeper look at our beginnings.';
 $('filterChips').replaceChildren();
 for(const [key,value] of params){if(['page','sort','view','ids'].includes(key)||!value)continue;const chip=el('button',`${key==='topic'?TOPICS[value]||value:key==='saved'?'Saved articles':key+': '+value} ×`,'chip');chip.type='button';chip.setAttribute('aria-label','Remove '+key+' filter');chip.addEventListener('click',()=>{params.delete(key);change();});$('filterChips').append(chip);}
}
function change({push=true,resetPage=true}={}){
 if(resetPage)params.delete('page');const url=location.pathname+(params.size?'?'+params.toString():'');if(push)history.pushState(null,'',url);syncControls();load();
}
async function api(url,signal){const response=await fetch(url,{signal});if(!response.ok)throw new Error('Archive unavailable');return response.json();}
function card(article){
 const node=el('article',undefined,'news-card'),top=el('div',undefined,'card-topline');
 for(const topic of article.topics.slice(0,2)){if(TOPICS[topic])top.append(anchor(TOPICS[topic],'/topics/'+topic,'tag'));}
 const type=article.publication_type==='preprint'?'Preprint · review unverified':article.publication_type==='journal'?'Journal article':'News report';
 top.append(el('span',type,'publication-label'));node.append(top);
 const heading=el('h3');heading.append(anchor(article.title,'/articles/'+article.id));node.append(heading);
 const bookmark=el('button',saved.includes(article.id)?'◆':'◇','bookmark');bookmark.type='button';bookmark.setAttribute('aria-label','Save '+article.title);bookmark.setAttribute('aria-pressed',String(saved.includes(article.id)));bookmark.addEventListener('click',()=>{
  const removing=saved.includes(article.id);if(!removing&&saved.length>=500){notify('Your reading list holds up to 500 articles. Remove one before adding another.');return;}
  saved=removing?saved.filter(x=>x!==article.id):[...saved,article.id];preference('archive-saved',JSON.stringify(saved));updateSaved();bookmark.textContent=removing?'◇':'◆';bookmark.setAttribute('aria-pressed',String(!removing));notify(removing?'Removed from your reading list.':'Saved in this browser.');if(params.has('saved'))load();
 });node.append(bookmark);
 const meta=el('div',undefined,'card-meta');meta.append(el('span',article.source),el('span',date(article.published_at)));if(article.authors)meta.append(el('span',article.authors.length>100?article.authors.slice(0,100)+'…':article.authors));node.append(meta);
 const summary=article.summary||'No abstract supplied. Read the original publication for details.',preview=summary.length>260?summary.slice(0,260).replace(/\s+\S*$/,'')+'…':summary;
 const text=el('p',preview,'card-summary');node.append(text);
 if(summary.length>260){const toggle=el('button','Expand summary','summary-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';text.textContent=open?preview:summary;toggle.textContent=open?'Expand summary':'Collapse summary';toggle.setAttribute('aria-expanded',String(!open));});node.append(toggle);}
 const actions=el('div',undefined,'card-actions'),original=anchor('Original publication ↗',article.canonical_url);original.target='_blank';original.rel='noopener noreferrer';actions.append(original);
 const share=el('button','Share');share.type='button';share.addEventListener('click',async()=>{const url=location.origin+'/articles/'+article.id;try{if(navigator.share)await navigator.share({title:article.title,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);notify('Article link copied.');}else notify('Open the article page and copy its address.');}catch(error){if(error.name!=='AbortError')notify('Sharing failed. Open the article page to copy its address.');}});actions.append(share);node.append(actions);return node;
}
async function load(){
 currentRequest?.abort();currentRequest=new AbortController();const signal=currentRequest.signal;
 $('newsGrid').setAttribute('aria-busy','true');$('resultCount').textContent='Searching the archive…';$('prevPage').disabled=true;$('nextPage').disabled=true;
 const request=new URLSearchParams(params);if(params.has('saved'))request.set('ids',saved.join(','));
 try{const data=await api('/api/articles?'+request,signal);if(signal.aborted)return;
  $('newsGrid').replaceChildren();$('resultCount').textContent=`${data.total.toLocaleString()} ${data.total===1?'article':'articles'}${params.has('saved')?' in your reading list':' found'}`;
  if(!data.articles.length){const empty=el('div',undefined,'empty-state');empty.append(el('h3',params.has('saved')?'A place for your next discovery.':'No matching research yet.'),el('p',params.has('saved')?'Save articles with the diamond button. Your reading list stays in this browser; articles under review are hidden.':'Try a broader search or clear a filter. Older articles remain in the archive.'));const reset=el('button','Explore all research');reset.addEventListener('click',()=>{params=new URLSearchParams();change();});empty.append(reset);$('newsGrid').append(empty);}
  else for(const a of data.articles)$('newsGrid').append(card(a));
  const pages=Math.max(1,Math.ceil(data.total/data.pageSize));$('pageInfo').textContent=`Page ${data.page} of ${pages}`;$('prevPage').disabled=data.page<=1;$('nextPage').disabled=data.page>=pages;
 }catch(error){if(error.name==='AbortError')return;$('resultCount').textContent='Archive temporarily unavailable';const box=el('div',undefined,'error-state');box.append(el('h3','The archive is taking a moment.'),el('p','Please retry shortly. Your articles are preserved; no collection has been replaced.'));const retry=el('button','Try again');retry.addEventListener('click',load);box.append(retry);$('newsGrid').replaceChildren(box);}
 finally{if(!signal.aborted)$('newsGrid').setAttribute('aria-busy','false');}
}
function setLayout(view){const grid=view==='grid';$('newsGrid').className=grid?'news-grid':'news-list';$('listView').setAttribute('aria-pressed',String(!grid));$('gridView').setAttribute('aria-pressed',String(grid));preference('archive-view',view);}
$('searchForm').addEventListener('submit',event=>{event.preventDefault();const q=$('searchInput').value.trim();q?params.set('q',q):params.delete('q');if(q)params.set('sort','relevance');change();});
document.querySelectorAll('[data-filter]').forEach(input=>input.addEventListener(input.tagName==='INPUT'&&input.type==='search'?'input':'change',()=>{clearTimeout(searchTimer);const apply=()=>{input.value?params.set(input.dataset.filter,input.value):params.delete(input.dataset.filter);change();};if(input.type==='search')searchTimer=setTimeout(apply,350);else apply();}));
document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{button.dataset.topic?params.set('topic',button.dataset.topic):params.delete('topic');change();}));
$('sortSelect').addEventListener('change',()=>{params.set('sort',$('sortSelect').value);change();});
$('clearFilters').addEventListener('click',()=>{params=new URLSearchParams();change();});
for(const [id,offset] of [['prevPage',-1],['nextPage',1]])$(id).addEventListener('click',()=>{params.set('page',Math.max(1,Number(params.get('page')||1)+offset));change({resetPage:false});$('archive').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
$('listView').addEventListener('click',()=>setLayout('list'));$('gridView').addEventListener('click',()=>setLayout('grid'));
$('themeToggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;preference('archive-theme',theme);});
document.documentElement.dataset.theme=readPreference('archive-theme','light');
window.addEventListener('popstate',()=>{params=new URLSearchParams(location.search);syncControls();load();});
window.addEventListener('storage',event=>{if(event.key==='archive-saved'){try{const values=JSON.parse(event.newValue||'[]');saved=Array.isArray(values)?values.filter(x=>/^[\da-f-]{36}$/i.test(x)).slice(0,500):[];}catch{saved=[];}updateSaved();load();}});
if(innerWidth<760)document.querySelector('.advanced').open=false;
$('year').textContent=new Date().getFullYear();setLayout(readPreference('archive-view','list'));updateSaved();syncControls();load();
api('/api/articles?stats=1').then(data=>{stats=data;$('totalArticles').textContent=data.total.toLocaleString();$('totalSources').textContent=data.sources.filter(s=>s.count>0).length;$('lastUpdated').textContent=data.lastUpdated?date(data.lastUpdated):'Awaiting first collection';for(const s of data.sources){const option=el('option',s.name+' ('+s.count+')');option.value=s.id;$('sourceFilter').append(option);}for(const [key,items] of [['region',data.regions],['period',data.periods],['species',data.species]])for(const value of items.sort()){const option=el('option',value);option.value=value;$(key+'Filter').append(option);}syncControls();}).catch(()=>{$('lastUpdated').textContent='Collection status unavailable';});
// Identity invitations can land at the site root. Forward the fragment without logging it.
if(/(?:invite_token|recovery_token|confirmation_token|access_token)=/.test(location.hash))location.replace('/admin.html'+location.hash);
