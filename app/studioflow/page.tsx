'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type View = 'dashboard' | 'projects' | 'assets' | 'content' | 'approvals' | 'calendar' | 'ready';
type ProjectStatus = 'new' | 'active' | 'paused' | 'complete';
type ContentStatus = 'draft' | 'in_review' | 'approved' | 'ready' | 'published';
type ContentFormat = 'carousel' | 'reel' | 'story_set' | 'single_post';
type Language = 'english' | 'arabic' | 'bilingual';
type AssetTag = 'Bedroom' | 'Living Room' | 'Kitchen' | 'Bathroom' | 'Dining' | 'Details' | 'Before/After' | 'Product' | 'Video' | 'Other';

type Brand = {
  brandName: string;
  tone: string;
  ctaStyle: string;
  bannedWords: string;
  defaultHashtags: string;
  language: Language;
};

type Project = {
  id: string;
  name: string;
  clientName: string;
  category: 'interior' | 'furniture' | 'architecture' | 'other';
  notes: string;
  audience: string;
  language: Language;
  status: ProjectStatus;
  brand: Brand;
  createdAt: string;
};

type Asset = {
  id: string;
  projectId: string;
  name: string;
  kind: 'image' | 'video';
  tag: AssetTag;
  rating: number;
  favorite: boolean;
  notes: string;
  used: boolean;
  source: 'remote' | 'idb';
  remoteUrl?: string;
  createdAt: string;
};

type ContentItem = {
  id: string;
  projectId: string;
  title: string;
  format: ContentFormat;
  assetIds: string[];
  hook: string;
  captionEn: string;
  captionAr: string;
  cta: string;
  hashtags: string;
  notes: string;
  publishDate: string;
  status: ContentStatus;
  createdAt: string;
};

type AppData = { projects: Project[]; assets: Asset[]; content: ContentItem[] };

const STORAGE_KEY = 'studioflow.v3';
const DB_NAME = 'studioflow-assets';
const DB_STORE = 'files';

const TAGS: AssetTag[] = ['Bedroom','Living Room','Kitchen','Bathroom','Dining','Details','Before/After','Product','Video','Other'];
const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft', in_review: 'Needs My Approval', approved: 'Approved', ready: 'Ready To Post', published: 'Published',
};

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'projects', label: 'Projects', icon: '▣' },
  { id: 'assets', label: 'Asset Library', icon: '▧' },
  { id: 'content', label: 'Content', icon: '✦' },
  { id: 'approvals', label: 'My Approval', icon: '✓' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'ready', label: 'Ready To Post', icon: '→' },
];

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`;
const today = () => new Date().toISOString().slice(0,10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

const demoProject: Project = {
  id: 'project_demo', name: 'Palm Residence — Launch Set', clientName: 'Northline Interiors', category: 'interior',
  notes: 'Warm contemporary residence. Prioritize materials, lighting and crafted details.', audience: 'Homeowners 28–45 planning premium renovations',
  language: 'bilingual', status: 'active', createdAt: new Date().toISOString(),
  brand: { brandName: 'Northline Interiors', tone: 'Warm, refined, confident and design-led', ctaStyle: 'Soft invitation', bannedWords: 'cheap, budget', defaultHashtags: '#InteriorDesign #ResidentialDesign #DesignDetails', language: 'bilingual' }
};

const seed: AppData = {
  projects: [demoProject],
  assets: [
    { id:'a1', projectId:'project_demo', name:'Living hero', kind:'image', tag:'Living Room', rating:5, favorite:true, notes:'Main hero', used:true, source:'remote', remoteUrl:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85', createdAt:new Date().toISOString() },
    { id:'a2', projectId:'project_demo', name:'Dining angle', kind:'image', tag:'Dining', rating:4, favorite:false, notes:'Good carousel opener', used:true, source:'remote', remoteUrl:'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1400&q=85', createdAt:new Date().toISOString() },
    { id:'a3', projectId:'project_demo', name:'Material detail', kind:'image', tag:'Details', rating:5, favorite:true, notes:'Strong texture shot', used:false, source:'remote', remoteUrl:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=85', createdAt:new Date().toISOString() },
    { id:'a4', projectId:'project_demo', name:'Bedroom reveal', kind:'image', tag:'Bedroom', rating:5, favorite:true, notes:'Reel cover option', used:false, source:'remote', remoteUrl:'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=85', createdAt:new Date().toISOString() },
  ],
  content: [
    { id:'c1', projectId:'project_demo', title:'Palm Residence — Living Reveal', format:'carousel', assetIds:['a1','a2'], hook:'A home designed around quiet warmth.', captionEn:'A layered living space shaped by warm light, tactile finishes and a calm material palette. Every element is designed to feel intentional without feeling overworked.', captionAr:'مساحة معيشة هادئة بتفاصيل دافئة وخامات مختارة بعناية، بتجمع بين الراحة والبساطة من غير أي مبالغة.', cta:'Save this project for your next interior reference.', hashtags:'#NorthlineInteriors #InteriorDesign #ResidentialDesign #DesignDetails', notes:'Use hero first, dining second.', publishDate:plusDays(1), status:'in_review', createdAt:new Date().toISOString() },
    { id:'c2', projectId:'project_demo', title:'Material Story', format:'story_set', assetIds:['a3'], hook:'Details that make the room.', captionEn:'A closer look at the textures that bring the concept together.', captionAr:'نظرة أقرب على الخامات والتفاصيل اللي بتكمل التصميم.', cta:'Reply for project details.', hashtags:'#MaterialPalette #InteriorDetails', notes:'3 story frames', publishDate:plusDays(3), status:'ready', createdAt:new Date().toISOString() },
  ]
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putBlob(assetId: string, blob: Blob) { const db = await openDb(); await new Promise<void>((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(blob,assetId); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); db.close(); }
async function getBlob(assetId: string): Promise<Blob | undefined> { const db=await openDb(); const result=await new Promise<Blob|undefined>((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(assetId); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); db.close(); return result; }
async function removeBlob(assetId: string) { const db=await openDb(); await new Promise<void>((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).delete(assetId); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); db.close(); }

function Card({ children, className='' }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-2xl border border-white/8 bg-white/[0.035] ${className}`}>{children}</div>; }
function Button({ children, onClick, variant='primary', disabled=false, className='' }: { children: React.ReactNode; onClick?:()=>void; variant?:'primary'|'ghost'|'danger'|'soft'; disabled?:boolean; className?:string }) {
  const styles = variant==='primary'?'bg-white text-black hover:bg-white/90':variant==='danger'?'bg-red-500/12 text-red-300 border border-red-400/15 hover:bg-red-500/20':variant==='soft'?'bg-violet-400/12 text-violet-200 border border-violet-300/15 hover:bg-violet-400/20':'bg-white/[0.045] text-white border border-white/8 hover:bg-white/[0.08]';
  return <button disabled={disabled} onClick={onClick} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}>{children}</button>;
}
function Pill({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/60">{children}</span>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25 ${props.className||''}`} />; }
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/25 ${props.className||''}`} />; }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`w-full rounded-xl border border-white/10 bg-[#111318] px-3.5 py-2.5 text-sm text-white outline-none ${props.className||''}`}>{props.children}</select>; }
function Modal({ open, onClose, children, wide=false }: { open:boolean; onClose:()=>void; children:React.ReactNode; wide?:boolean }) {
  if(!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget) onClose();}}><div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0e12] p-5 shadow-2xl ${wide?'max-w-4xl':'max-w-xl'}`}>{children}</div></div>;
}

export default function StudioFlowPage() {
  const [data,setData]=useState<AppData>(seed);
  const [hydrated,setHydrated]=useState(false);
  const [view,setView]=useState<View>('dashboard');
  const [selectedProjectId,setSelectedProjectId]=useState('project_demo');
  const [selectedAssets,setSelectedAssets]=useState<string[]>([]);
  const [assetUrls,setAssetUrls]=useState<Record<string,string>>({});
  const [projectModal,setProjectModal]=useState(false);
  const [editingProject,setEditingProject]=useState<Project|null>(null);
  const [contentModal,setContentModal]=useState(false);
  const [editingContent,setEditingContent]=useState<ContentItem|null>(null);
  const [assetFilter,setAssetFilter]=useState<'all'|'unused'|'favorites'>('all');
  const [contentFilter,setContentFilter]=useState<ContentStatus|'all'>('all');
  const [search,setSearch]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) setData(JSON.parse(raw)); }catch{} setHydrated(true); },[]);
  useEffect(()=>{ if(hydrated) { try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }catch{} } },[data,hydrated]);
  useEffect(()=>{ let cancelled=false; (async()=>{ const next:Record<string,string>={}; for(const a of data.assets.filter(x=>x.source==='idb')){ try{ const blob=await getBlob(a.id); if(blob) next[a.id]=URL.createObjectURL(blob); }catch{} } if(!cancelled) setAssetUrls(prev=>({...prev,...next})); })(); return ()=>{cancelled=true;}; },[data.assets.length]);

  const project = data.projects.find(p=>p.id===selectedProjectId) || data.projects[0];
  useEffect(()=>{ if(!data.projects.some(p=>p.id===selectedProjectId) && data.projects[0]) setSelectedProjectId(data.projects[0].id); },[data.projects,selectedProjectId]);

  const projectAssets=useMemo(()=>data.assets.filter(a=>!project||a.projectId===project.id),[data.assets,project]);
  const projectContent=useMemo(()=>data.content.filter(c=>!project||c.projectId===project.id),[data.content,project]);
  const q=search.trim().toLowerCase();
  const filteredAssets=projectAssets.filter(a=>(assetFilter==='all'||(assetFilter==='unused'&&!a.used)||(assetFilter==='favorites'&&a.favorite)) && (!q||`${a.name} ${a.tag} ${a.notes}`.toLowerCase().includes(q)));
  const filteredContent=data.content.filter(c=>(contentFilter==='all'||c.status===contentFilter) && (!q||`${c.title} ${c.captionEn} ${c.captionAr} ${c.hashtags}`.toLowerCase().includes(q)));

  const counts={
    projects:data.projects.length,
    assets:data.assets.filter(a=>!a.used).length,
    draft:data.content.filter(c=>c.status==='draft').length,
    review:data.content.filter(c=>c.status==='in_review').length,
    ready:data.content.filter(c=>c.status==='approved'||c.status==='ready').length,
    published:data.content.filter(c=>c.status==='published').length,
  };

  function patchProject(projectId:string, patch:Partial<Project>){ setData(d=>({...d,projects:d.projects.map(p=>p.id===projectId?{...p,...patch}:p)})); }
  function patchAsset(assetId:string,patch:Partial<Asset>){ setData(d=>({...d,assets:d.assets.map(a=>a.id===assetId?{...a,...patch}:a)})); }
  function patchContent(contentId:string,patch:Partial<ContentItem>){ setData(d=>({...d,content:d.content.map(c=>c.id===contentId?{...c,...patch}:c)})); }

  async function handleFiles(files:FileList|null){
    if(!project||!files?.length) return;
    const incoming:Asset[]=[];
    for(const file of Array.from(files)){
      const aid=id('asset');
      await putBlob(aid,file);
      const url=URL.createObjectURL(file);
      setAssetUrls(prev=>({...prev,[aid]:url}));
      incoming.push({ id:aid, projectId:project.id, name:file.name.replace(/\.[^.]+$/,''), kind:file.type.startsWith('video')?'video':'image', tag:file.type.startsWith('video')?'Video':'Other', rating:3, favorite:false, notes:'', used:false, source:'idb', createdAt:new Date().toISOString() });
    }
    setData(d=>({...d,assets:[...incoming,...d.assets]}));
    setView('assets');
  }

  function deleteAsset(a:Asset){ if(!confirm(`Delete ${a.name}?`)) return; if(a.source==='idb') removeBlob(a.id).catch(()=>{}); setSelectedAssets(s=>s.filter(x=>x!==a.id)); setData(d=>({...d,assets:d.assets.filter(x=>x.id!==a.id),content:d.content.map(c=>({...c,assetIds:c.assetIds.filter(x=>x!==a.id)}))})); }

  function generateSmartContent(format?:ContentFormat){
    if(!project) return;
    const pool=(selectedAssets.length?selectedAssets:projectAssets.filter(a=>!a.used).slice(0,4).map(a=>a.id));
    if(!pool.length){ alert('Upload or select at least one asset first.'); setView('assets'); return; }
    const chosen=projectAssets.filter(a=>pool.includes(a.id));
    const lead=chosen[0]?.tag||'project';
    const brand=project.brand.brandName||project.clientName||project.name;
    const f=format || (pool.length>=3?'carousel':'single_post');
    const title=`${project.name} — ${lead} ${f==='reel'?'Reel':f==='story_set'?'Stories':f==='carousel'?'Carousel':'Post'}`;
    const hook=f==='reel'?'From concept to atmosphere.':f==='carousel'?'A closer look at the details that shape this space.':'One frame, one clear design story.';
    const captionEn=`${hook} ${brand} brings together ${lead.toLowerCase()} details, considered materials and a calm visual language designed to feel intentional from every angle.`;
    const captionAr=`${hook==='From concept to atmosphere.'?'من الفكرة للإحساس.':'تفاصيل بتوضح فكرة التصميم.'} ${brand} بيجمع بين الخامات المدروسة والتفاصيل الهادية علشان كل زاوية تبقى جزء من قصة واحدة متكاملة.`;
    const item:ContentItem={ id:id('content'), projectId:project.id, title, format:f, assetIds:pool, hook, captionEn, captionAr, cta:project.brand.ctaStyle||'Save this for your next design reference.', hashtags:project.brand.defaultHashtags||'#InteriorDesign #DesignDetails', notes:'Generated in StudioFlow — edit anything before approval.', publishDate:'', status:'draft', createdAt:new Date().toISOString() };
    setData(d=>({...d,content:[item,...d.content],assets:d.assets.map(a=>pool.includes(a.id)?{...a,used:true}:a)}));
    setSelectedAssets([]); setEditingContent(item); setContentModal(true); setView('content');
  }

  function exportItem(c:ContentItem,kind:'txt'|'json'){
    const p=data.projects.find(x=>x.id===c.projectId);
    const payload={project:p?.name,title:c.title,format:c.format,publishDate:c.publishDate,status:c.status,hook:c.hook,captionEn:c.captionEn,captionAr:c.captionAr,cta:c.cta,hashtags:c.hashtags,notes:c.notes,assets:c.assetIds.map(aid=>data.assets.find(a=>a.id===aid)?.name).filter(Boolean)};
    const text=kind==='json'?JSON.stringify(payload,null,2):`${c.title}\n${p?.name||''}\n${c.publishDate||'No date'}\n\nHOOK\n${c.hook}\n\nENGLISH\n${c.captionEn}\n\nARABIC\n${c.captionAr}\n\nCTA\n${c.cta}\n\nHASHTAGS\n${c.hashtags}\n\nNOTES\n${c.notes}`;
    const blob=new Blob([text],{type:kind==='json'?'application/json':'text/plain'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${c.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.${kind}`; a.click(); URL.revokeObjectURL(url);
  }
  async function copy(text:string){ try{ await navigator.clipboard.writeText(text); }catch{ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }

  return <main className="min-h-screen bg-[#07080b] text-white">
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/8 bg-[#090b0f] lg:flex lg:flex-col">
        <div className="p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">✦</div><div><div className="text-lg font-black tracking-tight">StudioFlow</div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-white/30">Content OS</div></div></div></div>
        <nav className="space-y-1 px-3">{NAV.map(n=><button key={n.id} onClick={()=>setView(n.id)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition ${view===n.id?'bg-white text-black':'text-white/55 hover:bg-white/[0.05] hover:text-white'}`}><span className="w-5 text-center">{n.icon}</span><span className="flex-1">{n.label}</span>{n.id==='approvals'&&counts.review>0?<span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">{counts.review}</span>:null}</button>)}</nav>
        <div className="mt-auto p-4"><Card className="p-4"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/30">Owner mode</div><div className="mt-2 text-xs leading-5 text-white/45">You are the only approver. Data stays in this browser; uploaded files are stored in IndexedDB.</div></Card></div>
      </aside>

      <section className="min-w-0 flex-1 lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#07080b]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="lg:hidden"><Select value={view} onChange={e=>setView(e.target.value as View)}>{NAV.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</Select></div>
            <div className="hidden flex-1 lg:block"><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets, captions, content…" /></div>
            <div className="ml-auto flex gap-2"><Button variant="ghost" onClick={()=>{setEditingProject(null);setProjectModal(true);}}>+ Project</Button><Button onClick={()=>fileRef.current?.click()}>Upload Assets</Button><input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e=>handleFiles(e.target.files)} /></div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {view==='dashboard'&&<Dashboard counts={counts} data={data} setView={setView} onNewProject={()=>{setEditingProject(null);setProjectModal(true)}} onUpload={()=>fileRef.current?.click()} onGenerate={()=>generateSmartContent()} />}
          {view==='projects'&&<ProjectsView data={data} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} onNew={()=>{setEditingProject(null);setProjectModal(true)}} onEdit={p=>{setEditingProject(p);setProjectModal(true)}} onDelete={p=>{if(confirm(`Delete ${p.name} and its related content/assets?`)) setData(d=>({...d,projects:d.projects.filter(x=>x.id!==p.id),assets:d.assets.filter(a=>a.projectId!==p.id),content:d.content.filter(c=>c.projectId!==p.id)}));}} onPatch={patchProject} />}
          {view==='assets'&&<AssetsView project={project} projects={data.projects} setProject={setSelectedProjectId} assets={filteredAssets} urls={assetUrls} selected={selectedAssets} setSelected={setSelectedAssets} filter={assetFilter} setFilter={setAssetFilter} onUpload={()=>fileRef.current?.click()} onPatch={patchAsset} onDelete={deleteAsset} onCreate={()=>generateSmartContent()} />}
          {view==='content'&&<ContentView data={data} items={filteredContent} filter={contentFilter} setFilter={setContentFilter} onNew={()=>generateSmartContent('single_post')} onEdit={c=>{setEditingContent(c);setContentModal(true)}} onDelete={c=>{if(confirm(`Delete ${c.title}?`)) setData(d=>({...d,content:d.content.filter(x=>x.id!==c.id)}));}} onStatus={(c,s)=>patchContent(c.id,{status:s})} />}
          {view==='approvals'&&<ApprovalView data={data} items={data.content.filter(c=>c.status==='in_review')} onEdit={c=>{setEditingContent(c);setContentModal(true)}} onApprove={c=>patchContent(c.id,{status:'approved'})} onDraft={c=>patchContent(c.id,{status:'draft'})} />}
          {view==='calendar'&&<CalendarView data={data} onDate={(c,date)=>patchContent(c.id,{publishDate:date})} onEdit={c=>{setEditingContent(c);setContentModal(true)}} />}
          {view==='ready'&&<ReadyView data={data} items={data.content.filter(c=>c.status==='approved'||c.status==='ready'||c.status==='published')} onCopy={copy} onStatus={(c,s)=>patchContent(c.id,{status:s})} onEdit={c=>{setEditingContent(c);setContentModal(true)}} onExport={exportItem} />}
        </div>
      </section>
    </div>

    <ProjectModal open={projectModal} project={editingProject} onClose={()=>setProjectModal(false)} onSave={p=>{ if(editingProject) setData(d=>({...d,projects:d.projects.map(x=>x.id===p.id?p:x)})); else {setData(d=>({...d,projects:[p,...d.projects]}));setSelectedProjectId(p.id);} setProjectModal(false); }} />
    <ContentModal open={contentModal} item={editingContent} data={data} onClose={()=>setContentModal(false)} onSave={item=>{ setData(d=>({...d,content:d.content.some(c=>c.id===item.id)?d.content.map(c=>c.id===item.id?item:c):[item,...d.content]})); setContentModal(false); }} />
  </main>;
}

function SectionTitle({ eyebrow,title,copy,actions }:{eyebrow:string;title:string;copy?:string;actions?:React.ReactNode}){ return <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-200/50">{eyebrow}</div><h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl">{title}</h1>{copy?<p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">{copy}</p>:null}</div>{actions?<div className="flex flex-wrap gap-2">{actions}</div>:null}</div>; }
function Stat({label,value,note}:{label:string;value:number;note:string}){return <Card className="p-5"><div className="text-[10px] font-black uppercase tracking-[.17em] text-white/30">{label}</div><div className="mt-3 text-4xl font-black tracking-[-.06em]">{value}</div><div className="mt-2 text-xs text-white/35">{note}</div></Card>}

function Dashboard({counts,data,setView,onNewProject,onUpload,onGenerate}:{counts:any;data:AppData;setView:(v:View)=>void;onNewProject:()=>void;onUpload:()=>void;onGenerate:()=>void}){
 const upcoming=[...data.content].filter(c=>c.publishDate&&c.status!=='published').sort((a,b)=>a.publishDate.localeCompare(b.publishDate)).slice(0,6);
 return <><SectionTitle eyebrow="Command center" title="Turn projects into ready-to-post content." copy="Upload project assets once, organize them, build content, approve it yourself, schedule it and export the final package." actions={<><Button variant="ghost" onClick={onNewProject}>New Project</Button><Button variant="ghost" onClick={onUpload}>Upload Assets</Button><Button onClick={onGenerate}>Generate Content</Button></>} />
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Stat label="Projects" value={counts.projects} note="active workspaces"/><Stat label="Assets to review" value={counts.assets} note="unused visuals"/><Stat label="Drafts" value={counts.draft} note="being built"/><Stat label="My approval" value={counts.review} note="need your decision"/><Stat label="Ready" value={counts.ready} note="approved / ready"/><Stat label="Published" value={counts.published} note="completed"/></div>
 <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.17em] text-white/30">Upcoming</div><h2 className="mt-2 text-xl font-bold">Content schedule</h2></div><Button variant="ghost" onClick={()=>setView('calendar')}>Open Calendar</Button></div><div className="mt-5 space-y-2">{upcoming.length?upcoming.map(c=><div key={c.id} className="flex items-center gap-4 rounded-xl border border-white/7 bg-black/20 p-3.5"><div className="min-w-20 text-xs font-bold text-violet-200">{c.publishDate}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.title}</div><div className="mt-1 text-[11px] text-white/30">{STATUS_LABEL[c.status]} · {c.format.replace('_',' ')}</div></div></div>):<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">Nothing scheduled yet.</div>}</div></Card>
 <Card className="p-5 sm:p-6"><div className="text-[10px] font-black uppercase tracking-[.17em] text-white/30">Fast flow</div><h2 className="mt-2 text-xl font-bold">One path. No mess.</h2><div className="mt-5 space-y-3 text-sm text-white/45">{['1. Create or choose a project','2. Upload and tag assets','3. Generate or create content','4. Move to My Approval','5. Approve + schedule','6. Copy / export + publish'].map(x=><div key={x} className="rounded-xl border border-white/7 bg-black/20 px-4 py-3">{x}</div>)}</div></Card></div></>;
}

function ProjectsView({data,selectedProjectId,setSelectedProjectId,onNew,onEdit,onDelete,onPatch}:{data:AppData;selectedProjectId:string;setSelectedProjectId:(id:string)=>void;onNew:()=>void;onEdit:(p:Project)=>void;onDelete:(p:Project)=>void;onPatch:(id:string,p:Partial<Project>)=>void}){
 const selected=data.projects.find(p=>p.id===selectedProjectId)||data.projects[0];
 return <><SectionTitle eyebrow="Projects" title="Every client and project in one place." copy="Brand rules, assets and content all stay attached to the project." actions={<Button onClick={onNew}>+ New Project</Button>} />
 <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><div className="space-y-3">{data.projects.map(p=><button key={p.id} onClick={()=>setSelectedProjectId(p.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id===p.id?'border-white/20 bg-white/[0.07]':'border-white/8 bg-white/[0.025] hover:bg-white/[0.045]'}`}><div className="flex items-start justify-between gap-3"><div><div className="font-bold">{p.name}</div><div className="mt-1 text-xs text-white/35">{p.clientName||'No client'} · {p.category}</div></div><Pill>{p.status}</Pill></div><div className="mt-4 flex gap-2 text-[11px] text-white/35"><span>{data.assets.filter(a=>a.projectId===p.id).length} assets</span><span>·</span><span>{data.content.filter(c=>c.projectId===p.id).length} content</span></div></button>)}</div>
 {selected?<Card className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.17em] text-white/30">Selected project</div><h2 className="mt-2 text-2xl font-black">{selected.name}</h2><p className="mt-2 text-sm text-white/40">{selected.notes||'No project notes yet.'}</p></div><div className="flex gap-2"><Button variant="ghost" onClick={()=>onEdit(selected)}>Edit</Button><Button variant="danger" onClick={()=>onDelete(selected)}>Delete</Button></div></div>
 <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-white/45">Brand name<Input value={selected.brand.brandName} onChange={e=>onPatch(selected.id,{brand:{...selected.brand,brandName:e.target.value}})} /></label><label className="text-xs text-white/45">Tone of voice<Input value={selected.brand.tone} onChange={e=>onPatch(selected.id,{brand:{...selected.brand,tone:e.target.value}})} /></label><label className="text-xs text-white/45">CTA style<Input value={selected.brand.ctaStyle} onChange={e=>onPatch(selected.id,{brand:{...selected.brand,ctaStyle:e.target.value}})} /></label><label className="text-xs text-white/45">Default hashtags<Input value={selected.brand.defaultHashtags} onChange={e=>onPatch(selected.id,{brand:{...selected.brand,defaultHashtags:e.target.value}})} /></label><label className="text-xs text-white/45 sm:col-span-2">Banned words<Input value={selected.brand.bannedWords} onChange={e=>onPatch(selected.id,{brand:{...selected.brand,bannedWords:e.target.value}})} /></label></div><div className="mt-4 text-xs text-white/30">Brand settings save automatically.</div></Card>:null}</div></>;
}

function AssetThumb({asset,url}:{asset:Asset;url?:string}){ const src=asset.source==='remote'?asset.remoteUrl:url; return <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/[0.04]">{src?(asset.kind==='video'?<video src={src} className="h-full w-full object-cover" controls preload="metadata"/>:<img src={src} alt={asset.name} className="h-full w-full object-cover"/>):<div className="grid h-full place-items-center text-xs text-white/25">Asset loading…</div>}</div>; }

function AssetsView({project,projects,setProject,assets,urls,selected,setSelected,filter,setFilter,onUpload,onPatch,onDelete,onCreate}:{project?:Project;projects:Project[];setProject:(id:string)=>void;assets:Asset[];urls:Record<string,string>;selected:string[];setSelected:(v:string[])=>void;filter:any;setFilter:(v:any)=>void;onUpload:()=>void;onPatch:(id:string,p:Partial<Asset>)=>void;onDelete:(a:Asset)=>void;onCreate:()=>void}){
 return <><SectionTitle eyebrow="Asset library" title="Organize the visuals before you build content." copy="Upload photos or videos, tag the room/type, rate the strongest frames and select anything you want to turn into content." actions={<><Button variant="ghost" onClick={onUpload}>Upload</Button><Button disabled={!selected.length} onClick={onCreate}>Create Content ({selected.length})</Button></>} />
 <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]"><Select value={project?.id||''} onChange={e=>setProject(e.target.value)}>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</Select><div className="flex gap-2"><Button variant={filter==='all'?'soft':'ghost'} onClick={()=>setFilter('all')}>All</Button><Button variant={filter==='unused'?'soft':'ghost'} onClick={()=>setFilter('unused')}>Unused</Button><Button variant={filter==='favorites'?'soft':'ghost'} onClick={()=>setFilter('favorites')}>Favorites</Button></div></div>
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{assets.map(a=>{const active=selected.includes(a.id);return <Card key={a.id} className={`overflow-hidden p-3 transition ${active?'ring-2 ring-violet-300/40':''}`}><button onClick={()=>setSelected(active?selected.filter(x=>x!==a.id):[...selected,a.id])} className="block w-full text-left"><AssetThumb asset={a} url={urls[a.id]}/></button><div className="mt-3 flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-bold">{a.name}</div><div className="mt-1 text-[11px] text-white/30">{a.kind} · {a.used?'used':'unused'}</div></div><button onClick={()=>onPatch(a.id,{favorite:!a.favorite})} className={`text-lg ${a.favorite?'text-amber-300':'text-white/20'}`}>★</button></div><div className="mt-3 grid grid-cols-2 gap-2"><Select value={a.tag} onChange={e=>onPatch(a.id,{tag:e.target.value as AssetTag})}>{TAGS.map(t=><option key={t}>{t}</option>)}</Select><Select value={a.rating} onChange={e=>onPatch(a.id,{rating:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{'★'.repeat(n)}</option>)}</Select></div><Textarea rows={2} className="mt-2" value={a.notes} onChange={e=>onPatch(a.id,{notes:e.target.value})} placeholder="Asset notes…"/><div className="mt-2 flex gap-2"><Button className="flex-1" variant="ghost" onClick={()=>onPatch(a.id,{used:!a.used})}>{a.used?'Mark unused':'Mark used'}</Button><Button variant="danger" onClick={()=>onDelete(a)}>Delete</Button></div></Card>})}</div>{!assets.length?<Card className="p-12 text-center"><div className="text-lg font-bold">No assets here yet.</div><div className="mt-2 text-sm text-white/35">Upload project photos or videos to start.</div><div className="mt-5"><Button onClick={onUpload}>Upload Assets</Button></div></Card>:null}</>;
}

function ContentView({data,items,filter,setFilter,onNew,onEdit,onDelete,onStatus}:{data:AppData;items:ContentItem[];filter:any;setFilter:(v:any)=>void;onNew:()=>void;onEdit:(c:ContentItem)=>void;onDelete:(c:ContentItem)=>void;onStatus:(c:ContentItem,s:ContentStatus)=>void}){
 return <><SectionTitle eyebrow="Content" title="Draft, review and move every piece forward." copy="Nothing disappears into chats or notes. Every content item has one clear status." actions={<Button onClick={onNew}>+ Generate Draft</Button>} />
 <div className="mb-5 flex flex-wrap gap-2">{(['all','draft','in_review','approved','ready','published'] as const).map(s=><Button key={s} variant={filter===s?'soft':'ghost'} onClick={()=>setFilter(s)}>{s==='all'?'All':s==='in_review'?'My Approval':STATUS_LABEL[s as ContentStatus]}</Button>)}</div>
 <div className="space-y-3">{items.map(c=>{const p=data.projects.find(x=>x.id===c.projectId);return <Card key={c.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Pill>{c.format.replace('_',' ')}</Pill><Pill>{STATUS_LABEL[c.status]}</Pill>{c.publishDate?<Pill>{c.publishDate}</Pill>:null}</div><div className="mt-3 text-lg font-bold">{c.title}</div><div className="mt-1 text-xs text-white/35">{p?.name} · {c.assetIds.length} assets</div><div className="mt-3 line-clamp-2 text-sm leading-6 text-white/45">{c.captionEn}</div></div><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={()=>onEdit(c)}>Edit</Button>{c.status==='draft'?<Button onClick={()=>onStatus(c,'in_review')}>Send to My Approval</Button>:null}{c.status==='approved'?<Button onClick={()=>onStatus(c,'ready')}>Mark Ready</Button>:null}<Button variant="danger" onClick={()=>onDelete(c)}>Delete</Button></div></div></Card>})}</div>{!items.length?<Card className="p-12 text-center text-sm text-white/35">No content matches this filter.</Card>:null}</>;
}

function ApprovalView({data,items,onEdit,onApprove,onDraft}:{data:AppData;items:ContentItem[];onEdit:(c:ContentItem)=>void;onApprove:(c:ContentItem)=>void;onDraft:(c:ContentItem)=>void}){
 return <><SectionTitle eyebrow="My approval" title="Only the content waiting for your decision." copy="No clients or extra accounts. You are the only approver." />{items.length?<div className="grid gap-5 xl:grid-cols-2">{items.map(c=>{const p=data.projects.find(x=>x.id===c.projectId);const assets=c.assetIds.map(id=>data.assets.find(a=>a.id===id)).filter(Boolean) as Asset[];return <Card key={c.id} className="p-5"><div className="flex flex-wrap gap-2"><Pill>{p?.name}</Pill><Pill>{c.format.replace('_',' ')}</Pill></div><h3 className="mt-4 text-xl font-bold">{c.title}</h3><div className="mt-4 grid grid-cols-3 gap-2">{assets.slice(0,3).map(a=><div key={a.id} className="aspect-square rounded-xl bg-white/[0.05] p-2 text-xs text-white/35">{a.name}</div>)}</div><div className="mt-4 rounded-xl bg-black/25 p-4 text-sm leading-6 text-white/50">{c.captionEn}</div><div dir="rtl" className="mt-2 rounded-xl bg-black/25 p-4 text-sm leading-7 text-white/50">{c.captionAr}</div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={()=>onApprove(c)}>Approve</Button><Button variant="ghost" onClick={()=>onEdit(c)}>Edit</Button><Button variant="danger" onClick={()=>onDraft(c)}>Send Back to Draft</Button></div></Card>})}</div>:<Card className="p-12 text-center"><div className="text-xl font-bold">Approval queue is clear.</div><div className="mt-2 text-sm text-white/35">Move a Draft to “My Approval” when you want to review it.</div></Card>}</>;
}

function CalendarView({data,onDate,onEdit}:{data:AppData;onDate:(c:ContentItem,d:string)=>void;onEdit:(c:ContentItem)=>void}){
 const [month,setMonth]=useState(today().slice(0,7)); const items=[...data.content].filter(c=>c.publishDate.startsWith(month)).sort((a,b)=>a.publishDate.localeCompare(b.publishDate));
 return <><SectionTitle eyebrow="Calendar" title="See exactly what is going out and when." copy="Change any publish date directly; the schedule updates instantly." actions={<Input type="month" value={month} onChange={e=>setMonth(e.target.value)} />} />
 <div className="space-y-3">{items.map(c=>{const p=data.projects.find(x=>x.id===c.projectId);return <Card key={c.id} className="p-4"><div className="grid gap-4 md:grid-cols-[140px_1fr_auto] md:items-center"><Input type="date" value={c.publishDate} onChange={e=>onDate(c,e.target.value)} /><div><div className="font-bold">{c.title}</div><div className="mt-1 text-xs text-white/35">{p?.name} · {STATUS_LABEL[c.status]} · {c.format.replace('_',' ')}</div></div><Button variant="ghost" onClick={()=>onEdit(c)}>Open</Button></div></Card>})}{!items.length?<Card className="p-12 text-center text-sm text-white/35">No content scheduled for this month. Open Content and add a publish date.</Card>:null}</div>
 <div className="mt-6"><SectionTitle eyebrow="Unscheduled" title="Content without a date"/><div className="space-y-2">{data.content.filter(c=>!c.publishDate).map(c=><Card key={c.id} className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_180px]"><div><div className="font-semibold">{c.title}</div><div className="mt-1 text-xs text-white/30">{STATUS_LABEL[c.status]}</div></div><Input type="date" value="" onChange={e=>onDate(c,e.target.value)} /></div></Card>)}</div></div></>;
}

function ReadyView({data,items,onCopy,onStatus,onEdit,onExport}:{data:AppData;items:ContentItem[];onCopy:(t:string)=>void;onStatus:(c:ContentItem,s:ContentStatus)=>void;onEdit:(c:ContentItem)=>void;onExport:(c:ContentItem,k:'txt'|'json')=>void}){
 return <><SectionTitle eyebrow="Ready to post" title="Everything final, clean and copyable." copy="Copy captions and hashtags, export the package, then mark it published." />
 <div className="space-y-4">{items.map(c=>{const p=data.projects.find(x=>x.id===c.projectId);return <Card key={c.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Pill>{p?.name}</Pill><Pill>{STATUS_LABEL[c.status]}</Pill>{c.publishDate?<Pill>{c.publishDate}</Pill>:null}</div><h3 className="mt-3 text-xl font-bold">{c.title}</h3><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="rounded-xl bg-black/25 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">English</div><p className="mt-2 text-sm leading-6 text-white/55">{c.captionEn}</p><Button className="mt-3" variant="ghost" onClick={()=>onCopy(c.captionEn)}>Copy English</Button></div><div dir="rtl" className="rounded-xl bg-black/25 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-white/25">Arabic</div><p className="mt-2 text-sm leading-7 text-white/55">{c.captionAr}</p><Button className="mt-3" variant="ghost" onClick={()=>onCopy(c.captionAr)}>Copy Arabic</Button></div></div><div className="mt-3 rounded-xl border border-white/7 bg-black/20 p-4 text-sm text-white/45">{c.hashtags}<div><Button className="mt-3" variant="ghost" onClick={()=>onCopy(c.hashtags)}>Copy Hashtags</Button></div></div></div><div className="flex shrink-0 flex-row flex-wrap gap-2 xl:w-44 xl:flex-col"><Button variant="ghost" onClick={()=>onEdit(c)}>Edit</Button><Button variant="ghost" onClick={()=>onExport(c,'txt')}>Download TXT</Button><Button variant="ghost" onClick={()=>onExport(c,'json')}>Download JSON</Button>{c.status==='approved'?<Button onClick={()=>onStatus(c,'ready')}>Mark Ready</Button>:null}{c.status!=='published'?<Button onClick={()=>onStatus(c,'published')}>Mark Published</Button>:<Button variant="soft" onClick={()=>onStatus(c,'ready')}>Reopen</Button>}</div></div></Card>})}{!items.length?<Card className="p-12 text-center text-sm text-white/35">Approve content first and it will appear here.</Card>:null}</div></>;
}

function ProjectModal({open,project,onClose,onSave}:{open:boolean;project:Project|null;onClose:()=>void;onSave:(p:Project)=>void}){
 const blank:Project={id:id('project'),name:'',clientName:'',category:'interior',notes:'',audience:'',language:'bilingual',status:'active',createdAt:new Date().toISOString(),brand:{brandName:'',tone:'',ctaStyle:'',bannedWords:'',defaultHashtags:'#InteriorDesign #DesignDetails',language:'bilingual'}};
 const [draft,setDraft]=useState<Project>(blank); useEffect(()=>{if(open)setDraft(project?JSON.parse(JSON.stringify(project)):{...blank,id:id('project')});},[open,project]); if(!open)return null;
 return <Modal open={open} onClose={onClose}><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">Project</div><h2 className="mt-2 text-2xl font-black">{project?'Edit project':'Create project'}</h2></div><button onClick={onClose} className="text-white/40">✕</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs text-white/45 sm:col-span-2">Project name<Input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label><label className="text-xs text-white/45">Brand / client<Input value={draft.clientName} onChange={e=>setDraft(d=>({...d,clientName:e.target.value,brand:{...d.brand,brandName:d.brand.brandName||e.target.value}}))}/></label><label className="text-xs text-white/45">Category<Select value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as Project['category']}))}><option value="interior">Interior</option><option value="furniture">Furniture</option><option value="architecture">Architecture</option><option value="other">Other</option></Select></label><label className="text-xs text-white/45">Language<Select value={draft.language} onChange={e=>setDraft(d=>({...d,language:e.target.value as Language,brand:{...d.brand,language:e.target.value as Language}}))}><option value="english">English</option><option value="arabic">Arabic</option><option value="bilingual">Bilingual</option></Select></label><label className="text-xs text-white/45">Status<Select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value as ProjectStatus}))}><option value="new">New</option><option value="active">Active</option><option value="paused">Paused</option><option value="complete">Complete</option></Select></label><label className="text-xs text-white/45 sm:col-span-2">Target audience<Input value={draft.audience} onChange={e=>setDraft(d=>({...d,audience:e.target.value}))}/></label><label className="text-xs text-white/45 sm:col-span-2">Notes<Textarea rows={3} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></label></div><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim()} onClick={()=>onSave(draft)}>Save Project</Button></div></Modal>;
}

function ContentModal({open,item,data,onClose,onSave}:{open:boolean;item:ContentItem|null;data:AppData;onClose:()=>void;onSave:(c:ContentItem)=>void}){
 const blank:ContentItem={id:id('content'),projectId:data.projects[0]?.id||'',title:'',format:'single_post',assetIds:[],hook:'',captionEn:'',captionAr:'',cta:'',hashtags:'',notes:'',publishDate:'',status:'draft',createdAt:new Date().toISOString()};
 const [draft,setDraft]=useState<ContentItem>(blank); useEffect(()=>{if(open)setDraft(item?JSON.parse(JSON.stringify(item)):{...blank,id:id('content'),projectId:data.projects[0]?.id||''});},[open,item]); if(!open)return null;
 const assets=data.assets.filter(a=>a.projectId===draft.projectId);
 return <Modal open={open} onClose={onClose} wide><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">Content editor</div><h2 className="mt-2 text-2xl font-black">{draft.title||'New content'}</h2></div><button onClick={onClose} className="text-white/40">✕</button></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="space-y-3"><label className="text-xs text-white/45">Project<Select value={draft.projectId} onChange={e=>setDraft(d=>({...d,projectId:e.target.value,assetIds:[]}))}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></label><label className="text-xs text-white/45">Title<Input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs text-white/45">Format<Select value={draft.format} onChange={e=>setDraft(d=>({...d,format:e.target.value as ContentFormat}))}><option value="carousel">Carousel</option><option value="reel">Reel</option><option value="story_set">Story Set</option><option value="single_post">Single Post</option></Select></label><label className="text-xs text-white/45">Status<Select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value as ContentStatus}))}><option value="draft">Draft</option><option value="in_review">Needs My Approval</option><option value="approved">Approved</option><option value="ready">Ready To Post</option><option value="published">Published</option></Select></label></div><label className="text-xs text-white/45">Publish date<Input type="date" value={draft.publishDate} onChange={e=>setDraft(d=>({...d,publishDate:e.target.value}))}/></label><label className="text-xs text-white/45">Hook<Input value={draft.hook} onChange={e=>setDraft(d=>({...d,hook:e.target.value}))}/></label><label className="text-xs text-white/45">CTA<Input value={draft.cta} onChange={e=>setDraft(d=>({...d,cta:e.target.value}))}/></label><label className="text-xs text-white/45">Hashtags<Textarea rows={2} value={draft.hashtags} onChange={e=>setDraft(d=>({...d,hashtags:e.target.value}))}/></label></div><div className="space-y-3"><label className="text-xs text-white/45">English caption<Textarea rows={7} value={draft.captionEn} onChange={e=>setDraft(d=>({...d,captionEn:e.target.value}))}/></label><label className="text-xs text-white/45">Arabic caption<Textarea dir="rtl" rows={7} value={draft.captionAr} onChange={e=>setDraft(d=>({...d,captionAr:e.target.value}))}/></label><label className="text-xs text-white/45">Internal notes<Textarea rows={3} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></label></div></div><div className="mt-5"><div className="text-xs font-bold text-white/45">Assets</div><div className="mt-2 flex flex-wrap gap-2">{assets.map(a=>{const active=draft.assetIds.includes(a.id);return <button key={a.id} onClick={()=>setDraft(d=>({...d,assetIds:active?d.assetIds.filter(x=>x!==a.id):[...d.assetIds,a.id]}))} className={`rounded-xl border px-3 py-2 text-xs ${active?'border-violet-300/30 bg-violet-400/12 text-violet-100':'border-white/8 bg-white/[0.03] text-white/40'}`}>{a.name}</button>})}</div></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!draft.title.trim()||!draft.projectId} onClick={()=>onSave(draft)}>Save Content</Button></div></Modal>;
}
