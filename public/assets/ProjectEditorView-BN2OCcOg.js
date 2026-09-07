import{n as be,a as Xe,b as et}from"./useNotify-CImodwCC.js";import{u as tt}from"./useFormat-BmMcWoyy.js";import{x as n,c as u,F as z,r as X,a as e,D as Te,n as H,b as ae,f as L,t as c,p as V,e as _,d as f,h as Z,v as Q,O as at,S as F,M as je,m as O,w as me,K as Le,B as $e,o as qe,I as Oe,g as Ne,ad as st,C as it,k as _e,s as Ke,q as Je,A as ge,an as rt,X as ot,a9 as ue,ao as lt,u as nt}from"./index-BBLwCqFL.js";import{u as ze}from"./screenProjects-DcAo1-U8.js";import{_ as ve}from"./_plugin-vue_export-helper-DlAUqK2U.js";import{u as we}from"./useI18n-BoLF5j_m.js";import{d as Pe,b as dt}from"./useConfirm-DxCm97MR.js";import{c as ct,a as ut,b as Ce,d as Se,g as pt,p as ft,W as mt,e as vt}from"./previewRuntimes-9rFmFJjr.js";import{_ as Ue}from"./CodeEditor-B9ga1uqG.js";import"./toasts-Dp7QbukQ.js";const bt={class:"row g-3"},ht=["onClick","onKeyup"],gt={class:"schematic"},yt={viewBox:"0 0 120 70",xmlns:"http://www.w3.org/2000/svg",preserveAspectRatio:"xMidYMid meet"},kt=["fill"],xt=["fill"],wt=["fill"],$t=["fill"],_t={class:"pick-body"},Ct={class:"d-flex align-items-center mb-1"},St={class:"fw-semibold"},At={key:0,class:"badge bg-primary ms-auto"},Pt={key:1,class:"badge bg-light text-secondary ms-auto small"},Tt={class:"small text-secondary mb-0"},Et={__name:"LayoutPicker",props:{modelValue:{type:String,default:"sidebar-left"}},emits:["update:modelValue"],setup(s,{expose:t,emit:a}){const i=s,p=a,r=[{kind:"sidebar-left",label:"좌측 사이드바",description:"일반적인 어드민 레이아웃. 좌측 메뉴 + 상단 타이틀.",category:"admin"},{kind:"sidebar-dark",label:"어두운 사이드바",description:"좌측 메뉴가 어두운 톤. 대시보드 느낌.",category:"admin"},{kind:"top-nav",label:"상단 네비",description:"사이드바 없이 상단 네비만. 단순한 페이지용.",category:"web"},{kind:"sidebar-right",label:"우측 사이드바",description:"우측에 사이드 메뉴 — 콘텐츠 중심 배치.",category:"admin"},{kind:"sidebar-both",label:"좌우 사이드바",description:"메인 메뉴 + 보조 패널을 양쪽에 배치.",category:"admin"},{kind:"top-and-side",label:"상단 + 좌측",description:"상단 네비와 좌측 서브 메뉴 — 2단계 네비게이션.",category:"admin"},{kind:"hero-landing",label:"Hero 랜딩",description:"히어로 섹션 + 스크롤 콘텐츠 — 랜딩 페이지용.",category:"web"},{kind:"split-panel",label:"좌우 분할",description:"좌우 동일 분할 — 마스터-디테일 패턴.",category:"app"},{kind:"card-grid",label:"카드 그리드",description:"전체 화면 카드 그리드 — 대시보드형.",category:"app"}];function d(h){h!==i.modelValue&&p("update:modelValue",h)}const g=V(()=>r.find(h=>h.kind===i.modelValue)||r[0]);return t({currentPreset:g,presets:r}),(h,l)=>(n(),u("div",bt,[(n(),u(z,null,X(r,o=>e("div",{key:o.kind,class:"col-md-4 col-sm-6"},[e("div",{class:H(["pick-card h-100",{selected:s.modelValue===o.kind}]),onClick:m=>d(o.kind),tabindex:"0",role:"button",onKeyup:Te(m=>d(o.kind),["enter"])},[e("div",gt,[(n(),u("svg",yt,[l[8]||(l[8]=e("rect",{width:"120",height:"70",fill:"#f8fafc",rx:"3"},null,-1)),o.kind==="sidebar-left"||o.kind==="sidebar-dark"?(n(),u(z,{key:0},[e("rect",{x:"0",y:"0",width:"30",height:"70",fill:o.kind==="sidebar-dark"?"#1e2a3a":"#e2e8f0",rx:"3"},null,8,kt),e("rect",{x:"5",y:"8",width:"20",height:"3",rx:"1",fill:o.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,xt),e("rect",{x:"5",y:"14",width:"20",height:"3",rx:"1",fill:o.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,wt),e("rect",{x:"5",y:"20",width:"20",height:"3",rx:"1",fill:o.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,$t),l[0]||(l[0]=ae('<rect x="30" y="0" width="90" height="10" fill="#ffffff" data-v-a145cee8></rect><line x1="30" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="36" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="36" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="36" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="77" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',6))],64)):o.kind==="top-nav"?(n(),u(z,{key:1},[l[1]||(l[1]=ae('<rect x="0" y="0" width="120" height="12" fill="#ffffff" data-v-a145cee8></rect><line x1="0" y1="12" x2="120" y2="12" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="6" y="4" width="24" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="50" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="66" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="82" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="98" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="6" y="18" width="108" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="6" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="62" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',10))],64)):o.kind==="sidebar-right"?(n(),u(z,{key:2},[l[2]||(l[2]=ae('<rect x="0" y="0" width="90" height="10" fill="#ffffff" data-v-a145cee8></rect><line x1="0" y1="10" x2="90" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="6" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="90" y="0" width="30" height="70" fill="#e2e8f0" rx="3" data-v-a145cee8></rect><rect x="95" y="8" width="20" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="95" y="14" width="20" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="95" y="20" width="20" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="6" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="6" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="47" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',10))],64)):o.kind==="sidebar-both"?(n(),u(z,{key:3},[l[3]||(l[3]=ae('<rect x="0" y="0" width="24" height="70" fill="#1e2a3a" rx="3" data-v-a145cee8></rect><rect x="4" y="8" width="16" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="4" y="14" width="16" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="4" y="20" width="16" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="96" y="0" width="24" height="70" fill="#f1f5f9" rx="3" data-v-a145cee8></rect><rect x="100" y="8" width="16" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="100" y="14" width="16" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="24" y="0" width="72" height="10" fill="#ffffff" data-v-a145cee8></rect><line x1="24" y1="10" x2="96" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="28" y="3" width="22" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="28" y="16" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="28" y="42" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',12))],64)):o.kind==="top-and-side"?(n(),u(z,{key:4},[l[4]||(l[4]=ae('<rect x="0" y="0" width="120" height="10" fill="#1e2a3a" data-v-a145cee8></rect><rect x="6" y="3" width="22" height="4" rx="1" fill="#fff" data-v-a145cee8></rect><rect x="50" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="64" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="78" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="0" y="10" width="28" height="60" fill="#e2e8f0" data-v-a145cee8></rect><rect x="4" y="16" width="20" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="4" y="22" width="20" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="4" y="28" width="20" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="32" y="14" width="84" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="32" y="38" width="84" height="28" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',11))],64)):o.kind==="hero-landing"?(n(),u(z,{key:5},[l[5]||(l[5]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-a145cee8></rect><rect x="6" y="3" width="18" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="80" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="92" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="104" y="4" width="12" height="4" rx="1" fill="#0d6efd" data-v-a145cee8></rect><rect x="0" y="10" width="120" height="32" fill="#f1f5f9" data-v-a145cee8></rect><rect x="20" y="18" width="80" height="5" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="30" y="26" width="60" height="3" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="42" y="33" width="18" height="5" rx="2" fill="#0d6efd" data-v-a145cee8></rect><rect x="62" y="33" width="18" height="5" rx="2" fill="#fff" stroke="#0d6efd" stroke-width="0.5" data-v-a145cee8></rect><rect x="6" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="43" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="80" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect>',13))],64)):o.kind==="split-panel"?(n(),u(z,{key:6},[l[6]||(l[6]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-a145cee8></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="6" y="16" width="52" height="50" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="10" y="20" width="44" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="10" y="26" width="44" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="10" y="32" width="44" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="10" y="38" width="44" height="3" rx="1" fill="#94a3b8" data-v-a145cee8></rect><rect x="62" y="16" width="52" height="50" rx="2" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.5" data-v-a145cee8></rect><rect x="66" y="22" width="30" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><rect x="66" y="30" width="44" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="66" y="35" width="44" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="66" y="40" width="44" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect>',13))],64)):o.kind==="card-grid"?(n(),u(z,{key:7},[l[7]||(l[7]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-a145cee8></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-a145cee8></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></line><rect x="6" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="43" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="80" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="6" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="43" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="80" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-a145cee8></rect><rect x="10" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="47" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="84" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="10" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="47" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect><rect x="84" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-a145cee8></rect>',15))],64)):L("",!0)]))]),e("div",_t,[e("div",Ct,[e("span",St,c(o.label),1),s.modelValue===o.kind?(n(),u("span",At,[...l[9]||(l[9]=[e("i",{class:"bi bi-check-lg"},null,-1)])])):(n(),u("span",Pt,c(o.category),1))]),e("p",Tt,c(o.description),1)])],42,ht)])),64))]))}},Rt=ve(Et,[["__scopeId","data-v-a145cee8"]]),jt={class:"accordion",id:"layoutCustomizerAccordion"},Lt={class:"accordion-item"},Nt={class:"accordion-header"},zt={class:"accordion-button",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccTitle","aria-expanded":"true"},Wt={id:"cAccTitle",class:"accordion-collapse collapse show"},Mt={class:"accordion-body"},It={class:"row g-3"},Dt={class:"col-md-6"},Ot={class:"form-label small"},Ut=["placeholder"],Vt={class:"col-md-6"},Bt={class:"form-label small"},Ft={class:"text-secondary"},Ht={class:"col-md-4"},qt={class:"form-label small"},Kt={class:"input-group input-group-sm"},Jt={class:"col-md-4"},Gt={class:"form-label small"},Zt={class:"input-group input-group-sm"},Yt={class:"col-md-4"},Qt={class:"form-label small"},Xt={key:0,class:"accordion-item"},ea={class:"accordion-header"},ta={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccSidebar"},aa={id:"cAccSidebar",class:"accordion-collapse collapse"},sa={class:"accordion-body"},ia={key:0,class:"row g-3 mb-3"},ra={class:"col-md-3"},oa={class:"form-label small"},la={class:"input-group input-group-sm"},na={class:"col-md-3"},da={class:"form-label small"},ca={class:"input-group input-group-sm"},ua={class:"col-md-3"},pa={class:"form-label small"},fa={class:"input-group input-group-sm"},ma={class:"col-md-3"},va={class:"form-label small"},ba={key:1,class:"text-secondary small mb-3"},ha={class:"d-flex justify-content-between align-items-center mb-2"},ga={class:"form-label small mb-0"},ya={key:2,class:"text-secondary small py-2"},ka={key:3,class:"menu-item-list"},xa=["onUpdate:modelValue"],wa=["value"],$a=["onUpdate:modelValue","placeholder"],_a=["onUpdate:modelValue"],Ca={class:"btn-group"},Sa=["onClick","disabled","title"],Aa=["onClick","disabled","title"],Pa=["onClick","title"],Ta={class:"accordion-item"},Ea={class:"accordion-header"},Ra={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccMain"},ja={id:"cAccMain",class:"accordion-collapse collapse"},La={class:"accordion-body"},Na={class:"row g-3"},za={class:"col-md-6"},Wa={class:"form-label small"},Ma={class:"input-group input-group-sm"},Ia={class:"col-md-6"},Da={class:"form-label small"},Oa={__name:"LayoutCustomizer",props:{layout:{type:Object,required:!0}},emits:["update:layout"],setup(s,{emit:t}){const{t:a}=we(),i=s,p=t,r=V({get:()=>i.layout,set:j=>p("update:layout",j)}),d=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-nav","top-and-side"]),g=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both"]),h=V(()=>{var j;return d.has((j=i.layout)==null?void 0:j.kind)}),l=V(()=>{var j;return g.has((j=i.layout)==null?void 0:j.kind)}),o=V(()=>{var y;const j=(y=i.layout)==null?void 0:y.kind;return j==="top-nav"||j==="top-and-side"?"상단 네비 메뉴":"사이드바 메뉴"}),m=V(()=>{var y;const j=(y=i.layout)==null?void 0:y.kind;return j==="top-nav"||j==="top-and-side"?"bi-menu-button-wide":"bi-layout-sidebar"}),k=["bi-house-door","bi-list","bi-grid","bi-person","bi-gear","bi-file-text","bi-bar-chart","bi-cart","bi-bell","bi-envelope","bi-calendar","bi-folder","bi-images","bi-book"];function x(){r.value.sidebar||(r.value.sidebar={items:[]}),Array.isArray(r.value.sidebar.items)||(r.value.sidebar.items=[]),r.value.sidebar.items.push({icon:"bi-house-door",label:a("layoutCustomizer.k21"),path:"/"})}function $(j){r.value.sidebar.items.splice(j,1)}function I(j,y){const E=r.value.sidebar.items,A=j+y;if(A<0||A>=E.length)return;const[P]=E.splice(j,1);E.splice(A,0,P)}return(j,y)=>{var E,A;return n(),u("div",jt,[e("div",Lt,[e("h2",Nt,[e("button",zt,[y[17]||(y[17]=e("i",{class:"bi bi-window me-2"},null,-1)),_(c(f(a)("layoutCustomizer.k1")),1)])]),e("div",Wt,[e("div",Mt,[e("div",It,[e("div",Dt,[e("label",Ot,c(f(a)("layoutCustomizer.k2")),1),Z(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[0]||(y[0]=P=>r.value.title.text=P),placeholder:f(a)("layoutCustomizer.k16")},null,8,Ut),[[Q,r.value.title.text]])]),e("div",Vt,[e("label",Bt,[_(c(f(a)("layoutCustomizer.k3"))+" ",1),e("span",Ft,c(f(a)("layoutCustomizer.k4")),1)]),Z(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[1]||(y[1]=P=>r.value.title.logoUrl=P),placeholder:"https://..."},null,512),[[Q,r.value.title.logoUrl]])]),e("div",Ht,[e("label",qt,c(f(a)("layoutCustomizer.k5")),1),e("div",Kt,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[2]||(y[2]=P=>r.value.title.bgColor=P)},null,512),[[Q,r.value.title.bgColor]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[3]||(y[3]=P=>r.value.title.bgColor=P)},null,512),[[Q,r.value.title.bgColor]])])]),e("div",Jt,[e("label",Gt,c(f(a)("layoutCustomizer.k6")),1),e("div",Zt,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[4]||(y[4]=P=>r.value.title.fgColor=P)},null,512),[[Q,r.value.title.fgColor]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[5]||(y[5]=P=>r.value.title.fgColor=P)},null,512),[[Q,r.value.title.fgColor]])])]),e("div",Yt,[e("label",Qt,c(f(a)("layoutCustomizer.k7")),1),Z(e("input",{type:"number",class:"form-control form-control-sm",min:"40",max:"120","onUpdate:modelValue":y[6]||(y[6]=P=>r.value.title.height=P)},null,512),[[Q,r.value.title.height,void 0,{number:!0}]])])])])])]),h.value?(n(),u("div",Xt,[e("h2",ea,[e("button",ta,[e("i",{class:H(["bi me-2",m.value])},null,2),_(c(o.value),1)])]),e("div",aa,[e("div",sa,[l.value?(n(),u("div",ia,[e("div",ra,[e("label",oa,c(f(a)("layoutCustomizer.k5")),1),e("div",la,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[7]||(y[7]=P=>r.value.sidebar.bgColor=P)},null,512),[[Q,r.value.sidebar.bgColor]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[8]||(y[8]=P=>r.value.sidebar.bgColor=P)},null,512),[[Q,r.value.sidebar.bgColor]])])]),e("div",na,[e("label",da,c(f(a)("layoutCustomizer.k6")),1),e("div",ca,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[9]||(y[9]=P=>r.value.sidebar.fgColor=P)},null,512),[[Q,r.value.sidebar.fgColor]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[10]||(y[10]=P=>r.value.sidebar.fgColor=P)},null,512),[[Q,r.value.sidebar.fgColor]])])]),e("div",ua,[e("label",pa,c(f(a)("layoutCustomizer.k8")),1),e("div",fa,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[11]||(y[11]=P=>r.value.sidebar.activeBg=P)},null,512),[[Q,r.value.sidebar.activeBg]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[12]||(y[12]=P=>r.value.sidebar.activeBg=P)},null,512),[[Q,r.value.sidebar.activeBg]])])]),e("div",ma,[e("label",va,c(f(a)("layoutCustomizer.k9")),1),Z(e("input",{type:"number",class:"form-control form-control-sm",min:"160",max:"320","onUpdate:modelValue":y[13]||(y[13]=P=>r.value.sidebar.width=P)},null,512),[[Q,r.value.sidebar.width,void 0,{number:!0}]])])])):(n(),u("div",ba,[y[18]||(y[18]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),_(" "+c(f(a)("layoutCustomizer.k10")),1)])),e("div",ha,[e("label",ga,c(f(a)("layoutCustomizer.k11")),1),e("button",{class:"btn btn-sm btn-outline-primary",onClick:x},[y[19]||(y[19]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),_(c(f(a)("layoutCustomizer.k12")),1)])]),(A=(E=r.value.sidebar)==null?void 0:E.items)!=null&&A.length?(n(),u("div",ka,[(n(!0),u(z,null,X(r.value.sidebar.items,(P,ee)=>(n(),u("div",{key:ee,class:"menu-item-row"},[Z(e("select",{"onUpdate:modelValue":S=>P.icon=S,class:"form-select form-select-sm icon-select"},[(n(),u(z,null,X(k,S=>e("option",{key:S,value:S},c(S),9,wa)),64))],8,xa),[[at,P.icon]]),Z(e("input",{"onUpdate:modelValue":S=>P.label=S,class:"form-control form-control-sm",placeholder:f(a)("layoutCustomizer.k17")},null,8,$a),[[Q,P.label]]),Z(e("input",{"onUpdate:modelValue":S=>P.path=S,class:"form-control form-control-sm",placeholder:"/path"},null,8,_a),[[Q,P.path]]),e("div",Ca,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:S=>I(ee,-1),disabled:ee===0,title:f(a)("layoutCustomizer.k18")},[...y[20]||(y[20]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,Sa),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:S=>I(ee,1),disabled:ee===r.value.sidebar.items.length-1,title:f(a)("layoutCustomizer.k19")},[...y[21]||(y[21]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,Aa),e("button",{class:"btn btn-sm btn-outline-danger",onClick:S=>$(ee),title:f(a)("layoutCustomizer.k20")},[...y[22]||(y[22]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,Pa)])]))),128))])):(n(),u("div",ya,c(f(a)("layoutCustomizer.k13")),1))])])])):L("",!0),e("div",Ta,[e("h2",Ea,[e("button",Ra,[y[23]||(y[23]=e("i",{class:"bi bi-columns me-2"},null,-1)),_(c(f(a)("layoutCustomizer.k14")),1)])]),e("div",ja,[e("div",La,[e("div",Na,[e("div",za,[e("label",Wa,c(f(a)("layoutCustomizer.k5")),1),e("div",Ma,[Z(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[14]||(y[14]=P=>r.value.mainArea.bgColor=P)},null,512),[[Q,r.value.mainArea.bgColor]]),Z(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[15]||(y[15]=P=>r.value.mainArea.bgColor=P)},null,512),[[Q,r.value.mainArea.bgColor]])])]),e("div",Ia,[e("label",Da,c(f(a)("layoutCustomizer.k15")),1),Z(e("input",{type:"number",class:"form-control form-control-sm",min:"0",max:"64","onUpdate:modelValue":y[16]||(y[16]=P=>r.value.mainArea.padding=P)},null,512),[[Q,r.value.mainArea.padding,void 0,{number:!0}]])])])])])])])}}},Ua=ve(Oa,[["__scopeId","data-v-866b703d"]]),Va=["src"],Ba={class:"mini-title-text"},Fa={class:"mini-menu-label"},Ha={key:0,class:"mini-menu-empty"},qa=["src"],Ka={class:"mini-title-text"},Ja={class:"mini-topnav"},Ga=["src"],Za={class:"mini-title-text"},Ya={class:"mini-menu-label"},Qa={key:0,class:"mini-menu-empty"},Xa={class:"mini-menu-label"},es={key:0,class:"mini-menu-empty"},ts={class:"mini-center"},as={class:"mini-title-text"},ss={class:"mini-title-text"},is={class:"mini-topnav"},rs={class:"mini-menu-label"},os={key:0,class:"mini-menu-empty"},ls={class:"mini-title-text"},ns={class:"mini-topnav"},ds={class:"mini-title-text"},cs={class:"mini-split-list"},us={class:"mini-title-text"},Ve=400,fe=240,ps={__name:"LayoutPreview",props:{layout:{type:Object,required:!0}},setup(s){const t=s,a=V(()=>{var $;return(($=t.layout)==null?void 0:$.kind)||"sidebar-left"}),i=V(()=>{var $;return(($=t.layout)==null?void 0:$.title)||{}}),p=V(()=>{var $;return(($=t.layout)==null?void 0:$.sidebar)||{}}),r=V(()=>{var $;return(($=t.layout)==null?void 0:$.mainArea)||{}}),d=V(()=>p.value.items||[]),g=V(()=>fe/600),h=V(()=>Ve/1e3),l=V(()=>Math.max(18,(i.value.height||60)*g.value)),o=V(()=>Math.max(40,(p.value.width||220)*h.value)),m=V(()=>Math.max(4,(r.value.padding||16)*h.value)),k=V(()=>{const $=a.value;return $==="sidebar-right"?"sidebar-right":$==="sidebar-both"?"sidebar-both":$==="top-and-side"?"top-and-side":$==="hero-landing"?"hero-landing":$==="split-panel"?"split-panel":$==="card-grid"?"card-grid":$==="top-nav"?"top-nav":"sidebar-left"});function x($,I){return($||[]).slice(0,I)}return($,I)=>(n(),u("div",{class:"mini-wrapper",style:F({width:Ve+"px",height:fe+"px"})},[k.value==="sidebar-left"?(n(),u(z,{key:0},[e("div",{class:"mini-title",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(n(),u("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Va)):L("",!0),e("span",Ba,c(i.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:F({height:fe-l.value+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:p.value.bgColor||(a.value==="sidebar-dark"?"#1e2a3a":"#e2e8f0"),color:p.value.fgColor||(a.value==="sidebar-dark"?"#cfd6de":"#334155")})},[(n(!0),u(z,null,X(x(d.value,8),(j,y)=>(n(),u("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:F({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([j.icon,"mini-menu-icon"])},null,2),e("span",Fa,c(j.label),1)],6))),128)),d.value.length?L("",!0):(n(),u("div",Ha,"(메뉴 없음)"))],4),e("div",{class:"mini-main",style:F({backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[...I[0]||(I[0]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):k.value==="top-nav"?(n(),u(z,{key:1},[e("div",{class:"mini-title mini-title--nav",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(n(),u("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,qa)):L("",!0),e("span",Ka,c(i.value.text||"My App"),1),e("div",Ja,[(n(!0),u(z,null,X(x(d.value,5),(j,y)=>(n(),u("span",{key:y,class:"mini-topnav-item"},c(j.label),1))),128))])],4),e("div",{class:"mini-main mini-main--full",style:F({height:fe-l.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[...I[1]||(I[1]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],64)):k.value==="sidebar-right"?(n(),u(z,{key:2},[e("div",{class:"mini-title",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(n(),u("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Ga)):L("",!0),e("span",Za,c(i.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:F({height:fe-l.value+"px"})},[e("div",{class:"mini-main",style:F({backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[...I[2]||(I[2]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4),e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:p.value.bgColor||"#e2e8f0",color:p.value.fgColor||"#334155"})},[(n(!0),u(z,null,X(x(d.value,8),(j,y)=>(n(),u("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:F({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([j.icon,"mini-menu-icon"])},null,2),e("span",Ya,c(j.label),1)],6))),128)),d.value.length?L("",!0):(n(),u("div",Qa,"(메뉴 없음)"))],4)],4)],64)):k.value==="sidebar-both"?(n(),u("div",{key:3,class:"mini-body",style:F({height:fe+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:p.value.bgColor||"#1e2a3a",color:p.value.fgColor||"#cfd6de"})},[(n(!0),u(z,null,X(x(d.value,8),(j,y)=>(n(),u("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:F({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([j.icon,"mini-menu-icon"])},null,2),e("span",Xa,c(j.label),1)],6))),128)),d.value.length?L("",!0):(n(),u("div",es,"(메뉴 없음)"))],4),e("div",ts,[e("div",{class:"mini-title",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",as,c(i.value.text||"My App"),1)],4),e("div",{class:"mini-main",style:F({backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[...I[3]||(I[3]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)]),e("div",{class:"mini-sidebar mini-sidebar--aux",style:F({width:Math.min(o.value,70)+"px",backgroundColor:"#f1f5f9",color:"#64748b"})},[...I[4]||(I[4]=[ae('<div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder short" data-v-582ff2b9></div></div>',3)])],4)],4)):k.value==="top-and-side"?(n(),u(z,{key:4},[e("div",{class:"mini-title mini-title--nav",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#1e2a3a",color:i.value.fgColor||"#ffffff"})},[e("span",ss,c(i.value.text||"My App"),1),e("div",is,[(n(!0),u(z,null,X(x(d.value,3),(j,y)=>(n(),u("span",{key:y,class:"mini-topnav-item"},c(j.label),1))),128))])],4),e("div",{class:"mini-body",style:F({height:fe-l.value+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:p.value.bgColor||"#e2e8f0",color:p.value.fgColor||"#334155"})},[(n(!0),u(z,null,X(x(d.value.slice(3),6),(j,y)=>(n(),u("div",{key:y,class:H(["mini-menu-item mini-menu-item--sub",{active:y===0}]),style:F({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([j.icon,"mini-menu-icon"])},null,2),e("span",rs,c(j.label),1)],6))),128)),d.value.length<=3?(n(),u("div",os,"(서브 메뉴)")):L("",!0)],4),e("div",{class:"mini-main",style:F({backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[...I[5]||(I[5]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):k.value==="hero-landing"?(n(),u(z,{key:5},[e("div",{class:"mini-title mini-title--nav mini-title--compact",style:F({backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",ls,c(i.value.text||"Landing"),1),e("div",ns,[(n(!0),u(z,null,X(x(d.value,4),(j,y)=>(n(),u("span",{key:y,class:"mini-topnav-item"},c(j.label),1))),128)),I[6]||(I[6]=e("span",{class:"mini-topnav-cta"},"시작",-1))])],4),e("div",{class:"mini-hero",style:F({backgroundColor:r.value.bgColor||"#eef2ff"})},[...I[7]||(I[7]=[ae('<div class="mini-hero-title" data-v-582ff2b9></div><div class="mini-hero-sub" data-v-582ff2b9></div><div class="mini-hero-buttons" data-v-582ff2b9><div class="mini-hero-btn primary" data-v-582ff2b9></div><div class="mini-hero-btn" data-v-582ff2b9></div></div>',3)])],4),I[8]||(I[8]=e("div",{class:"mini-landing-features"},[e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"})],-1))],64)):k.value==="split-panel"?(n(),u(z,{key:6},[e("div",{class:"mini-title",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",ds,c(i.value.text||"My App"),1)],4),e("div",{class:"mini-split",style:F({height:fe-l.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[e("div",cs,[(n(),u(z,null,X(5,j=>e("div",{key:j,class:H(["mini-split-row",{active:j===1}])},null,2)),64))]),I[9]||(I[9]=ae('<div class="mini-split-detail" data-v-582ff2b9><div class="mini-split-detail-title" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div></div>',1))],4)],64)):k.value==="card-grid"?(n(),u(z,{key:7},[e("div",{class:"mini-title",style:F({height:l.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",us,c(i.value.text||"My App"),1)],4),e("div",{class:"mini-grid",style:F({height:fe-l.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:m.value+"px"})},[(n(),u(z,null,X(6,j=>e("div",{key:j,class:"mini-grid-card"},[...I[10]||(I[10]=[e("div",{class:"mini-grid-card-dot"},null,-1),e("div",{class:"mini-grid-card-line"},null,-1)])])),64))],4)],64)):L("",!0)],4))}},fs=ve(ps,[["__scopeId","data-v-582ff2b9"]]),ms={class:"d-flex justify-content-between align-items-center mb-3"},vs={class:"save-indicator"},bs={key:0,class:"text-secondary small"},hs={key:1,class:"text-danger small"},gs={class:"row g-3"},ys={class:"col-lg-6"},ks={class:"col-lg-6"},xs={class:"right-sticky"},ws=500,$s={__name:"LayoutTab",setup(s){var k;const t=ze(),{activeId:a,activeProject:i,saving:p}=je(t),r=O("idle"),d=O(null);let g=null;function h(x){const $={...x||{}};return $.kind=$.kind||"sidebar-left",$.title={text:"My App",logoUrl:"",bgColor:"#ffffff",fgColor:"#0f172a",height:60,...$.title||{}},$.sidebar={items:[],bgColor:"#1e2a3a",fgColor:"#cfd6de",width:220,activeBg:"#0d6efd",...$.sidebar||{}},Array.isArray($.sidebar.items)||($.sidebar.items=[]),$.mainArea={bgColor:"#f5f7fa",padding:16,...$.mainArea||{}},$}const l=O(h((k=i.value)==null?void 0:k.layout));let o=JSON.stringify(l.value);me(()=>{var x;return(x=i.value)==null?void 0:x.id},()=>{var x;l.value=h((x=i.value)==null?void 0:x.layout),o=JSON.stringify(l.value),r.value="idle",g&&(clearTimeout(g),g=null)}),me(l,()=>{a.value&&JSON.stringify(l.value)!==o&&(r.value="pending",g&&clearTimeout(g),g=setTimeout(async()=>{if(g=null,JSON.stringify(l.value)===o){r.value="idle";return}r.value="saving";try{await t.savePatch(a.value,{layout:l.value}),o=JSON.stringify(l.value),r.value="saved",d.value&&clearTimeout(d.value),d.value=setTimeout(()=>{r.value="idle",d.value=null},2e3)}catch{r.value="error"}},ws))},{deep:!0}),Le(async()=>{if(g&&(clearTimeout(g),g=null,a.value&&JSON.stringify(l.value)!==o))try{await t.savePatch(a.value,{layout:l.value})}catch{}d.value&&clearTimeout(d.value)});function m(x){l.value={...l.value,kind:x}}return(x,$)=>(n(),u("div",null,[e("div",ms,[$[3]||($[3]=e("p",{class:"text-secondary small mb-0"},[_(" 전체 화면 구조를 선택하고 타이틀 / 사이드바 / 메인 영역의 색상과 구성을 편집합니다. "),e("span",{class:"text-muted"},"변경사항은 자동 저장됩니다.")],-1)),e("div",vs,[r.value==="pending"?(n(),u("span",bs,[...$[1]||($[1]=[e("i",{class:"bi bi-pencil-square me-1"},null,-1),_("편집 중… ",-1)])])):r.value==="error"?(n(),u("span",hs,[...$[2]||($[2]=[e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1),_("저장 실패 ",-1)])])):L("",!0)])]),e("div",gs,[e("div",ys,[$[4]||($[4]=e("h6",{class:"mb-2"},[e("i",{class:"bi bi-grid-1x2 me-1"}),_("전체 구조 선택 ")],-1)),$e(Rt,{"model-value":l.value.kind,"onUpdate:modelValue":m},null,8,["model-value"])]),e("div",ks,[e("div",xs,[$[5]||($[5]=e("h6",{class:"mb-2"},[e("i",{class:"bi bi-eye me-1"}),_("미리보기 ")],-1)),$e(fs,{layout:l.value},null,8,["layout"]),$[6]||($[6]=e("h6",{class:"mb-2 mt-4"},[e("i",{class:"bi bi-sliders me-1"}),_("세부 편집 ")],-1)),$e(Ua,{layout:l.value,"onUpdate:layout":$[0]||($[0]=I=>l.value=I)},null,8,["layout"])])])])]))}},_s=ve($s,[["__scopeId","data-v-6706256a"]]),Cs={class:"modal-content"},Ss={class:"modal-header"},As={class:"modal-title"},Ps={key:0,class:"text-muted fs-6"},Ts={key:0,class:"modal-body"},Es={class:"text-muted small mb-3"},Rs={class:"row g-3"},js=["onClick","onMouseenter"],Ls={class:"kind-icon"},Ns={viewBox:"0 0 80 60",xmlns:"http://www.w3.org/2000/svg"},zs=["x1","x2"],Ws=["y1","y2"],Ms={class:"kind-body"},Is={class:"kind-label"},Ds={class:"kind-desc"},Os={key:1,class:"modal-body"},Us={class:"mb-3"},Vs={class:"form-label"},Bs=["placeholder"],Fs={class:"form-text"},Hs={class:"mb-3"},qs={class:"form-label"},Ks={class:"form-text"},Js={key:0,class:"form-text text-primary d-flex align-items-start gap-1 mt-1"},Gs=["innerHTML"],Zs={key:1,class:"alert alert-warning py-2 px-2 small mt-2 mb-0"},Ys=["innerHTML"],Qs={class:"alert alert-info small mb-0 py-2"},Xs={key:0,class:"text-danger small mt-2"},ei={class:"modal-footer"},ti={__name:"ScreenCreateModal",emits:["close","created"],setup(s,{emit:t}){const{t:a}=we(),i=t,p=[{kind:"list",label:a("screenCreate.k1"),description:a("screenCreate.k2"),category:"data",icon:"list"},{kind:"detail",label:a("screenCreate.k3"),description:a("screenCreate.k4"),category:"data",icon:"detail"},{kind:"form-new",label:a("screenCreate.k5"),description:a("screenCreate.k6"),category:"form",icon:"form-new"},{kind:"form-edit",label:a("screenCreate.k7"),description:a("screenCreate.k8"),category:"form",icon:"form-edit"},{kind:"dashboard",label:a("screenCreate.k9"),description:a("screenCreate.k10"),category:"summary",icon:"dashboard"},{kind:"kanban",label:a("screenCreate.k11"),description:a("screenCreate.k12"),category:"summary",icon:"kanban"},{kind:"calendar",label:a("screenCreate.k13"),description:a("screenCreate.k14"),category:"summary",icon:"calendar"},{kind:"chart",label:a("screenCreate.k15"),description:a("screenCreate.k16"),category:"summary",icon:"chart"},{kind:"report",label:a("screenCreate.k17"),description:a("screenCreate.k18"),category:"summary",icon:"report"},{kind:"empty",label:a("screenCreate.k19"),description:a("screenCreate.k20"),category:"blank",icon:"empty"}],r=O(1),d=O("list"),g=V(()=>p.find(B=>B.kind===d.value)||p[0]),h=O(""),l=O(""),o=O(!1),m=O(null),k=O(null),x={학생:"student",사용자:"user",회원:"member",관리자:"admin",상품:"product",주문:"order",결제:"payment",배송:"shipping",게시판:"board",게시글:"post",댓글:"comment",공지:"notice",공지사항:"notice",문의:"inquiry",알림:"notification",고객:"customer",직원:"employee",부서:"department",팀:"team",회사:"company",교사:"teacher",강사:"instructor",과목:"subject",수업:"lesson",카테고리:"category",태그:"tag",파일:"file",이미지:"image",정산:"settlement",재고:"inventory",매출:"sales",통화:"currency",보고서:"report",리포트:"report",책:"book",도서:"book",간식:"snack",학교:"school",선생님:"teacher",친구:"friend",반:"class",숙제:"homework",점수:"score",시험:"exam",급식:"meal",동아리:"club",환자:"patient",진료:"care",진료과:"department",처방:"prescription",병동:"ward",의사:"doctor",간호사:"nurse",예약:"reservation",목록:"list",리스트:"list",상세:"detail",조회:"view",보기:"view",확인:"view",추가:"add",등록:"register",생성:"create",신규:"new",수정:"edit",편집:"edit",변경:"change",삭제:"delete",제거:"remove",검색:"search",필터:"filter",정렬:"sort",가져오기:"import",내보내기:"export",업로드:"upload",다운로드:"download",로그인:"login",로그아웃:"logout",가입:"signup",회원가입:"signup",인증:"auth",권한:"permission",대시보드:"dashboard",홈:"home",메뉴:"menu",네비:"nav",설정:"settings",환경설정:"settings",프로필:"profile",계정:"account",비밀번호:"password",통계:"stats",차트:"chart",그래프:"graph",분석:"analytics",리뷰:"review",평가:"rating",캘린더:"calendar",일정:"schedule",관리:"manage",페이지:"page",화면:"screen",탭:"tab",및:"and",또는:"or",모든:"all",전체:"all",나의:"my",내:"my"},$=["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"],I=["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","yi","i"],j=["","g","kk","gs","n","nj","nh","d","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];function y(B){const b=B.charCodeAt(0);if(b<44032||b>55203)return null;const v=b-44032,W=Math.floor(v/588),C=Math.floor(v%588/28),w=v%28;return $[W]+I[C]+j[w]}function E(B){const b=B.charCodeAt(0);return b>=44032&&b<=55203}function A(B){return B?x[B]?x[B]:[...B].some(E)?[...B].map(v=>E(v)?y(v):v).join("-"):B:""}function P(B){const b=String(B||"").trim();return b?b.split(/\s+/).map(A).join("-").toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,60):""}const ee=new Set(["detail","form-edit"]),S=V(()=>ee.has(d.value)),U=V(()=>/:[A-Za-z_]\w*/.test(l.value||""));function N(B,b){const v=P(B);return v?ee.has(b)?`/${v}/:id`:`/${v}`:""}function T(){o.value||(l.value=N(h.value,d.value))}function M(){o.value=!0}function q(B){d.value=B,o.value||(l.value=N(h.value,B)),r.value=2,Oe(()=>{var b;return(b=k.value)==null?void 0:b.focus()})}function K(){r.value=1,m.value=null}function re(){const B=h.value.trim();if(!B){m.value="화면 제목을 입력하세요";return}let b=l.value.trim()||"/untitled";b.startsWith("/")||(b="/"+b);const v=ct(d.value,{title:B,path:b});i("created",v),i("close")}qe(async()=>{var B;await Oe(),(B=k.value)==null||B.focus()});function se(B){B.key==="Escape"&&i("close")}return(B,b)=>(n(),u("div",{class:"modal-backdrop-custom",onClick:b[4]||(b[4]=Ne(v=>i("close"),["self"])),onKeydown:se,tabindex:"-1"},[e("div",{class:"modal-dialog modal-dialog-centered",style:F({maxWidth:r.value===1?"900px":"560px"})},[e("div",Cs,[e("div",Ss,[e("h5",As,[b[5]||(b[5]=e("i",{class:"bi bi-plus-square me-2"},null,-1)),_(" "+c(f(a)("screenCreate.title"))+" ",1),r.value===2?(n(),u("span",Ps,"— "+c(g.value.label),1)):L("",!0)]),e("button",{type:"button",class:"btn-close",onClick:b[0]||(b[0]=v=>i("close"))})]),r.value===1?(n(),u("div",Ts,[e("p",Es,c(f(a)("screenCreate.pickKind")),1),e("div",Rs,[(n(),u(z,null,X(p,v=>e("div",{key:v.kind,class:"col-md-4 col-sm-6"},[e("button",{class:H(["kind-card",{selected:d.value===v.kind}]),onClick:W=>q(v.kind),onMouseenter:W=>d.value=v.kind},[e("div",Ls,[(n(),u("svg",Ns,[b[22]||(b[22]=e("rect",{width:"80",height:"60",fill:"#f8fafc",rx:"3"},null,-1)),v.icon==="list"?(n(),u(z,{key:0},[b[6]||(b[6]=ae('<rect x="6" y="8" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="6" y="20" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="6" y="32" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="6" y="44" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="10" y="12" width="16" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="10" y="24" width="24" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="10" y="36" width="20" height="2" fill="#94a3b8" data-v-25629a6d></rect>',7))],64)):v.icon==="detail"?(n(),u(z,{key:1},[b[7]||(b[7]=ae('<rect x="6" y="6" width="68" height="48" rx="3" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="12" y="14" width="16" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="32" y="14" width="36" height="3" fill="#0f172a" data-v-25629a6d></rect><rect x="12" y="22" width="12" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="32" y="22" width="30" height="3" fill="#0f172a" data-v-25629a6d></rect><rect x="12" y="30" width="14" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="32" y="30" width="26" height="3" fill="#0f172a" data-v-25629a6d></rect><rect x="12" y="38" width="18" height="2" fill="#94a3b8" data-v-25629a6d></rect><rect x="32" y="38" width="32" height="3" fill="#0f172a" data-v-25629a6d></rect>',9))],64)):v.icon==="form-new"?(n(),u(z,{key:2},[b[8]||(b[8]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#198754" data-v-25629a6d></rect><rect x="52" y="49" width="12" height="3" fill="#fff" data-v-25629a6d></rect>',5))],64)):v.icon==="form-edit"?(n(),u(z,{key:3},[b[9]||(b[9]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-25629a6d></rect><rect x="14" y="11" width="20" height="2" fill="#0f172a" data-v-25629a6d></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-25629a6d></rect><rect x="14" y="23" width="30" height="2" fill="#0f172a" data-v-25629a6d></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-25629a6d></rect><rect x="14" y="35" width="24" height="2" fill="#0f172a" data-v-25629a6d></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#0d6efd" data-v-25629a6d></rect><rect x="53" y="49" width="10" height="3" fill="#fff" data-v-25629a6d></rect>',8))],64)):v.icon==="dashboard"?(n(),u(z,{key:4},[b[10]||(b[10]=ae('<rect x="4" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="23" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="42" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="61" y="6" width="15" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="8" y="14" width="8" height="6" fill="#0d6efd" data-v-25629a6d></rect><rect x="27" y="14" width="8" height="6" fill="#198754" data-v-25629a6d></rect><rect x="46" y="14" width="8" height="6" fill="#ffc107" data-v-25629a6d></rect><rect x="65" y="14" width="7" height="6" fill="#dc3545" data-v-25629a6d></rect><rect x="4" y="30" width="72" height="24" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><polyline points="10,50 20,42 30,46 40,36 50,40 60,32 70,38" stroke="#0d6efd" stroke-width="1.5" fill="none" data-v-25629a6d></polyline>',10))],64)):v.icon==="kanban"?(n(),u(z,{key:5},[b[11]||(b[11]=ae('<rect x="4" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-25629a6d></rect><rect x="29" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-25629a6d></rect><rect x="54" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-25629a6d></rect><rect x="7" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="7" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="32" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="32" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="32" y="32" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="57" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect>',9))],64)):v.icon==="calendar"?(n(),u(z,{key:6},[b[12]||(b[12]=e("rect",{x:"4",y:"6",width:"72",height:"48",rx:"3",fill:"#fff",stroke:"#cbd5e1"},null,-1)),b[13]||(b[13]=e("rect",{x:"4",y:"6",width:"72",height:"10",fill:"#f1f5f9"},null,-1)),(n(),u(z,null,X(6,W=>e("line",{key:"vl"+W,x1:4+W*12,y1:"6",x2:4+W*12,y2:"54",stroke:"#e2e8f0","stroke-width":"0.5"},null,8,zs)),64)),(n(),u(z,null,X(3,W=>e("line",{key:"hl"+W,x1:"4",y1:16+W*10,x2:"76",y2:16+W*10,stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Ws)),64)),b[14]||(b[14]=e("circle",{cx:"28",cy:"30",r:"2",fill:"#0d6efd"},null,-1)),b[15]||(b[15]=e("circle",{cx:"52",cy:"40",r:"2",fill:"#198754"},null,-1)),b[16]||(b[16]=e("circle",{cx:"16",cy:"50",r:"2",fill:"#ffc107"},null,-1))],64)):v.icon==="chart"?(n(),u(z,{key:7},[b[17]||(b[17]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><line x1="10" y1="46" x2="70" y2="46" stroke="#94a3b8" data-v-25629a6d></line><line x1="10" y1="12" x2="10" y2="46" stroke="#94a3b8" data-v-25629a6d></line><rect x="14" y="30" width="8" height="16" fill="#0d6efd" data-v-25629a6d></rect><rect x="26" y="20" width="8" height="26" fill="#198754" data-v-25629a6d></rect><rect x="38" y="26" width="8" height="20" fill="#ffc107" data-v-25629a6d></rect><rect x="50" y="14" width="8" height="32" fill="#dc3545" data-v-25629a6d></rect><rect x="62" y="22" width="8" height="24" fill="#6610f2" data-v-25629a6d></rect>',8))],64)):v.icon==="report"?(n(),u(z,{key:8},[b[18]||(b[18]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-25629a6d></rect><rect x="10" y="10" width="40" height="4" fill="#0f172a" data-v-25629a6d></rect><rect x="10" y="17" width="24" height="2" fill="#94a3b8" data-v-25629a6d></rect><line x1="10" y1="23" x2="70" y2="23" stroke="#e2e8f0" data-v-25629a6d></line><rect x="10" y="26" width="60" height="4" fill="#f1f5f9" data-v-25629a6d></rect><rect x="10" y="32" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-25629a6d></rect><rect x="10" y="37" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-25629a6d></rect><rect x="10" y="42" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-25629a6d></rect><rect x="10" y="47" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-25629a6d></rect>',9))],64)):v.icon==="empty"?(n(),u(z,{key:9},[b[19]||(b[19]=e("rect",{x:"8",y:"10",width:"64",height:"40",rx:"3",fill:"none",stroke:"#cbd5e1","stroke-width":"1.5","stroke-dasharray":"3 2"},null,-1)),b[20]||(b[20]=e("circle",{cx:"40",cy:"30",r:"4",fill:"#cbd5e1"},null,-1)),b[21]||(b[21]=e("rect",{x:"36",y:"28",width:"8",height:"4",fill:"#cbd5e1"},null,-1))],64)):L("",!0)]))]),e("div",Ms,[e("div",Is,c(v.label),1),e("div",Ds,c(v.description),1)])],42,js)])),64))])])):(n(),u("div",Os,[e("div",Us,[e("label",Vs,[_(c(f(a)("screenCreate.screenTitle"))+" ",1),b[23]||(b[23]=e("span",{class:"text-danger"},"*",-1))]),Z(e("input",{ref_key:"nameInput",ref:k,"onUpdate:modelValue":b[1]||(b[1]=v=>h.value=v),onInput:T,type:"text",class:"form-control",placeholder:f(a)("screenCreate.titlePlaceholder"),maxlength:"100",onKeyup:Te(re,["enter"])},null,40,Bs),[[Q,h.value]]),e("div",Fs,c(f(a)("screenCreate.titleHint")),1)]),e("div",Hs,[e("label",qs,c(f(a)("screenCreate.pathLabel")),1),Z(e("input",{"onUpdate:modelValue":b[2]||(b[2]=v=>l.value=v),onInput:M,type:"text",class:"form-control",placeholder:"/dashboard",maxlength:"100"},null,544),[[Q,l.value]]),e("div",Ks,c(f(a)("screenCreate.pathHint")),1),S.value?(n(),u("div",Js,[b[24]||(b[24]=e("i",{class:"bi bi-info-circle mt-1"},null,-1)),e("span",{innerHTML:f(a)("screenCreate.idParamHint")},null,8,Gs)])):L("",!0),S.value&&!U.value?(n(),u("div",Zs,[b[25]||(b[25]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("span",{innerHTML:f(a)("screenCreate.noIdWarn")},null,8,Ys)])):L("",!0)]),e("div",Qs,[b[26]||(b[26]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),_(" "+c(f(a)("screenCreate.createdAs",{label:g.value.label}))+" 화면 스튜디오에서 widget 을 추가/수정할 수 있습니다. ",1)]),m.value?(n(),u("div",Xs,[b[27]||(b[27]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(c(m.value),1)])):L("",!0)])),e("div",ei,[r.value===2?(n(),u("button",{key:0,class:"btn btn-link me-auto",onClick:K},[b[28]||(b[28]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),_(c(f(a)("screenCreate.pickAgain")),1)])):L("",!0),e("button",{class:"btn btn-secondary",onClick:b[3]||(b[3]=v=>i("close"))},c(f(a)("common.cancel")),1),r.value===2?(n(),u("button",{key:1,class:"btn btn-primary",onClick:re},[b[29]||(b[29]=e("i",{class:"bi bi-check2 me-1"},null,-1)),_(c(f(a)("screenCreate.create")),1)])):L("",!0)])])],4)],32))}},ai=ve(ti,[["__scopeId","data-v-25629a6d"]]),si={class:"wizard-modal"},ii={class:"wizard-header"},ri={class:"mb-0"},oi={class:"wizard-steps"},li={class:"step-num"},ni={class:"step-label"},di={class:"wizard-body"},ci={key:0,class:"step-pane"},ui={class:"step-title"},pi={class:"input-group input-group-sm mb-2"},fi=["placeholder"],mi={key:0,class:"alert alert-danger small"},vi={key:1,class:"text-center py-4 text-secondary small"},bi={key:2,class:"ctrl-list"},hi={key:0,class:"empty-state"},gi={class:"fw-semibold mb-1"},yi={class:"text-secondary small mb-3"},ki={class:"text-secondary small mt-3"},xi=["checked","onChange"],wi={class:"flex-grow-1"},$i={class:"fw-semibold"},_i={class:"text-secondary small"},Ci={key:0,class:"text-secondary small text-center py-3"},Si={key:1,class:"step-pane"},Ai={class:"step-title"},Pi={class:"small text-secondary mb-2"},Ti={key:0,class:"text-secondary small text-center py-3"},Ei=["checked","onChange"],Ri={class:"route-path"},ji={class:"text-secondary small ms-auto"},Li={key:1,class:"alert alert-warning small mt-3"},Ni={key:2,class:"step-pane"},zi={class:"step-title"},Wi={class:"route-summary mb-3"},Mi={class:"ms-2"},Ii={key:0,class:"text-center py-3 text-secondary small"},Di={key:1},Oi={key:0,class:"text-secondary small mb-3"},Ui={class:"form-label small mb-1"},Vi={key:0,class:"text-danger"},Bi={class:"text-secondary ms-1"},Fi=["onUpdate:modelValue","placeholder"],Hi=["onUpdate:modelValue","placeholder"],qi={key:2,class:"form-text"},Ki={key:1,class:"deps-summary"},Ji={class:"section-label mt-3"},Gi={class:"small text-secondary"},Zi={key:0,class:"ms-2"},Yi={key:3,class:"step-pane"},Qi={class:"step-title"},Xi={class:"route-summary mb-3"},er={class:"ms-2"},tr={key:0,class:"text-center py-4"},ar=["disabled"],sr={key:0,class:"spinner-border spinner-border-sm me-1"},ir={key:1,class:"bi bi-play-fill me-1"},rr={class:"small text-secondary mt-2"},or={key:1},lr={key:0,class:"alert alert-danger small"},nr={class:"fw-semibold"},dr={class:"mt-1"},cr={key:1},ur={class:"alert alert-success small py-2"},pr={key:0},fr={key:0,class:"mb-3"},mr={class:"section-label"},vr={class:"output-fields"},br={class:"text-secondary"},hr={key:0,class:"text-secondary ms-1"},gr={class:"mb-3"},yr={class:"small text-secondary",style:{cursor:"pointer"}},kr={class:"sample-json"},xr={class:"wizard-footer"},wr=["disabled"],$r=["disabled"],_r={key:0,class:"spinner-border spinner-border-sm me-1"},Cr={__name:"ScreenWizardModal",props:{show:{type:Boolean,default:!1}},emits:["close","create"],setup(s,{emit:t}){const{t:a}=we(),i=s,p=t,r=O(1),d=O([]),g=O(!1),h=O(null),l=O(""),o=O(null),m=O(null),k=O(!1),x=O(null),$=O({});function I(){const b=new Date,v=(w,D=2)=>String(w).padStart(D,"0"),W=`${b.getFullYear()}${v(b.getMonth()+1)}${v(b.getDate())}-${v(b.getHours())}${v(b.getMinutes())}${v(b.getSeconds())}`,C=Math.floor(Math.random()*65536).toString(16).padStart(4,"0");return`req-${W}-${C}`}const j=O(!1),y=O(null),E=O(!1),A=V(()=>{const b=l.value.trim().toLowerCase();return b?d.value.filter(v=>[v.name,v.base_path,v.basePath,v.description].filter(Boolean).join(" ").toLowerCase().includes(b)):d.value}),P=V(()=>m.value?["POST","PUT","PATCH","DELETE"].includes((m.value.method||"GET").toUpperCase()):!1),ee=V(()=>r.value===1?!!o.value:r.value===2?!!m.value:r.value===3?!!x.value:r.value===4?!!y.value&&y.value.ok:!1);function S(b){const v=(b||"GET").toUpperCase();return{GET:"bg-success",POST:"bg-warning text-dark",PUT:"bg-info text-dark",PATCH:"bg-info text-dark",DELETE:"bg-danger"}[v]||"bg-secondary"}function U(b){const v=b.type||"string",W=b.source||"";return W==="path"?`${v} 값 (URL path 에 삽입됨)`:W==="query"?`${v} 값 (query string)`:`${v} 값`}function N(){r.value=1,o.value=null,m.value=null,x.value=null,$.value={},y.value=null,E.value=!1}function T(){N(),p("close")}async function M(){var b,v,W;g.value=!0,h.value=null;try{const C=await _e.get("/api/admin/controllers/paged",{params:{page:1,perPage:200}});d.value=((b=C.data)==null?void 0:b.data)||[]}catch(C){h.value=((W=(v=C.response)==null?void 0:v.data)==null?void 0:W.message)||C.message}finally{g.value=!1}}async function q(b){var v,W,C;o.value=b,m.value=null;try{const D=((v=(await _e.get(`/api/admin/controllers/${encodeURIComponent(b.id)}`)).data)==null?void 0:v.data)||{};Array.isArray(D.routes)&&(D.routes=D.routes.map(J=>({...J,handler:J.handler||J.handlerName||null}))),o.value={...b,...D}}catch(w){h.value=`컨트롤러 상세 조회 실패: ${((C=(W=w.response)==null?void 0:W.data)==null?void 0:C.message)||w.message}`}}function K(b){m.value=b}async function re(){var b,v;if(!(!o.value||!m.value)){k.value=!0,x.value=null;try{const W=await _e.get("/api/admin/screen-wizard/analyze",{params:{controllerId:o.value.name||o.value.id,handler:m.value.handler}});x.value=((b=W.data)==null?void 0:b.data)||null;const C={};for(const w of((v=x.value)==null?void 0:v.inputs)||[])w.default!=null&&(C[w.name]=w.default);C.requestCode=I(),x.value&&!x.value.inputs.some(w=>w.name==="requestCode")&&x.value.inputs.unshift({name:"requestCode",type:"string",source:"auto",required:!1,default:C.requestCode,desc:a("screenWizard.k10")}),$.value=C}catch(W){be("분석 실패",W)}finally{k.value=!1}}}async function se(){var b,v,W,C;if(!(P.value&&!await Pe({title:`${m.value.method} 라우트 실제 실행`,message:`이 라우트는 ${m.value.method} 이므로 서버 데이터를 변경할 수 있습니다.
실제로 handler 를 호출합니다. 계속할까요?`,detail:"테스트 DB 가 아니라면 데이터가 생성/수정/삭제될 수 있습니다.",confirmText:a("screenWizard.k11"),variant:"danger",icon:"bi-exclamation-triangle"}))){j.value=!0,y.value=null;try{const w={};for(const J of((b=x.value)==null?void 0:b.inputs)||[]){let te=$.value[J.name];te===""||te==null||(J.type==="number"&&(te=Number(te)),J.type==="boolean"&&(te=te===!0||te==="true"),w[J.name]=te)}const D=await _e.post("/api/admin/screen-wizard/probe",{controllerId:o.value.name||o.value.id,handler:m.value.handler,params:w});y.value=((v=D.data)==null?void 0:v.data)||null}catch(w){y.value={ok:!1,error:((C=(W=w.response)==null?void 0:W.data)==null?void 0:C.message)||w.message,outputFields:[]}}finally{j.value=!1}}}function B(){const b=x.value,v=y.value;if(!b||!v||!v.ok)return;const W=(b.method||"GET").toUpperCase(),C=W==="POST"||W==="PUT"||W==="PATCH"||W==="DELETE";let w=b.suggestedWidget||"text";v.shape==="pagedRows"||v.shape==="rowsArray"?w="list":v.shape==="object"&&(w="detail");const D=b.handler.replace(/([A-Z])/g," $1").replace(/^./,Y=>Y.toUpperCase()).trim(),J=`${b.controllerName.replace(/Controller$/i,"")} ${D}`.trim(),te=`/${b.handler.toLowerCase()}`.replace(/[^a-z0-9\-/]/g,"-"),ie=v.listPath||null,le=(b.inputs||[]).filter(Y=>Y.name!=="requestCode"),pe=le.filter(Y=>Y.source==="path"),R=le.filter(Y=>Y.source!=="path"),oe=o.value.name||o.value.id,de=ut({title:J,path:te}),ke=(b.fullPath||"").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,"{$1}");if(C){const Y=Ce({kind:"formDialog"});Y.title=J,Y.source={type:"endpoint",method:W,path:ke,controllerId:oe,handlerName:b.handler};const xe=W==="DELETE"?"danger":W==="POST"?"success":"primary",ce=W==="POST"?"생성":W==="DELETE"?"삭제":"수정";Y.config={buttonLabel:ce,buttonVariant:xe,dialogTitle:`${J} — ${ce}`,fields:le.map(ye=>({name:ye.name,label:ye.name,type:ye.type||"string",required:!!ye.required,default:ye.default!=null?ye.default:"",placeholder:U(ye)})),confirmBeforeSubmit:W==="DELETE",refreshTargetWidgetId:null},de.rows=[Se({widths:[12],widgets:[Y]})]}else if(pe.length>0||R.length>0&&w==="detail"){const Y=Ce({kind:w});Y.title=J+" 결과",Y.source={type:"endpoint",method:W,path:ke,resultKey:ie,controllerId:oe,handlerName:b.handler},w==="list"?Y.config={maxRows:20}:w==="stat"&&(Y.config={format:"number",color:"primary"});const xe=Ce({kind:"queryForm"});xe.title=J+" 조회",xe.source={type:"endpoint",method:W,path:ke,resultKey:ie,controllerId:oe,handlerName:b.handler},xe.config={endpointHint:`${W} ${ke}`,fields:le.map(ce=>({name:ce.name,label:ce.name,type:ce.type||"string",required:!!ce.required,default:ce.default!=null?ce.default:"",placeholder:U(ce)})),submitLabel:"조회",targetWidgetId:Y.id},de.rows=[Se({widths:[12],widgets:[xe]}),Se({widths:[12],widgets:[Y]})]}else{const Y=Ce({kind:w});Y.title=J,Y.source={type:"endpoint",method:W,path:b.fullPath,resultKey:ie,controllerId:oe,handlerName:b.handler},w==="list"?Y.config={maxRows:20}:w==="stat"&&(Y.config={format:"number",color:"primary"}),de.rows=[Se({widths:[12],widgets:[Y]})]}p("create",de),T()}return me(()=>i.show,b=>{b&&(N(),d.value.length||M())}),(b,v)=>{var C,w,D,J,te,ie,le,pe;const W=st("router-link");return s.show?(n(),u("div",{key:0,class:"wizard-backdrop",onClick:Ne(T,["self"])},[e("div",si,[e("div",ii,[e("h5",ri,[v[6]||(v[6]=e("i",{class:"bi bi-magic me-2"},null,-1)),_(c(f(a)("wizard.title")),1)]),e("button",{class:"btn btn-sm btn-link text-secondary",onClick:T},[...v[7]||(v[7]=[e("i",{class:"bi bi-x-lg"},null,-1)])])]),e("div",oi,[(n(),u(z,null,X(4,R=>e("div",{key:R,class:H(["step-item",{active:r.value===R,done:r.value>R}])},[e("span",li,c(R),1),e("span",ni,c([f(a)("screenWizard.k2"),f(a)("screenWizard.k5"),f(a)("screenWizard.k6"),f(a)("screenWizard.k7")][R-1]),1)],2)),64))]),e("div",di,[r.value===1?(n(),u("div",ci,[e("div",ui,c(f(a)("wizard.step1")),1),e("div",pi,[v[8]||(v[8]=e("span",{class:"input-group-text"},[e("i",{class:"bi bi-search"})],-1)),Z(e("input",{"onUpdate:modelValue":v[0]||(v[0]=R=>l.value=R),class:"form-control",placeholder:f(a)("wiz2.searchByNameOrPath")},null,8,fi),[[Q,l.value]])]),h.value?(n(),u("div",mi,c(h.value),1)):L("",!0),g.value?(n(),u("div",vi,[v[9]||(v[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(c(f(a)("wizard.loading")),1)])):(n(),u("div",bi,[d.value.length?(n(),u(z,{key:1},[(n(!0),u(z,null,X(A.value,R=>{var oe,de;return n(),u("label",{key:R.id,class:H(["ctrl-item",{selected:((oe=o.value)==null?void 0:oe.id)===R.id}])},[e("input",{type:"radio",checked:((de=o.value)==null?void 0:de.id)===R.id,onChange:ke=>q(R)},null,40,xi),e("div",wi,[e("div",$i,c(R.name),1),e("div",_i,[e("code",null,c(R.base_path||R.basePath||"-"),1)])])],2)}),128)),A.value.length?L("",!0):(n(),u("div",Ci,[v[13]||(v[13]=e("i",{class:"bi bi-search me-1"},null,-1)),_('"'+c(l.value)+'" 로 검색한 결과가 없습니다 ',1)]))],64)):(n(),u("div",hi,[v[12]||(v[12]=e("div",{class:"empty-icon"},[e("i",{class:"bi bi-collection"})],-1)),e("div",gi,c(f(a)("wizard.noControllers")),1),e("div",yi,[_(c(f(a)("wizard.intro")),1),v[10]||(v[10]=e("br",null,null,-1)),_(" "+c(f(a)("screenWizard.k1"))+" ",1),e("strong",null,c(f(a)("screenWizard.k2")),1),_(" "+c(f(a)("screenWizard.k3")),1)]),$e(W,{to:{name:"controllers"},class:"btn btn-sm btn-primary",onClick:v[1]||(v[1]=R=>p("close"))},{default:it(()=>[v[11]||(v[11]=e("i",{class:"bi bi-arrow-right me-1"},null,-1)),_(c(f(a)("wizard.goControllers")),1)]),_:1}),e("div",ki,c(f(a)("screenWizard.k4")),1)]))]))])):r.value===2?(n(),u("div",Si,[e("div",Ai,c(f(a)("wizard.step2")),1),e("div",Pi,[e("strong",null,c((C=o.value)==null?void 0:C.name),1),_(" "+c(f(a)("wiz2.routesOf")),1)]),(D=(w=o.value)==null?void 0:w.routes)!=null&&D.length?L("",!0):(n(),u("div",Ti,c(f(a)("wizard.noRoutesFor")),1)),(n(!0),u(z,null,X(((J=o.value)==null?void 0:J.routes)||[],R=>{var oe,de;return n(),u("label",{key:R.handler,class:H(["route-item",{selected:((oe=m.value)==null?void 0:oe.handler)===R.handler}])},[e("input",{type:"radio",checked:((de=m.value)==null?void 0:de.handler)===R.handler,onChange:ke=>K(R)},null,40,Ei),e("span",{class:H(["badge route-method-badge",S(R.method)])},c((R.method||"GET").toUpperCase()),3),e("code",Ri,c(R.path||"/"),1),e("span",ji,c(R.handler),1)],2)}),128)),m.value&&P.value?(n(),u("div",Li,[v[14]||(v[14]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("strong",null,c(m.value.method),1),_(" 라우트를 선택했습니다. 이 타입은 서버 데이터를 변경할 수 있으며, "+c(f(a)("wiz2.next"))+" 단계에서 실제 호출 시 경고 대화상자가 표시됩니다. ",1)])):L("",!0)])):r.value===3?(n(),u("div",Ni,[e("div",zi,c(f(a)("wizard.step3")),1),e("div",Wi,[e("span",{class:H(["badge",S(m.value.method)])},c(m.value.method),3),e("code",Mi,c(((te=x.value)==null?void 0:te.fullPath)||(((ie=o.value)==null?void 0:ie.base_path)||((le=o.value)==null?void 0:le.basePath)||"")+m.value.path),1)]),k.value?(n(),u("div",Ii,[v[15]||(v[15]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(c(f(a)("wiz2.analyzing")),1)])):x.value?(n(),u("div",Di,[x.value.inputs.length?L("",!0):(n(),u("div",Oi,c(f(a)("wizard.noInputParams")),1)),(n(!0),u(z,null,X(x.value.inputs,R=>(n(),u("div",{key:R.name,class:"input-field mb-2"},[e("label",Ui,[e("strong",null,c(R.name),1),R.required?(n(),u("span",Vi,"*")):L("",!0),e("span",Bi,"("+c(R.type)+", "+c(R.source)+")",1)]),R.type==="number"?Z((n(),u("input",{key:0,type:"number",class:"form-control form-control-sm","onUpdate:modelValue":oe=>$.value[R.name]=oe,placeholder:String(R.default??"")},null,8,Fi)),[[Q,$.value[R.name]]]):Z((n(),u("input",{key:1,type:"text",class:"form-control form-control-sm","onUpdate:modelValue":oe=>$.value[R.name]=oe,placeholder:R.desc||String(R.default??"")},null,8,Hi)),[[Q,$.value[R.name]]]),R.desc?(n(),u("div",qi,c(R.desc),1)):L("",!0)]))),128)),x.value.dependencies?(n(),u("div",Ki,[e("div",Ji,c(f(a)("wiz2.reference")),1),e("div",Gi,[v[16]||(v[16]=_(" Services: ",-1)),e("strong",null,c(x.value.dependencies.services.length),1),v[17]||(v[17]=_(" · SQL files: ",-1)),e("strong",null,c(x.value.dependencies.sqls.length),1),x.value.dependencies.services.length?(n(),u("span",Zi," ("+c(x.value.dependencies.services.map(R=>R.name).join(", "))+") ",1)):L("",!0)])])):L("",!0)])):L("",!0)])):r.value===4?(n(),u("div",Yi,[e("div",Qi,c(f(a)("wizard.step4")),1),e("div",Xi,[e("span",{class:H(["badge",S(m.value.method)])},c(m.value.method),3),e("code",er,c((pe=x.value)==null?void 0:pe.fullPath),1)]),y.value?(n(),u("div",or,[y.value.ok?(n(),u("div",cr,[e("div",ur,[v[21]||(v[21]=e("i",{class:"bi bi-check-circle me-1"},null,-1)),_(" "+c(f(a)("wiz2.responseOk"))+" ",1),e("code",null,c(y.value.shape),1),y.value.listPath?(n(),u("span",pr,[v[20]||(v[20]=_(", listPath: ",-1)),e("code",null,c(y.value.listPath),1)])):L("",!0)]),y.value.outputFields.length?(n(),u("div",fr,[e("div",mr,"추출된 Output 필드 ("+c(y.value.outputFields.length)+"개)",1),e("div",vr,[(n(!0),u(z,null,X(y.value.outputFields,R=>(n(),u("div",{key:R.name,class:"field-tag"},[e("strong",null,c(R.name),1),e("span",br,": "+c(R.type),1),R.sample!=null?(n(),u("span",hr," ≈ "+c(typeof R.sample=="string"&&R.sample.length>24?R.sample.slice(0,24)+"...":R.sample),1)):L("",!0)]))),128))])])):L("",!0),e("details",gr,[e("summary",yr,c(f(a)("wiz2.viewRawJson")),1),e("pre",kr,[e("code",null,c(JSON.stringify(y.value.sample,null,2).slice(0,2e3)),1)])]),e("button",{class:"btn btn-success w-100",onClick:B},[v[22]||(v[22]=e("i",{class:"bi bi-magic me-1"},null,-1)),_(" "+c(f(a)("wiz2.buildFromThis"))+" (widget: ",1),e("strong",null,c(x.value.suggestedWidget),1),v[23]||(v[23]=_(") ",-1))])])):(n(),u("div",lr,[e("div",nr,[v[18]||(v[18]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(c(f(a)("wiz2.runFailed")),1)]),e("div",dr,c(y.value.error),1),e("button",{class:"btn btn-sm btn-outline-secondary mt-2",onClick:v[2]||(v[2]=R=>y.value=null)},[v[19]||(v[19]=e("i",{class:"bi bi-arrow-counterclockwise me-1"},null,-1)),_(c(f(a)("wiz2.retry")),1)])]))])):(n(),u("div",tr,[e("button",{class:H(["btn btn-primary",{"btn-warning text-dark":P.value}]),disabled:j.value,onClick:se},[j.value?(n(),u("span",sr)):(n(),u("i",ir)),_(" "+c(P.value?"⚠️ "+m.value.method+f(a)("screenWizard.k8"):f(a)("screenWizard.k9")),1)],10,ar),e("div",rr,c(f(a)("wizard.step4Hint")),1)]))])):L("",!0)]),e("div",xr,[r.value>1?(n(),u("button",{key:0,class:"btn btn-outline-secondary btn-sm",onClick:v[3]||(v[3]=R=>r.value=r.value-1)},[v[24]||(v[24]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),_(c(f(a)("wiz2.prev")),1)])):L("",!0),v[28]||(v[28]=e("span",{class:"ms-auto"},null,-1)),r.value<4&&r.value!==3?(n(),u("button",{key:1,class:"btn btn-primary btn-sm",disabled:!ee.value,onClick:v[4]||(v[4]=R=>r.value=r.value+1)},[_(c(f(a)("wiz2.next"))+" ",1),v[25]||(v[25]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))],8,wr)):L("",!0),r.value===3&&!x.value?(n(),u("button",{key:2,class:"btn btn-primary btn-sm",disabled:!m.value||k.value,onClick:re},[k.value?(n(),u("span",_r)):L("",!0),_(" "+c(f(a)("wiz2.analyze"))+" ",1),v[26]||(v[26]=e("i",{class:"bi bi-search ms-1"},null,-1))],8,$r)):r.value===3&&x.value?(n(),u("button",{key:3,class:"btn btn-primary btn-sm",onClick:v[5]||(v[5]=R=>r.value=4)},[_(c(f(a)("wiz2.next"))+" ",1),v[27]||(v[27]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))])):L("",!0)])])])):L("",!0)}}},Sr=ve(Cr,[["__scopeId","data-v-803c044c"]]),Ar={class:"d-flex justify-content-between align-items-center mb-3"},Pr={class:"mb-1"},Tr={class:"badge bg-secondary ms-2"},Er={class:"text-secondary small mb-0"},Rr=["disabled"],jr=["disabled"],Lr={key:0,class:"card"},Nr={class:"card-body text-center py-5 text-secondary"},zr={class:"mb-2"},Wr={class:"small"},Mr={key:1,class:"card"},Ir={class:"table-responsive"},Dr={class:"table table-hover mb-0"},Or={class:"table-light"},Ur={style:{width:"110px"}},Vr={style:{width:"240px"}},Br={class:"text-secondary small"},Fr={key:0,class:"d-flex gap-1"},Hr=["onKeyup"],qr=["onClick","title"],Kr=["title"],Jr=["onClick"],Gr={class:"small"},Zr={class:"small text-secondary"},Yr={class:"small text-secondary"},Qr=["onClick","title"],Xr={class:"btn-group me-1"},eo=["onClick","disabled","title"],to=["onClick","disabled","title"],ao=["onClick","title"],so=["onClick","disabled","title"],io={key:0,class:"spinner-border spinner-border-sm"},ro={key:1,class:"bi bi-trash"},oo={__name:"ScreensTab",setup(s){const{t}=we();Ke();const a=Je(),i=ze(),{activeId:p,activeProject:r,saving:d}=je(i),g=O(!1),h=O(!1),l=O(null),o=O(null),m=O(""),k=V(()=>{var N;return((N=r.value)==null?void 0:N.screens)||[]});async function x(N){if(!r.value)return;const T=[...k.value,N];try{await i.savePatch(p.value,{screens:T})}catch(M){be("화면 생성 실패",M)}}async function $(N){if(!r.value)return;const T=[...k.value,N];try{await i.savePatch(p.value,{screens:T}),a.push({name:"screen-studio",params:{id:p.value,screenId:N.id}})}catch(M){be("화면 생성 실패",M)}}async function I(N){if(!await dt(N.title,{title:t("screensTab.k21")}))return;l.value=N.id;const T=k.value.filter(M=>M.id!==N.id);try{await i.savePatch(p.value,{screens:T})}catch(M){be("삭제 실패",M)}finally{l.value=null}}function j(N){o.value=N.id,m.value=N.title}function y(){o.value=null,m.value=""}async function E(N){const T=m.value.trim();if(!T){y();return}if(T===N.title){y();return}const M=k.value.map(q=>q.id===N.id?{...q,title:T,header:{...q.header||{},title:T}}:q);try{await i.savePatch(p.value,{screens:M})}catch(q){be("이름 변경 실패",q)}finally{y()}}async function A(N,T){const M=k.value.findIndex(se=>se.id===N.id),q=M+T;if(M<0||q<0||q>=k.value.length)return;const K=[...k.value],[re]=K.splice(M,1);K.splice(q,0,re);try{await i.savePatch(p.value,{screens:K})}catch(se){be("이동 실패",se)}}function P(N){a.push({name:"screen-studio",params:{id:p.value,screenId:N.id}})}function ee(N){return N.kind!=="composite"||!Array.isArray(N.rows)?0:N.rows.reduce((T,M)=>{var q;return T+(((q=M.widgets)==null?void 0:q.length)||0)},0)}function S(N){return Array.isArray(N==null?void 0:N.rows)?N.rows.length:0}function U(N){var M;const T=((M=N.header)==null?void 0:M.kind)||"page-title";return pt(T).label}return(N,T)=>(n(),u("div",null,[e("div",Ar,[e("div",null,[e("h6",Pr,[T[5]||(T[5]=e("i",{class:"bi bi-collection me-1"},null,-1)),_(c(f(t)("screensTab.k1"))+" ",1),e("span",Tr,c(k.value.length),1)]),e("p",Er,c(f(t)("screensTab.k2")),1)]),e("button",{class:"btn btn-outline-primary btn-sm me-2",onClick:T[0]||(T[0]=M=>h.value=!0),disabled:f(d)},[T[6]||(T[6]=e("i",{class:"bi bi-magic me-1"},null,-1)),_(c(f(t)("screensTab.k3")),1)],8,Rr),e("button",{class:"btn btn-primary btn-sm",onClick:T[1]||(T[1]=M=>g.value=!0),disabled:f(d)},[T[7]||(T[7]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),_(c(f(t)("screensTab.k4")),1)],8,jr)]),k.value.length===0?(n(),u("div",Lr,[e("div",Nr,[T[8]||(T[8]=e("i",{class:"bi bi-collection fs-1 d-block mb-3 opacity-50"},null,-1)),e("div",zr,c(f(t)("screensTab.k5")),1),e("div",Wr,[_(c(f(t)("screensTab.k6"))+" ",1),e("em",null,c(f(t)("screensTab.k7")),1),_(" "+c(f(t)("screensTab.k8")),1)])])])):(n(),u("div",Mr,[e("div",Ir,[e("table",Dr,[e("thead",Or,[e("tr",null,[T[9]||(T[9]=e("th",{style:{width:"40px"}},"#",-1)),e("th",null,c(f(t)("screensTab.k9")),1),e("th",null,c(f(t)("screensTab.k10")),1),e("th",Ur,c(f(t)("screensTab.k11")),1),T[10]||(T[10]=e("th",{style:{width:"90px"}},"Row / Widget",-1)),e("th",Vr,c(f(t)("screensTab.k12")),1)])]),e("tbody",null,[(n(!0),u(z,null,X(k.value,(M,q)=>(n(),u("tr",{key:M.id},[e("td",Br,c(q+1),1),e("td",null,[o.value===M.id?(n(),u("div",Fr,[Z(e("input",{"onUpdate:modelValue":T[2]||(T[2]=K=>m.value=K),class:"form-control form-control-sm",onKeyup:[Te(K=>E(M),["enter"]),Te(y,["escape"])],ref_for:!0,ref:"renameInputEl"},null,40,Hr),[[Q,m.value]]),e("button",{class:"btn btn-sm btn-success",onClick:K=>E(M),title:f(t)("screensTab.k14")},[...T[11]||(T[11]=[e("i",{class:"bi bi-check-lg"},null,-1)])],8,qr),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:y,title:f(t)("screensTab.k15")},[...T[12]||(T[12]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,Kr)])):(n(),u("a",{key:1,href:"#",class:"text-decoration-none",onClick:Ne(K=>P(M),["prevent"])},[e("strong",null,c(M.title),1)],8,Jr))]),e("td",Gr,[e("code",null,c(M.path),1)]),e("td",Zr,c(U(M)),1),e("td",Yr,c(S(M))+" / "+c(ee(M)),1),e("td",null,[e("button",{class:"btn btn-sm btn-outline-primary me-1",onClick:K=>P(M),title:f(t)("screensTab.k16")},[T[13]||(T[13]=e("i",{class:"bi bi-pencil-square"},null,-1)),_(" "+c(f(t)("screensTab.k13")),1)],8,Qr),e("div",Xr,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:K=>A(M,-1),disabled:q===0,title:f(t)("screensTab.k17")},[...T[14]||(T[14]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,eo),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:K=>A(M,1),disabled:q===k.value.length-1,title:f(t)("screensTab.k18")},[...T[15]||(T[15]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,to)]),e("button",{class:"btn btn-sm btn-outline-secondary me-1",onClick:K=>j(M),title:f(t)("screensTab.k19")},[...T[16]||(T[16]=[e("i",{class:"bi bi-pencil"},null,-1)])],8,ao),e("button",{class:"btn btn-sm btn-outline-danger",onClick:K=>I(M),disabled:l.value===M.id,title:f(t)("screensTab.k20")},[l.value===M.id?(n(),u("span",io)):(n(),u("i",ro))],8,so)])]))),128))])])])])),g.value?(n(),ge(ai,{key:2,onClose:T[3]||(T[3]=M=>g.value=!1),onCreated:x})):L("",!0),$e(Sr,{show:h.value,onClose:T[4]||(T[4]=M=>h.value=!1),onCreate:$},null,8,["show"])]))}};function ne(s){return String(s||"").replace(/(?:^|[-_\s])(.)/g,(t,a)=>a.toUpperCase())}function Ge(s){const t=ne(s);return t.charAt(0).toLowerCase()+t.slice(1)}function Ee(s){return String(s||"").replace(/[^a-zA-Z0-9_\-.]/g,"")||"screen"}function lo(s,t="  "){return String(s||"").split(`
`).map(a=>a.length?t+a:a).join(`
`)}function G(s){return String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ze(s){if(!s)return"item";const t=String(s).split("/").filter(Boolean);for(let a=t.length-1;a>=0;a--){const i=t[a];if(!i||i.startsWith(":")||i.startsWith("{")||/^(api|admin|v\d+|auth|internal)$/i.test(i)||/^(paged|search|count|summary|export|import|batch|bulk|new|edit)$/i.test(i)||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(i))continue;let p=i.toLowerCase();return p.endsWith("ies")?p=p.slice(0,-3)+"y":p.endsWith("s")&&!p.endsWith("ss")&&(p=p.slice(0,-1)),p||"item"}return"item"}function no({imports:s=[],setup:t="",template:a="",style:i=""}={}){const r=[s.filter(Boolean).join(`
`),"",t].filter(Boolean).join(`
`),d=[];return d.push("<script setup>"),d.push(r),d.push("<\/script>"),d.push(""),d.push("<template>"),d.push(lo(a,"  ")),d.push("</template>"),i&&i.trim()&&(d.push(""),d.push("<style scoped>"),d.push(i.trim()),d.push("</style>")),d.push(""),d.join(`
`)}function co(s){var i;const t=s.name||"my-app",a=((i=s.config)==null?void 0:i.cssFramework)||"bootstrap";return[po(s,a),fo(t),mo(),vo(a),bo(),ho(s)]}function uo(s=[]){const t=s.length?`import compositeRoutes from './modules/composites';
`:"",a=s.length?`  ...compositeRoutes,
`:"";return{path:"src/router/index.js",content:`import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
${t}
const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
${a}    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
`,source:"scaffold"}}function po(s,t){const a=(s.name||"App").replace(/</g,""),i=t==="metronic";return{path:"index.html",content:`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${a}</title>
  ${i?`<!-- Metronic v8 — bundle 은 public/metronic/assets/ 에 배치 -->
    <link rel="stylesheet" href="/metronic/assets/plugins/global/plugins.bundle.css" />
    <link rel="stylesheet" href="/metronic/assets/css/style.bundle.css" />`:"<!-- Bootstrap 5 · Bootstrap Icons 는 main.js 에서 패키지로 import 한다 (CDN 없이 동작) -->"}
</head>
<body ${i?`id="kt_app_body"
      data-kt-app-layout="dark-sidebar"
      data-kt-app-header-fixed="true"
      data-kt-app-sidebar-enabled="true"
      data-kt-app-sidebar-fixed="true"
      data-kt-app-sidebar-hoverable="true"
      data-kt-app-sidebar-minimize-desktop-hoverable="true"
      data-kt-app-toolbar-enabled="true"
      class="app-default"`:""}>
  <div id="app"></div>
  <script type="module" src="/src/main.js"><\/script>
</body>
</html>
`,source:"scaffold"}}function fo(s){const t=Ee(s.toLowerCase());return{path:"package.json",content:JSON.stringify({name:t,version:"0.1.0",private:!0,type:"module",scripts:{dev:"vite",build:"vite build",preview:"vite preview"},dependencies:{vue:"^3.4.0","vue-router":"^4.3.0",pinia:"^2.1.7",axios:"^1.7.0",bootstrap:"^5.3.3","bootstrap-icons":"^1.11.3"},devDependencies:{"@vitejs/plugin-vue":"^5.0.4",vite:"^5.2.0"}},null,2),source:"scaffold"}}function mo(){return{path:"vite.config.js",content:`import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: { port: 5180 },
});
`,source:"scaffold"}}function vo(s){return{path:"src/main.js",content:`import { createApp } from 'vue';
import { createPinia } from 'pinia';
${s==="metronic"?`// Metronic 번들은 public/metronic 에 함께 배치됐다고 가정.
// 필요 시 index.html 이나 main.js 에서 script import 추가.
`:`import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
`}import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
`,source:"scaffold"}}function bo(){return{path:"src/App.vue",content:`<script setup>
// 루트 App — 라우터가 모든 뷰를 담당.
<\/script>

<template>
  <RouterView />
</template>
`,source:"scaffold"}}function ho(s){var r,d;const t=s.name||"생성된 프로젝트",a=((r=s.config)==null?void 0:r.cssFramework)==="metronic",i=a?`
## ⚠️ Metronic 번들 배치 (필수)

이 프로젝트는 **Metronic v8** 을 사용하므로 번들을 수동으로 배치해야 합니다:

\`\`\`
${t}/
└─ public/
   └─ metronic/
      └─ assets/          ← Metronic demo 의 assets 폴더를 그대로 복사
         ├─ css/
         │  └─ style.bundle.css
         ├─ plugins/
         │  └─ global/
         │     ├─ plugins.bundle.css
         │     └─ plugins.bundle.js
         ├─ js/
         │  └─ scripts.bundle.js
         └─ media/
\`\`\`

1. Metronic 공식 사이트에서 HTML demo (예: demo38) 를 다운로드
2. 압축을 풀고 \`demo*/assets/\` 폴더 전체를 \`public/metronic/assets/\` 로 복사
3. \`npm run dev\` 실행

번들 없이 실행하면 스타일이 적용되지 않아 빈 화면이 뜹니다.

`:"";return{path:"README.md",content:`# ${t}

${s.description||"Screen Designer 로 자동 생성된 Vue3 프로젝트입니다."}
${i}
## 실행

\`\`\`bash
npm install
npm run dev
\`\`\`

## 빌드

\`\`\`bash
npm run build
\`\`\`

## 스택

- Vue 3 (Composition API, \`<script setup>\`)
- Vue Router 4
- Pinia
- Axios (apiClient 래퍼)
- ${a?"Metronic v8 (상용 라이선스 필요)":"Bootstrap 5"}

## 생성된 구조

\`\`\`
src/
├─ api/client.js           axios 인스턴스 + envelope unwrap
├─ stores/                 Pinia 스토어
│  ├─ auth.js              인증
│  └─ <n>Store.js       각 resource 별 스토어 (list fetch + state)
├─ layouts/                레이아웃 (AppLayout + Header + Sidebar/TopNav)
├─ views/composites/       각 composite 화면
├─ components/widgets/     widget SFC (Stat/List/Detail/Text/Markdown)
├─ router/
│  ├─ index.js             루트 라우터
│  └─ modules/composites.js composite 라우트
└─ main.js
\`\`\`

## 주의

- 생성된 apiClient 는 \`${((d=s.config)==null?void 0:d.apiBaseUrl)||"http://localhost:7901"}\` 로 요청합니다.
  실제 환경에 맞게 \`src/api/client.js\` 의 baseURL 을 수정하세요.
- Resource 스토어의 기본 액션은 \`fetchList\` 만 들어있습니다.
  필요 시 create/update/remove 를 추가해서 사용하세요.
`,source:"scaffold"}}const We=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-and-side"]),Me=new Set(["top-nav","top-and-side","hero-landing"]),Ie=new Set(["sidebar-both"]);function go(s,t="bootstrap"){const a=s||{},i=a.kind||"sidebar-left",p=a.title||{},r=a.sidebar||{},d=a.mainArea||{},g=t==="metronic",h=[];return h.push(yo(i,p,r,d,g)),h.push($o(p,g,i)),We.has(i)&&h.push(_o(r,i==="sidebar-dark"||i==="sidebar-both",g)),Me.has(i)&&h.push(Co(r,g,i)),Ie.has(i)&&h.push(So(g)),h}function yo(s,t,a,i,p){return p?xo(s):ko(s,t,a,i)}function ko(s,t,a,i){const p=Math.max(160,Math.min(320,Number(a.width)||220)),r=i.bgColor||"#f5f7fa",d=Math.max(0,Math.min(48,Number(i.padding)||16)),g=["AppHeader"];We.has(s)&&g.push("AppSidebar"),Me.has(s)&&g.push("AppTopNav"),Ie.has(s)&&g.push("AppAuxPanel");const h=g.map(m=>`import ${m} from './components/${m}.vue';`).join(`
`);let l;switch(s){case"sidebar-left":case"sidebar-dark":{l=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
        <RouterView />
      </main>
    </div>`;break}case"sidebar-right":{l=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
    </div>`;break}case"sidebar-both":{const m=Math.round(p*.6);l=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${m}px;">
        <AppAuxPanel />
      </aside>
    </div>`;break}case"top-nav":{l=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
      <RouterView />
    </main>`;break}case"top-and-side":{l=`
    <AppTopNav />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
        <RouterView />
      </main>
    </div>`;break}case"hero-landing":{l=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r};">
      <RouterView />
    </main>`;break}case"split-panel":{l=`
    <AppHeader />
    <main class="flex-grow-1 d-flex" style="background-color: ${r}; padding: ${d}px;">
      <RouterView />
    </main>`;break}case"card-grid":{l=`
    <AppHeader />
    <main class="flex-grow-1 container-fluid" style="background-color: ${r}; padding: ${d}px;">
      <RouterView />
    </main>`;break}default:l=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${d}px;">
        <RouterView />
      </main>
    </div>`}return{path:"src/layouts/AppLayout.vue",content:`<script setup>
${h}
<\/script>

<template>
  <div class="d-flex flex-column min-vh-100" data-layout-kind="${s}">${l}
  </div>
</template>
`,source:"scaffold"}}function xo(s,t,a,i){const p=["AppHeader"];We.has(s)&&p.push("AppSidebar"),Me.has(s)&&p.push("AppTopNav"),Ie.has(s)&&p.push("AppAuxPanel");const r=p.map(o=>`import ${o} from './components/${o}.vue';`).join(`
`),d=wo(s);let g;switch(s){case"sidebar-left":case"sidebar-dark":g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;break;case"sidebar-right":g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
        <AppSidebar />
      </div>`;break;case"sidebar-both":g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
        <AppAuxPanel />
      </div>`;break;case"top-nav":g=`
      <AppHeader />
      <AppTopNav />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;break;case"top-and-side":g=`
      <AppHeader />
      <AppTopNav />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;break;case"hero-landing":g=`
      <AppTopNav />
      <div class="flex-column-fluid" id="kt_app_content">
        <RouterView />
      </div>`;break;case"split-panel":g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column-fluid">
            <div class="app-content flex-column-fluid d-flex" id="kt_app_content">
              <div class="app-container container-xxl d-flex">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;break;case"card-grid":g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-fluid">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;break;default:g=`
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`}const h=Object.entries(d).map(([o,m])=>`[${JSON.stringify(o)}, ${JSON.stringify(m)}]`).join(", ");return{path:"src/layouts/AppLayout.vue",content:`<script setup>
// Metronic 은 body 의 data-kt-app-* attribute 조합으로 layout 모양을 결정합니다.
// demo38 의 body 를 참고하여 mount 시점에 적절한 속성을 설정합니다.
import { onMounted, onBeforeUnmount } from 'vue';
${r}

const BODY_ATTRS = [${h}];
const prevAttrs = new Map();

onMounted(() => {
  const body = document.body;
  for (const [k, v] of BODY_ATTRS) {
    prevAttrs.set(k, body.getAttribute(k));
    body.setAttribute(k, v);
  }
  body.classList.add('app-default');
});

onBeforeUnmount(() => {
  const body = document.body;
  for (const [k, prev] of prevAttrs.entries()) {
    if (prev === null) body.removeAttribute(k);
    else body.setAttribute(k, prev);
  }
  body.classList.remove('app-default');
});
<\/script>

<template>
  <div class="d-flex flex-column flex-root app-root" id="kt_app_root" data-layout-kind="${s}">
    <div class="app-page flex-column flex-column-fluid" id="kt_app_page">${g}
    </div>
  </div>
</template>
`,source:"scaffold"}}function wo(s){const t={"data-kt-app-layout":"dark-sidebar","data-kt-app-header-fixed":"true","data-kt-app-header-fixed-mobile":"true","data-kt-app-sidebar-enabled":"true","data-kt-app-sidebar-fixed":"true","data-kt-app-sidebar-hoverable":"true","data-kt-app-sidebar-push-header":"true","data-kt-app-sidebar-push-toolbar":"true","data-kt-app-sidebar-push-footer":"true","data-kt-app-toolbar-enabled":"true"};switch(s){case"sidebar-left":return{...t,"data-kt-app-layout":"light-sidebar"};case"sidebar-dark":return{...t,"data-kt-app-layout":"dark-sidebar"};case"sidebar-right":return{...t,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-position":"end"};case"sidebar-both":return{...t,"data-kt-app-layout":"dark-sidebar","data-kt-app-aside-enabled":"true"};case"top-nav":return{"data-kt-app-layout":"dark-header","data-kt-app-header-fixed":"true","data-kt-app-sidebar-enabled":"false","data-kt-app-toolbar-enabled":"true"};case"top-and-side":return{...t,"data-kt-app-layout":"dark-header"};case"hero-landing":return{"data-kt-app-layout":"blank","data-kt-app-sidebar-enabled":"false","data-kt-app-header-fixed":"false"};case"split-panel":return{...t,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};case"card-grid":return{...t,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};default:return t}}function $o(s,t,a){const i=s.text||"",p=s.logoUrl||"",r=Math.max(40,Math.min(120,Number(s.height)||60));if(t)return a==="hero-landing"?{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <div class="landing-header" data-kt-sticky="true" data-kt-sticky-name="landing-header" data-kt-sticky-offset="{default: '200px', lg: '300px'}">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-equal">
          ${p?`<img alt="logo" src="${G(p)}" class="h-40px" />`:""}
          <span class="h3 m-0 ms-3 fw-bold">${i}</span>
        </div>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"}:{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <div class="app-header" id="kt_app_header">
    <div class="app-container container-xxl d-flex align-items-stretch justify-content-between">
      <div class="d-flex align-items-center">
        ${p?`<img src="${G(p)}" alt="logo" class="h-40px me-3" />`:""}
        <h3 class="app-header-title m-0 fw-bold">${i}</h3>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"};const d=s.bgColor||"#ffffff",g=s.fgColor||"#0f172a";return{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <header class="d-flex align-items-center border-bottom px-3"
          style="height: ${r}px; background-color: ${d}; color: ${g};">
    ${p?`<img src="${G(p)}" alt="logo" class="me-2" style="max-height: ${r-16}px;" />`:""}
    <h1 class="h5 m-0">${i}</h1>
  </header>
</template>
`,source:"scaffold"}}function _o(s,t,a){const i=Array.isArray(s.items)?s.items:[];if(a){const g=i.map(l=>{const o=G(l.label||""),m=G(l.path||"#"),k=l.icon||"bi-circle";return`        <div class="menu-item">
          <RouterLink to="${m}" class="menu-link">
            <span class="menu-icon">
              <i class="bi ${k}"></i>
            </span>
            <span class="menu-title">${o}</span>
          </RouterLink>
        </div>`}).join(`
`);return{path:"src/layouts/components/AppSidebar.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div id="kt_app_sidebar"
       class="app-sidebar flex-column"
       data-kt-drawer="true"
       data-kt-drawer-name="app-sidebar"
       data-kt-drawer-activate="{default: true, lg: false}"
       data-kt-drawer-overlay="true"
       data-kt-drawer-width="225px"
       data-kt-drawer-direction="start"
       data-kt-drawer-toggle="#kt_app_sidebar_mobile_toggle">
    <div class="app-sidebar-logo px-6 py-4" id="kt_app_sidebar_logo">
      <RouterLink to="/" class="d-flex align-items-center">
        <span class="fs-3 fw-bold text-white">${G(s.brand||"App")}</span>
      </RouterLink>
    </div>
    <div class="app-sidebar-menu overflow-hidden flex-column-fluid">
      <div id="kt_app_sidebar_menu_wrapper"
           class="app-sidebar-wrapper hover-scroll-overlay-y my-5">
        <div class="menu menu-column menu-rounded menu-sub-indention px-3">
${g||"          <!-- 메뉴 항목 없음 -->"}
        </div>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"}}const p=t?"bg-dark text-white":"bg-light",r=i.map(g=>{const h=G(g.label||""),l=G(g.path||"#"),o=g.icon||"bi-file-earmark";return`    <li class="nav-item">
      <RouterLink to="${l}" class="nav-link ${t?"text-white-50":""}">
        <i class="bi ${o} me-2"></i>${h}
      </RouterLink>
    </li>`}).join(`
`);return{path:"src/layouts/components/AppSidebar.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="d-flex flex-column h-100 ${p} p-2">
    <ul class="nav flex-column">
${r||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function Co(s,t,a){const i=Array.isArray(s.items)?s.items:[];if(t)return a==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div class="landing-menu-wrapper d-flex align-items-center flex-equal flex-lg-end" data-kt-drawer="true" data-kt-drawer-name="landing-menu">
    <div class="menu menu-rounded menu-column menu-lg-row menu-title-gray-500 menu-state-title-primary fw-semibold fs-6" id="kt_landing_menu">
${i.map(o=>{const m=G(o.label||"");return`      <div class="menu-item">
        <RouterLink to="${G(o.path||"#")}" class="menu-link nav-link py-3 px-4 px-xxl-6">
          <span class="menu-title">${m}</span>
        </RouterLink>
      </div>`}).join(`
`)||"      <!-- 메뉴 항목 없음 -->"}
    </div>
  </div>
</template>
`,source:"scaffold"}:{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div class="app-navbar app-container container-xxl">
    <div class="menu menu-rounded menu-column menu-lg-row menu-state-bg
                menu-title-gray-700 menu-state-icon-primary menu-state-bullet-primary
                menu-arrow-gray-400 fw-semibold my-5 my-lg-0 align-items-stretch">
${i.map(h=>{const l=G(h.label||"");return`      <div class="menu-item">
        <RouterLink to="${G(h.path||"#")}" class="menu-link">
          <span class="menu-title">${l}</span>
        </RouterLink>
      </div>`}).join(`
`)||"      <!-- 메뉴 항목 없음 -->"}
    </div>
  </div>
</template>
`,source:"scaffold"};const p=i.map(d=>{const g=G(d.label||"");return`      <li class="nav-item">
        <RouterLink to="${G(d.path||"#")}" class="nav-link">${g}</RouterLink>
      </li>`}).join(`
`);return a==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top">
    <div class="container">
      <div class="navbar-nav d-flex flex-row gap-3">
${p||"        <!-- 메뉴 항목 없음 -->"}
      </div>
    </div>
  </nav>
</template>
`,source:"scaffold"}:{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="border-bottom px-3 py-1 bg-body-tertiary">
    <ul class="nav nav-pills">
${p||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function So(s){return s?{path:"src/layouts/components/AppAuxPanel.vue",content:`<script setup><\/script>

<template>
  <div class="app-aside flex-column" id="kt_app_aside" data-kt-app-aside-enabled="true">
    <div class="app-aside-wrapper p-5">
      <h6 class="text-muted">보조 패널</h6>
      <p class="text-muted small">이 영역에 알림 · 퀵 액션 등을 배치할 수 있습니다.</p>
    </div>
  </div>
</template>
`,source:"scaffold"}:{path:"src/layouts/components/AppAuxPanel.vue",content:`<script setup><\/script>

<template>
  <div class="d-flex flex-column h-100 bg-body-tertiary p-3">
    <h6 class="text-muted mb-2">보조 패널</h6>
    <p class="text-muted small mb-0">이 영역에 알림 · 퀵 액션 등을 배치할 수 있습니다.</p>
  </div>
</template>
`,source:"scaffold"}}function Ao(){return[{path:"src/components/widgets/StatWidget.vue",content:Po,source:"widget"},{path:"src/components/widgets/ListWidget.vue",content:To,source:"widget"},{path:"src/components/widgets/ListPagedWidget.vue",content:Lo,source:"widget"},{path:"src/components/widgets/DetailWidget.vue",content:Eo,source:"widget"},{path:"src/components/widgets/TextWidget.vue",content:Ro,source:"widget"},{path:"src/components/widgets/MarkdownWidget.vue",content:jo,source:"widget"},{path:"src/components/widgets/QueryFormWidget.vue",content:No,source:"widget"},{path:"src/components/widgets/FormDialogWidget.vue",content:zo,source:"widget"}]}const Po=`<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: null },
  format: { type: String, default: 'number' },   // number | currency | percent | raw
  color: { type: String, default: 'primary' },   // primary | success | warning | danger
});

const displayValue = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  switch (props.format) {
    case 'currency': return '₩' + Number(v).toLocaleString('ko-KR');
    case 'percent':  return (Number(v) * 100).toFixed(1) + '%';
    case 'number':   return Number(v).toLocaleString('ko-KR');
    case 'raw':
    default:         return String(v);
  }
});

const valueColorClass = computed(() => 'text-' + (props.color || 'primary'));
<\/script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <div class="text-uppercase text-muted small fw-semibold mb-1">{{ label }}</div>
      <div class="fs-2 fw-bold" :class="valueColorClass">{{ displayValue }}</div>
    </div>
  </div>
</template>
`,To=`<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: null },
  maxRows: { type: Number, default: 5 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // 실시간(SSE) 사용 여부 / 현재 연결 상태 — 화면 디자이너에서 [실시간 자동 갱신] 을 켜면 전달된다
  realtime: { type: Boolean, default: false },
  realtimeConnected: { type: Boolean, default: false },
  // ★ v1.9.0 — 화면 디자이너의 '눌렀을 때 → 화면 이동' 설정이 켜지면 true.
  //   꺼져 있으면 행에 아무 속성도 붙지 않아 예전과 똑같이 동작한다.
  rowClickable: { type: Boolean, default: false },
});
const emit = defineEmits(['row-click']);

const effectiveRows = computed(() => (props.rows || []).slice(0, Number(props.maxRows) || 5));
const effectiveColumns = computed(() => {
  if (props.columns && props.columns.length) return props.columns;
  const first = effectiveRows.value[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object')
    .slice(0, 6)
    .map((k) => ({ name: k, label: k }));
});

const formatCell = (value) => {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

const hiddenCount = computed(() => Math.max(0, (props.rows || []).length - effectiveRows.value.length));

/* 실시간으로 목록이 바뀌면 잠깐 표시해 준다 (사용자가 "방금 갱신됐다" 를 알 수 있게) */
const justUpdated = ref(false);
let flashTimer = null;
watch(() => props.rows, () => {
  if (!props.realtime) return;
  justUpdated.value = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { justUpdated.value = false; }, 1200);
}, { deep: false });
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title || realtime" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <!-- 실시간 배지: 연결되면 초록, 끊기면 회색. 새 데이터가 오면 잠깐 "갱신됨" -->
      <span v-if="realtime" class="ms-auto d-inline-flex align-items-center small">
        <span class="rt-dot" :class="realtimeConnected ? 'on' : 'off'"></span>
        <span :class="realtimeConnected ? 'text-success' : 'text-muted'">
          {{ realtimeConnected ? '실시간' : '연결 끊김' }}
        </span>
        <span v-if="justUpdated" class="badge bg-primary ms-2">갱신됨</span>
      </span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>불러오는 중…
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!effectiveRows.length" class="text-center text-muted py-4">데이터가 없습니다.</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted text-uppercase small">
            <tr>
              <th v-for="c in effectiveColumns" :key="c.name" class="fw-semibold">
                {{ c.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- ★ v1.9.0: 화면 디자이너에서 '눌렀을 때 → 화면 이동' 을 설정하면
                 rowClickable 이 켜지고 아래 핸들러가 붙는다.
                 ⚠ tabindex + keyup.enter — 클릭만 되면 키보드 사용자가 쓸 수 없다. -->
            <tr v-for="(row, i) in effectiveRows" :key="i"
                :class="{ 'rt-clickable': rowClickable }"
                :tabindex="rowClickable ? 0 : undefined"
                :role="rowClickable ? 'button' : undefined"
                @click="rowClickable && emit('row-click', row)"
                @keyup.enter="rowClickable && emit('row-click', row)">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="hiddenCount > 0" class="text-muted small text-end px-3 py-2 border-top">
        +{{ hiddenCount }}개 더
      </div>
    </div>
  </div>
</template>

<style scoped>
.rt-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
/* ★ v1.9.0 — 누를 수 있다는 것이 보여야 누른다 */
.rt-clickable { cursor: pointer; }
.rt-clickable:focus-visible { outline: 2px solid var(--bs-primary, #0d6efd); outline-offset: -2px; }
.rt-dot.on { background: #12A150; }
.rt-dot.off { background: #9AA3BC; }
</style>
`,Eo=`<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  record: { type: Object, default: null },
  fields: { type: Array, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const effectiveFields = computed(() => {
  if (props.fields && props.fields.length) return props.fields;
  if (!props.record || typeof props.record !== 'object') return [];
  return Object.keys(props.record)
    .filter((k) => typeof props.record[k] !== 'object' || props.record[k] == null)
    .slice(0, 10)
    .map((k) => ({ name: k, label: k }));
});

const formatCell = (value) => {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>불러오는 중…
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-center text-muted py-4">선택된 항목이 없습니다.</div>
      <dl v-else class="row mb-0 small">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt class="col-sm-4 text-muted fw-normal">{{ f.label }}</dt>
          <dd class="col-sm-8 mb-2">{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
`,Ro=`<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String, Boolean], default: null },
  format: { type: String, default: 'auto' },
});

const display = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (props.format === 'number') return Number(v).toLocaleString('ko-KR');
  return String(v);
});
<\/script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <div v-if="label" class="text-uppercase text-muted small mb-1">{{ label }}</div>
      <div class="fs-5 fw-semibold">{{ display }}</div>
    </div>
  </div>
</template>
`,jo=`<script setup>
const props = defineProps({
  body: { type: String, default: '' },
});
<\/script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <pre class="mb-0" style="white-space: pre-wrap; word-break: break-word;
                                font-family: inherit; font-size: 13px; line-height: 1.6;">{{ body }}</pre>
    </div>
  </div>
</template>
`,Lo=`<script setup>
/**
 * ListPagedWidget — 페이지네이션 내장 목록 위젯.
 *   상위 컴포넌트가 store 의 rows / page / perPage / totalPages / total 을 전달.
 *   페이지 버튼 클릭 시 @change-page 이벤트를 emit 해서 상위가 store.fetchList 재호출.
 */
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: null },
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: 10 },
  totalPages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  defaultPerPage: { type: Number, default: 10 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['change-page']);

const effectiveColumns = computed(() => {
  if (props.columns && props.columns.length) return props.columns;
  const first = (props.rows || [])[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object')
    .slice(0, 6)
    .map((k) => ({ name: k, label: k }));
});

const pageWindow = computed(() => {
  const tp = Math.max(1, props.totalPages);
  const size = 10;
  let start = Math.max(1, props.page - Math.floor(size / 2));
  let end = start + size - 1;
  if (end > tp) { end = tp; start = Math.max(1, end - size + 1); }
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
});

const hasPrev = computed(() => props.page > 1);
const hasNext = computed(() => props.page < props.totalPages);

function go(p) {
  if (p < 1 || p > props.totalPages || p === props.page) return;
  emit('change-page', p);
}

const formatCell = (v) => {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge bg-secondary ms-2">총 {{ total }}건</span>
      <span v-if="totalPages > 1" class="text-muted small ms-auto">{{ page }} / {{ totalPages }}</span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>불러오는 중…
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!(rows || []).length" class="text-center text-muted py-4">데이터가 없습니다.</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted text-uppercase small">
            <tr><th v-for="c in effectiveColumns" :key="c.name" class="fw-semibold">{{ c.label }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="totalPages > 1" class="d-flex gap-1 justify-content-center p-2 border-top">
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasPrev" @click="go(1)">«</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasPrev" @click="go(page - 1)">‹</button>
        <button v-for="p in pageWindow" :key="p"
                class="btn btn-sm"
                :class="p === page ? 'btn-primary' : 'btn-outline-secondary'"
                @click="go(p)">{{ p }}</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasNext" @click="go(page + 1)">›</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasNext" @click="go(totalPages)">»</button>
      </nav>
    </div>
  </div>
</template>
`,No=`<script setup>
/**
 * QueryFormWidget — 입력값을 입력받아 상위에 @submit 이벤트로 전달.
 *   사용자 코드에서 이 이벤트를 받아 store.fetchOne(params) 를 호출.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },       // [{ name, label, type, required, default, placeholder }]
  submitLabel: { type: String, default: '조회' },
  endpointHint: { type: String, default: '' },
});
const emit = defineEmits(['submit']);

const values = reactive({});
for (const f of (props.fields || [])) {
  values[f.name] = f.default != null ? f.default : '';
}
const localError = ref('');

function onSubmit() {
  localError.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      localError.value = f.label + ' 값을 입력하세요.';
      return;
    }
  }
  const out = {};
  for (const f of (props.fields || [])) {
    let v = values[f.name];
    if (v === '' || v == null) continue;
    if (f.type === 'number') v = Number(v);
    if (f.type === 'boolean') v = v === true || v === 'true';
    out[f.name] = v;
  }
  emit('submit', out);
}
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title || endpointHint" class="card-header d-flex align-items-center flex-wrap gap-2">
      <h3 v-if="title" class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <code v-if="endpointHint" class="ms-auto text-muted small px-2 py-1 bg-light rounded">{{ endpointHint }}</code>
    </div>
    <div class="card-body">
      <div class="d-flex flex-wrap gap-2 align-items-end">
        <div v-for="f in (fields || [])" :key="f.name" class="d-flex flex-column" style="min-width: 120px; flex: 1;">
          <label class="form-label small mb-1">
            <code class="small px-1 bg-primary bg-opacity-10 text-primary rounded">{{ f.label }}</code>
            <span v-if="f.required" class="text-danger">*</span>
          </label>
          <input v-if="f.type === 'number'" type="number" class="form-control form-control-sm"
                 v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                 @keyup.enter="onSubmit" />
          <select v-else-if="f.type === 'boolean'" class="form-select form-select-sm" v-model="values[f.name]">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <input v-else type="text" class="form-control form-control-sm"
                 v-model="values[f.name]" :placeholder="f.placeholder || ''"
                 @keyup.enter="onSubmit" />
        </div>
        <button class="btn btn-primary btn-sm" style="min-width: 72px;" @click="onSubmit">{{ submitLabel }}</button>
      </div>
      <div v-if="localError" class="alert alert-warning py-1 px-2 mt-2 mb-0 small">{{ localError }}</div>
    </div>
  </div>
</template>
`,zo=`<script setup>
/**
 * FormDialogWidget — 버튼 + 모달 + 폼.
 *   [버튼] 클릭 → 모달 열림 → 사용자 입력 → [제출] → @submit(params) 이벤트.
 *   상위 코드에서 store.submitForm(method, params) 호출하고, 성공 시 @success 이벤트로 refresh 유도.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  buttonLabel: { type: String, default: '실행' },
  buttonVariant: { type: String, default: 'primary' },
  dialogTitle: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  confirmBeforeSubmit: { type: Boolean, default: false },
  method: { type: String, default: 'POST' },
});
const emit = defineEmits(['submit', 'success']);

const open = ref(false);
const values = reactive({});
const submitting = ref(false);
const error = ref('');
const success = ref('');

function reset() {
  for (const f of (props.fields || [])) {
    values[f.name] = f.default != null ? f.default : '';
  }
  error.value = '';
  success.value = '';
}
function openDialog() { reset(); open.value = true; }
function closeDialog() { open.value = false; }

async function doSubmit() {
  error.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      error.value = f.label + ' 값을 입력하세요.';
      return;
    }
  }
  if (props.confirmBeforeSubmit && !confirm('계속 진행할까요?')) return;
  submitting.value = true;
  try {
    const out = {};
    for (const f of (props.fields || [])) {
      let v = values[f.name];
      if (v === '' || v == null) continue;
      if (f.type === 'number') v = Number(v);
      if (f.type === 'boolean') v = v === true || v === 'true';
      out[f.name] = v;
    }
    // 상위가 store.submitForm 을 호출 — await 가능하도록 Promise 반환 계약.
    await Promise.resolve(emit('submit', out));
    success.value = '완료되었습니다.';
    emit('success');
    setTimeout(() => { open.value = false; }, 600);
  } catch (e) {
    error.value = e?.message || String(e);
  } finally {
    submitting.value = false;
  }
}
<\/script>

<template>
  <div class="d-inline-block">
    <button :class="'btn btn-' + (buttonVariant || 'primary')" @click="openDialog">{{ buttonLabel }}</button>
    <div v-if="open"
         class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
         style="background: rgba(15, 23, 42, 0.45); z-index: 2000;"
         @click.self="closeDialog">
      <div class="card" style="width: 100%; max-width: 480px;">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">{{ dialogTitle || buttonLabel }}</h5>
          <button class="btn-close" @click="closeDialog"></button>
        </div>
        <div class="card-body">
          <div v-for="f in (fields || [])" :key="f.name" class="mb-2">
            <label class="form-label small mb-1">
              {{ f.label }} <span v-if="f.required" class="text-danger">*</span>
            </label>
            <input v-if="f.type === 'number'" type="number" class="form-control form-control-sm"
                   v-model.number="values[f.name]" :placeholder="f.placeholder || ''" />
            <select v-else-if="f.type === 'boolean'" class="form-select form-select-sm" v-model="values[f.name]">
              <option :value="true">true</option>
              <option :value="false">false</option>
            </select>
            <textarea v-else-if="f.type === 'text'" class="form-control form-control-sm" rows="3"
                      v-model="values[f.name]" :placeholder="f.placeholder || ''"></textarea>
            <input v-else type="text" class="form-control form-control-sm"
                   v-model="values[f.name]" :placeholder="f.placeholder || ''" />
          </div>
          <div v-if="error" class="alert alert-danger py-1 px-2 mt-2 mb-0 small">{{ error }}</div>
          <div v-if="success" class="alert alert-success py-1 px-2 mt-2 mb-0 small">{{ success }}</div>
        </div>
        <div class="card-footer d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">취소</button>
          <button :class="'btn btn-sm btn-' + (buttonVariant || 'primary')"
                  @click="doSubmit" :disabled="submitting">
            <span v-if="submitting">…</span>
            <span v-else>{{ buttonLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;function Wo(s){var a;const t=((a=s==null?void 0:s.config)==null?void 0:a.apiBaseUrl)||"http://localhost:7901";return{path:"src/api/client.js",content:`import axios from 'axios';

/**
 * apiClient — aidot-express 서버와 통신하는 axios 인스턴스.
 *  서버 응답 envelope: { code, message, header, data }
 *  interceptor 에서 .data 를 언래핑해 호출자가 바로 쓰기 편하게 한다.
 *
 *  토큰 보관 정책
 *   - access token : 이 모듈의 지역 변수(메모리)에만 둔다. localStorage/sessionStorage 사용 금지.
 *   - refresh token: 서버가 HttpOnly 쿠키로 내려준다(경로 /api/auth). JS 는 접근하지 못한다.
 *   - 새로고침하면 access token 은 사라지지만 부팅 시 refreshAccessToken() 한 번으로 복구된다.
 */
const BASE_URL = ${JSON.stringify(t)};

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // refresh 쿠키 전송에 필요
  timeout: 15000,
});

let accessToken = null;
let refreshPromise = null;                 // 동시에 401 이 여러 개 나도 refresh 는 한 번만
const listeners = new Set();               // 토큰 변경 알림 (authStore 가 구독)

export function setAccessToken(token) {
  accessToken = token || null;
  for (const fn of listeners) { try { fn(accessToken); } catch (_) {} }
}
export function getAccessToken() { return accessToken; }
export function onAccessTokenChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** refresh 쿠키로 access token 재발급. 실패하면 null 반환(비로그인 상태). */
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(BASE_URL + '/api/auth/refresh', {}, { withCredentials: true, timeout: 15000 })
      .then((res) => {
        const body = res.data;
        const token = (body && body.data ? body.data.accessToken : null) || null;
        setAccessToken(token);
        return token;
      })
      .catch(() => { setAccessToken(null); return null; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// 요청 시 Bearer 토큰 부착 (있으면)
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = 'Bearer ' + accessToken;
  }
  return config;
});

// 응답 envelope unwrap + 401 자동 재발급
apiClient.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'code' in body) {
      return { ...res, data: body.data, header: body.header, envelope: body };
    }
    return res;
  },
  async (err) => {
    const original = err.config || {};
    const status = err.response && err.response.status;
    const isAuthCall = String(original.url || '').indexOf('/api/auth/') !== -1;
    if (status === 401 && !original._retried && !isAuthCall) {
      original._retried = true;                 // 재시도는 1회 (무한 루프 방지)
      const token = await refreshAccessToken();
      if (token) return apiClient(original);
    }
    return Promise.reject(err);
  },
);

export default apiClient;
`,source:"common"}}function Mo(){return{path:"src/stores/auth.js",content:`import { defineStore } from 'pinia';
import apiClient, { setAccessToken, getAccessToken, refreshAccessToken } from '@/api/client';

/**
 * authStore — 로그인 상태.
 *  access token 은 apiClient 의 메모리에만 보관한다(스토리지 저장 안 함).
 *  앱 시작 시 bootstrap() 을 한 번 호출하면 HttpOnly refresh 쿠키로 로그인 상태를 복구한다.
 *
 *  main.js 예시:
 *    const auth = useAuthStore();
 *    await auth.bootstrap();
 *    app.mount('#app');
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    authReady: false,     // bootstrap 완료 여부 (라우터 가드에서 사용)
  }),
  getters: {
    isAuthenticated: () => !!getAccessToken(),
  },
  actions: {
    async login({ username, password }) {
      const r = await apiClient.post('/api/auth/login', { username, password });
      setAccessToken((r.data && r.data.accessToken) || null);
      this.user = (r.data && r.data.user) || null;
      return r.data;
    },

    /** 새로고침 후 로그인 상태 복구 — 실패해도 예외를 던지지 않는다(비로그인으로 진행) */
    async bootstrap() {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const me = await apiClient.get('/api/auth/me');
          this.user = (me.data && me.data.user) || me.data || null;
        } catch (_) { this.user = null; }
      }
      this.authReady = true;
      return !!token;
    },

    async logout() {
      try { await apiClient.post('/api/auth/logout'); } catch (_) {}
      this.clearLocal();
    },

    clearLocal() {
      this.user = null;
      setAccessToken(null);
    },
  },
});
`,source:"common"}}function Be(s){const t=s==null?void 0:s.onRowClick;return!t||t.action!=="navigate"||!t.target?"":` :row-clickable="true" @row-click="onRowClick_${s.id}"`}function Io(s,t=[]){const a=[];let i=!1;for(const p of(s==null?void 0:s.rows)||[])for(const r of p.widgets||[]){const d=r==null?void 0:r.onRowClick;if(!d||d.action!=="navigate"||!d.target)continue;i=!0;const g=t.find(o=>o.id===d.target),h=ne(g?De(g):d.target),l=Object.entries(d.params||{}).filter(([,o])=>o).map(([o,m])=>/^row\.([\w$]+)$/.test(m)?`${o}: row.${/^row\.([\w$]+)$/.exec(m)[1]}`:`${o}: ${JSON.stringify(m)}`);a.push(""),a.push(`/** 화면 디자이너: '${r.title||r.kind}' 행 클릭 → ${(g==null?void 0:g.title)||d.target} */`),a.push(`function onRowClick_${r.id}(row) {`),a.push(`  router.push({ name: '${h}'${l.length?`, params: { ${l.join(", ")} }`:""} });`),a.push("}")}return{needsRouter:i,lines:a}}function Do(s,{resourceCollector:t=new Map,screens:a=[]}={}){const i=Vo(s,t);i.rowClick=Io(s,a);const p=Bo(i),r=Fo(i),d=Ho(i);return{path:`src/views/composites/${De(s)}.vue`,content:no({imports:p,setup:r,template:d,style:Zo}),source:"screen",specId:s.id,kind:"composite"}}function Oo(s){const t=String((s==null?void 0:s.path)||"/").replace(/\/+$/,"")||"/",a=Array.isArray(s==null?void 0:s.params)?s.params:[];if(!a.length)return(s==null?void 0:s.path)||"/";const i=new Set([...String((s==null?void 0:s.path)||"").matchAll(/(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)\??/g)].map(r=>r[1])),p=a.filter(r=>!i.has(r.name)).map(r=>`:${r.name}${r.required===!1?"?":""}`);return p.length?`${t==="/"?"":t}/${p.join("/")}`:(s==null?void 0:s.path)||"/"}function Uo(s){if(!s.length)return null;const t=[];t.push("/**"),t.push(" * Composite 화면 라우트. 자동 생성됨."),t.push(" */"),t.push(""),t.push("const routes = [");for(const a of s){const i=De(a);t.push("  {"),t.push(`    path: ${JSON.stringify(Oo(a))},`),t.push(`    name: ${JSON.stringify(ne(i))},`),t.push("    props: true,   // route.params 를 props 로 받는다"),t.push(`    component: () => import('@/views/composites/${i}.vue'),`),t.push("  },")}return t.push("]"),t.push(""),t.push("export default routes;"),t.push(""),{path:"src/router/modules/composites.js",content:t.join(`
`),source:"router-module"}}function De(s){const t=Ee(ne(s.title||""));if(t.toLowerCase()!=="screen")return t+"View";const a=Ee(ne(String(s.path||"").replace(/:/g,"").split("/").filter(Boolean).join("-")));if(a.toLowerCase()!=="screen")return a+"View";const i=String(s.id||"").replace(/[^\w]/g,"").slice(-6)||"Main";return"Screen"+ne(i)+"View"}function Vo(s,t){const a=new Map,i=new Map,p=[],r=new Set;let d=0;function g(l,o){const m=Ge(l);if(!m)return null;if(!a.has(m)){const k={Pascal:ne(l),endpointPath:(o==null?void 0:o.endpointPath)||`/api/${m}s`,method:(o==null?void 0:o.method)||"GET",resultKey:(o==null?void 0:o.resultKey)||null,realtime:!!(o!=null&&o.realtime)&&!!(o!=null&&o.streamPath),streamPath:(o==null?void 0:o.streamPath)||null};a.set(m,k),t&&!t.has(m)&&t.set(m,{key:m,...k})}return m}function h(l){const o={primary:"null",rowsExpr:"[]",loading:"false",error:"''"},m=l.source;if(!m)return o;if(m.type==="endpoint"){const k=Ze(m.path||""),x=g(k,{endpointPath:m.path,method:m.method||"GET",resultKey:m.resultKey||null,realtime:m.realtime,streamPath:m.streamPath});if(!x)return o;const $=!!(m.realtime&&m.streamPath);return{primary:`${x}CurrentItem`,rowsExpr:`${x}Rows`,loading:`${x}Loading`,error:`${x}Error`,realtime:$,realtimeConnectedExpr:$?`${x}Store.realtimeConnected`:null}}if(m.type==="storeState"){if(!m.resourceKey||!m.stateName)return o;const k=g(m.resourceKey,null);return k?{primary:`${k}${ne(m.stateName)}`,rowsExpr:`${k}Rows`,loading:`${k}Loading`,error:`${k}Error`}:o}if(m.type==="storeCompute"){if(!m.resourceKey||!m.stateName)return o;const k=g(m.resourceKey,null);if(!k)return o;const x=`${k}${ne(m.stateName)}`,$=`c${++d}`;return p.push(`const ${$} = computed(() => ${Go(x,m)});`),{primary:$,rowsExpr:x,loading:`${k}Loading`,error:`${k}Error`}}return m.type==="customVar"&&m.varName?{primary:m.varName,rowsExpr:m.varName,loading:"false",error:"''"}:o}for(const l of s.rows||[])for(const o of l.widgets||[])i.set(o.id,h(o));return{spec:s,usedResources:a,widgetBindings:i,computedDecls:p,exposed:r}}function Bo(s){var i;const t=[],a=[...s.usedResources.values()].some(p=>p.realtime);if(t.push(`import { ref, computed, onMounted${a?", onBeforeUnmount":""} } from 'vue';`),(i=s.rowClick)!=null&&i.needsRouter&&t.push("import { useRouter } from 'vue-router';"),s.usedResources.size>0){t.push("import { storeToRefs } from 'pinia';");for(const[p,r]of s.usedResources)t.push(`import { use${r.Pascal}Store } from '@/stores/${p}Store';`)}return t.push(""),t.push("import StatWidget from '@/components/widgets/StatWidget.vue';"),t.push("import ListWidget from '@/components/widgets/ListWidget.vue';"),t.push("import ListPagedWidget from '@/components/widgets/ListPagedWidget.vue';"),t.push("import DetailWidget from '@/components/widgets/DetailWidget.vue';"),t.push("import TextWidget from '@/components/widgets/TextWidget.vue';"),t.push("import MarkdownWidget from '@/components/widgets/MarkdownWidget.vue';"),t.push("import QueryFormWidget from '@/components/widgets/QueryFormWidget.vue';"),t.push("import FormDialogWidget from '@/components/widgets/FormDialogWidget.vue';"),t}function Fo(s){var p,r,d,g,h;const t=[];(p=s.rowClick)!=null&&p.needsRouter&&t.push("const router = useRouter();");for(const[l,o]of s.usedResources)t.push(`const ${l}Store = use${o.Pascal}Store();`),t.push(`const { rows: ${l}Rows, currentItem: ${l}CurrentItem, loading: ${l}Loading, error: ${l}Error, total: ${l}Total, page: ${l}Page, perPage: ${l}PerPage, totalPages: ${l}TotalPages } = storeToRefs(${l}Store);`);if((r=s.spec.customFns)!=null&&r.length){t.push(""),t.push("// User-defined functions");for(const l of s.spec.customFns){const o=(l.params||[]).join(", "),m=(l.body||"return null;").split(`
`).map(k=>"  "+k).join(`
`);t.push(`function ${l.name}(${o}) {`),t.push(m),t.push("}")}}if((d=s.spec.customVars)!=null&&d.length){t.push(""),t.push("// User-defined computed vars");for(const l of s.spec.customVars)t.push(`const ${l.name} = computed(() => (${l.expression||"null"}));`)}if(s.computedDecls.length){t.push(""),t.push("// Widget-level computeds (storeCompute sources)");for(const l of s.computedDecls)t.push(l)}const a=Array.isArray(s.spec.params)&&s.spec.params.length?s.spec.params:ft(s.spec.path);a.length&&(t.push(""),t.push(`const props = defineProps({ ${a.map(l=>`${l.name}: { type: [String, Number], default: null }`).join(", ")} });`));const i=l=>a.some(o=>new RegExp(`(\\{${o.name}\\}|/:${o.name}(?![A-Za-z0-9_]))`).test(String(l.endpointPath||"")));if(s.usedResources.size>0){const l=[...s.usedResources.entries()].filter(([,o])=>o.realtime).map(([o])=>o);t.push(""),t.push("onMounted(() => {");for(const[o,m]of s.usedResources)a.length&&i(m)?t.push(`  ${o}Store.fetchOne({ ${a.map(k=>`${k.name}: props.${k.name}`).join(", ")} });   // 라우트 파라미터로 단건 조회`):t.push(`  ${o}Store.fetchList();`);for(const o of l)t.push(`  ${o}Store.subscribeRealtime();   // 데이터가 바뀌면 자동으로 다시 읽는다`);if(t.push("});"),l.length){t.push(""),t.push("onBeforeUnmount(() => {");for(const o of l)t.push(`  ${o}Store.unsubscribeRealtime();`);t.push("});")}}return(h=(g=s.rowClick)==null?void 0:g.lines)!=null&&h.length&&t.push(...s.rowClick.lines),t.join(`
`)}function Ho(s){var i;const{spec:t}=s,a=[];if(a.push('<div class="container-fluid py-3">'),t.header&&t.header.kind!=="none"){const p=G(t.header.title||t.title||""),r=G(t.header.subtitle||"");a.push('  <div class="mb-3 pb-2 border-bottom">'),a.push(`    <h2 class="h4 mb-1 fw-semibold">${p}</h2>`),r&&a.push(`    <div class="text-muted small">${r}</div>`),a.push("  </div>")}if(!((i=t.rows)!=null&&i.length))return a.push('  <div class="text-muted text-center py-4">(빈 화면)</div>'),a.push("</div>"),a.join(`
`);for(const p of t.rows){const r=p.style||{},d=r.gap!=null&&r.gap!==16,g=d?"row mb-3":"row g-3 mb-3",h=[];d&&h.push(`gap: ${r.gap}px`),r.padding&&h.push(`padding: ${r.padding}px`),r.bgColor&&h.push(`background-color: ${r.bgColor}`);const l=h.length?` style="${h.join("; ")}"`:"";a.push(`  <div class="${g}"${l}>`);for(let o=0;o<p.widgets.length;o++){const m=p.widgets[o],k=p.widths[o],x=s.widgetBindings.get(m.id)||{primary:"null",rowsExpr:"[]",loading:"false",error:"''"},$=qo(m);a.push(`    <div class="col-md-${k}"${$}>`),a.push(`      ${Ko(m,x,Jo((s==null?void 0:s.spec)||t))}`),a.push("    </div>")}a.push("  </div>")}return a.push("</div>"),a.join(`
`)}function qo(s){const t=s.style||{},a=[];return t.height&&t.height!=="auto"&&a.push(`min-height: ${t.height}px`),a.length?` style="${a.join("; ")}"`:""}function Ko(s,t,a=null){var g;const i=G(s.title||""),p=s.config||{};switch({chart:"list",progress:"stat",timeline:"list",form:"detail",button:"markdown",search:"text",image:"markdown"}[s.kind]||s.kind){case"stat":return`<StatWidget label="${i}" :value="${t.primary}" format="${G(p.format||"number")}" color="${G(p.color||"primary")}" />`;case"list":{const h=t.realtime?` :realtime="true" :realtime-connected="${t.realtimeConnectedExpr}"`:"";return`<ListWidget title="${i}" :rows="${t.rowsExpr}" :loading="${t.loading}" :error="${t.error}" :max-rows="${Number(p.maxRows)||5}"${h}${Be(s)} />`}case"listPaged":{const h=Number(p.perPage)||10,o=(/^[A-Za-z_$][\w$]*Rows$/.test(String(t.rowsExpr))?String(t.rowsExpr).replace(/Rows$/,""):null)||a;return`<ListPagedWidget title="${i}" :rows="${t.rowsExpr}" :loading="${t.loading}" :error="${t.error}" :page="${o}Page" :per-page="${o}PerPage" :total-pages="${o}TotalPages" :total="${o}Total" :default-per-page="${h}" @change-page="(p) => ${o}Store.fetchList({ page: p, perPage: ${o}PerPage })"${Be(s)} />`}case"detail":return`<DetailWidget title="${i}" :record="${t.primary}" :loading="${t.loading}" :error="${t.error}" />`;case"text":return`<TextWidget label="${i}" :value="${t.primary}" format="${G(p.format||"auto")}" />`;case"queryForm":{const h=Re(s)||a,l=JSON.stringify(p.fields||[]).replace(/'/g,"\\'"),o=G(p.submitLabel||"조회"),m=p.endpointHint?` endpoint-hint="${G(p.endpointHint)}"`:"",k=h?` @submit="(params) => ${h}Store.fetchOne(params)"`:"";return`<QueryFormWidget title="${i}" :fields='${l}' submit-label="${o}"${m} ${k} />`}case"formDialog":{const h=Re(s)||a,l=JSON.stringify(p.fields||[]).replace(/'/g,"\\'"),o=G(p.buttonLabel||"실행"),m=G(p.buttonVariant||"primary"),k=G(p.dialogTitle||s.title||o),x=!!p.confirmBeforeSubmit,$=G(((g=s.source)==null?void 0:g.method)||"POST");return`<FormDialogWidget title="${i}" button-label="${o}" button-variant="${m}" dialog-title="${k}" :fields='${l}' :confirm-before-submit="${x}" method="${$}" @submit="(params) => ${h}Store.submitForm('${$}', params)" @success="() => ${h}Store.fetchList()" />`}case"markdown":{let h=String(p.body||"");if(s.kind==="button"){const l=String(s.title||p.label||"버튼"),o=String(p.variant||"primary"),m=s.onRowClick,k=m&&m.action==="navigate"&&m.target?` @click="onRowClick_${s.id}({})"`:"";return`<div class="card h-100"><div class="card-body"><button type="button" class="btn btn-${o}"${k}>${G(l)}</button></div></div>`}return s.kind==="image"?'<div class="card h-100"><div class="card-body text-center"><i class="bi bi-image fs-1 text-muted"></i><div class="small text-muted">(image widget — placeholder)</div></div></div>':(!h&&s.kind!=="markdown"&&(h=`[${s.kind} widget — Phase 24 beta]`),h?`<MarkdownWidget :body='${JSON.stringify(h).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />')}default:return`<!-- unknown widget kind: ${s.kind} -->`}}function Re(s){var a;const t=((a=s==null?void 0:s.source)==null?void 0:a.path)||"";return t&&Ze(t)||null}function Jo(s){for(const t of(s==null?void 0:s.rows)||[])for(const a of(t==null?void 0:t.widgets)||[]){const i=Re(a);if(i)return i}return null}function Go(s,t){const a=t.op||"count",i=t.field,p=t.value,r=s+".value",d=h=>String(h).replace(/[^a-zA-Z0-9_$]/g,""),g=h=>{const l=String(h??"");return l==="true"?"true":l==="false"?"false":l!==""&&!isNaN(Number(l))?String(Number(l)):JSON.stringify(l)};switch(a){case"count":return`(${r} || []).length`;case"sum":return i?`(${r} || []).reduce((a, r) => a + Number(r?.${d(i)} || 0), 0)`:"0";case"avg":return i?`((${r} || []).length === 0 ? 0 : (${r} || []).reduce((a, r) => a + Number(r?.${d(i)} || 0), 0) / (${r} || []).length)`:"0";case"min":return i?`Math.min(...((${r} || []).map((r) => Number(r?.${d(i)} || 0))))`:"0";case"max":return i?`Math.max(...((${r} || []).map((r) => Number(r?.${d(i)} || 0))))`:"0";case"filterCount":return i?`(${r} || []).filter((r) => r?.${d(i)} === ${g(p)}).length`:`(${r} || []).length`;case"pluck":return i?`((${r} || {})?.${d(i)})`:r;case"custom":return t.fnName?`${t.fnName}(${r})`:"null";default:return"null"}}const Zo="";function Yo(s){const{key:t,endpointPath:a,method:i="GET",resultKey:p=null,realtime:r=!1,streamPath:d=null}=s,g=ne(t),h=Ge(t),l=p?`r.data?.${p} ?? r.data ?? []`:"Array.isArray(r.data) ? r.data : (r.data?.rows ?? [])",o=`import { defineStore } from 'pinia';
import apiClient from '@/api/client';

/**
 * ${g}Store — ${t} 리소스 상태 + fetch 액션.
 *  자동 생성된 기본 형태. 필요 시 create/update/remove 액션 등을 추가하세요.
 *
 *  Phase 33 (patch-12): Pattern A (QueryForm + Detail) 및 Pattern B (FormDialog) 를
 *  생성 코드에서 지원하기 위해 fetchOne / submitForm 두 액션이 추가됨.
 */
export const use${g}Store = defineStore('${h}', {
  state: () => ({
    rows: [],
    currentItem: null,
    loading: false,
    error: '',
    total: 0,
    page: 1,
    perPage: 10,
    totalPages: 1,${r&&d?`
    // 실시간 연결 상태 — 화면에서 "● 실시간" 배지로 쓸 수 있다
    realtimeConnected: false,
    _es: null,
    _lastRealtimeAt: 0,`:""}
  }),

  actions: {
    async fetchList(opts = {}) {
      this.loading = true;
      this.error = '';
      try {
        const r = await apiClient.${i.toLowerCase()}(${JSON.stringify(a)}, ${i.toUpperCase()==="GET"?"{ params: opts }":"opts"});
        this.rows = ${l};
        this.total = r.data?.total ?? this.rows.length;
        this.page = r.data?.page ?? opts.page ?? 1;
        this.perPage = r.data?.perPage ?? opts.perPage ?? this.perPage;
        this.totalPages = r.data?.totalPages ?? Math.max(1, Math.ceil(this.total / this.perPage));
        if (!this.currentItem && this.rows.length) this.currentItem = this.rows[0];
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
      } finally {
        this.loading = false;
      }
    },

${r&&d?`    /* ── 실시간 자동 갱신 (SSE) ─────────────────────────────────────
     *  서버가 데이터 변경(change) 을 알려 주면 목록을 다시 읽는다.
     *  · 연결이 끊기면 브라우저가 스스로 다시 붙는다 (EventSource 기본 동작)
     *  · 알림이 몰려 와도 1초에 한 번만 다시 읽는다
     *  구독 주소: ${d}
     * ------------------------------------------------------------- */
    subscribeRealtime() {
      if (this._es) return;                       // 이미 구독 중
      try {
        this._es = new EventSource(${JSON.stringify(d)});
      } catch (e) {
        this.error = '실시간 연결 실패: ' + e.message;
        return;
      }
      this._es.addEventListener('change', () => {
        const now = Date.now();
        if (now - (this._lastRealtimeAt || 0) < 1000) return;
        this._lastRealtimeAt = now;
        this.fetchList();
      });
      this._es.onerror = () => { this.realtimeConnected = false; };
      this._es.onopen = () => { this.realtimeConnected = true; };
    },

    unsubscribeRealtime() {
      if (this._es) { this._es.close(); this._es = null; }
      this.realtimeConnected = false;
    },

`:""}    /**
     * 단건 조회 (Pattern A — QueryFormWidget 의 @submit 에서 호출).
     *  params 객체에 URL path param (예: { id: 1 }) 이나 query param 이 포함됨.
     *  path 템플릿에 {paramName} 이 있으면 params 값으로 치환, 나머지는 ?query 로 붙임.
     */
    async fetchOne(params = {}) {
      this.loading = true;
      this.error = '';
      try {
        let url = ${JSON.stringify(a)};
        const query = { ...params };
        url = url.replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => {
          const v = params[name];
          delete query[name];
          return v != null ? encodeURIComponent(String(v)) : '{' + name + '}';
        });
        // ★ v1.11.7 — /api/books/:id 형식(콘솔 라우트 표기)도 채운다
        url = url.replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
          const v = params[name];
          delete query[name];
          return v != null ? '/' + encodeURIComponent(String(v)) : '/:' + name;
        });
        const r = await apiClient.get(url, { params: query });
        let data = r.data;
        // envelope 자동 unwrap
        if (data && typeof data === 'object' && 'data' in data && ('code' in data || 'message' in data)) {
          data = data.data;
        }
        this.currentItem = Array.isArray(data) ? (data[0] ?? null) : data;
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
        this.currentItem = null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 일반 write 액션 (Pattern B — FormDialogWidget 의 @submit 에서 호출).
     *  httpMethod: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
     *  params: 폼 필드 값들 — path param 은 URL 에 치환, 나머지는 body (GET/DELETE 는 query).
     */
    async submitForm(httpMethod, params = {}) {
      this.loading = true;
      this.error = '';
      try {
        let url = ${JSON.stringify(a)};
        const body = { ...params };
        url = url.replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
          const v = params[name];
          delete body[name];
          return v != null ? '/' + encodeURIComponent(String(v)) : '/:' + name;
        });
        url = url.replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => {
          const v = params[name];
          delete body[name];
          return v != null ? encodeURIComponent(String(v)) : '{' + name + '}';
        });
        const m = String(httpMethod || 'POST').toLowerCase();
        const useBody = m === 'post' || m === 'put' || m === 'patch';
        const r = useBody
          ? await apiClient[m](url, body)
          : await apiClient[m](url, { params: body });
        return r.data;
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
`;return{path:`src/stores/${h}Store.js`,content:o,source:"store",resourceKey:h}}function Qo(s){return s.map(Yo)}function Xo(s){var g;if(!s)throw new Error("project 가 필요합니다");const t=[],a=new Map;t.push(...co(s)),t.push(...go(s.layout||{},(g=s.config)==null?void 0:g.cssFramework)),t.push(...Ao()),t.push(Wo(s)),t.push(Mo());const i=(s.screens||[]).filter(h=>h.kind==="composite");for(const h of i)t.push(Do(h,{resourceCollector:a,screens:i}));const p=Uo(i);if(p&&t.push(p),t.push(uo(i)),a.size>0){const h=[...a.values()];t.push(...Qo(h))}const r=new Map;for(const h of t)r.set(h.path,h);const d=[...r.values()];return d.sort((h,l)=>h.path.localeCompare(l.path)),d}const Ye="aidot.screen-designer.fileEdits";function el(){try{const s=sessionStorage.getItem(Ye);if(!s)return{};const t=JSON.parse(s);return t&&typeof t=="object"?t:{}}catch{return{}}}function Ae(s){try{sessionStorage.setItem(Ye,JSON.stringify(s))}catch(t){console.warn("[fileEdits] storage save failed:",t)}}const tl=rt("fileEdits",{state:()=>({edits:el()}),getters:{forProject:s=>t=>s.edits[String(t)]||{}},actions:{get(s,t){const a=this.edits[String(s)];return a?a[t]??null:null},set(s,t,a){const i=String(s);this.edits[i]||(this.edits[i]={}),this.edits[i][t]=a,Ae(this.edits)},clear(s,t){const a=String(s),i=this.edits[a];i&&(delete i[t],Object.keys(i).length===0&&delete this.edits[a],Ae(this.edits))},clearAll(s){delete this.edits[String(s)],Ae(this.edits)},applyTo(s,t){const a=String(s),i=this.edits[a];if(!i)return t;const p=new Set(t.map(d=>d.path));let r=!1;for(const d of Object.keys(i))p.has(d)||(delete i[d],r=!0);return r&&(Object.keys(i).length===0&&delete this.edits[a],Ae(this.edits)),t.map(d=>i[d.path]!=null?{...d,content:i[d.path],edited:!0}:d)},listEditedPaths(s){const t=this.edits[String(s)];return new Set(t?Object.keys(t):[])}}}),al={class:"code-export-panel"},sl={class:"export-header d-flex justify-content-between align-items-start mb-3"},il={class:"mb-1"},rl={class:"small text-secondary"},ol={key:0,class:"text-warning ms-1"},ll={class:"d-flex gap-2"},nl=["title"],dl=["title"],cl=["disabled"],ul={key:0,class:"spinner-border spinner-border-sm me-1"},pl={key:1,class:"bi bi-file-earmark-zip me-1"},fl={key:0,class:"alert alert-danger small"},ml={key:1,class:"alert alert-danger small"},vl={class:"mt-1 text-secondary"},bl={key:2,class:"export-split"},hl={class:"file-tree"},gl={class:"tree-title d-flex justify-content-between"},yl={class:"code-viewer"},kl={key:0,class:"viewer-empty"},xl={class:"viewer-header"},wl={class:"small flex-grow-1 text-truncate"},$l={class:"badge bg-light text-dark border ms-2"},_l={key:0,class:"badge bg-warning text-dark ms-1"},Cl=["title"],Sl={class:"viewer-editor-wrap"};function Al(s){return s.endsWith(".vue")?"bi bi-filetype-js text-success":s.endsWith(".js")?"bi bi-filetype-js text-warning":s.endsWith(".json")?"bi bi-filetype-json":s.endsWith(".html")?"bi bi-filetype-html text-danger":s.endsWith(".md")?"bi bi-filetype-md":s.endsWith(".css")?"bi bi-filetype-css text-primary":"bi bi-file-earmark"}const Qe=ot({name:"TreeNode",props:{node:Object,parentPath:String,selected:String,isExpanded:Function,isEdited:Function},emits:["toggle","select"],setup(s,{emit:t}){return()=>{const{node:a,parentPath:i,selected:p,isExpanded:r,isEdited:d}=s;if(a.type==="dir"){const h=i?i+"/"+a.name:a.name,l=r(h),o=ue("button",{class:"tree-dir",onClick:()=>t("toggle",h)},[ue("i",{class:`bi ${l?"bi-folder2-open":"bi-folder"} me-1`}),ue("span",{class:"tree-name"},a.name)]),m=l?ue("div",{class:"tree-children"},a.children.map(k=>ue(Qe,{key:k.type==="file"?k.path:k.name,node:k,parentPath:h,selected:p,isExpanded:r,isEdited:d,onToggle:x=>t("toggle",x),onSelect:x=>t("select",x)}))):null;return ue("div",{class:"tree-dir-wrap"},[o,m])}const g=d(a.path);return ue("button",{class:["tree-file",{selected:p===a.path,edited:g}],onClick:()=>t("select",a.path)},[ue("i",{class:Al(a.name)+" me-1"}),ue("span",{class:"tree-name"},a.name),g?ue("span",{class:"edit-dot ms-auto",title:"편집됨"},"●"):null])}}}),Pl={__name:"CodeExportPanel",props:{project:{type:Object,required:!0}},setup(s){const{t}=we(),a=s,i=tl(),p=O([]),r=O(null);function d(){r.value=null;try{p.value=Xo(a.project)}catch(C){r.value=String(C.message||C),p.value=[]}}me(()=>a.project,d,{deep:!0,immediate:!0});const g=V(()=>{var C;return i.applyTo((C=a.project)==null?void 0:C.id,p.value)}),h=V(()=>{var C;return i.listEditedPaths((C=a.project)==null?void 0:C.id)}),l=V(()=>o(g.value));function o(C){const w={type:"dir",name:"",children:[]};for(const D of C){const J=D.path.split("/");let te=w;for(let ie=0;ie<J.length-1;ie++){const le=J[ie];let pe=te.children.find(R=>R.type==="dir"&&R.name===le);pe||(pe={type:"dir",name:le,children:[]},te.children.push(pe)),te=pe}te.children.push({type:"file",name:J[J.length-1],path:D.path,source:D.source})}return m(w),w}function m(C){if(C.type==="dir"){C.children.sort((w,D)=>w.type!==D.type?w.type==="dir"?-1:1:w.name.localeCompare(D.name));for(const w of C.children)m(w)}}const k=O(null),x=O(new Set(["","src","src/layouts","src/views","src/stores","src/components","src/api","src/router"]));function $(C){x.value.has(C)?x.value.delete(C):x.value.add(C),x.value=new Set(x.value)}function I(C){return x.value.has(C)}function j(C){return h.value.has(C)}async function y(C){var w;S.value&&U.value!==ee(S.value)&&U.value!==i.get((w=a.project)==null?void 0:w.id,S.value)&&!await Pe({title:"저장하지 않은 편집",message:`편집 중인 변경사항이 있습니다.
저장 없이 이동할까요?`,detail:`편집 중: ${S.value}`,confirmText:"이동",cancelText:"계속 편집",variant:"danger"})||(k.value=C,S.value=null,U.value="")}const E=V(()=>g.value.find(C=>C.path===k.value)||null);function A(C){return C&&C.toLowerCase().endsWith(".sql")?"sql":"javascript"}const P=V(()=>{var C;return A((C=E.value)==null?void 0:C.path)});function ee(C){const w=p.value.find(D=>D.path===C);return(w==null?void 0:w.content)||""}const S=O(null),U=O("");function N(){E.value&&(S.value=E.value.path,U.value=E.value.content)}function T(){var C;S.value&&(i.set((C=a.project)==null?void 0:C.id,S.value,U.value),S.value=null,U.value="")}function M(){S.value=null,U.value=""}async function q(){var C;E.value&&await Pe({title:t("codeExportPanel.k15"),message:t("codeExportPanel.k16"),detail:E.value.path,confirmText:t("codeExportPanel.k17"),variant:"danger"})&&i.clear((C=a.project)==null?void 0:C.id,E.value.path)}async function K(){var C;h.value.size&&await Pe({title:"편집 전체 초기화",message:`이 프로젝트의 편집 ${h.value.size}개를 모두 초기화할까요?`,detail:"되돌릴 수 없습니다.",confirmText:"초기화",variant:"danger"})&&(i.clearAll((C=a.project)==null?void 0:C.id),S.value=null,U.value="")}const re=O(!1),se=O(null);async function B(){var C;if(!re.value){re.value=!0,se.value=null;try{const w=await b(),D=new w;for(const le of g.value)D.file(le.path,le.content);const J=await D.generateAsync({type:"blob",compression:"DEFLATE"}),te=URL.createObjectURL(J),ie=document.createElement("a");ie.href=te,ie.download=v((C=a.project)==null?void 0:C.name),document.body.appendChild(ie),ie.click(),document.body.removeChild(ie),URL.revokeObjectURL(te)}catch(w){se.value=String(w.message||w)}finally{re.value=!1}}}async function b(){const C=await lt(()=>import("./jszip.min-DvbXqdIg.js").then(w=>w.j),[]);return C.default||C}function v(C){const w=String(C||"project").replace(/[^a-zA-Z0-9가-힣_\-]/g,"_").slice(0,40)||"project",D=new Date,J=[D.getFullYear(),String(D.getMonth()+1).padStart(2,"0"),String(D.getDate()).padStart(2,"0"),"-",String(D.getHours()).padStart(2,"0"),String(D.getMinutes()).padStart(2,"0"),String(D.getSeconds()).padStart(2,"0")].join("");return`${w}-${J}.zip`}const W=V(()=>g.value.reduce((C,w)=>{var D;return C+(((D=w.content)==null?void 0:D.length)||0)},0));return(C,w)=>(n(),u("div",al,[e("div",sl,[e("div",null,[e("h6",il,[w[1]||(w[1]=e("i",{class:"bi bi-download me-1"},null,-1)),_(c(f(t)("codeExportPanel.k1")),1)]),e("div",rl,[_(c(f(t)("codeExportPanel.k2")),1),e("strong",null,c(g.value.length),1),_(" 파일 · "+c((W.value/1024).toFixed(1))+" KB) ",1),h.value.size>0?(n(),u("span",ol,[w[2]||(w[2]=_(" · ",-1)),w[3]||(w[3]=e("i",{class:"bi bi-pencil-fill"},null,-1)),_(" "+c(h.value.size)+"개 편집됨 ",1)])):L("",!0)])]),e("div",ll,[h.value.size>0?(n(),u("button",{key:0,class:"btn btn-sm btn-outline-danger",onClick:K,title:f(t)("codeExportPanel.k12")},[w[4]||(w[4]=e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)),_(" "+c(f(t)("codeExportPanel.k3")),1)],8,nl)):L("",!0),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:d,title:f(t)("codeExportPanel.k13")},[w[5]||(w[5]=e("i",{class:"bi bi-arrow-clockwise"},null,-1)),_(" "+c(f(t)("codeExportPanel.k4")),1)],8,dl),e("button",{class:"btn btn-sm btn-primary",onClick:B,disabled:re.value||g.value.length===0},[re.value?(n(),u("span",ul)):(n(),u("i",pl)),_(" "+c(f(t)("codeExportPanel.k5")),1)],8,cl)])]),r.value?(n(),u("div",fl,[w[6]||(w[6]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_("코드 생성 실패: "+c(r.value),1)])):L("",!0),se.value?(n(),u("div",ml,[w[7]||(w[7]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_("다운로드 실패: "+c(se.value)+" ",1),e("div",vl,c(f(t)("codeExportPanel.k6")),1)])):L("",!0),r.value?L("",!0):(n(),u("div",bl,[e("div",hl,[e("div",gl,[e("span",null,"파일 ("+c(g.value.length)+")",1)]),(n(!0),u(z,null,X(l.value.children,D=>(n(),ge(f(Qe),{key:D.type==="file"?D.path:D.name,node:D,"parent-path":"",selected:k.value,"is-expanded":I,"is-edited":j,onToggle:$,onSelect:y},null,8,["node","selected"]))),128))]),e("div",yl,[E.value?(n(),u(z,{key:1},[e("div",xl,[e("code",wl,c(E.value.path),1),e("span",$l,c(E.value.source),1),j(E.value.path)?(n(),u("span",_l,[w[9]||(w[9]=e("i",{class:"bi bi-pencil-fill"},null,-1)),_(" "+c(f(t)("codeExportPanel.k8")),1)])):L("",!0),S.value?(n(),u(z,{key:2},[e("button",{class:"btn btn-sm btn-success ms-2",onClick:T},[w[12]||(w[12]=e("i",{class:"bi bi-check-lg"},null,-1)),_(" "+c(f(t)("codeExportPanel.k10")),1)]),e("button",{class:"btn btn-sm btn-outline-secondary ms-1",onClick:M},[w[13]||(w[13]=e("i",{class:"bi bi-x-lg"},null,-1)),_(" "+c(f(t)("codeExportPanel.k11")),1)])],64)):(n(),u(z,{key:1},[e("button",{class:"btn btn-sm btn-outline-primary ms-2",onClick:N},[w[10]||(w[10]=e("i",{class:"bi bi-pencil"},null,-1)),_(" "+c(f(t)("codeExportPanel.k9")),1)]),j(E.value.path)?(n(),u("button",{key:0,class:"btn btn-sm btn-outline-secondary ms-1",onClick:q,title:f(t)("codeExportPanel.k14")},[...w[11]||(w[11]=[e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)])],8,Cl)):L("",!0)],64))]),e("div",Sl,[S.value?(n(),ge(Ue,{key:1,modelValue:U.value,"onUpdate:modelValue":w[0]||(w[0]=D=>U.value=D),language:P.value,readonly:!1},null,8,["modelValue","language"])):(n(),ge(Ue,{key:0,"model-value":E.value.content,language:P.value,readonly:!0},null,8,["model-value","language"]))])],64)):(n(),u("div",kl,[w[8]||(w[8]=e("i",{class:"bi bi-file-earmark-code fs-1 d-block mb-2 opacity-50"},null,-1)),_(" "+c(f(t)("codeExportPanel.k7")),1)]))])]))]))}},Tl=ve(Pl,[["__scopeId","data-v-54274d6b"]]),El="/public/vendor/vue.esm-browser.prod.js",Rl="/public/vendor/bootstrap.min.css",jl=new Set(["top-nav","top-and-side","hero-landing"]),Ll=new Set(["sidebar-left","sidebar-dark","sidebar-both","top-and-side"]),Nl=new Set(["split-panel","card-grid"]);function Fe(s){return jl.has(s)}function zl(s){return Ll.has(s)}function Wl(s){return!Nl.has(s==null?void 0:s.kind)}function Ml({project:s,authToken:t=""}={}){var x,$,I,j,y,E,A,P,ee;if(!s)return Vl("프로젝트 정보가 없습니다");const a=t?`<script>window.__previewToken=${JSON.stringify(String(t))};<\/script>`:"",i=Ol(s.layout),p=(s.screens||[]).filter(S=>S&&S.kind==="composite"),r=[];for(const S of p){const U=[],N=[];for(const T of S.rows||[]){const M=[];for(let q=0;q<(T.widgets||[]).length;q++){const K=T.widgets[q],re=((x=T.widths)==null?void 0:x[q])||12;let se=null;(($=K.source)==null?void 0:$.type)==="endpoint"&&K.source.path&&(se=`ep_${String(K.id).replace(/[^a-zA-Z0-9_]/g,"_")}`,U.push({name:se,method:K.source.method||"GET",path:K.source.path,resultKey:K.source.resultKey||null})),M.push({widget:K,width:re,endpointVar:se})}N.push({row:T,widgets:M})}r.push({screen:S,rowDescriptors:N,endpointVars:U})}let d=Array.isArray((I=i.sidebar)==null?void 0:I.items)?i.sidebar.items:[];d.length?d=d.map(S=>{const U=p.find(N=>N.path===S.path);return{...S,screenId:(U==null?void 0:U.id)||null}}):d=p.map(S=>({label:S.title||"무제",path:S.path||`/screen-${S.id}`,icon:"bi-file-earmark",screenId:S.id}));const g=[],h=new Set;for(const{endpointVars:S}of r)for(const U of S){if(h.has(U.name))continue;h.add(U.name);const N={method:U.method,path:U.path};U.resultKey&&(N.resultKey=U.resultKey),g.push(`const ${U.name} = ${JSON.stringify(N)};`)}const l=JSON.stringify(d.map(S=>({label:S.label,path:S.path,icon:S.icon||"",screenId:S.screenId}))),o=r.map(S=>Il(S)).join(`
`),m=((j=p[0])==null?void 0:j.id)||null,k=((y=d[0])==null?void 0:y.path)||"/";return`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${he(s.name||"Preview")}</title>
<link rel="stylesheet" href="${Rl}" />
<style>
${Bl}
${mt}
${Ul(i)}
</style>
</head>
<body>
<div id="app"></div>
${a}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${El}';

// ---- Widget components ----
${vt}

// ---- Endpoint definitions (전역 공유) ----
${g.join(`
`)}

// ---- 메뉴 / 화면 라우팅 (간이 SPA) ----
const MENU = ${l};
/* ★ v1.9.2 — 화면 id → 정보. 메뉴에는 없는 화면(수정 화면 등)으로도 이동해야 하므로
   MENU 가 아니라 전체 화면 목록으로 만든다. */
const SCREEN_INDEX = ${JSON.stringify(Object.fromEntries(p.map(S=>[S.id,{id:S.id,title:S.title||S.id,path:S.path||""}])))};
const currentScreenId = ref(${JSON.stringify(m)});
const currentPath = ref(${JSON.stringify(k)});

function navigate(item) {
  currentScreenId.value = item.screenId;
  currentPath.value = item.path;
}

/* ★ v1.9.2 — 행 클릭으로 화면 이동.
   전체 앱 미리보기는 iframe 안에서 currentScreenId 로 화면을 갈아 끼운다.
   생성 코드처럼 router.push 를 부르면 **콘솔 화면 자체가 이동하므로** 쓰지 않는다.

   ⚠ 뒤로 가기를 함께 넣는다. 없으면 수정 화면으로 넘어간 뒤 갇힌다 —
     메뉴에 없는 화면(수정 화면 등)으로 이동하면 돌아갈 길이 사라진다. */
const navStack = ref([]);
const navParams = ref({});

function __previewNavigate(targetScreenId, params, row) {
  const resolved = {};
  for (const [k, v] of Object.entries(params || {})) {
    /* 정규식 리터럴을 쓰지 않는다 — 이 코드는 템플릿 문자열을 거쳐 문서에 새겨지는데,
         그 과정에서 백슬래시가 먹혀 매칭이 어긋난다(실제로 값이 안 풀리고
         'row.id' 문자열이 그대로 넘어갔다). 문자열 조작이면 그 문제가 없다. */
    const sv = String(v);
    resolved[k] = sv.indexOf('row.') === 0 ? row?.[sv.slice(4)] : v;
  }
  const target = SCREEN_INDEX[targetScreenId];
  if (!target) {
    __previewToast("'" + targetScreenId + "' 화면을 찾을 수 없습니다 — 지워졌거나 이름이 바뀌었습니다");
    return;
  }
  navStack.value.push({ screenId: currentScreenId.value, path: currentPath.value, params: navParams.value });
  currentScreenId.value = targetScreenId;
  currentPath.value = target.path || '';
  navParams.value = resolved;
  /* ★ v1.11.7 — 위젯 런타임에 파라미터를 넘긴다. 상세 화면의 GET /api/books/:id 가 여기서 id 를 받는다 */
  if (window.__previewNav) { window.__previewNav.params = resolved; window.__previewNav.version++; }

  const desc = Object.entries(resolved).map(function (e) { return e[0] + ': ' + e[1]; }).join(', ');
  __previewToast('→ ' + (target.title || targetScreenId) + (desc ? ' (' + desc + ')' : ''));
}

function __previewBack() {
  const prev = navStack.value.pop();
  if (!prev) return;
  currentScreenId.value = prev.screenId;
  currentPath.value = prev.path;
  navParams.value = prev.params || {};
  if (window.__previewNav) { window.__previewNav.params = navParams.value; window.__previewNav.version++; }
}

function __previewToast(text) {
  let el = document.getElementById('__preview_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__preview_toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);' +
      'background:#1e2129;color:#fff;padding:9px 15px;border-radius:9px;font-size:13px;' +
      'z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.28);max-width:88%;transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el.__t);
  el.__t = setTimeout(function () { el.style.opacity = '0'; }, 2200);
}
window.__previewNavigate = __previewNavigate;
/* ★ v1.11.7 — 템플릿의 @click="__previewBack()" 는 setup 이 돌려준 값 중 _ 로 시작하는 이름을 못 본다(Vue 예약 접두어)
   → 전역에도 둔다. 예전에는 [← 뒤로] 를 누르면 ReferenceError 로 미리보기가 통째로 죽었다. */
window.__previewBack = __previewBack;

const App = {
  components: WIDGETS,
  setup() {
    // Phase 31 (patch-10): 전역 row context (queryForm ↔ 결과 widget 연결용)
    provide(ROW_CONTEXT_KEY, createRowContext());
    return {
      menu: MENU,
      currentScreenId,
      currentPath,
      navigate,
      __previewNavigate,
      __previewBack,
      navStack,
      navParams,
      ${g.map(S=>{var U;return(U=S.match(/const (\w+)/))==null?void 0:U[1]}).filter(Boolean).join(`,
      `)}
    };
  },
  template: \`
    <div class="app-shell layout-kind-${i.kind}">
      <!-- 상단 네비 (kind: top-nav / top-and-side / hero-landing) -->
      <header v-if="${Fe(i.kind)}" class="app-topbar">
        <div class="header-title">${he(((E=i.title)==null?void 0:E.text)||"")}</div>
        <nav class="topnav">
          <button v-for="m in menu" :key="m.path"
                  class="topnav-item"
                  :class="{ active: currentPath === m.path }"
                  @click="navigate(m)">{{ m.label }}</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- 좌 사이드바 (kind: sidebar-left / sidebar-dark / sidebar-both / top-and-side) -->
        <aside v-if="${zl(i.kind)}" class="app-sidebar app-sidebar-left">
          ${i.kind!=="top-and-side"?`<div class="sidebar-brand">${he(((A=i.title)==null?void 0:A.text)||s.name||"App")}</div>`:""}
          <nav class="sidebar-nav">
            <button v-for="m in menu" :key="m.path"
                    class="sidebar-item"
                    :class="{ active: currentPath === m.path }"
                    @click="navigate(m)">
              <i v-if="m.icon" :class="'bi ' + m.icon"></i>
              <span>{{ m.label }}</span>
            </button>
          </nav>
        </aside>

        <!-- 메인 (공통) -->
        <div class="app-main">
          <!-- 상단 타이틀 — top-kind 가 아닐 때만 (top-kind 는 header 가 외부에 있음) -->
          <header v-if="${!Fe(i.kind)}" class="app-header">
            <div class="header-title">${he(((P=i.title)==null?void 0:P.text)||"")}</div>
          </header>
          <main class="app-content ${i.kind==="split-panel"?"is-split":""} ${i.kind==="card-grid"?"is-grid":""}">
            <!-- ★ v1.9.2 — 행 클릭으로 넘어왔을 때만 뜨는 뒤로 가기.
                 수정 화면은 메뉴에 없는 경우가 많아, 없으면 그 화면에 갇힌다. -->
            <div v-if="navStack.length" class="d-flex align-items-center gap-2 mb-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="__previewBack()">
                ← 뒤로
              </button>
              <small class="text-muted" v-if="Object.keys(navParams).length">
                받은 값:
                <code v-for="(v, k) in navParams" :key="k" class="me-1">{{ k }}={{ v }}</code>
              </small>
            </div>
${o}
            <div v-if="!currentScreenId" class="text-center text-muted py-5">
              ${Wl(i)?"사이드바에서":""}화면을 선택하세요.
            </div>
          </main>
        </div>

        <!-- 우 사이드바 (kind: sidebar-right) -->
        <aside v-if="${i.kind==="sidebar-right"}" class="app-sidebar app-sidebar-right">
          <div class="sidebar-brand">${he(((ee=i.title)==null?void 0:ee.text)||s.name||"App")}</div>
          <nav class="sidebar-nav">
            <button v-for="m in menu" :key="m.path"
                    class="sidebar-item"
                    :class="{ active: currentPath === m.path }"
                    @click="navigate(m)">
              <i v-if="m.icon" :class="'bi ' + m.icon"></i>
              <span>{{ m.label }}</span>
            </button>
          </nav>
        </aside>

        <!-- 우 보조 패널 (kind: sidebar-both) -->
        <aside v-if="${i.kind==="sidebar-both"}" class="app-aux-panel">
          <div class="aux-title">보조 패널</div>
          <div class="aux-body">알림 · 퀵 액션 영역</div>
        </aside>
      </div>
    </div>
  \`,
};

const app = createApp(App);
app.config.errorHandler = (err) => {
  document.getElementById('app').innerHTML =
    '<div style="padding:32px;color:#b91c1c;font-family:monospace;white-space:pre-wrap">' +
    'Preview 오류:<br>' +
    String(err && err.stack || err).replace(/</g, '&lt;') + '</div>';
};
app.mount('#app');
<\/script>
</body>
</html>`}function Il({screen:s,rowDescriptors:t,endpointVars:a}){const i=[],p="'"+String(s.id).replace(/'/g,"\\'")+"'";if(i.push(`          <div v-if="currentScreenId === ${p}" class="composite-view">`),s.header&&s.header.kind!=="none"){const r=he(s.header.title||s.title||""),d=he(s.header.subtitle||"");i.push('            <div class="composite-header">'),i.push(`              <h2 class="composite-title">${r}</h2>`),d&&i.push(`              <div class="composite-subtitle">${d}</div>`),i.push("            </div>")}for(const{row:r,widgets:d}of t){const h=`gap:${(r.style||{}).gap??16}px`;i.push(`            <div class="row" style="${h}">`);for(const{widget:l,width:o,endpointVar:m}of d)i.push(`              <div class="col-md-${o}">`),i.push(`                ${Dl(l,m)}`),i.push("              </div>");i.push("            </div>")}return i.push("          </div>"),i.join(`
`)}function He(s){const t=s==null?void 0:s.onRowClick;if(!t||t.action!=="navigate"||!t.target)return"";const a=Object.entries(t.params||{}).filter(([,p])=>p).map(([p,r])=>`${p}: '${String(r).replace(/'/g,"")}'`).join(", ");return` :row-clickable="true" @row-click="(row) => __previewNavigate('${String(t.target).replace(/'/g,"")}', { ${a} }, row)"`}function Dl(s,t){const a=s.title||"",i=s.config||{},p=s.source,r=l=>`"${String(l).replace(/"/g,"&quot;")}"`,d=t&&(p==null?void 0:p.type)==="endpoint",g=p&&p.resultKey?`result-key=${r(p.resultKey)}`:"",h=s.id?`widget-id=${r(s.id)}`:"";switch(s.kind){case"stat":return d?`<StatWidget label=${r(a)} :endpoint="${t}" ${g} format=${r(i.format||"number")} color=${r(i.color||"primary")} ${h} />`:`<StatWidget label=${r(a)} :value="null" format=${r(i.format||"number")} color=${r(i.color||"primary")} />`;case"list":return d?`<ListWidget title=${r(a)} :endpoint="${t}" ${g} :max-rows="${Number(i.maxRows)||20}" ${h}${He(s)} />`:`<ListWidget title=${r(a)} :rows="[]" :max-rows="${Number(i.maxRows)||5}"${He(s)} />`;case"listPaged":return d?`<ListPagedWidget title=${r(a)} :endpoint="${t}" ${g} :per-page="${Number(i.perPage)||10}" ${h} />`:`<ListPagedWidget title=${r(a)} :endpoint="null" :per-page="${Number(i.perPage)||10}" />`;case"detail":return d?`<DetailWidget title=${r(a)} :endpoint="${t}" ${g} ${h} />`:`<DetailWidget title=${r(a)} :record="null" />`;case"text":return d?`<TextWidget label=${r(a)} :endpoint="${t}" ${g} format=${r(i.format||"auto")} ${h} />`:`<TextWidget label=${r(a)} :value="null" format=${r(i.format||"auto")} />`;case"markdown":{const l=String(i.body||"");return l?`<MarkdownWidget :body='${JSON.stringify(l).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />'}case"queryForm":{const l=JSON.stringify(i.fields||[]).replace(/'/g,"\\'"),o=i.submitLabel||"조회",m=i.targetWidgetId||"",k=i.endpointHint?`endpoint-hint=${r(i.endpointHint)}`:"";return`<QueryFormWidget title=${r(a)} :fields='${l}' submit-label=${r(o)} target-widget-id=${r(m)} ${k} />`}case"formDialog":{const l=JSON.stringify(i.fields||[]).replace(/'/g,"\\'"),o=i.buttonLabel||"실행",m=i.buttonVariant||"primary",k=i.dialogTitle||a||o,x=!!i.confirmBeforeSubmit,$=i.refreshTargetWidgetId||"",I=d?`:endpoint="${t}"`:"";return`<FormDialogWidget title=${r(a)} ${I} button-label=${r(o)} button-variant=${r(m)} dialog-title=${r(k)} :fields='${l}' :confirm-before-submit="${x}" refresh-target-widget-id=${r($)} />`}case"button":{const l=String(a||i.label||"버튼"),o=String(i.variant||"primary"),m=s.onRowClick,k=m&&m.action==="navigate"&&m.target?` @click="__previewNavigate('${String(m.target).replace(/'/g,"")}', {}, null)"`:"";return`<div class="card h-100"><div class="card-body d-flex align-items-center"><button type="button" class="btn btn-${o}"${k}>${l.replace(/</g,"&lt;")}</button></div></div>`}default:return`<!-- unknown widget kind: ${s.kind} -->`}}function Ol(s){var a,i,p,r,d,g,h,l,o,m,k;const t=s||{};return{kind:t.kind||"sidebar-left",title:{text:((a=t.title)==null?void 0:a.text)||"",bgColor:((i=t.title)==null?void 0:i.bgColor)||"#ffffff",fgColor:((p=t.title)==null?void 0:p.fgColor)||"#0f172a",height:Number((r=t.title)==null?void 0:r.height)||60,...t.title},sidebar:{items:Array.isArray((d=t.sidebar)==null?void 0:d.items)?t.sidebar.items:[],bgColor:((g=t.sidebar)==null?void 0:g.bgColor)||"#1e2a3a",fgColor:((h=t.sidebar)==null?void 0:h.fgColor)||"#cfd6de",width:Number((l=t.sidebar)==null?void 0:l.width)||220,activeBg:((o=t.sidebar)==null?void 0:o.activeBg)||"#0d6efd",...t.sidebar},mainArea:{bgColor:((m=t.mainArea)==null?void 0:m.bgColor)||"#f5f7fa",padding:Number((k=t.mainArea)==null?void 0:k.padding)||16,...t.mainArea}}}function Ul(s){const t=s.title,a=s.sidebar,i=s.mainArea;return`
/* ════════════════════════════ 공통 shell ════════════════════════════ */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
}
.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ────────── 공통 사이드바 ────────── */
.app-sidebar {
  width: ${a.width}px;
  flex-shrink: 0;
  background: ${a.bgColor};
  color: ${a.fgColor};
  display: flex;
  flex-direction: column;
}
.app-sidebar-right { order: 2; }       /* sidebar-right 에서 flex order 로 오른쪽 배치 */

.sidebar-brand {
  padding: 16px 20px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  color: #fff;
}
.sidebar-nav {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: ${a.fgColor};
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.sidebar-item:hover { background: rgba(255, 255, 255, 0.05); }
.sidebar-item.active { background: ${a.activeBg}; color: #fff; }
.sidebar-item i { width: 16px; text-align: center; font-size: 14px; }

/* ────────── 우측 보조 패널 (sidebar-both 전용) ────────── */
.app-aux-panel {
  width: ${Math.round(a.width*.6)}px;
  flex-shrink: 0;
  background: #f8fafc;
  border-left: 1px solid #e5e7eb;
  padding: 16px;
  color: #64748b;
  order: 3;
}
.aux-title { font-weight: 600; color: #0f172a; margin-bottom: 8px; }
.aux-body { font-size: 13px; }

/* ────────── 메인 영역 ────────── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  order: 1;
}

/* ────────── 상단 헤더 (좌 사이드바형) ────────── */
.app-header {
  height: ${t.height}px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: ${t.bgColor};
  color: ${t.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
}
.header-title { font-weight: 600; font-size: 16px; }

/* ────────── 상단 네비 막대 (top-kind 전용) ────────── */
.app-topbar {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: ${t.height}px;
  background: ${t.bgColor};
  color: ${t.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
  flex-shrink: 0;
}
.topnav {
  display: flex;
  gap: 4px;
  align-items: center;
}
.topnav-item {
  padding: 6px 14px;
  color: inherit;
  background: none;
  border: none;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}
.topnav-item:hover { background: rgba(0,0,0,0.05); }
.topnav-item.active {
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
  font-weight: 600;
}

/* ────────── 메인 콘텐츠 ────────── */
.app-content {
  flex: 1;
  background: ${i.bgColor};
  padding: ${i.padding}px;
  overflow-y: auto;
}
.app-content.is-split {
  display: flex;
  gap: 16px;
  overflow: hidden;
}
.app-content.is-split .composite-view { flex: 1; overflow-y: auto; }
.app-content.is-grid .composite-view {
  max-width: none;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-content: flex-start;
}
.app-content.is-grid .composite-view > .composite-header {
  flex: 0 0 100%;
}
.app-content.is-grid .composite-view > *:not(.composite-header) {
  flex: 1 1 300px;
  max-width: 100%;
}

/* ════════════════════════════ kind-specific 오버라이드 ════════════════════════════ */

/* sidebar-right: app-body 내 flex order 로 메인 왼쪽 + 사이드바 오른쪽 */
.layout-kind-sidebar-right .app-sidebar-right { border-left: 1px solid #e5e7eb; border-right: none; }

/* sidebar-both: 좌 사이드바 + 메인 + 우 aux 순서 */
.layout-kind-sidebar-both .app-sidebar-left { order: 0; }
.layout-kind-sidebar-both .app-main { order: 1; }
.layout-kind-sidebar-both .app-aux-panel { order: 2; }

/* top-and-side: 상단 네비 + 좌 서브메뉴 + 메인 — 좌 사이드바는 상단 헤더 없이 */
.layout-kind-top-and-side .app-sidebar { padding-top: 8px; }

/* hero-landing: 상단 네비 고정 + 메인은 전체 폭 */
.layout-kind-hero-landing .app-topbar {
  background: transparent;
  border-bottom: none;
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}
.layout-kind-hero-landing .app-content { max-width: none; padding: 0; }
.layout-kind-hero-landing .composite-view { max-width: 1200px; margin: 0 auto; padding: ${i.padding}px; }

/* split-panel: 메인 영역 2분할 (composite-view 내부 구성은 화면이 담당) */
.layout-kind-split-panel .app-content { padding: ${i.padding}px; }

/* card-grid: 메인 영역 그리드는 위의 .app-content.is-grid 규칙이 담당 */

/* ════════════════════════════ composite-view 공통 ════════════════════════════ */
.composite-view {
  max-width: 1400px;
  margin: 0 auto;
}
.composite-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e6ef;
}
.composite-title { margin: 0 0 4px; font-size: 20px; font-weight: 600; color: #0f172a; }
.composite-subtitle { font-size: 13px; color: #64748b; }
`}function he(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Vl(s){return`<!DOCTYPE html><html><body style="padding:32px;font-family:sans-serif;color:#b91c1c">${he(s)}</body></html>`}const Bl=`
* { box-sizing: border-box; }
body { margin: 0; }
`,Fl={class:"whole-app-preview"},Hl={class:"preview-toolbar"},ql={class:"d-flex align-items-center gap-2 flex-grow-1"},Kl={class:"fw-semibold"},Jl={class:"text-secondary small"},Gl={class:"btn-group btn-group-sm",role:"group"},Zl={key:0,class:"empty-state"},Yl=["srcdoc"],Ql=400,Xl={__name:"WholeAppPreview",props:{project:{type:Object,required:!0}},setup(s){const t=nt(),a=s,i=O(a.project);let p=null;me(()=>a.project,l=>{p&&clearTimeout(p),p=setTimeout(()=>{i.value=l,p=null},Ql)},{deep:!0}),Le(()=>{p&&clearTimeout(p)});const r=V(()=>{try{return Ml({project:i.value,authToken:t.accessToken||""})}catch(l){return`<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(l.message||l).replace(/</g,"&lt;")}</body></html>`}}),d=O("desktop"),g={desktop:"100%",tablet:"1024px",mobile:"375px"},h=V(()=>{var l;return(((l=a.project)==null?void 0:l.screens)||[]).filter(o=>o.kind==="composite").length});return(l,o)=>(n(),u("div",Fl,[e("div",Hl,[e("div",ql,[o[3]||(o[3]=e("i",{class:"bi bi-app-indicator"},null,-1)),e("span",Kl,c(s.project.name||"전체 앱 미리보기"),1),e("span",Jl,"· "+c(h.value)+"개 화면",1)]),e("div",Gl,[e("button",{class:H(["btn",d.value==="desktop"?"btn-primary":"btn-outline-secondary"]),onClick:o[0]||(o[0]=m=>d.value="desktop")},[...o[4]||(o[4]=[e("i",{class:"bi bi-laptop"},null,-1),_(" Desktop ",-1)])],2),e("button",{class:H(["btn",d.value==="tablet"?"btn-primary":"btn-outline-secondary"]),onClick:o[1]||(o[1]=m=>d.value="tablet")},[...o[5]||(o[5]=[e("i",{class:"bi bi-tablet"},null,-1),_(" Tablet ",-1)])],2),e("button",{class:H(["btn",d.value==="mobile"?"btn-primary":"btn-outline-secondary"]),onClick:o[2]||(o[2]=m=>d.value="mobile")},[...o[6]||(o[6]=[e("i",{class:"bi bi-phone"},null,-1),_(" Mobile ",-1)])],2)])]),h.value?(n(),u("div",{key:1,class:H(["preview-frame-wrap","viewport-"+d.value])},[e("iframe",{class:"preview-iframe",style:F({width:g[d.value]}),srcdoc:r.value,sandbox:"allow-scripts allow-same-origin",referrerpolicy:"no-referrer"},null,12,Yl)],2)):(n(),u("div",Zl,[...o[7]||(o[7]=[e("i",{class:"bi bi-easel2 fs-1 d-block mb-2 opacity-50"},null,-1),e("div",{class:"mb-2"},"아직 화면이 없습니다.",-1),e("div",{class:"small text-secondary"}," '화면 목록' 탭에서 새 화면을 추가하세요. ",-1)])]))]))}},en=ve(Xl,[["__scopeId","data-v-9fea16d5"]]),tn={class:"container-fluid py-3"},an={class:"d-flex justify-content-between align-items-center mb-3"},sn={class:"d-flex align-items-center gap-2"},rn=["title"],on={class:"mb-0"},ln={key:0,class:"text-secondary"},nn={key:1},dn={key:2,class:"text-secondary"},cn={key:0,class:"small text-secondary"},un={key:0},pn={class:"ms-2"},fn={key:0,class:"opacity-75"},mn={key:1,class:"small text-secondary"},vn={key:0,class:"d-flex align-items-center gap-2"},bn={key:0},hn={key:1},gn={class:"text-secondary"},yn={key:2,class:"text-secondary"},kn=["disabled","title"],xn={key:0,class:"alert alert-danger small"},wn={class:"nav nav-tabs mb-3"},$n={class:"nav-item"},_n={class:"nav-item"},Cn={class:"nav-item"},Sn={class:"nav-item"},An={key:1},Pn={key:0,class:"card"},Tn={class:"card-body text-center py-5 text-secondary"},En={key:2},Rn={key:0,class:"card"},jn={class:"card-body text-center py-5 text-secondary"},Ln={key:3},Nn={key:0,class:"card"},zn={class:"card-body text-center py-5 text-secondary"},Wn={key:4},Mn={key:0,class:"card"},In={class:"card-body text-center py-5 text-secondary"},Dn={__name:"ProjectEditorView",setup(s){const t=tt(),{t:a}=we(),i=Ke(),p=Je(),r=ze(),{activeProject:d,loading:g,error:h,saving:l}=je(r),o=["layout","screens","preview","export"];function m(){const E=i.query.tab;return typeof E=="string"&&o.includes(E)?E:"layout"}const k=O(m());me(k,E=>{i.query.tab!==E&&p.replace({query:E==="layout"?{}:{...i.query,tab:E}})}),me(()=>i.query.tab,()=>{const E=m();E!==k.value&&(k.value=E)});const x=O(null);me(l,(E,A)=>{A===!0&&E===!1&&(x.value=new Date)});const $=V(()=>l.value?"저장 중…":x.value?"모든 변경사항이 자동 저장됨":"자동 저장됨 (편집 시 500ms 후 저장)");async function I(){var A;const E=i.params.id;if(E)try{await r.loadById(E)}catch(P){((A=P.response)==null?void 0:A.status)===404&&(be("존재하지 않는 프로젝트입니다","목록으로 돌아갑니다."),p.replace({name:"screen-projects"}))}}qe(I),me(()=>i.params.id,I),Le(()=>r.clearActive());function j(){p.push({name:"screen-projects"})}async function y(){var A,P,ee;if(!d.value){Xe("저장할 수 없습니다","프로젝트가 아직 로드되지 않았습니다.");return}const E=d.value;console.log("[ProjectEditor] saveNow → PUT /api/admin/screen-projects/"+E.id,{name:E.name,screensCount:(E.screens||[]).length});try{const S=await r.savePatch(E.id,{name:E.name,description:E.description,config:E.config,layout:E.layout,screens:E.screens,vars:E.vars});x.value=new Date,console.log("[ProjectEditor] saveNow ✓ updated id="+((S==null?void 0:S.id)??E.id)),et("저장되었습니다",`${E.name} · ID ${E.id} · ${t.time(x.value)}`)}catch(S){const U=(A=S.response)==null?void 0:A.status,N=((ee=(P=S.response)==null?void 0:P.data)==null?void 0:ee.message)||S.message;console.error("[ProjectEditor] saveNow ✗",U,N),be(`저장 실패 (HTTP ${U||"?"})`,N)}}return(E,A)=>(n(),u("div",tn,[e("div",an,[e("div",sn,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:j,title:f(a)("projectEditor.k12")},[...A[4]||(A[4]=[e("i",{class:"bi bi-arrow-left"},null,-1)])],8,rn),e("div",null,[e("h5",on,[A[6]||(A[6]=e("i",{class:"bi bi-easel2 me-2"},null,-1)),f(g)&&!f(d)?(n(),u("span",ln,[A[5]||(A[5]=e("span",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(c(f(a)("projectEditor.k1")),1)])):f(d)?(n(),u("span",nn,c(f(d).name),1)):(n(),u("span",dn,c(f(a)("projectEditor.k2")),1))]),f(d)?(n(),u("div",cn,[f(d).description?(n(),u("span",un,c(f(d).description)+" · ",1)):L("",!0),A[7]||(A[7]=_(" Project ID: ",-1)),e("code",null,c(f(d).id),1),e("span",pn,[e("i",{class:H(["bi",f(l)?"bi-arrow-repeat":"bi-check-circle"])},null,2),_(" "+c($.value)+" ",1),x.value?(n(),u("span",fn," ("+c(f(t).time(x.value))+") ",1)):L("",!0)])])):(n(),u("div",mn,[A[8]||(A[8]=_(" Project ID: ",-1)),e("code",null,c(f(i).params.id),1)]))])]),f(d)?(n(),u("div",vn,[e("span",{class:H(["small save-indicator",{saving:f(l),"just-saved":x.value&&!f(l)}])},[f(l)?(n(),u("span",bn,[A[9]||(A[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(c(f(a)("projectEditor.k3")),1)])):x.value?(n(),u("span",hn,[A[10]||(A[10]=e("i",{class:"bi bi-check-circle-fill me-1 text-success"},null,-1)),_(" "+c(f(a)("projectEditor.k4"))+" ",1),e("span",gn,"("+c(f(t).time(x.value))+")",1)])):(n(),u("span",yn,[A[11]||(A[11]=e("i",{class:"bi bi-cloud me-1"},null,-1)),_(c(f(a)("projectEditor.k5")),1)]))],2),e("button",{class:"btn btn-sm btn-outline-primary",onClick:y,disabled:f(l),title:f(a)("projectEditor.k6")},[A[12]||(A[12]=e("i",{class:"bi bi-save me-1"},null,-1)),_(c(f(a)("projectEditor.k6")),1)],8,kn)])):L("",!0)]),f(h)?(n(),u("div",xn,[A[13]||(A[13]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(c(f(h)),1)])):L("",!0),e("ul",wn,[e("li",$n,[e("button",{class:H(["nav-link",{active:k.value==="layout"}]),onClick:A[0]||(A[0]=P=>k.value="layout")},[A[14]||(A[14]=e("i",{class:"bi bi-layout-sidebar me-1"},null,-1)),_(c(f(a)("projectEditor.k7")),1)],2)]),e("li",_n,[e("button",{class:H(["nav-link",{active:k.value==="screens"}]),onClick:A[1]||(A[1]=P=>k.value="screens")},[A[15]||(A[15]=e("i",{class:"bi bi-collection me-1"},null,-1)),_(c(f(a)("projectEditor.k8")),1)],2)]),e("li",Cn,[e("button",{class:H(["nav-link",{active:k.value==="preview"}]),onClick:A[2]||(A[2]=P=>k.value="preview")},[A[16]||(A[16]=e("i",{class:"bi bi-eye me-1"},null,-1)),_(c(f(a)("projectEditor.k9")),1)],2)]),e("li",Sn,[e("button",{class:H(["nav-link",{active:k.value==="export"}]),onClick:A[3]||(A[3]=P=>k.value="export")},[A[17]||(A[17]=e("i",{class:"bi bi-download me-1"},null,-1)),_(c(f(a)("projectEditor.k10")),1)],2)])]),k.value==="layout"?(n(),u("div",An,[f(d)?(n(),ge(_s,{key:1})):(n(),u("div",Pn,[e("div",Tn,[A[18]||(A[18]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(c(f(a)("projectEditor.k11")),1)])]))])):L("",!0),k.value==="screens"?(n(),u("div",En,[f(d)?(n(),ge(oo,{key:1})):(n(),u("div",Rn,[e("div",jn,[A[19]||(A[19]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(c(f(a)("projectEditor.k11")),1)])]))])):L("",!0),k.value==="preview"?(n(),u("div",Ln,[f(d)?(n(),ge(en,{key:1,project:f(d)},null,8,["project"])):(n(),u("div",Nn,[e("div",zn,[A[20]||(A[20]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(c(f(a)("projectEditor.k11")),1)])]))])):L("",!0),k.value==="export"?(n(),u("div",Wn,[f(d)?(n(),ge(Tl,{key:1,project:f(d)},null,8,["project"])):(n(),u("div",Mn,[e("div",In,[A[21]||(A[21]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(c(f(a)("projectEditor.k11")),1)])]))])):L("",!0)]))}},Zn=ve(Dn,[["__scopeId","data-v-8983075a"]]);export{Zn as default};
