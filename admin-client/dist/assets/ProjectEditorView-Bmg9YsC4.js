import{n as ge,a as et,b as tt}from"./useNotify-C01_g_8e.js";import{u as st}from"./useFormat-B4LfgE4_.js";import{x as c,c as f,F as W,r as ee,a as e,D as Ee,n as H,b as ae,f as z,t as l,d as m,p as K,e as _,h as Y,v as X,O as at,S as F,M as Le,m as V,w as ve,K as je,B as _e,o as qe,I as Ve,g as ze,ad as it,C as rt,k as Ce,s as Je,q as Ge,A as ke,an as nt,X as ot,a9 as pe,ao as lt,u as dt}from"./index-CzdPA76M.js";import{u as Me}from"./screenProjects-DCQ2c8wK.js";import{u as be,l as ct}from"./useI18n-pazIs5RI.js";import{_ as he}from"./_plugin-vue_export-helper-DlAUqK2U.js";import{d as Te,b as ut}from"./useConfirm-BX5YsDKw.js";import{c as pt,a as ft,b as Se,d as Ae,g as mt,p as vt,W as bt,e as ht}from"./previewRuntimes-D0tG2n4R.js";import{_ as Ue}from"./CodeEditor-BrEv_kz2.js";import"./toasts-_8eBy38Y.js";const gt={class:"row g-3"},yt=["onClick","onKeyup"],kt={class:"schematic"},xt={viewBox:"0 0 120 70",xmlns:"http://www.w3.org/2000/svg",preserveAspectRatio:"xMidYMid meet"},wt=["fill"],$t=["fill"],_t=["fill"],Ct=["fill"],St={class:"pick-body"},At={class:"d-flex align-items-center mb-1"},Pt={class:"fw-semibold"},Tt={key:0,class:"badge bg-primary ms-auto"},Et={key:1,class:"badge bg-light text-secondary ms-auto small"},Rt={class:"small text-secondary mb-0"},Nt={__name:"LayoutPicker",props:{modelValue:{type:String,default:"sidebar-left"}},emits:["update:modelValue"],setup(i,{expose:s,emit:a}){const r=i,u=a,{t:n}=be(),p=[{kind:"sidebar-left",labelKey:"lay_sidebarLeft",descKey:"lay_sidebarLeftD",category:"admin"},{kind:"sidebar-dark",labelKey:"lay_sidebarDark",descKey:"lay_sidebarDarkD",category:"admin"},{kind:"top-nav",labelKey:"lay_topNav",descKey:"lay_topNavD",category:"web"},{kind:"sidebar-right",labelKey:"lay_sidebarRight",descKey:"lay_sidebarRightD",category:"admin"},{kind:"sidebar-both",labelKey:"lay_sidebarBoth",descKey:"lay_sidebarBothD",category:"admin"},{kind:"top-and-side",labelKey:"lay_topAndSide",descKey:"lay_topAndSideD",category:"admin"},{kind:"hero-landing",labelKey:"lay_heroLanding",descKey:"lay_heroLandingD",category:"web"},{kind:"split-panel",labelKey:"lay_splitPanel",descKey:"lay_splitPanelD",category:"app"},{kind:"card-grid",labelKey:"lay_cardGrid",descKey:"lay_cardGridD",category:"app"}];function y(v){v!==r.modelValue&&u("update:modelValue",v)}const g=K(()=>p.find(v=>v.kind===r.modelValue)||p[0]);return s({currentPreset:g,presets:p}),(v,o)=>(c(),f("div",gt,[(c(),f(W,null,ee(p,d=>e("div",{key:d.kind,class:"col-md-4 col-sm-6"},[e("div",{class:H(["pick-card h-100",{selected:i.modelValue===d.kind}]),onClick:x=>y(d.kind),tabindex:"0",role:"button",onKeyup:Ee(x=>y(d.kind),["enter"])},[e("div",kt,[(c(),f("svg",xt,[o[8]||(o[8]=e("rect",{width:"120",height:"70",fill:"#f8fafc",rx:"3"},null,-1)),d.kind==="sidebar-left"||d.kind==="sidebar-dark"?(c(),f(W,{key:0},[e("rect",{x:"0",y:"0",width:"30",height:"70",fill:d.kind==="sidebar-dark"?"#1e2a3a":"#e2e8f0",rx:"3"},null,8,wt),e("rect",{x:"5",y:"8",width:"20",height:"3",rx:"1",fill:d.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,$t),e("rect",{x:"5",y:"14",width:"20",height:"3",rx:"1",fill:d.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,_t),e("rect",{x:"5",y:"20",width:"20",height:"3",rx:"1",fill:d.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,Ct),o[0]||(o[0]=ae('<rect x="30" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="30" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="36" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="36" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="36" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="77" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',6))],64)):d.kind==="top-nav"?(c(),f(W,{key:1},[o[1]||(o[1]=ae('<rect x="0" y="0" width="120" height="12" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="12" x2="120" y2="12" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="4" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="50" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="82" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="98" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="6" y="18" width="108" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="62" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):d.kind==="sidebar-right"?(c(),f(W,{key:2},[o[2]||(o[2]=ae('<rect x="0" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="10" x2="90" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="90" y="0" width="30" height="70" fill="#e2e8f0" rx="3" data-v-b3652270></rect><rect x="95" y="8" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="14" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="20" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="6" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="47" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):d.kind==="sidebar-both"?(c(),f(W,{key:3},[o[3]||(o[3]=ae('<rect x="0" y="0" width="24" height="70" fill="#1e2a3a" rx="3" data-v-b3652270></rect><rect x="4" y="8" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="14" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="20" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="96" y="0" width="24" height="70" fill="#f1f5f9" rx="3" data-v-b3652270></rect><rect x="100" y="8" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="100" y="14" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="24" y="0" width="72" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="24" y1="10" x2="96" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="28" y="3" width="22" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="28" y="16" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="28" y="42" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',12))],64)):d.kind==="top-and-side"?(c(),f(W,{key:4},[o[4]||(o[4]=ae('<rect x="0" y="0" width="120" height="10" fill="#1e2a3a" data-v-b3652270></rect><rect x="6" y="3" width="22" height="4" rx="1" fill="#fff" data-v-b3652270></rect><rect x="50" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="64" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="78" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="0" y="10" width="28" height="60" fill="#e2e8f0" data-v-b3652270></rect><rect x="4" y="16" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="22" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="28" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="32" y="14" width="84" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="32" y="38" width="84" height="28" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',11))],64)):d.kind==="hero-landing"?(c(),f(W,{key:5},[o[5]||(o[5]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="18" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="80" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="92" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="104" y="4" width="12" height="4" rx="1" fill="#0d6efd" data-v-b3652270></rect><rect x="0" y="10" width="120" height="32" fill="#f1f5f9" data-v-b3652270></rect><rect x="20" y="18" width="80" height="5" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="30" y="26" width="60" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="42" y="33" width="18" height="5" rx="2" fill="#0d6efd" data-v-b3652270></rect><rect x="62" y="33" width="18" height="5" rx="2" fill="#fff" stroke="#0d6efd" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',13))],64)):d.kind==="split-panel"?(c(),f(W,{key:6},[o[6]||(o[6]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="52" height="50" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="26" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="32" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="38" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="62" y="16" width="52" height="50" rx="2" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.5" data-v-b3652270></rect><rect x="66" y="22" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="66" y="30" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="35" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="40" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',13))],64)):d.kind==="card-grid"?(c(),f(W,{key:7},[o[7]||(o[7]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="10" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',15))],64)):z("",!0)]))]),e("div",St,[e("div",At,[e("span",Pt,l(m(n)("designer."+d.labelKey)),1),i.modelValue===d.kind?(c(),f("span",Tt,[...o[9]||(o[9]=[e("i",{class:"bi bi-check-lg"},null,-1)])])):(c(),f("span",Et,l(d.category),1))]),e("p",Rt,l(m(n)("designer."+d.descKey)),1)])],42,yt)])),64))]))}},Lt=he(Nt,[["__scopeId","data-v-b3652270"]]),jt={class:"accordion",id:"layoutCustomizerAccordion"},zt={class:"accordion-item"},Mt={class:"accordion-header"},Wt={class:"accordion-button",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccTitle","aria-expanded":"true"},Dt={id:"cAccTitle",class:"accordion-collapse collapse show"},It={class:"accordion-body"},Ot={class:"row g-3"},Vt={class:"col-md-6"},Ut={class:"form-label small"},Bt=["placeholder"],Kt={class:"col-md-6"},Ft={class:"form-label small"},Ht={class:"text-secondary"},qt={class:"col-md-4"},Jt={class:"form-label small"},Gt={class:"input-group input-group-sm"},Zt={class:"col-md-4"},Yt={class:"form-label small"},Qt={class:"input-group input-group-sm"},Xt={class:"col-md-4"},es={class:"form-label small"},ts={key:0,class:"accordion-item"},ss={class:"accordion-header"},as={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccSidebar"},is={id:"cAccSidebar",class:"accordion-collapse collapse"},rs={class:"accordion-body"},ns={key:0,class:"row g-3 mb-3"},os={class:"col-md-3"},ls={class:"form-label small"},ds={class:"input-group input-group-sm"},cs={class:"col-md-3"},us={class:"form-label small"},ps={class:"input-group input-group-sm"},fs={class:"col-md-3"},ms={class:"form-label small"},vs={class:"input-group input-group-sm"},bs={class:"col-md-3"},hs={class:"form-label small"},gs={key:1,class:"text-secondary small mb-3"},ys={class:"d-flex justify-content-between align-items-center mb-2"},ks={class:"form-label small mb-0"},xs={key:2,class:"text-secondary small py-2"},ws={key:3,class:"menu-item-list"},$s=["onUpdate:modelValue"],_s=["value"],Cs=["onUpdate:modelValue","placeholder"],Ss=["onUpdate:modelValue"],As={class:"btn-group"},Ps=["onClick","disabled","title"],Ts=["onClick","disabled","title"],Es=["onClick","title"],Rs={class:"accordion-item"},Ns={class:"accordion-header"},Ls={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccMain"},js={id:"cAccMain",class:"accordion-collapse collapse"},zs={class:"accordion-body"},Ms={class:"row g-3"},Ws={class:"col-md-6"},Ds={class:"form-label small"},Is={class:"input-group input-group-sm"},Os={class:"col-md-6"},Vs={class:"form-label small"},Us={__name:"LayoutCustomizer",props:{layout:{type:Object,required:!0}},emits:["update:layout"],setup(i,{emit:s}){const{t:a}=be(),r=i,u=s,n=K({get:()=>r.layout,set:N=>u("update:layout",N)}),p=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-nav","top-and-side"]),y=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both"]),g=K(()=>{var N;return p.has((N=r.layout)==null?void 0:N.kind)}),v=K(()=>{var N;return y.has((N=r.layout)==null?void 0:N.kind)}),o=K(()=>{var k;const N=(k=r.layout)==null?void 0:k.kind;return a(N==="top-nav"||N==="top-and-side"?"designer.topNavMenu":"designer.sidebarMenu")}),d=K(()=>{var k;const N=(k=r.layout)==null?void 0:k.kind;return N==="top-nav"||N==="top-and-side"?"bi-menu-button-wide":"bi-layout-sidebar"}),x=["bi-house-door","bi-list","bi-grid","bi-person","bi-gear","bi-file-text","bi-bar-chart","bi-cart","bi-bell","bi-envelope","bi-calendar","bi-folder","bi-images","bi-book"];function $(){n.value.sidebar||(n.value.sidebar={items:[]}),Array.isArray(n.value.sidebar.items)||(n.value.sidebar.items=[]),n.value.sidebar.items.push({icon:"bi-house-door",label:a("layoutCustomizer.k21"),path:"/"})}function P(N){n.value.sidebar.items.splice(N,1)}function T(N,k){const L=n.value.sidebar.items,A=N+k;if(A<0||A>=L.length)return;const[E]=L.splice(N,1);L.splice(A,0,E)}return(N,k)=>{var L,A;return c(),f("div",jt,[e("div",zt,[e("h2",Mt,[e("button",Wt,[k[17]||(k[17]=e("i",{class:"bi bi-window me-2"},null,-1)),_(l(m(a)("layoutCustomizer.k1")),1)])]),e("div",Dt,[e("div",It,[e("div",Ot,[e("div",Vt,[e("label",Ut,l(m(a)("layoutCustomizer.k2")),1),Y(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":k[0]||(k[0]=E=>n.value.title.text=E),placeholder:m(a)("layoutCustomizer.k16")},null,8,Bt),[[X,n.value.title.text]])]),e("div",Kt,[e("label",Ft,[_(l(m(a)("layoutCustomizer.k3"))+" ",1),e("span",Ht,l(m(a)("layoutCustomizer.k4")),1)]),Y(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":k[1]||(k[1]=E=>n.value.title.logoUrl=E),placeholder:"https://..."},null,512),[[X,n.value.title.logoUrl]])]),e("div",qt,[e("label",Jt,l(m(a)("layoutCustomizer.k5")),1),e("div",Gt,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[2]||(k[2]=E=>n.value.title.bgColor=E)},null,512),[[X,n.value.title.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[3]||(k[3]=E=>n.value.title.bgColor=E)},null,512),[[X,n.value.title.bgColor]])])]),e("div",Zt,[e("label",Yt,l(m(a)("layoutCustomizer.k6")),1),e("div",Qt,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[4]||(k[4]=E=>n.value.title.fgColor=E)},null,512),[[X,n.value.title.fgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[5]||(k[5]=E=>n.value.title.fgColor=E)},null,512),[[X,n.value.title.fgColor]])])]),e("div",Xt,[e("label",es,l(m(a)("layoutCustomizer.k7")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"40",max:"120","onUpdate:modelValue":k[6]||(k[6]=E=>n.value.title.height=E)},null,512),[[X,n.value.title.height,void 0,{number:!0}]])])])])])]),g.value?(c(),f("div",ts,[e("h2",ss,[e("button",as,[e("i",{class:H(["bi me-2",d.value])},null,2),_(l(o.value),1)])]),e("div",is,[e("div",rs,[v.value?(c(),f("div",ns,[e("div",os,[e("label",ls,l(m(a)("layoutCustomizer.k5")),1),e("div",ds,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[7]||(k[7]=E=>n.value.sidebar.bgColor=E)},null,512),[[X,n.value.sidebar.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[8]||(k[8]=E=>n.value.sidebar.bgColor=E)},null,512),[[X,n.value.sidebar.bgColor]])])]),e("div",cs,[e("label",us,l(m(a)("layoutCustomizer.k6")),1),e("div",ps,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[9]||(k[9]=E=>n.value.sidebar.fgColor=E)},null,512),[[X,n.value.sidebar.fgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[10]||(k[10]=E=>n.value.sidebar.fgColor=E)},null,512),[[X,n.value.sidebar.fgColor]])])]),e("div",fs,[e("label",ms,l(m(a)("layoutCustomizer.k8")),1),e("div",vs,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[11]||(k[11]=E=>n.value.sidebar.activeBg=E)},null,512),[[X,n.value.sidebar.activeBg]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[12]||(k[12]=E=>n.value.sidebar.activeBg=E)},null,512),[[X,n.value.sidebar.activeBg]])])]),e("div",bs,[e("label",hs,l(m(a)("layoutCustomizer.k9")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"160",max:"320","onUpdate:modelValue":k[13]||(k[13]=E=>n.value.sidebar.width=E)},null,512),[[X,n.value.sidebar.width,void 0,{number:!0}]])])])):(c(),f("div",gs,[k[18]||(k[18]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),_(" "+l(m(a)("layoutCustomizer.k10")),1)])),e("div",ys,[e("label",ks,l(m(a)("layoutCustomizer.k11")),1),e("button",{class:"btn btn-sm btn-outline-primary",onClick:$},[k[19]||(k[19]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),_(l(m(a)("layoutCustomizer.k12")),1)])]),(A=(L=n.value.sidebar)==null?void 0:L.items)!=null&&A.length?(c(),f("div",ws,[(c(!0),f(W,null,ee(n.value.sidebar.items,(E,te)=>(c(),f("div",{key:te,class:"menu-item-row"},[Y(e("select",{"onUpdate:modelValue":S=>E.icon=S,class:"form-select form-select-sm icon-select"},[(c(),f(W,null,ee(x,S=>e("option",{key:S,value:S},l(S),9,_s)),64))],8,$s),[[at,E.icon]]),Y(e("input",{"onUpdate:modelValue":S=>E.label=S,class:"form-control form-control-sm",placeholder:m(a)("layoutCustomizer.k17")},null,8,Cs),[[X,E.label]]),Y(e("input",{"onUpdate:modelValue":S=>E.path=S,class:"form-control form-control-sm",placeholder:"/path"},null,8,Ss),[[X,E.path]]),e("div",As,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:S=>T(te,-1),disabled:te===0,title:m(a)("layoutCustomizer.k18")},[...k[20]||(k[20]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,Ps),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:S=>T(te,1),disabled:te===n.value.sidebar.items.length-1,title:m(a)("layoutCustomizer.k19")},[...k[21]||(k[21]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,Ts),e("button",{class:"btn btn-sm btn-outline-danger",onClick:S=>P(te),title:m(a)("layoutCustomizer.k20")},[...k[22]||(k[22]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,Es)])]))),128))])):(c(),f("div",xs,l(m(a)("layoutCustomizer.k13")),1))])])])):z("",!0),e("div",Rs,[e("h2",Ns,[e("button",Ls,[k[23]||(k[23]=e("i",{class:"bi bi-columns me-2"},null,-1)),_(l(m(a)("layoutCustomizer.k14")),1)])]),e("div",js,[e("div",zs,[e("div",Ms,[e("div",Ws,[e("label",Ds,l(m(a)("layoutCustomizer.k5")),1),e("div",Is,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":k[14]||(k[14]=E=>n.value.mainArea.bgColor=E)},null,512),[[X,n.value.mainArea.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":k[15]||(k[15]=E=>n.value.mainArea.bgColor=E)},null,512),[[X,n.value.mainArea.bgColor]])])]),e("div",Os,[e("label",Vs,l(m(a)("layoutCustomizer.k15")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"0",max:"64","onUpdate:modelValue":k[16]||(k[16]=E=>n.value.mainArea.padding=E)},null,512),[[X,n.value.mainArea.padding,void 0,{number:!0}]])])])])])])])}}},Bs=he(Us,[["__scopeId","data-v-0fdebd42"]]),Ks=["src"],Fs={class:"mini-title-text"},Hs={class:"mini-menu-label"},qs={key:0,class:"mini-menu-empty"},Js=["src"],Gs={class:"mini-title-text"},Zs={class:"mini-topnav"},Ys=["src"],Qs={class:"mini-title-text"},Xs={class:"mini-menu-label"},ea={key:0,class:"mini-menu-empty"},ta={class:"mini-menu-label"},sa={key:0,class:"mini-menu-empty"},aa={class:"mini-center"},ia={class:"mini-title-text"},ra={class:"mini-title-text"},na={class:"mini-topnav"},oa={class:"mini-menu-label"},la={key:0,class:"mini-menu-empty"},da={class:"mini-title-text"},ca={class:"mini-topnav"},ua={class:"mini-title-text"},pa={class:"mini-split-list"},fa={class:"mini-title-text"},Be=400,me=240,ma={__name:"LayoutPreview",props:{layout:{type:Object,required:!0}},setup(i){const s=i,a=K(()=>{var P;return((P=s.layout)==null?void 0:P.kind)||"sidebar-left"}),r=K(()=>{var P;return((P=s.layout)==null?void 0:P.title)||{}}),u=K(()=>{var P;return((P=s.layout)==null?void 0:P.sidebar)||{}}),n=K(()=>{var P;return((P=s.layout)==null?void 0:P.mainArea)||{}}),p=K(()=>u.value.items||[]),y=K(()=>me/600),g=K(()=>Be/1e3),v=K(()=>Math.max(18,(r.value.height||60)*y.value)),o=K(()=>Math.max(40,(u.value.width||220)*g.value)),d=K(()=>Math.max(4,(n.value.padding||16)*g.value)),x=K(()=>{const P=a.value;return P==="sidebar-right"?"sidebar-right":P==="sidebar-both"?"sidebar-both":P==="top-and-side"?"top-and-side":P==="hero-landing"?"hero-landing":P==="split-panel"?"split-panel":P==="card-grid"?"card-grid":P==="top-nav"?"top-nav":"sidebar-left"});function $(P,T){return(P||[]).slice(0,T)}return(P,T)=>(c(),f("div",{class:"mini-wrapper",style:F({width:Be+"px",height:me+"px"})},[x.value==="sidebar-left"?(c(),f(W,{key:0},[e("div",{class:"mini-title",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[r.value.logoUrl?(c(),f("img",{key:0,src:r.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Ks)):z("",!0),e("span",Fs,l(r.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:F({height:me-v.value+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:u.value.bgColor||(a.value==="sidebar-dark"?"#1e2a3a":"#e2e8f0"),color:u.value.fgColor||(a.value==="sidebar-dark"?"#cfd6de":"#334155")})},[(c(!0),f(W,null,ee($(p.value,8),(N,k)=>(c(),f("div",{key:k,class:H(["mini-menu-item",{active:k===0}]),style:F({backgroundColor:k===0?u.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([N.icon,"mini-menu-icon"])},null,2),e("span",Hs,l(N.label),1)],6))),128)),p.value.length?z("",!0):(c(),f("div",qs,"(메뉴 없음)"))],4),e("div",{class:"mini-main",style:F({backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[...T[0]||(T[0]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):x.value==="top-nav"?(c(),f(W,{key:1},[e("div",{class:"mini-title mini-title--nav",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[r.value.logoUrl?(c(),f("img",{key:0,src:r.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Js)):z("",!0),e("span",Gs,l(r.value.text||"My App"),1),e("div",Zs,[(c(!0),f(W,null,ee($(p.value,5),(N,k)=>(c(),f("span",{key:k,class:"mini-topnav-item"},l(N.label),1))),128))])],4),e("div",{class:"mini-main mini-main--full",style:F({height:me-v.value+"px",backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[...T[1]||(T[1]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],64)):x.value==="sidebar-right"?(c(),f(W,{key:2},[e("div",{class:"mini-title",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[r.value.logoUrl?(c(),f("img",{key:0,src:r.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Ys)):z("",!0),e("span",Qs,l(r.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:F({height:me-v.value+"px"})},[e("div",{class:"mini-main",style:F({backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[...T[2]||(T[2]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4),e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:u.value.bgColor||"#e2e8f0",color:u.value.fgColor||"#334155"})},[(c(!0),f(W,null,ee($(p.value,8),(N,k)=>(c(),f("div",{key:k,class:H(["mini-menu-item",{active:k===0}]),style:F({backgroundColor:k===0?u.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([N.icon,"mini-menu-icon"])},null,2),e("span",Xs,l(N.label),1)],6))),128)),p.value.length?z("",!0):(c(),f("div",ea,"(메뉴 없음)"))],4)],4)],64)):x.value==="sidebar-both"?(c(),f("div",{key:3,class:"mini-body",style:F({height:me+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:u.value.bgColor||"#1e2a3a",color:u.value.fgColor||"#cfd6de"})},[(c(!0),f(W,null,ee($(p.value,8),(N,k)=>(c(),f("div",{key:k,class:H(["mini-menu-item",{active:k===0}]),style:F({backgroundColor:k===0?u.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([N.icon,"mini-menu-icon"])},null,2),e("span",ta,l(N.label),1)],6))),128)),p.value.length?z("",!0):(c(),f("div",sa,"(메뉴 없음)"))],4),e("div",aa,[e("div",{class:"mini-title",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[e("span",ia,l(r.value.text||"My App"),1)],4),e("div",{class:"mini-main",style:F({backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[...T[3]||(T[3]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)]),e("div",{class:"mini-sidebar mini-sidebar--aux",style:F({width:Math.min(o.value,70)+"px",backgroundColor:"#f1f5f9",color:"#64748b"})},[...T[4]||(T[4]=[ae('<div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder short" data-v-582ff2b9></div></div>',3)])],4)],4)):x.value==="top-and-side"?(c(),f(W,{key:4},[e("div",{class:"mini-title mini-title--nav",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#1e2a3a",color:r.value.fgColor||"#ffffff"})},[e("span",ra,l(r.value.text||"My App"),1),e("div",na,[(c(!0),f(W,null,ee($(p.value,3),(N,k)=>(c(),f("span",{key:k,class:"mini-topnav-item"},l(N.label),1))),128))])],4),e("div",{class:"mini-body",style:F({height:me-v.value+"px"})},[e("div",{class:"mini-sidebar",style:F({width:o.value+"px",backgroundColor:u.value.bgColor||"#e2e8f0",color:u.value.fgColor||"#334155"})},[(c(!0),f(W,null,ee($(p.value.slice(3),6),(N,k)=>(c(),f("div",{key:k,class:H(["mini-menu-item mini-menu-item--sub",{active:k===0}]),style:F({backgroundColor:k===0?u.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([N.icon,"mini-menu-icon"])},null,2),e("span",oa,l(N.label),1)],6))),128)),p.value.length<=3?(c(),f("div",la,"(서브 메뉴)")):z("",!0)],4),e("div",{class:"mini-main",style:F({backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[...T[5]||(T[5]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):x.value==="hero-landing"?(c(),f(W,{key:5},[e("div",{class:"mini-title mini-title--nav mini-title--compact",style:F({backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[e("span",da,l(r.value.text||"Landing"),1),e("div",ca,[(c(!0),f(W,null,ee($(p.value,4),(N,k)=>(c(),f("span",{key:k,class:"mini-topnav-item"},l(N.label),1))),128)),T[6]||(T[6]=e("span",{class:"mini-topnav-cta"},"시작",-1))])],4),e("div",{class:"mini-hero",style:F({backgroundColor:n.value.bgColor||"#eef2ff"})},[...T[7]||(T[7]=[ae('<div class="mini-hero-title" data-v-582ff2b9></div><div class="mini-hero-sub" data-v-582ff2b9></div><div class="mini-hero-buttons" data-v-582ff2b9><div class="mini-hero-btn primary" data-v-582ff2b9></div><div class="mini-hero-btn" data-v-582ff2b9></div></div>',3)])],4),T[8]||(T[8]=e("div",{class:"mini-landing-features"},[e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"})],-1))],64)):x.value==="split-panel"?(c(),f(W,{key:6},[e("div",{class:"mini-title",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[e("span",ua,l(r.value.text||"My App"),1)],4),e("div",{class:"mini-split",style:F({height:me-v.value+"px",backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[e("div",pa,[(c(),f(W,null,ee(5,N=>e("div",{key:N,class:H(["mini-split-row",{active:N===1}])},null,2)),64))]),T[9]||(T[9]=ae('<div class="mini-split-detail" data-v-582ff2b9><div class="mini-split-detail-title" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div></div>',1))],4)],64)):x.value==="card-grid"?(c(),f(W,{key:7},[e("div",{class:"mini-title",style:F({height:v.value+"px",backgroundColor:r.value.bgColor||"#ffffff",color:r.value.fgColor||"#0f172a"})},[e("span",fa,l(r.value.text||"My App"),1)],4),e("div",{class:"mini-grid",style:F({height:me-v.value+"px",backgroundColor:n.value.bgColor||"#f5f7fa",padding:d.value+"px"})},[(c(),f(W,null,ee(6,N=>e("div",{key:N,class:"mini-grid-card"},[...T[10]||(T[10]=[e("div",{class:"mini-grid-card-dot"},null,-1),e("div",{class:"mini-grid-card-line"},null,-1)])])),64))],4)],64)):z("",!0)],4))}},va=he(ma,[["__scopeId","data-v-582ff2b9"]]),ba={class:"d-flex justify-content-between align-items-center mb-3"},ha={class:"text-secondary small mb-0"},ga={class:"text-muted"},ya={class:"save-indicator"},ka={key:0,class:"text-secondary small"},xa={key:1,class:"text-danger small"},wa={class:"row g-3"},$a={class:"col-lg-6"},_a={class:"mb-2"},Ca={class:"col-lg-6"},Sa={class:"right-sticky"},Aa={class:"mb-2"},Pa={class:"mb-2 mt-4"},Ta=500,Ea={__name:"LayoutTab",setup(i){var $;const{t:s}=be(),a=Me(),{activeId:r,activeProject:u,saving:n}=Le(a),p=V("idle"),y=V(null);let g=null;function v(P){const T={...P||{}};return T.kind=T.kind||"sidebar-left",T.title={text:"My App",logoUrl:"",bgColor:"#ffffff",fgColor:"#0f172a",height:60,...T.title||{}},T.sidebar={items:[],bgColor:"#1e2a3a",fgColor:"#cfd6de",width:220,activeBg:"#0d6efd",...T.sidebar||{}},Array.isArray(T.sidebar.items)||(T.sidebar.items=[]),T.mainArea={bgColor:"#f5f7fa",padding:16,...T.mainArea||{}},T}const o=V(v(($=u.value)==null?void 0:$.layout));let d=JSON.stringify(o.value);ve(()=>{var P;return(P=u.value)==null?void 0:P.id},()=>{var P;o.value=v((P=u.value)==null?void 0:P.layout),d=JSON.stringify(o.value),p.value="idle",g&&(clearTimeout(g),g=null)}),ve(o,()=>{r.value&&JSON.stringify(o.value)!==d&&(p.value="pending",g&&clearTimeout(g),g=setTimeout(async()=>{if(g=null,JSON.stringify(o.value)===d){p.value="idle";return}p.value="saving";try{await a.savePatch(r.value,{layout:o.value}),d=JSON.stringify(o.value),p.value="saved",y.value&&clearTimeout(y.value),y.value=setTimeout(()=>{p.value="idle",y.value=null},2e3)}catch{p.value="error"}},Ta))},{deep:!0}),je(async()=>{if(g&&(clearTimeout(g),g=null,r.value&&JSON.stringify(o.value)!==d))try{await a.savePatch(r.value,{layout:o.value})}catch{}y.value&&clearTimeout(y.value)});function x(P){o.value={...o.value,kind:P}}return(P,T)=>(c(),f("div",null,[e("div",ba,[e("p",ha,[_(l(m(s)("designer.layoutHint"))+" ",1),e("span",ga,l(m(s)("designer.autoSaved")),1)]),e("div",ya,[p.value==="pending"?(c(),f("span",ka,[T[1]||(T[1]=e("i",{class:"bi bi-pencil-square me-1"},null,-1)),_(l(m(s)("designer.editing")),1)])):p.value==="error"?(c(),f("span",xa,[T[2]||(T[2]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(m(s)("designer.saveFailed")),1)])):z("",!0)])]),e("div",wa,[e("div",$a,[e("h6",_a,[T[3]||(T[3]=e("i",{class:"bi bi-grid-1x2 me-1"},null,-1)),_(l(m(s)("designer.pickStructure")),1)]),_e(Lt,{"model-value":o.value.kind,"onUpdate:modelValue":x},null,8,["model-value"])]),e("div",Ca,[e("div",Sa,[e("h6",Aa,[T[4]||(T[4]=e("i",{class:"bi bi-eye me-1"},null,-1)),_(l(m(s)("designer.preview")),1)]),_e(va,{layout:o.value},null,8,["layout"]),e("h6",Pa,[T[5]||(T[5]=e("i",{class:"bi bi-sliders me-1"},null,-1)),_(l(m(s)("designer.details")),1)]),_e(Bs,{layout:o.value,"onUpdate:layout":T[0]||(T[0]=N=>o.value=N)},null,8,["layout"])])])])]))}},Ra=he(Ea,[["__scopeId","data-v-d21e1ea0"]]),Na={class:"modal-content"},La={class:"modal-header"},ja={class:"modal-title"},za={key:0,class:"text-muted fs-6"},Ma={key:0,class:"modal-body"},Wa={class:"text-muted small mb-3"},Da={class:"row g-3"},Ia=["onClick","onMouseenter"],Oa={class:"kind-icon"},Va={viewBox:"0 0 80 60",xmlns:"http://www.w3.org/2000/svg"},Ua=["x1","x2"],Ba=["y1","y2"],Ka={class:"kind-body"},Fa={class:"kind-label"},Ha={class:"kind-desc"},qa={key:1,class:"modal-body"},Ja={class:"mb-3"},Ga={class:"form-label"},Za=["placeholder"],Ya={class:"form-text"},Qa={class:"mb-3"},Xa={class:"form-label"},ei={class:"form-text"},ti={key:0,class:"form-text text-primary d-flex align-items-start gap-1 mt-1"},si=["innerHTML"],ai={key:1,class:"alert alert-warning py-2 px-2 small mt-2 mb-0"},ii=["innerHTML"],ri={class:"alert alert-info small mb-0 py-2"},ni={key:0,class:"text-danger small mt-2"},oi={class:"modal-footer"},li={__name:"ScreenCreateModal",emits:["close","created"],setup(i,{emit:s}){const{t:a}=be(),r=s,u=[{kind:"list",label:a("screenCreate.k1"),description:a("screenCreate.k2"),category:"data",icon:"list"},{kind:"detail",label:a("screenCreate.k3"),description:a("screenCreate.k4"),category:"data",icon:"detail"},{kind:"form-new",label:a("screenCreate.k5"),description:a("screenCreate.k6"),category:"form",icon:"form-new"},{kind:"form-edit",label:a("screenCreate.k7"),description:a("screenCreate.k8"),category:"form",icon:"form-edit"},{kind:"dashboard",label:a("screenCreate.k9"),description:a("screenCreate.k10"),category:"summary",icon:"dashboard"},{kind:"kanban",label:a("screenCreate.k11"),description:a("screenCreate.k12"),category:"summary",icon:"kanban"},{kind:"calendar",label:a("screenCreate.k13"),description:a("screenCreate.k14"),category:"summary",icon:"calendar"},{kind:"chart",label:a("screenCreate.k15"),description:a("screenCreate.k16"),category:"summary",icon:"chart"},{kind:"report",label:a("screenCreate.k17"),description:a("screenCreate.k18"),category:"summary",icon:"report"},{kind:"empty",label:a("screenCreate.k19"),description:a("screenCreate.k20"),category:"blank",icon:"empty"}],n=V(1),p=V("list"),y=K(()=>u.find(B=>B.kind===p.value)||u[0]),g=V(""),v=V(""),o=V(!1),d=V(null),x=V(null),$={학생:"student",사용자:"user",회원:"member",관리자:"admin",상품:"product",주문:"order",결제:"payment",배송:"shipping",게시판:"board",게시글:"post",댓글:"comment",공지:"notice",공지사항:"notice",문의:"inquiry",알림:"notification",고객:"customer",직원:"employee",부서:"department",팀:"team",회사:"company",교사:"teacher",강사:"instructor",과목:"subject",수업:"lesson",카테고리:"category",태그:"tag",파일:"file",이미지:"image",정산:"settlement",재고:"inventory",매출:"sales",통화:"currency",보고서:"report",리포트:"report",책:"book",도서:"book",간식:"snack",학교:"school",선생님:"teacher",친구:"friend",반:"class",숙제:"homework",점수:"score",시험:"exam",급식:"meal",동아리:"club",환자:"patient",진료:"care",진료과:"department",처방:"prescription",병동:"ward",의사:"doctor",간호사:"nurse",예약:"reservation",목록:"list",리스트:"list",상세:"detail",조회:"view",보기:"view",확인:"view",추가:"add",등록:"register",생성:"create",신규:"new",수정:"edit",편집:"edit",변경:"change",삭제:"delete",제거:"remove",검색:"search",필터:"filter",정렬:"sort",가져오기:"import",내보내기:"export",업로드:"upload",다운로드:"download",로그인:"login",로그아웃:"logout",가입:"signup",회원가입:"signup",인증:"auth",권한:"permission",대시보드:"dashboard",홈:"home",메뉴:"menu",네비:"nav",설정:"settings",환경설정:"settings",프로필:"profile",계정:"account",비밀번호:"password",통계:"stats",차트:"chart",그래프:"graph",분석:"analytics",리뷰:"review",평가:"rating",캘린더:"calendar",일정:"schedule",관리:"manage",페이지:"page",화면:"screen",탭:"tab",및:"and",또는:"or",모든:"all",전체:"all",나의:"my",내:"my"},P=["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"],T=["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","yi","i"],N=["","g","kk","gs","n","nj","nh","d","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];function k(B){const h=B.charCodeAt(0);if(h<44032||h>55203)return null;const b=h-44032,D=Math.floor(b/588),C=Math.floor(b%588/28),w=b%28;return P[D]+T[C]+N[w]}function L(B){const h=B.charCodeAt(0);return h>=44032&&h<=55203}function A(B){return B?$[B]?$[B]:[...B].some(L)?[...B].map(b=>L(b)?k(b):b).join("-"):B:""}function E(B){const h=String(B||"").trim();return h?h.split(/\s+/).map(A).join("-").toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,60):""}const te=new Set(["detail","form-edit"]),S=K(()=>te.has(p.value)),U=K(()=>/:[A-Za-z_]\w*/.test(v.value||""));function M(B,h){const b=E(B);return b?te.has(h)?`/${b}/:id`:`/${b}`:""}function R(){o.value||(v.value=M(g.value,p.value))}function I(){o.value=!0}function q(B){p.value=B,o.value||(v.value=M(g.value,B)),n.value=2,Ve(()=>{var h;return(h=x.value)==null?void 0:h.focus()})}function J(){n.value=1,d.value=null}function ne(){const B=g.value.trim();if(!B){d.value=B("designer.titleRequired");return}let h=v.value.trim()||"/untitled";h.startsWith("/")||(h="/"+h);const b=pt(p.value,{title:B,path:h});r("created",b),r("close")}qe(async()=>{var B;await Ve(),(B=x.value)==null||B.focus()});function ie(B){B.key==="Escape"&&r("close")}return(B,h)=>(c(),f("div",{class:"modal-backdrop-custom",onClick:h[4]||(h[4]=ze(b=>r("close"),["self"])),onKeydown:ie,tabindex:"-1"},[e("div",{class:"modal-dialog modal-dialog-centered",style:F({maxWidth:n.value===1?"900px":"560px"})},[e("div",Na,[e("div",La,[e("h5",ja,[h[5]||(h[5]=e("i",{class:"bi bi-plus-square me-2"},null,-1)),_(" "+l(m(a)("screenCreate.title"))+" ",1),n.value===2?(c(),f("span",za,"— "+l(y.value.label),1)):z("",!0)]),e("button",{type:"button",class:"btn-close",onClick:h[0]||(h[0]=b=>r("close"))})]),n.value===1?(c(),f("div",Ma,[e("p",Wa,l(m(a)("screenCreate.pickKind")),1),e("div",Da,[(c(),f(W,null,ee(u,b=>e("div",{key:b.kind,class:"col-md-4 col-sm-6"},[e("button",{class:H(["kind-card",{selected:p.value===b.kind}]),onClick:D=>q(b.kind),onMouseenter:D=>p.value=b.kind},[e("div",Oa,[(c(),f("svg",Va,[h[22]||(h[22]=e("rect",{width:"80",height:"60",fill:"#f8fafc",rx:"3"},null,-1)),b.icon==="list"?(c(),f(W,{key:0},[h[6]||(h[6]=ae('<rect x="6" y="8" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="20" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="32" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="44" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="12" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="24" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="36" width="20" height="2" fill="#94a3b8" data-v-d30fe811></rect>',7))],64)):b.icon==="detail"?(c(),f(W,{key:1},[h[7]||(h[7]=ae('<rect x="6" y="6" width="68" height="48" rx="3" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="12" y="14" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="14" width="36" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="22" width="12" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="22" width="30" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="30" width="14" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="30" width="26" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="38" width="18" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="38" width="32" height="3" fill="#0f172a" data-v-d30fe811></rect>',9))],64)):b.icon==="form-new"?(c(),f(W,{key:2},[h[8]||(h[8]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#198754" data-v-d30fe811></rect><rect x="52" y="49" width="12" height="3" fill="#fff" data-v-d30fe811></rect>',5))],64)):b.icon==="form-edit"?(c(),f(W,{key:3},[h[9]||(h[9]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="11" width="20" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="23" width="30" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="35" width="24" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#0d6efd" data-v-d30fe811></rect><rect x="53" y="49" width="10" height="3" fill="#fff" data-v-d30fe811></rect>',8))],64)):b.icon==="dashboard"?(c(),f(W,{key:4},[h[10]||(h[10]=ae('<rect x="4" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="23" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="42" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="61" y="6" width="15" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="8" y="14" width="8" height="6" fill="#0d6efd" data-v-d30fe811></rect><rect x="27" y="14" width="8" height="6" fill="#198754" data-v-d30fe811></rect><rect x="46" y="14" width="8" height="6" fill="#ffc107" data-v-d30fe811></rect><rect x="65" y="14" width="7" height="6" fill="#dc3545" data-v-d30fe811></rect><rect x="4" y="30" width="72" height="24" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><polyline points="10,50 20,42 30,46 40,36 50,40 60,32 70,38" stroke="#0d6efd" stroke-width="1.5" fill="none" data-v-d30fe811></polyline>',10))],64)):b.icon==="kanban"?(c(),f(W,{key:5},[h[11]||(h[11]=ae('<rect x="4" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="29" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="54" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="7" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="7" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="32" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="57" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect>',9))],64)):b.icon==="calendar"?(c(),f(W,{key:6},[h[12]||(h[12]=e("rect",{x:"4",y:"6",width:"72",height:"48",rx:"3",fill:"#fff",stroke:"#cbd5e1"},null,-1)),h[13]||(h[13]=e("rect",{x:"4",y:"6",width:"72",height:"10",fill:"#f1f5f9"},null,-1)),(c(),f(W,null,ee(6,D=>e("line",{key:"vl"+D,x1:4+D*12,y1:"6",x2:4+D*12,y2:"54",stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Ua)),64)),(c(),f(W,null,ee(3,D=>e("line",{key:"hl"+D,x1:"4",y1:16+D*10,x2:"76",y2:16+D*10,stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Ba)),64)),h[14]||(h[14]=e("circle",{cx:"28",cy:"30",r:"2",fill:"#0d6efd"},null,-1)),h[15]||(h[15]=e("circle",{cx:"52",cy:"40",r:"2",fill:"#198754"},null,-1)),h[16]||(h[16]=e("circle",{cx:"16",cy:"50",r:"2",fill:"#ffc107"},null,-1))],64)):b.icon==="chart"?(c(),f(W,{key:7},[h[17]||(h[17]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><line x1="10" y1="46" x2="70" y2="46" stroke="#94a3b8" data-v-d30fe811></line><line x1="10" y1="12" x2="10" y2="46" stroke="#94a3b8" data-v-d30fe811></line><rect x="14" y="30" width="8" height="16" fill="#0d6efd" data-v-d30fe811></rect><rect x="26" y="20" width="8" height="26" fill="#198754" data-v-d30fe811></rect><rect x="38" y="26" width="8" height="20" fill="#ffc107" data-v-d30fe811></rect><rect x="50" y="14" width="8" height="32" fill="#dc3545" data-v-d30fe811></rect><rect x="62" y="22" width="8" height="24" fill="#6610f2" data-v-d30fe811></rect>',8))],64)):b.icon==="report"?(c(),f(W,{key:8},[h[18]||(h[18]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="10" width="40" height="4" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="17" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><line x1="10" y1="23" x2="70" y2="23" stroke="#e2e8f0" data-v-d30fe811></line><rect x="10" y="26" width="60" height="4" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="37" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="42" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="47" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect>',9))],64)):b.icon==="empty"?(c(),f(W,{key:9},[h[19]||(h[19]=e("rect",{x:"8",y:"10",width:"64",height:"40",rx:"3",fill:"none",stroke:"#cbd5e1","stroke-width":"1.5","stroke-dasharray":"3 2"},null,-1)),h[20]||(h[20]=e("circle",{cx:"40",cy:"30",r:"4",fill:"#cbd5e1"},null,-1)),h[21]||(h[21]=e("rect",{x:"36",y:"28",width:"8",height:"4",fill:"#cbd5e1"},null,-1))],64)):z("",!0)]))]),e("div",Ka,[e("div",Fa,l(b.label),1),e("div",Ha,l(b.description),1)])],42,Ia)])),64))])])):(c(),f("div",qa,[e("div",Ja,[e("label",Ga,[_(l(m(a)("screenCreate.screenTitle"))+" ",1),h[23]||(h[23]=e("span",{class:"text-danger"},"*",-1))]),Y(e("input",{ref_key:"nameInput",ref:x,"onUpdate:modelValue":h[1]||(h[1]=b=>g.value=b),onInput:R,type:"text",class:"form-control",placeholder:m(a)("screenCreate.titlePlaceholder"),maxlength:"100",onKeyup:Ee(ne,["enter"])},null,40,Za),[[X,g.value]]),e("div",Ya,l(m(a)("screenCreate.titleHint")),1)]),e("div",Qa,[e("label",Xa,l(m(a)("screenCreate.pathLabel")),1),Y(e("input",{"onUpdate:modelValue":h[2]||(h[2]=b=>v.value=b),onInput:I,type:"text",class:"form-control",placeholder:"/dashboard",maxlength:"100"},null,544),[[X,v.value]]),e("div",ei,l(m(a)("screenCreate.pathHint")),1),S.value?(c(),f("div",ti,[h[24]||(h[24]=e("i",{class:"bi bi-info-circle mt-1"},null,-1)),e("span",{innerHTML:m(a)("screenCreate.idParamHint")},null,8,si)])):z("",!0),S.value&&!U.value?(c(),f("div",ai,[h[25]||(h[25]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("span",{innerHTML:m(a)("screenCreate.noIdWarn")},null,8,ii)])):z("",!0)]),e("div",ri,[h[26]||(h[26]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),_(" "+l(m(a)("screenCreate.createdAs",{label:y.value.label}))+" "+l(m(a)("designer.wizardHint")),1)]),d.value?(c(),f("div",ni,[h[27]||(h[27]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(d.value),1)])):z("",!0)])),e("div",oi,[n.value===2?(c(),f("button",{key:0,class:"btn btn-link me-auto",onClick:J},[h[28]||(h[28]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),_(l(m(a)("screenCreate.pickAgain")),1)])):z("",!0),e("button",{class:"btn btn-secondary",onClick:h[3]||(h[3]=b=>r("close"))},l(m(a)("common.cancel")),1),n.value===2?(c(),f("button",{key:1,class:"btn btn-primary",onClick:ne},[h[29]||(h[29]=e("i",{class:"bi bi-check2 me-1"},null,-1)),_(l(m(a)("screenCreate.create")),1)])):z("",!0)])])],4)],32))}},di=he(li,[["__scopeId","data-v-d30fe811"]]),ci={class:"wizard-modal"},ui={class:"wizard-header"},pi={class:"mb-0"},fi={class:"wizard-steps"},mi={class:"step-num"},vi={class:"step-label"},bi={class:"wizard-body"},hi={key:0,class:"step-pane"},gi={class:"step-title"},yi={class:"input-group input-group-sm mb-2"},ki=["placeholder"],xi={key:0,class:"alert alert-danger small"},wi={key:1,class:"text-center py-4 text-secondary small"},$i={key:2,class:"ctrl-list"},_i={key:0,class:"empty-state"},Ci={class:"fw-semibold mb-1"},Si={class:"text-secondary small mb-3"},Ai={class:"text-secondary small mt-3"},Pi=["checked","onChange"],Ti={class:"flex-grow-1"},Ei={class:"fw-semibold"},Ri={class:"text-secondary small"},Ni={key:0,class:"text-secondary small text-center py-3"},Li={key:1,class:"step-pane"},ji={class:"step-title"},zi={class:"small text-secondary mb-2"},Mi={key:0,class:"text-secondary small text-center py-3"},Wi=["checked","onChange"],Di={class:"route-path"},Ii={class:"text-secondary small ms-auto"},Oi={key:1,class:"alert alert-warning small mt-3"},Vi={key:2,class:"step-pane"},Ui={class:"step-title"},Bi={class:"route-summary mb-3"},Ki={class:"ms-2"},Fi={key:0,class:"text-center py-3 text-secondary small"},Hi={key:1},qi={key:0,class:"text-secondary small mb-3"},Ji={class:"form-label small mb-1"},Gi={key:0,class:"text-danger"},Zi={class:"text-secondary ms-1"},Yi=["onUpdate:modelValue","placeholder"],Qi=["onUpdate:modelValue","placeholder"],Xi={key:2,class:"form-text"},er={key:1,class:"deps-summary"},tr={class:"section-label mt-3"},sr={class:"small text-secondary"},ar={key:0,class:"ms-2"},ir={key:3,class:"step-pane"},rr={class:"step-title"},nr={class:"route-summary mb-3"},or={class:"ms-2"},lr={key:0,class:"text-center py-4"},dr=["disabled"],cr={key:0,class:"spinner-border spinner-border-sm me-1"},ur={key:1,class:"bi bi-play-fill me-1"},pr={class:"small text-secondary mt-2"},fr={key:1},mr={key:0,class:"alert alert-danger small"},vr={class:"fw-semibold"},br={class:"mt-1"},hr={key:1},gr={class:"alert alert-success small py-2"},yr={key:0},kr={key:0,class:"mb-3"},xr={class:"section-label"},wr={class:"output-fields"},$r={class:"text-secondary"},_r={key:0,class:"text-secondary ms-1"},Cr={class:"mb-3"},Sr={class:"small text-secondary",style:{cursor:"pointer"}},Ar={class:"sample-json"},Pr={class:"wizard-footer"},Tr=["disabled"],Er=["disabled"],Rr={key:0,class:"spinner-border spinner-border-sm me-1"},Nr={__name:"ScreenWizardModal",props:{show:{type:Boolean,default:!1}},emits:["close","create"],setup(i,{emit:s}){const{t:a}=be(),r=i,u=s,n=V(1),p=V([]),y=V(!1),g=V(null),v=V(""),o=V(null),d=V(null),x=V(!1),$=V(null),P=V({});function T(){const h=new Date,b=(w,O=2)=>String(w).padStart(O,"0"),D=`${h.getFullYear()}${b(h.getMonth()+1)}${b(h.getDate())}-${b(h.getHours())}${b(h.getMinutes())}${b(h.getSeconds())}`,C=Math.floor(Math.random()*65536).toString(16).padStart(4,"0");return`req-${D}-${C}`}const N=V(!1),k=V(null),L=V(!1),A=K(()=>{const h=v.value.trim().toLowerCase();return h?p.value.filter(b=>[b.name,b.base_path,b.basePath,b.description].filter(Boolean).join(" ").toLowerCase().includes(h)):p.value}),E=K(()=>d.value?["POST","PUT","PATCH","DELETE"].includes((d.value.method||"GET").toUpperCase()):!1),te=K(()=>n.value===1?!!o.value:n.value===2?!!d.value:n.value===3?!!$.value:n.value===4?!!k.value&&k.value.ok:!1);function S(h){const b=(h||"GET").toUpperCase();return{GET:"bg-success",POST:"bg-warning text-dark",PUT:"bg-info text-dark",PATCH:"bg-info text-dark",DELETE:"bg-danger"}[b]||"bg-secondary"}function U(h){const b=h.type||"string",D=h.source||"";return D==="path"?a("designer.valueIn").replace("{type}",b):D==="query"?a("designer.valueQuery").replace("{type}",b):a("designer.valuePlain").replace("{type}",b)}function M(){n.value=1,o.value=null,d.value=null,$.value=null,P.value={},k.value=null,L.value=!1}function R(){M(),u("close")}async function I(){var h,b,D;y.value=!0,g.value=null;try{const C=await Ce.get("/api/admin/controllers/paged",{params:{page:1,perPage:200}});p.value=((h=C.data)==null?void 0:h.data)||[]}catch(C){g.value=((D=(b=C.response)==null?void 0:b.data)==null?void 0:D.message)||C.message}finally{y.value=!1}}async function q(h){var b,D,C;o.value=h,d.value=null;try{const O=((b=(await Ce.get(`/api/admin/controllers/${encodeURIComponent(h.id)}`)).data)==null?void 0:b.data)||{};Array.isArray(O.routes)&&(O.routes=O.routes.map(G=>({...G,handler:G.handler||G.handlerName||null}))),o.value={...h,...O}}catch(w){g.value=`${a("designer.ctrlDetailFailed")}: ${((C=(D=w.response)==null?void 0:D.data)==null?void 0:C.message)||w.message}`}}function J(h){d.value=h}async function ne(){var h,b;if(!(!o.value||!d.value)){x.value=!0,$.value=null;try{const D=await Ce.get("/api/admin/screen-wizard/analyze",{params:{controllerId:o.value.name||o.value.id,handler:d.value.handler}});$.value=((h=D.data)==null?void 0:h.data)||null;const C={};for(const w of((b=$.value)==null?void 0:b.inputs)||[])w.default!=null&&(C[w.name]=w.default);C.requestCode=T(),$.value&&!$.value.inputs.some(w=>w.name==="requestCode")&&$.value.inputs.unshift({name:"requestCode",type:"string",source:"auto",required:!1,default:C.requestCode,desc:a("screenWizard.k10")}),P.value=C}catch(D){ge(a("designer.analyzeFailed"),D)}finally{x.value=!1}}}async function ie(){var h,b,D,C;if(!(E.value&&!await Te({title:a("designer.runRouteTitle").replace("{m}",d.value.method),message:a("designer.runRouteMsg").replace(/\{m\}/g,d.value.method),detail:a("designer.runRouteDetail"),confirmText:a("screenWizard.k11"),variant:"danger",icon:"bi-exclamation-triangle"}))){N.value=!0,k.value=null;try{const w={};for(const G of((h=$.value)==null?void 0:h.inputs)||[]){let se=P.value[G.name];se===""||se==null||(G.type==="number"&&(se=Number(se)),G.type==="boolean"&&(se=se===!0||se==="true"),w[G.name]=se)}const O=await Ce.post("/api/admin/screen-wizard/probe",{controllerId:o.value.name||o.value.id,handler:d.value.handler,params:w});k.value=((b=O.data)==null?void 0:b.data)||null}catch(w){k.value={ok:!1,error:((C=(D=w.response)==null?void 0:D.data)==null?void 0:C.message)||w.message,outputFields:[]}}finally{N.value=!1}}}function B(){const h=$.value,b=k.value;if(!h||!b||!b.ok)return;const D=(h.method||"GET").toUpperCase(),C=D==="POST"||D==="PUT"||D==="PATCH"||D==="DELETE";let w=h.suggestedWidget||"text";b.shape==="pagedRows"||b.shape==="rowsArray"?w="list":b.shape==="object"&&(w="detail");const O=h.handler.replace(/([A-Z])/g," $1").replace(/^./,Q=>Q.toUpperCase()).trim(),G=`${h.controllerName.replace(/Controller$/i,"")} ${O}`.trim(),se=`/${h.handler.toLowerCase()}`.replace(/[^a-z0-9\-/]/g,"-"),re=b.listPath||null,le=(h.inputs||[]).filter(Q=>Q.name!=="requestCode"),fe=le.filter(Q=>Q.source==="path"),j=le.filter(Q=>Q.source!=="path"),oe=o.value.name||o.value.id,ce=ft({title:G,path:se}),we=(h.fullPath||"").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,"{$1}");if(C){const Q=Se({kind:"formDialog"});Q.title=G,Q.source={type:"endpoint",method:D,path:we,controllerId:oe,handlerName:h.handler};const $e=D==="DELETE"?"danger":D==="POST"?"success":"primary",ue=a(D==="POST"?"designer.actCreate":D==="DELETE"?"designer.actDelete":"designer.actUpdate");Q.config={buttonLabel:ue,buttonVariant:$e,dialogTitle:`${G} — ${ue}`,fields:le.map(xe=>({name:xe.name,label:xe.name,type:xe.type||"string",required:!!xe.required,default:xe.default!=null?xe.default:"",placeholder:U(xe)})),confirmBeforeSubmit:D==="DELETE",refreshTargetWidgetId:null},ce.rows=[Ae({widths:[12],widgets:[Q]})]}else if(fe.length>0||j.length>0&&w==="detail"){const Q=Se({kind:w});Q.title=G+" 결과",Q.source={type:"endpoint",method:D,path:we,resultKey:re,controllerId:oe,handlerName:h.handler},w==="list"?Q.config={maxRows:20}:w==="stat"&&(Q.config={format:"number",color:"primary"});const $e=Se({kind:"queryForm"});$e.title=G+" 조회",$e.source={type:"endpoint",method:D,path:we,resultKey:re,controllerId:oe,handlerName:h.handler},$e.config={endpointHint:`${D} ${we}`,fields:le.map(ue=>({name:ue.name,label:ue.name,type:ue.type||"string",required:!!ue.required,default:ue.default!=null?ue.default:"",placeholder:U(ue)})),submitLabel:"조회",targetWidgetId:Q.id},ce.rows=[Ae({widths:[12],widgets:[$e]}),Ae({widths:[12],widgets:[Q]})]}else{const Q=Se({kind:w});Q.title=G,Q.source={type:"endpoint",method:D,path:h.fullPath,resultKey:re,controllerId:oe,handlerName:h.handler},w==="list"?Q.config={maxRows:20}:w==="stat"&&(Q.config={format:"number",color:"primary"}),ce.rows=[Ae({widths:[12],widgets:[Q]})]}u("create",ce),R()}return ve(()=>r.show,h=>{h&&(M(),p.value.length||I())}),(h,b)=>{var C,w,O,G,se,re,le,fe;const D=it("router-link");return i.show?(c(),f("div",{key:0,class:"wizard-backdrop",onClick:ze(R,["self"])},[e("div",ci,[e("div",ui,[e("h5",pi,[b[6]||(b[6]=e("i",{class:"bi bi-magic me-2"},null,-1)),_(l(m(a)("wizard.title")),1)]),e("button",{class:"btn btn-sm btn-link text-secondary",onClick:R},[...b[7]||(b[7]=[e("i",{class:"bi bi-x-lg"},null,-1)])])]),e("div",fi,[(c(),f(W,null,ee(4,j=>e("div",{key:j,class:H(["step-item",{active:n.value===j,done:n.value>j}])},[e("span",mi,l(j),1),e("span",vi,l([m(a)("screenWizard.k2"),m(a)("screenWizard.k5"),m(a)("screenWizard.k6"),m(a)("screenWizard.k7")][j-1]),1)],2)),64))]),e("div",bi,[n.value===1?(c(),f("div",hi,[e("div",gi,l(m(a)("wizard.step1")),1),e("div",yi,[b[8]||(b[8]=e("span",{class:"input-group-text"},[e("i",{class:"bi bi-search"})],-1)),Y(e("input",{"onUpdate:modelValue":b[0]||(b[0]=j=>v.value=j),class:"form-control",placeholder:m(a)("wiz2.searchByNameOrPath")},null,8,ki),[[X,v.value]])]),g.value?(c(),f("div",xi,l(g.value),1)):z("",!0),y.value?(c(),f("div",wi,[b[9]||(b[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(l(m(a)("wizard.loading")),1)])):(c(),f("div",$i,[p.value.length?(c(),f(W,{key:1},[(c(!0),f(W,null,ee(A.value,j=>{var oe,ce;return c(),f("label",{key:j.id,class:H(["ctrl-item",{selected:((oe=o.value)==null?void 0:oe.id)===j.id}])},[e("input",{type:"radio",checked:((ce=o.value)==null?void 0:ce.id)===j.id,onChange:we=>q(j)},null,40,Pi),e("div",Ti,[e("div",Ei,l(j.name),1),e("div",Ri,[e("code",null,l(j.base_path||j.basePath||"-"),1)])])],2)}),128)),A.value.length?z("",!0):(c(),f("div",Ni,[b[13]||(b[13]=e("i",{class:"bi bi-search me-1"},null,-1)),_('"'+l(v.value)+'" 로 검색한 결과가 없습니다 ',1)]))],64)):(c(),f("div",_i,[b[12]||(b[12]=e("div",{class:"empty-icon"},[e("i",{class:"bi bi-collection"})],-1)),e("div",Ci,l(m(a)("wizard.noControllers")),1),e("div",Si,[_(l(m(a)("wizard.intro")),1),b[10]||(b[10]=e("br",null,null,-1)),_(" "+l(m(a)("screenWizard.k1"))+" ",1),e("strong",null,l(m(a)("screenWizard.k2")),1),_(" "+l(m(a)("screenWizard.k3")),1)]),_e(D,{to:{name:"controllers"},class:"btn btn-sm btn-primary",onClick:b[1]||(b[1]=j=>u("close"))},{default:rt(()=>[b[11]||(b[11]=e("i",{class:"bi bi-arrow-right me-1"},null,-1)),_(l(m(a)("wizard.goControllers")),1)]),_:1}),e("div",Ai,l(m(a)("screenWizard.k4")),1)]))]))])):n.value===2?(c(),f("div",Li,[e("div",ji,l(m(a)("wizard.step2")),1),e("div",zi,[e("strong",null,l((C=o.value)==null?void 0:C.name),1),_(" "+l(m(a)("wiz2.routesOf")),1)]),(O=(w=o.value)==null?void 0:w.routes)!=null&&O.length?z("",!0):(c(),f("div",Mi,l(m(a)("wizard.noRoutesFor")),1)),(c(!0),f(W,null,ee(((G=o.value)==null?void 0:G.routes)||[],j=>{var oe,ce;return c(),f("label",{key:j.handler,class:H(["route-item",{selected:((oe=d.value)==null?void 0:oe.handler)===j.handler}])},[e("input",{type:"radio",checked:((ce=d.value)==null?void 0:ce.handler)===j.handler,onChange:we=>J(j)},null,40,Wi),e("span",{class:H(["badge route-method-badge",S(j.method)])},l((j.method||"GET").toUpperCase()),3),e("code",Di,l(j.path||"/"),1),e("span",Ii,l(j.handler),1)],2)}),128)),d.value&&E.value?(c(),f("div",Oi,[b[14]||(b[14]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("strong",null,l(d.value.method),1),_(" 라우트를 선택했습니다. 이 타입은 서버 데이터를 변경할 수 있으며, "+l(m(a)("wiz2.next"))+" 단계에서 실제 호출 시 경고 대화상자가 표시됩니다. ",1)])):z("",!0)])):n.value===3?(c(),f("div",Vi,[e("div",Ui,l(m(a)("wizard.step3")),1),e("div",Bi,[e("span",{class:H(["badge",S(d.value.method)])},l(d.value.method),3),e("code",Ki,l(((se=$.value)==null?void 0:se.fullPath)||(((re=o.value)==null?void 0:re.base_path)||((le=o.value)==null?void 0:le.basePath)||"")+d.value.path),1)]),x.value?(c(),f("div",Fi,[b[15]||(b[15]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(l(m(a)("wiz2.analyzing")),1)])):$.value?(c(),f("div",Hi,[$.value.inputs.length?z("",!0):(c(),f("div",qi,l(m(a)("wizard.noInputParams")),1)),(c(!0),f(W,null,ee($.value.inputs,j=>(c(),f("div",{key:j.name,class:"input-field mb-2"},[e("label",Ji,[e("strong",null,l(j.name),1),j.required?(c(),f("span",Gi,"*")):z("",!0),e("span",Zi,"("+l(j.type)+", "+l(j.source)+")",1)]),j.type==="number"?Y((c(),f("input",{key:0,type:"number",class:"form-control form-control-sm","onUpdate:modelValue":oe=>P.value[j.name]=oe,placeholder:String(j.default??"")},null,8,Yi)),[[X,P.value[j.name]]]):Y((c(),f("input",{key:1,type:"text",class:"form-control form-control-sm","onUpdate:modelValue":oe=>P.value[j.name]=oe,placeholder:j.desc||String(j.default??"")},null,8,Qi)),[[X,P.value[j.name]]]),j.desc?(c(),f("div",Xi,l(j.desc),1)):z("",!0)]))),128)),$.value.dependencies?(c(),f("div",er,[e("div",tr,l(m(a)("wiz2.reference")),1),e("div",sr,[b[16]||(b[16]=_(" Services: ",-1)),e("strong",null,l($.value.dependencies.services.length),1),b[17]||(b[17]=_(" · SQL files: ",-1)),e("strong",null,l($.value.dependencies.sqls.length),1),$.value.dependencies.services.length?(c(),f("span",ar," ("+l($.value.dependencies.services.map(j=>j.name).join(", "))+") ",1)):z("",!0)])])):z("",!0)])):z("",!0)])):n.value===4?(c(),f("div",ir,[e("div",rr,l(m(a)("wizard.step4")),1),e("div",nr,[e("span",{class:H(["badge",S(d.value.method)])},l(d.value.method),3),e("code",or,l((fe=$.value)==null?void 0:fe.fullPath),1)]),k.value?(c(),f("div",fr,[k.value.ok?(c(),f("div",hr,[e("div",gr,[b[21]||(b[21]=e("i",{class:"bi bi-check-circle me-1"},null,-1)),_(" "+l(m(a)("wiz2.responseOk"))+" ",1),e("code",null,l(k.value.shape),1),k.value.listPath?(c(),f("span",yr,[b[20]||(b[20]=_(", listPath: ",-1)),e("code",null,l(k.value.listPath),1)])):z("",!0)]),k.value.outputFields.length?(c(),f("div",kr,[e("div",xr,"추출된 Output 필드 ("+l(k.value.outputFields.length)+"개)",1),e("div",wr,[(c(!0),f(W,null,ee(k.value.outputFields,j=>(c(),f("div",{key:j.name,class:"field-tag"},[e("strong",null,l(j.name),1),e("span",$r,": "+l(j.type),1),j.sample!=null?(c(),f("span",_r," ≈ "+l(typeof j.sample=="string"&&j.sample.length>24?j.sample.slice(0,24)+"...":j.sample),1)):z("",!0)]))),128))])])):z("",!0),e("details",Cr,[e("summary",Sr,l(m(a)("wiz2.viewRawJson")),1),e("pre",Ar,[e("code",null,l(JSON.stringify(k.value.sample,null,2).slice(0,2e3)),1)])]),e("button",{class:"btn btn-success w-100",onClick:B},[b[22]||(b[22]=e("i",{class:"bi bi-magic me-1"},null,-1)),_(" "+l(m(a)("wiz2.buildFromThis"))+" (widget: ",1),e("strong",null,l($.value.suggestedWidget),1),b[23]||(b[23]=_(") ",-1))])])):(c(),f("div",mr,[e("div",vr,[b[18]||(b[18]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(m(a)("wiz2.runFailed")),1)]),e("div",br,l(k.value.error),1),e("button",{class:"btn btn-sm btn-outline-secondary mt-2",onClick:b[2]||(b[2]=j=>k.value=null)},[b[19]||(b[19]=e("i",{class:"bi bi-arrow-counterclockwise me-1"},null,-1)),_(l(m(a)("wiz2.retry")),1)])]))])):(c(),f("div",lr,[e("button",{class:H(["btn btn-primary",{"btn-warning text-dark":E.value}]),disabled:N.value,onClick:ie},[N.value?(c(),f("span",cr)):(c(),f("i",ur)),_(" "+l(E.value?"⚠️ "+d.value.method+m(a)("screenWizard.k8"):m(a)("screenWizard.k9")),1)],10,dr),e("div",pr,l(m(a)("wizard.step4Hint")),1)]))])):z("",!0)]),e("div",Pr,[n.value>1?(c(),f("button",{key:0,class:"btn btn-outline-secondary btn-sm",onClick:b[3]||(b[3]=j=>n.value=n.value-1)},[b[24]||(b[24]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),_(l(m(a)("wiz2.prev")),1)])):z("",!0),b[28]||(b[28]=e("span",{class:"ms-auto"},null,-1)),n.value<4&&n.value!==3?(c(),f("button",{key:1,class:"btn btn-primary btn-sm",disabled:!te.value,onClick:b[4]||(b[4]=j=>n.value=n.value+1)},[_(l(m(a)("wiz2.next"))+" ",1),b[25]||(b[25]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))],8,Tr)):z("",!0),n.value===3&&!$.value?(c(),f("button",{key:2,class:"btn btn-primary btn-sm",disabled:!d.value||x.value,onClick:ne},[x.value?(c(),f("span",Rr)):z("",!0),_(" "+l(m(a)("wiz2.analyze"))+" ",1),b[26]||(b[26]=e("i",{class:"bi bi-search ms-1"},null,-1))],8,Er)):n.value===3&&$.value?(c(),f("button",{key:3,class:"btn btn-primary btn-sm",onClick:b[5]||(b[5]=j=>n.value=4)},[_(l(m(a)("wiz2.next"))+" ",1),b[27]||(b[27]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))])):z("",!0)])])])):z("",!0)}}},Lr=he(Nr,[["__scopeId","data-v-5679dbca"]]),jr={class:"d-flex justify-content-between align-items-center mb-3"},zr={class:"mb-1"},Mr={class:"badge bg-secondary ms-2"},Wr={class:"text-secondary small mb-0"},Dr=["disabled"],Ir=["disabled"],Or={key:0,class:"card"},Vr={class:"card-body text-center py-5 text-secondary"},Ur={class:"mb-2"},Br={class:"small"},Kr={key:1,class:"card"},Fr={class:"table-responsive"},Hr={class:"table table-hover mb-0"},qr={class:"table-light"},Jr={style:{width:"110px"}},Gr={style:{width:"240px"}},Zr={class:"text-secondary small"},Yr={key:0,class:"d-flex gap-1"},Qr=["onKeyup"],Xr=["onClick","title"],en=["title"],tn=["onClick"],sn={class:"small"},an={class:"small text-secondary"},rn={class:"small text-secondary"},nn=["onClick","title"],on={class:"btn-group me-1"},ln=["onClick","disabled","title"],dn=["onClick","disabled","title"],cn=["onClick","title"],un=["onClick","disabled","title"],pn={key:0,class:"spinner-border spinner-border-sm"},fn={key:1,class:"bi bi-trash"},mn={__name:"ScreensTab",setup(i){const{t:s}=be();Je();const a=Ge(),r=Me(),{activeId:u,activeProject:n,saving:p}=Le(r),y=V(!1),g=V(!1),v=V(null),o=V(null),d=V(""),x=K(()=>{var M;return((M=n.value)==null?void 0:M.screens)||[]});async function $(M){if(!n.value)return;const R=[...x.value,M];try{await r.savePatch(u.value,{screens:R})}catch(I){ge("화면 생성 실패",I)}}async function P(M){if(!n.value)return;const R=[...x.value,M];try{await r.savePatch(u.value,{screens:R}),a.push({name:"screen-studio",params:{id:u.value,screenId:M.id}})}catch(I){ge("화면 생성 실패",I)}}async function T(M){if(!await ut(M.title,{title:s("screensTab.k21")}))return;v.value=M.id;const R=x.value.filter(I=>I.id!==M.id);try{await r.savePatch(u.value,{screens:R})}catch(I){ge("삭제 실패",I)}finally{v.value=null}}function N(M){o.value=M.id,d.value=M.title}function k(){o.value=null,d.value=""}async function L(M){const R=d.value.trim();if(!R){k();return}if(R===M.title){k();return}const I=x.value.map(q=>q.id===M.id?{...q,title:R,header:{...q.header||{},title:R}}:q);try{await r.savePatch(u.value,{screens:I})}catch(q){ge("이름 변경 실패",q)}finally{k()}}async function A(M,R){const I=x.value.findIndex(ie=>ie.id===M.id),q=I+R;if(I<0||q<0||q>=x.value.length)return;const J=[...x.value],[ne]=J.splice(I,1);J.splice(q,0,ne);try{await r.savePatch(u.value,{screens:J})}catch(ie){ge("이동 실패",ie)}}function E(M){a.push({name:"screen-studio",params:{id:u.value,screenId:M.id}})}function te(M){return M.kind!=="composite"||!Array.isArray(M.rows)?0:M.rows.reduce((R,I)=>{var q;return R+(((q=I.widgets)==null?void 0:q.length)||0)},0)}function S(M){return Array.isArray(M==null?void 0:M.rows)?M.rows.length:0}function U(M){var I;const R=((I=M.header)==null?void 0:I.kind)||"page-title";return mt(R).label}return(M,R)=>(c(),f("div",null,[e("div",jr,[e("div",null,[e("h6",zr,[R[5]||(R[5]=e("i",{class:"bi bi-collection me-1"},null,-1)),_(l(m(s)("screensTab.k1"))+" ",1),e("span",Mr,l(x.value.length),1)]),e("p",Wr,l(m(s)("screensTab.k2")),1)]),e("button",{class:"btn btn-outline-primary btn-sm me-2",onClick:R[0]||(R[0]=I=>g.value=!0),disabled:m(p)},[R[6]||(R[6]=e("i",{class:"bi bi-magic me-1"},null,-1)),_(l(m(s)("screensTab.k3")),1)],8,Dr),e("button",{class:"btn btn-primary btn-sm",onClick:R[1]||(R[1]=I=>y.value=!0),disabled:m(p)},[R[7]||(R[7]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),_(l(m(s)("screensTab.k4")),1)],8,Ir)]),x.value.length===0?(c(),f("div",Or,[e("div",Vr,[R[8]||(R[8]=e("i",{class:"bi bi-collection fs-1 d-block mb-3 opacity-50"},null,-1)),e("div",Ur,l(m(s)("screensTab.k5")),1),e("div",Br,[_(l(m(s)("screensTab.k6"))+" ",1),e("em",null,l(m(s)("screensTab.k7")),1),_(" "+l(m(s)("screensTab.k8")),1)])])])):(c(),f("div",Kr,[e("div",Fr,[e("table",Hr,[e("thead",qr,[e("tr",null,[R[9]||(R[9]=e("th",{style:{width:"40px"}},"#",-1)),e("th",null,l(m(s)("screensTab.k9")),1),e("th",null,l(m(s)("screensTab.k10")),1),e("th",Jr,l(m(s)("screensTab.k11")),1),R[10]||(R[10]=e("th",{style:{width:"90px"}},"Row / Widget",-1)),e("th",Gr,l(m(s)("screensTab.k12")),1)])]),e("tbody",null,[(c(!0),f(W,null,ee(x.value,(I,q)=>(c(),f("tr",{key:I.id},[e("td",Zr,l(q+1),1),e("td",null,[o.value===I.id?(c(),f("div",Yr,[Y(e("input",{"onUpdate:modelValue":R[2]||(R[2]=J=>d.value=J),class:"form-control form-control-sm",onKeyup:[Ee(J=>L(I),["enter"]),Ee(k,["escape"])],ref_for:!0,ref:"renameInputEl"},null,40,Qr),[[X,d.value]]),e("button",{class:"btn btn-sm btn-success",onClick:J=>L(I),title:m(s)("screensTab.k14")},[...R[11]||(R[11]=[e("i",{class:"bi bi-check-lg"},null,-1)])],8,Xr),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:k,title:m(s)("screensTab.k15")},[...R[12]||(R[12]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,en)])):(c(),f("a",{key:1,href:"#",class:"text-decoration-none",onClick:ze(J=>E(I),["prevent"])},[e("strong",null,l(I.title),1)],8,tn))]),e("td",sn,[e("code",null,l(I.path),1)]),e("td",an,l(U(I)),1),e("td",rn,l(S(I))+" / "+l(te(I)),1),e("td",null,[e("button",{class:"btn btn-sm btn-outline-primary me-1",onClick:J=>E(I),title:m(s)("screensTab.k16")},[R[13]||(R[13]=e("i",{class:"bi bi-pencil-square"},null,-1)),_(" "+l(m(s)("screensTab.k13")),1)],8,nn),e("div",on,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:J=>A(I,-1),disabled:q===0,title:m(s)("screensTab.k17")},[...R[14]||(R[14]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,ln),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:J=>A(I,1),disabled:q===x.value.length-1,title:m(s)("screensTab.k18")},[...R[15]||(R[15]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,dn)]),e("button",{class:"btn btn-sm btn-outline-secondary me-1",onClick:J=>N(I),title:m(s)("screensTab.k19")},[...R[16]||(R[16]=[e("i",{class:"bi bi-pencil"},null,-1)])],8,cn),e("button",{class:"btn btn-sm btn-outline-danger",onClick:J=>T(I),disabled:v.value===I.id,title:m(s)("screensTab.k20")},[v.value===I.id?(c(),f("span",pn)):(c(),f("i",fn))],8,un)])]))),128))])])])])),y.value?(c(),ke(di,{key:2,onClose:R[3]||(R[3]=I=>y.value=!1),onCreated:$})):z("",!0),_e(Lr,{show:g.value,onClose:R[4]||(R[4]=I=>g.value=!1),onCreate:P},null,8,["show"])]))}};function de(i){return String(i||"").replace(/(?:^|[-_\s])(.)/g,(s,a)=>a.toUpperCase())}function Ze(i){const s=de(i);return s.charAt(0).toLowerCase()+s.slice(1)}function Re(i){return String(i||"").replace(/[^a-zA-Z0-9_\-.]/g,"")||"screen"}function vn(i,s="  "){return String(i||"").split(`
`).map(a=>a.length?s+a:a).join(`
`)}function Z(i){return String(i??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ye(i){if(!i)return"item";const s=String(i).split("/").filter(Boolean);for(let a=s.length-1;a>=0;a--){const r=s[a];if(!r||r.startsWith(":")||r.startsWith("{")||/^(api|admin|v\d+|auth|internal)$/i.test(r)||/^(paged|search|count|summary|export|import|batch|bulk|new|edit)$/i.test(r)||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(r))continue;let u=r.toLowerCase();return u.endsWith("ies")?u=u.slice(0,-3)+"y":u.endsWith("s")&&!u.endsWith("ss")&&(u=u.slice(0,-1)),u||"item"}return"item"}function bn({imports:i=[],setup:s="",template:a="",style:r=""}={}){const n=[i.filter(Boolean).join(`
`),"",s].filter(Boolean).join(`
`),p=[];return p.push("<script setup>"),p.push(n),p.push("<\/script>"),p.push(""),p.push("<template>"),p.push(vn(a,"  ")),p.push("</template>"),r&&r.trim()&&(p.push(""),p.push("<style scoped>"),p.push(r.trim()),p.push("</style>")),p.push(""),p.join(`
`)}const hn={loading:"불러오는 중…",noData:"데이터가 없습니다.",noSelection:"선택된 항목이 없습니다.",yes:"예",no:"아니오",done:"완료되었습니다.",confirmProceed:"계속 진행할까요?",live:"실시간",disconnected:"연결 끊김",refreshed:"갱신됨",moreCount:"{n}개 더",totalCount:"총 {n}건",submitQuery:"조회",submitRun:"실행",valueRequired:" 값을 입력하세요.",close:"닫기",cancel:"취소",first:"맨앞",prev:"이전",next:"다음",last:"맨뒤"},gn={loading:"Loading…",noData:"No data.",noSelection:"Nothing selected.",yes:"Yes",no:"No",done:"Done.",confirmProceed:"Go ahead?",live:"Live",disconnected:"Disconnected",refreshed:"Updated",moreCount:"{n} more",totalCount:"{n} total",submitQuery:"Search",submitRun:"Run",valueRequired:" is required.",close:"Close",cancel:"Cancel",first:"First",prev:"Previous",next:"Next",last:"Last"};function yn(i){return String(i||"").startsWith("en")?gn:hn}function kn(i,s){var u;const a=i.name||"my-app",r=((u=i.config)==null?void 0:u.cssFramework)||"bootstrap";return[wn(i,r),$n(a),_n(),Cn(r),Sn(),An(i,s)]}function xn(i=[]){const s=i.length?`import compositeRoutes from './modules/composites';
`:"",a=i.length?`  ...compositeRoutes,
`:"";return{path:"src/router/index.js",content:`import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
${s}
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
`,source:"scaffold"}}function wn(i,s){const a=(i.name||"App").replace(/</g,""),r=s==="metronic";return{path:"index.html",content:`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${a}</title>
  ${r?`<!-- Metronic v8 — bundle 은 public/metronic/assets/ 에 배치 -->
    <link rel="stylesheet" href="/metronic/assets/plugins/global/plugins.bundle.css" />
    <link rel="stylesheet" href="/metronic/assets/css/style.bundle.css" />`:"<!-- Bootstrap 5 · Bootstrap Icons 는 main.js 에서 패키지로 import 한다 (CDN 없이 동작) -->"}
</head>
<body ${r?`id="kt_app_body"
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
`,source:"scaffold"}}function $n(i){const s=Re(i.toLowerCase());return{path:"package.json",content:JSON.stringify({name:s,version:"0.1.0",private:!0,type:"module",scripts:{dev:"vite",build:"vite build",preview:"vite preview"},dependencies:{vue:"^3.4.0","vue-router":"^4.3.0",pinia:"^2.1.7",axios:"^1.7.0",bootstrap:"^5.3.3","bootstrap-icons":"^1.11.3"},devDependencies:{"@vitejs/plugin-vue":"^5.0.4",vite:"^5.2.0"}},null,2),source:"scaffold"}}function _n(){return{path:"vite.config.js",content:`import { defineConfig } from 'vite';
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
`,source:"scaffold"}}function Cn(i){return{path:"src/main.js",content:`import { createApp } from 'vue';
import { createPinia } from 'pinia';
${i==="metronic"?`// Metronic 번들은 public/metronic 에 함께 배치됐다고 가정.
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
`,source:"scaffold"}}function Sn(){return{path:"src/App.vue",content:`<script setup>
// 루트 App — 라우터가 모든 뷰를 담당.
<\/script>

<template>
  <RouterView />
</template>
`,source:"scaffold"}}function An(i,s){const a=String(s||"").startsWith("en"),r=i.name||(a?"Generated project":"생성된 프로젝트"),u=i.cssFramework==="metronic",n=`
## ⚠️ Metronic 번들 배치 (필수)

이 프로젝트는 **Metronic v8** 을 사용하므로 번들을 수동으로 배치해야 합니다:

\`\`\`
public/metronic/
└─ assets/          ← Metronic demo 의 assets 폴더를 그대로 복사
\`\`\`

1. Metronic 공식 사이트에서 HTML demo (예: demo38) 를 다운로드
2. 압축을 풀고 \`demo*/assets/\` 폴더 전체를 \`public/metronic/assets/\` 로 복사
3. \`npm run dev\` 실행

번들 없이 실행하면 스타일이 적용되지 않아 빈 화면이 뜹니다.
`,p=`
## ⚠️ Metronic bundle (required)

This project uses **Metronic v8**, so you have to place the bundle yourself:

\`\`\`
public/metronic/
└─ assets/          ← copy the assets folder from a Metronic demo
\`\`\`

1. Download an HTML demo (for example demo38) from the Metronic site
2. Unpack it and copy the whole \`demo*/assets/\` folder to \`public/metronic/assets/\`
3. Run \`npm run dev\`

Without the bundle no styles load and the page comes up blank.
`;return a?{path:"README.md",content:`# ${r}

${i.description||"A Vue 3 project generated by the screen designer."}
${u?p:""}
## Running it

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Stack

- Vue 3 (script setup) + Vite
- Vue Router + Pinia
- Axios (wrapped as apiClient)
- ${u?"Metronic v8 (commercial licence required)":"Bootstrap 5"}

## What was generated

\`\`\`
src/
├─ api/client.js           axios instance, unwraps the response envelope
├─ stores/                 Pinia stores
│  ├─ auth.js              authentication
│  └─ <n>Store.js          one per resource (list fetch and state)
├─ layouts/                layout (AppLayout with header and sidebar or top nav)
├─ components/widgets/     the widgets your screens use
└─ views/                  one file per screen
\`\`\`
`}:{path:"README.md",content:`# ${r}

${i.description||"Screen Designer 로 자동 생성된 Vue3 프로젝트입니다."}
${u?n:""}
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

- Vue 3 (script setup) + Vite
- Vue Router + Pinia
- Axios (apiClient 래퍼)
- ${u?"Metronic v8 (상용 라이선스 필요)":"Bootstrap 5"}

## 생성된 구조

\`\`\`
src/
├─ api/client.js           axios 인스턴스 + envelope unwrap
├─ stores/                 Pinia 스토어
│  ├─ auth.js              인증
│  └─ <n>Store.js          각 resource 별 스토어 (list fetch + state)
├─ layouts/                레이아웃 (AppLayout + Header + Sidebar/TopNav)
├─ components/widgets/     화면이 쓰는 위젯들
└─ views/                  화면마다 한 파일
\`\`\`
`}}const We=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-and-side"]),De=new Set(["top-nav","top-and-side","hero-landing"]),Ie=new Set(["sidebar-both"]);function Pn(i,s="bootstrap"){const a=i||{},r=a.kind||"sidebar-left",u=a.title||{},n=a.sidebar||{},p=a.mainArea||{},y=s==="metronic",g=[];return g.push(Tn(r,u,n,p,y)),g.push(Ln(u,y,r)),We.has(r)&&g.push(jn(n,r==="sidebar-dark"||r==="sidebar-both",y)),De.has(r)&&g.push(zn(n,y,r)),Ie.has(r)&&g.push(Mn(y)),g}function Tn(i,s,a,r,u){return u?Rn(i):En(i,s,a,r)}function En(i,s,a,r){const u=Math.max(160,Math.min(320,Number(a.width)||220)),n=r.bgColor||"#f5f7fa",p=Math.max(0,Math.min(48,Number(r.padding)||16)),y=["AppHeader"];We.has(i)&&y.push("AppSidebar"),De.has(i)&&y.push("AppTopNav"),Ie.has(i)&&y.push("AppAuxPanel");const g=y.map(d=>`import ${d} from './components/${d}.vue';`).join(`
`);let v;switch(i){case"sidebar-left":case"sidebar-dark":{v=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${u}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`;break}case"sidebar-right":{v=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${u}px;">
        <AppSidebar />
      </aside>
    </div>`;break}case"sidebar-both":{const d=Math.round(u*.6);v=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${u}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${d}px;">
        <AppAuxPanel />
      </aside>
    </div>`;break}case"top-nav":{v=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
      <RouterView />
    </main>`;break}case"top-and-side":{v=`
    <AppTopNav />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${u}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`;break}case"hero-landing":{v=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${n};">
      <RouterView />
    </main>`;break}case"split-panel":{v=`
    <AppHeader />
    <main class="flex-grow-1 d-flex" style="background-color: ${n}; padding: ${p}px;">
      <RouterView />
    </main>`;break}case"card-grid":{v=`
    <AppHeader />
    <main class="flex-grow-1 container-fluid" style="background-color: ${n}; padding: ${p}px;">
      <RouterView />
    </main>`;break}default:v=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${u}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${n}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`}return{path:"src/layouts/AppLayout.vue",content:`<script setup>
${g}
<\/script>

<template>
  <div class="d-flex flex-column min-vh-100" data-layout-kind="${i}">${v}
  </div>
</template>
`,source:"scaffold"}}function Rn(i,s,a,r){const u=["AppHeader"];We.has(i)&&u.push("AppSidebar"),De.has(i)&&u.push("AppTopNav"),Ie.has(i)&&u.push("AppAuxPanel");const n=u.map(o=>`import ${o} from './components/${o}.vue';`).join(`
`),p=Nn(i);let y;switch(i){case"sidebar-left":case"sidebar-dark":y=`
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
      </div>`;break;case"sidebar-right":y=`
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
      </div>`;break;case"sidebar-both":y=`
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
      </div>`;break;case"top-nav":y=`
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
      </div>`;break;case"top-and-side":y=`
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
      </div>`;break;case"hero-landing":y=`
      <AppTopNav />
      <div class="flex-column-fluid" id="kt_app_content">
        <RouterView />
      </div>`;break;case"split-panel":y=`
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
      </div>`;break;case"card-grid":y=`
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
      </div>`;break;default:y=`
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
      </div>`}const g=Object.entries(p).map(([o,d])=>`[${JSON.stringify(o)}, ${JSON.stringify(d)}]`).join(", ");return{path:"src/layouts/AppLayout.vue",content:`<script setup>
// Metronic 은 body 의 data-kt-app-* attribute 조합으로 layout 모양을 결정합니다.
// demo38 의 body 를 참고하여 mount 시점에 적절한 속성을 설정합니다.
import { onMounted, onBeforeUnmount } from 'vue';
${n}

const BODY_ATTRS = [${g}];
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
  <div class="d-flex flex-column flex-root app-root" id="kt_app_root" data-layout-kind="${i}">
    <div class="app-page flex-column flex-column-fluid" id="kt_app_page">${y}
    </div>
  </div>
</template>
`,source:"scaffold"}}function Nn(i){const s={"data-kt-app-layout":"dark-sidebar","data-kt-app-header-fixed":"true","data-kt-app-header-fixed-mobile":"true","data-kt-app-sidebar-enabled":"true","data-kt-app-sidebar-fixed":"true","data-kt-app-sidebar-hoverable":"true","data-kt-app-sidebar-push-header":"true","data-kt-app-sidebar-push-toolbar":"true","data-kt-app-sidebar-push-footer":"true","data-kt-app-toolbar-enabled":"true"};switch(i){case"sidebar-left":return{...s,"data-kt-app-layout":"light-sidebar"};case"sidebar-dark":return{...s,"data-kt-app-layout":"dark-sidebar"};case"sidebar-right":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-position":"end"};case"sidebar-both":return{...s,"data-kt-app-layout":"dark-sidebar","data-kt-app-aside-enabled":"true"};case"top-nav":return{"data-kt-app-layout":"dark-header","data-kt-app-header-fixed":"true","data-kt-app-sidebar-enabled":"false","data-kt-app-toolbar-enabled":"true"};case"top-and-side":return{...s,"data-kt-app-layout":"dark-header"};case"hero-landing":return{"data-kt-app-layout":"blank","data-kt-app-sidebar-enabled":"false","data-kt-app-header-fixed":"false"};case"split-panel":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};case"card-grid":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};default:return s}}function Ln(i,s,a){const r=i.text||"",u=i.logoUrl||"",n=Math.max(40,Math.min(120,Number(i.height)||60));if(s)return a==="hero-landing"?{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <div class="landing-header" data-kt-sticky="true" data-kt-sticky-name="landing-header" data-kt-sticky-offset="{default: '200px', lg: '300px'}">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-equal">
          ${u?`<img alt="logo" src="${Z(u)}" class="h-40px" />`:""}
          <span class="h3 m-0 ms-3 fw-bold">${r}</span>
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
        ${u?`<img src="${Z(u)}" alt="logo" class="h-40px me-3" />`:""}
        <h3 class="app-header-title m-0 fw-bold">${r}</h3>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"};const p=i.bgColor||"#ffffff",y=i.fgColor||"#0f172a";return{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <header class="d-flex align-items-center border-bottom px-3"
          style="height: ${n}px; background-color: ${p}; color: ${y};">
    ${u?`<img src="${Z(u)}" alt="logo" class="me-2" style="max-height: ${n-16}px;" />`:""}
    <h1 class="h5 m-0">${r}</h1>
  </header>
</template>
`,source:"scaffold"}}function jn(i,s,a){const r=Array.isArray(i.items)?i.items:[];if(a){const y=r.map(v=>{const o=Z(v.label||""),d=Z(v.path||"#"),x=v.icon||"bi-circle";return`        <div class="menu-item">
          <RouterLink to="${d}" class="menu-link">
            <span class="menu-icon">
              <i class="bi ${x}"></i>
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
        <span class="fs-3 fw-bold text-white">${Z(i.brand||"App")}</span>
      </RouterLink>
    </div>
    <div class="app-sidebar-menu overflow-hidden flex-column-fluid">
      <div id="kt_app_sidebar_menu_wrapper"
           class="app-sidebar-wrapper hover-scroll-overlay-y my-5">
        <div class="menu menu-column menu-rounded menu-sub-indention px-3">
${y||"          <!-- 메뉴 항목 없음 -->"}
        </div>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"}}const u=s?"bg-dark text-white":"bg-light",n=r.map(y=>{const g=Z(y.label||""),v=Z(y.path||"#"),o=y.icon||"bi-file-earmark";return`    <li class="nav-item">
      <RouterLink to="${v}" class="nav-link ${s?"text-white-50":""}">
        <i class="bi ${o} me-2"></i>${g}
      </RouterLink>
    </li>`}).join(`
`);return{path:"src/layouts/components/AppSidebar.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="d-flex flex-column h-100 ${u} p-2">
    <ul class="nav flex-column">
${n||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function zn(i,s,a){const r=Array.isArray(i.items)?i.items:[];if(s)return a==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div class="landing-menu-wrapper d-flex align-items-center flex-equal flex-lg-end" data-kt-drawer="true" data-kt-drawer-name="landing-menu">
    <div class="menu menu-rounded menu-column menu-lg-row menu-title-gray-500 menu-state-title-primary fw-semibold fs-6" id="kt_landing_menu">
${r.map(o=>{const d=Z(o.label||"");return`      <div class="menu-item">
        <RouterLink to="${Z(o.path||"#")}" class="menu-link nav-link py-3 px-4 px-xxl-6">
          <span class="menu-title">${d}</span>
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
${r.map(g=>{const v=Z(g.label||"");return`      <div class="menu-item">
        <RouterLink to="${Z(g.path||"#")}" class="menu-link">
          <span class="menu-title">${v}</span>
        </RouterLink>
      </div>`}).join(`
`)||"      <!-- 메뉴 항목 없음 -->"}
    </div>
  </div>
</template>
`,source:"scaffold"};const u=r.map(p=>{const y=Z(p.label||"");return`      <li class="nav-item">
        <RouterLink to="${Z(p.path||"#")}" class="nav-link">${y}</RouterLink>
      </li>`}).join(`
`);return a==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top">
    <div class="container">
      <div class="navbar-nav d-flex flex-row gap-3">
${u||"        <!-- 메뉴 항목 없음 -->"}
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
${u||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function Mn(i){return i?{path:"src/layouts/components/AppAuxPanel.vue",content:`<script setup><\/script>

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
`,source:"scaffold"}}function Wn(i){const s=yn(i);return[{path:"src/components/widgets/StatWidget.vue",content:Dn,source:"widget"},{path:"src/components/widgets/ListWidget.vue",content:In(s),source:"widget"},{path:"src/components/widgets/ListPagedWidget.vue",content:Bn(s),source:"widget"},{path:"src/components/widgets/DetailWidget.vue",content:On(s),source:"widget"},{path:"src/components/widgets/TextWidget.vue",content:Vn(s),source:"widget"},{path:"src/components/widgets/MarkdownWidget.vue",content:Un,source:"widget"},{path:"src/components/widgets/QueryFormWidget.vue",content:Kn(s),source:"widget"},{path:"src/components/widgets/FormDialogWidget.vue",content:Fn(s),source:"widget"}]}const Dn=`<script setup>
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
`,In=i=>`<script setup>
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
  if (typeof value === 'boolean') return value ? '${i.yes}' : '${i.no}';
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
          {{ realtimeConnected ? '${i.live}' : '${i.disconnected}' }}
        </span>
        <span v-if="justUpdated" class="badge bg-primary ms-2">${i.refreshed}</span>
      </span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${i.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!effectiveRows.length" class="text-center text-muted py-4">${i.noData}</div>
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
        +{{ hiddenCount }}${i.moreCount.replace("{n}","")}
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
`,On=i=>`<script setup>
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
  if (typeof value === 'boolean') return value ? '${i.yes}' : '${i.no}';
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
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${i.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-center text-muted py-4">${i.noSelection}</div>
      <dl v-else class="row mb-0 small">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt class="col-sm-4 text-muted fw-normal">{{ f.label }}</dt>
          <dd class="col-sm-8 mb-2">{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
`,Vn=i=>`<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String, Boolean], default: null },
  format: { type: String, default: 'auto' },
});

const display = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${i.yes}' : '${i.no}';
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
`,Un=`<script setup>
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
`,Bn=i=>`<script setup>
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
  if (typeof v === 'boolean') return v ? '${i.yes}' : '${i.no}';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge bg-secondary ms-2">${i.totalCount.replace("{n}","")}{{ total }}</span>
      <span v-if="totalPages > 1" class="text-muted small ms-auto">{{ page }} / {{ totalPages }}</span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>${i.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!(rows || []).length" class="text-center text-muted py-4">${i.noData}</div>
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
`,Kn=i=>`<script setup>
/**
 * QueryFormWidget — 입력값을 입력받아 상위에 @submit 이벤트로 전달.
 *   사용자 코드에서 이 이벤트를 받아 store.fetchOne(params) 를 호출.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },       // [{ name, label, type, required, default, placeholder }]
  submitLabel: { type: String, default: '${i.submitQuery}' },
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
      localError.value = f.label + '${i.valueRequired}';
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
`,Fn=i=>`<script setup>
/**
 * FormDialogWidget — 버튼 + 모달 + 폼.
 *   [버튼] 클릭 → 모달 열림 → 사용자 입력 → [제출] → @submit(params) 이벤트.
 *   상위 코드에서 store.submitForm(method, params) 호출하고, 성공 시 @success 이벤트로 refresh 유도.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  buttonLabel: { type: String, default: '${i.submitRun}' },
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
      error.value = f.label + '${i.valueRequired}';
      return;
    }
  }
  if (props.confirmBeforeSubmit && !confirm('${i.confirmProceed}')) return;
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
    success.value = '${i.done}';
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
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">${i.cancel}</button>
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
`;function Hn(i){var a,r;const s=((a=i==null?void 0:i.config)==null?void 0:a.apiBaseUrl)||((r=globalThis.location)==null?void 0:r.origin)||"http://localhost:7901";return{path:"src/api/client.js",content:`import axios from 'axios';

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
const BASE_URL = ${JSON.stringify(s)};

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
`,source:"common"}}function qn(){return{path:"src/stores/auth.js",content:`import { defineStore } from 'pinia';
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
`,source:"common"}}function Ke(i){const s=i==null?void 0:i.onRowClick;return!s||s.action!=="navigate"||!s.target?"":` :row-clickable="true" @row-click="onRowClick_${i.id}"`}function Jn(i,s=[]){const a=[];let r=!1;for(const u of(i==null?void 0:i.rows)||[])for(const n of u.widgets||[]){const p=n==null?void 0:n.onRowClick;if(!p||p.action!=="navigate"||!p.target)continue;r=!0;const y=s.find(o=>o.id===p.target),g=de(y?Oe(y):p.target),v=Object.entries(p.params||{}).filter(([,o])=>o).map(([o,d])=>/^row\.([\w$]+)$/.test(d)?`${o}: row.${/^row\.([\w$]+)$/.exec(d)[1]}`:`${o}: ${JSON.stringify(d)}`);a.push(""),a.push(`/** 화면 디자이너: '${n.title||n.kind}' 행 클릭 → ${(y==null?void 0:y.title)||p.target} */`),a.push(`function onRowClick_${n.id}(row) {`),a.push(`  router.push({ name: '${g}'${v.length?`, params: { ${v.join(", ")} }`:""} });`),a.push("}")}return{needsRouter:r,lines:a}}function Gn(i,{resourceCollector:s=new Map,screens:a=[]}={}){const r=Qn(i,s);r.rowClick=Jn(i,a);const u=Xn(r),n=eo(r),p=to(r);return{path:`src/views/composites/${Oe(i)}.vue`,content:bn({imports:u,setup:n,template:p,style:no}),source:"screen",specId:i.id,kind:"composite"}}function Zn(i){const s=String((i==null?void 0:i.path)||"/").replace(/\/+$/,"")||"/",a=Array.isArray(i==null?void 0:i.params)?i.params:[];if(!a.length)return(i==null?void 0:i.path)||"/";const r=new Set([...String((i==null?void 0:i.path)||"").matchAll(/(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)\??/g)].map(n=>n[1])),u=a.filter(n=>!r.has(n.name)).map(n=>`:${n.name}${n.required===!1?"?":""}`);return u.length?`${s==="/"?"":s}/${u.join("/")}`:(i==null?void 0:i.path)||"/"}function Yn(i){if(!i.length)return null;const s=[];s.push("/**"),s.push(" * Composite 화면 라우트. 자동 생성됨."),s.push(" */"),s.push(""),s.push("const routes = [");for(const a of i){const r=Oe(a);s.push("  {"),s.push(`    path: ${JSON.stringify(Zn(a))},`),s.push(`    name: ${JSON.stringify(de(r))},`),s.push("    props: true,   // route.params 를 props 로 받는다"),s.push(`    component: () => import('@/views/composites/${r}.vue'),`),s.push("  },")}return s.push("]"),s.push(""),s.push("export default routes;"),s.push(""),{path:"src/router/modules/composites.js",content:s.join(`
`),source:"router-module"}}function Oe(i){const s=Re(de(i.title||""));if(s.toLowerCase()!=="screen")return s+"View";const a=Re(de(String(i.path||"").replace(/:/g,"").split("/").filter(Boolean).join("-")));if(a.toLowerCase()!=="screen")return a+"View";const r=String(i.id||"").replace(/[^\w]/g,"").slice(-6)||"Main";return"Screen"+de(r)+"View"}function Qn(i,s){const a=new Map,r=new Map,u=[],n=new Set;let p=0;function y(v,o){const d=Ze(v);if(!d)return null;if(!a.has(d)){const x={Pascal:de(v),endpointPath:(o==null?void 0:o.endpointPath)||`/api/${d}s`,method:(o==null?void 0:o.method)||"GET",resultKey:(o==null?void 0:o.resultKey)||null,realtime:!!(o!=null&&o.realtime)&&!!(o!=null&&o.streamPath),streamPath:(o==null?void 0:o.streamPath)||null};a.set(d,x),s&&!s.has(d)&&s.set(d,{key:d,...x})}return d}function g(v){const o={primary:"null",rowsExpr:"[]",loading:"false",error:"''"},d=v.source;if(!d)return o;if(d.type==="endpoint"){const x=Ye(d.path||""),$=y(x,{endpointPath:d.path,method:d.method||"GET",resultKey:d.resultKey||null,realtime:d.realtime,streamPath:d.streamPath});if(!$)return o;const P=!!(d.realtime&&d.streamPath);return{primary:`${$}CurrentItem`,rowsExpr:`${$}Rows`,loading:`${$}Loading`,error:`${$}Error`,realtime:P,realtimeConnectedExpr:P?`${$}Store.realtimeConnected`:null}}if(d.type==="storeState"){if(!d.resourceKey||!d.stateName)return o;const x=y(d.resourceKey,null);return x?{primary:`${x}${de(d.stateName)}`,rowsExpr:`${x}Rows`,loading:`${x}Loading`,error:`${x}Error`}:o}if(d.type==="storeCompute"){if(!d.resourceKey||!d.stateName)return o;const x=y(d.resourceKey,null);if(!x)return o;const $=`${x}${de(d.stateName)}`,P=`c${++p}`;return u.push(`const ${P} = computed(() => ${ro($,d)});`),{primary:P,rowsExpr:$,loading:`${x}Loading`,error:`${x}Error`}}return d.type==="customVar"&&d.varName?{primary:d.varName,rowsExpr:d.varName,loading:"false",error:"''"}:o}for(const v of i.rows||[])for(const o of v.widgets||[])r.set(o.id,g(o));return{spec:i,usedResources:a,widgetBindings:r,computedDecls:u,exposed:n}}function Xn(i){var r;const s=[],a=[...i.usedResources.values()].some(u=>u.realtime);if(s.push(`import { ref, computed, onMounted${a?", onBeforeUnmount":""} } from 'vue';`),(r=i.rowClick)!=null&&r.needsRouter&&s.push("import { useRouter } from 'vue-router';"),i.usedResources.size>0){s.push("import { storeToRefs } from 'pinia';");for(const[u,n]of i.usedResources)s.push(`import { use${n.Pascal}Store } from '@/stores/${u}Store';`)}return s.push(""),s.push("import StatWidget from '@/components/widgets/StatWidget.vue';"),s.push("import ListWidget from '@/components/widgets/ListWidget.vue';"),s.push("import ListPagedWidget from '@/components/widgets/ListPagedWidget.vue';"),s.push("import DetailWidget from '@/components/widgets/DetailWidget.vue';"),s.push("import TextWidget from '@/components/widgets/TextWidget.vue';"),s.push("import MarkdownWidget from '@/components/widgets/MarkdownWidget.vue';"),s.push("import QueryFormWidget from '@/components/widgets/QueryFormWidget.vue';"),s.push("import FormDialogWidget from '@/components/widgets/FormDialogWidget.vue';"),s}function eo(i){var u,n,p,y,g;const s=[];(u=i.rowClick)!=null&&u.needsRouter&&s.push("const router = useRouter();");for(const[v,o]of i.usedResources)s.push(`const ${v}Store = use${o.Pascal}Store();`),s.push(`const { rows: ${v}Rows, currentItem: ${v}CurrentItem, loading: ${v}Loading, error: ${v}Error, total: ${v}Total, page: ${v}Page, perPage: ${v}PerPage, totalPages: ${v}TotalPages } = storeToRefs(${v}Store);`);if((n=i.spec.customFns)!=null&&n.length){s.push(""),s.push("// User-defined functions");for(const v of i.spec.customFns){const o=(v.params||[]).join(", "),d=(v.body||"return null;").split(`
`).map(x=>"  "+x).join(`
`);s.push(`function ${v.name}(${o}) {`),s.push(d),s.push("}")}}if((p=i.spec.customVars)!=null&&p.length){s.push(""),s.push("// User-defined computed vars");for(const v of i.spec.customVars)s.push(`const ${v.name} = computed(() => (${v.expression||"null"}));`)}if(i.computedDecls.length){s.push(""),s.push("// Widget-level computeds (storeCompute sources)");for(const v of i.computedDecls)s.push(v)}const a=Array.isArray(i.spec.params)&&i.spec.params.length?i.spec.params:vt(i.spec.path);a.length&&(s.push(""),s.push(`const props = defineProps({ ${a.map(v=>`${v.name}: { type: [String, Number], default: null }`).join(", ")} });`));const r=v=>a.some(o=>new RegExp(`(\\{${o.name}\\}|/:${o.name}(?![A-Za-z0-9_]))`).test(String(v.endpointPath||"")));if(i.usedResources.size>0){const v=[...i.usedResources.entries()].filter(([,o])=>o.realtime).map(([o])=>o);s.push(""),s.push("onMounted(() => {");for(const[o,d]of i.usedResources)a.length&&r(d)?s.push(`  ${o}Store.fetchOne({ ${a.map(x=>`${x.name}: props.${x.name}`).join(", ")} });   // 라우트 파라미터로 단건 조회`):s.push(`  ${o}Store.fetchList();`);for(const o of v)s.push(`  ${o}Store.subscribeRealtime();   // 데이터가 바뀌면 자동으로 다시 읽는다`);if(s.push("});"),v.length){s.push(""),s.push("onBeforeUnmount(() => {");for(const o of v)s.push(`  ${o}Store.unsubscribeRealtime();`);s.push("});")}}return(g=(y=i.rowClick)==null?void 0:y.lines)!=null&&g.length&&s.push(...i.rowClick.lines),s.join(`
`)}function to(i){var r;const{spec:s}=i,a=[];if(a.push('<div class="container-fluid py-3">'),s.header&&s.header.kind!=="none"){const u=Z(s.header.title||s.title||""),n=Z(s.header.subtitle||"");a.push('  <div class="mb-3 pb-2 border-bottom">'),a.push(`    <h2 class="h4 mb-1 fw-semibold">${u}</h2>`),n&&a.push(`    <div class="text-muted small">${n}</div>`),a.push("  </div>")}if(!((r=s.rows)!=null&&r.length))return a.push('  <div class="text-muted text-center py-4">(빈 화면)</div>'),a.push("</div>"),a.join(`
`);for(const u of s.rows){const n=u.style||{},p=n.gap!=null&&n.gap!==16,y=p?"row mb-3":"row g-3 mb-3",g=[];p&&g.push(`gap: ${n.gap}px`),n.padding&&g.push(`padding: ${n.padding}px`),n.bgColor&&g.push(`background-color: ${n.bgColor}`);const v=g.length?` style="${g.join("; ")}"`:"";a.push(`  <div class="${y}"${v}>`);for(let o=0;o<u.widgets.length;o++){const d=u.widgets[o],x=u.widths[o],$=i.widgetBindings.get(d.id)||{primary:"null",rowsExpr:"[]",loading:"false",error:"''"},P=so(d);a.push(`    <div class="col-md-${x}"${P}>`),a.push(`      ${ao(d,$,io((i==null?void 0:i.spec)||s))}`),a.push("    </div>")}a.push("  </div>")}return a.push("</div>"),a.join(`
`)}function so(i){const s=i.style||{},a=[];return s.height&&s.height!=="auto"&&a.push(`min-height: ${s.height}px`),a.length?` style="${a.join("; ")}"`:""}function ao(i,s,a=null){var y;const r=Z(i.title||""),u=i.config||{};switch({chart:"list",progress:"stat",timeline:"list",form:"detail",button:"markdown",search:"text",image:"markdown"}[i.kind]||i.kind){case"stat":return`<StatWidget label="${r}" :value="${s.primary}" format="${Z(u.format||"number")}" color="${Z(u.color||"primary")}" />`;case"list":{const g=s.realtime?` :realtime="true" :realtime-connected="${s.realtimeConnectedExpr}"`:"";return`<ListWidget title="${r}" :rows="${s.rowsExpr}" :loading="${s.loading}" :error="${s.error}" :max-rows="${Number(u.maxRows)||5}"${g}${Ke(i)} />`}case"listPaged":{const g=Number(u.perPage)||10,o=(/^[A-Za-z_$][\w$]*Rows$/.test(String(s.rowsExpr))?String(s.rowsExpr).replace(/Rows$/,""):null)||a;return`<ListPagedWidget title="${r}" :rows="${s.rowsExpr}" :loading="${s.loading}" :error="${s.error}" :page="${o}Page" :per-page="${o}PerPage" :total-pages="${o}TotalPages" :total="${o}Total" :default-per-page="${g}" @change-page="(p) => ${o}Store.fetchList({ page: p, perPage: ${o}PerPage })"${Ke(i)} />`}case"detail":return`<DetailWidget title="${r}" :record="${s.primary}" :loading="${s.loading}" :error="${s.error}" />`;case"text":return`<TextWidget label="${r}" :value="${s.primary}" format="${Z(u.format||"auto")}" />`;case"queryForm":{const g=Ne(i)||a,v=JSON.stringify(u.fields||[]).replace(/'/g,"\\'"),o=Z(u.submitLabel||"조회"),d=u.endpointHint?` endpoint-hint="${Z(u.endpointHint)}"`:"",x=g?` @submit="(params) => ${g}Store.fetchOne(params)"`:"";return`<QueryFormWidget title="${r}" :fields='${v}' submit-label="${o}"${d} ${x} />`}case"formDialog":{const g=Ne(i)||a,v=JSON.stringify(u.fields||[]).replace(/'/g,"\\'"),o=Z(u.buttonLabel||"실행"),d=Z(u.buttonVariant||"primary"),x=Z(u.dialogTitle||i.title||o),$=!!u.confirmBeforeSubmit,P=Z(((y=i.source)==null?void 0:y.method)||"POST");return`<FormDialogWidget title="${r}" button-label="${o}" button-variant="${d}" dialog-title="${x}" :fields='${v}' :confirm-before-submit="${$}" method="${P}" @submit="(params) => ${g}Store.submitForm('${P}', params)" @success="() => ${g}Store.fetchList()" />`}case"markdown":{let g=String(u.body||"");if(i.kind==="button"){const v=String(i.title||u.label||"버튼"),o=String(u.variant||"primary"),d=i.onRowClick,x=d&&d.action==="navigate"&&d.target?` @click="onRowClick_${i.id}({})"`:"";return`<div class="card h-100"><div class="card-body"><button type="button" class="btn btn-${o}"${x}>${Z(v)}</button></div></div>`}return i.kind==="image"?'<div class="card h-100"><div class="card-body text-center"><i class="bi bi-image fs-1 text-muted"></i><div class="small text-muted">(image widget — placeholder)</div></div></div>':(!g&&i.kind!=="markdown"&&(g=`[${i.kind} widget — Phase 24 beta]`),g?`<MarkdownWidget :body='${JSON.stringify(g).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />')}default:return`<!-- unknown widget kind: ${i.kind} -->`}}function Ne(i){var a;const s=((a=i==null?void 0:i.source)==null?void 0:a.path)||"";return s&&Ye(s)||null}function io(i){for(const s of(i==null?void 0:i.rows)||[])for(const a of(s==null?void 0:s.widgets)||[]){const r=Ne(a);if(r)return r}return null}function ro(i,s){const a=s.op||"count",r=s.field,u=s.value,n=i+".value",p=g=>String(g).replace(/[^a-zA-Z0-9_$]/g,""),y=g=>{const v=String(g??"");return v==="true"?"true":v==="false"?"false":v!==""&&!isNaN(Number(v))?String(Number(v)):JSON.stringify(v)};switch(a){case"count":return`(${n} || []).length`;case"sum":return r?`(${n} || []).reduce((a, r) => a + Number(r?.${p(r)} || 0), 0)`:"0";case"avg":return r?`((${n} || []).length === 0 ? 0 : (${n} || []).reduce((a, r) => a + Number(r?.${p(r)} || 0), 0) / (${n} || []).length)`:"0";case"min":return r?`Math.min(...((${n} || []).map((r) => Number(r?.${p(r)} || 0))))`:"0";case"max":return r?`Math.max(...((${n} || []).map((r) => Number(r?.${p(r)} || 0))))`:"0";case"filterCount":return r?`(${n} || []).filter((r) => r?.${p(r)} === ${y(u)}).length`:`(${n} || []).length`;case"pluck":return r?`((${n} || {})?.${p(r)})`:n;case"custom":return s.fnName?`${s.fnName}(${n})`:"null";default:return"null"}}const no="";function oo(i){const{key:s,endpointPath:a,method:r="GET",resultKey:u=null,realtime:n=!1,streamPath:p=null}=i,y=de(s),g=Ze(s),v=u?`r.data?.${u} ?? r.data ?? []`:"Array.isArray(r.data) ? r.data : (r.data?.rows ?? [])",o=`import { defineStore } from 'pinia';
import apiClient from '@/api/client';

/**
 * ${y}Store — ${s} 리소스 상태 + fetch 액션.
 *  자동 생성된 기본 형태. 필요 시 create/update/remove 액션 등을 추가하세요.
 *
 *  Phase 33 (patch-12): Pattern A (QueryForm + Detail) 및 Pattern B (FormDialog) 를
 *  생성 코드에서 지원하기 위해 fetchOne / submitForm 두 액션이 추가됨.
 */
export const use${y}Store = defineStore('${g}', {
  state: () => ({
    rows: [],
    currentItem: null,
    loading: false,
    error: '',
    total: 0,
    page: 1,
    perPage: 10,
    totalPages: 1,${n&&p?`
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
        const r = await apiClient.${r.toLowerCase()}(${JSON.stringify(a)}, ${r.toUpperCase()==="GET"?"{ params: opts }":"opts"});
        this.rows = ${v};
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

${n&&p?`    /* ── 실시간 자동 갱신 (SSE) ─────────────────────────────────────
     *  서버가 데이터 변경(change) 을 알려 주면 목록을 다시 읽는다.
     *  · 연결이 끊기면 브라우저가 스스로 다시 붙는다 (EventSource 기본 동작)
     *  · 알림이 몰려 와도 1초에 한 번만 다시 읽는다
     *  구독 주소: ${p}
     * ------------------------------------------------------------- */
    subscribeRealtime() {
      if (this._es) return;                       // 이미 구독 중
      try {
        this._es = new EventSource(${JSON.stringify(p)});
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
`;return{path:`src/stores/${g}Store.js`,content:o,source:"store",resourceKey:g}}function lo(i){return i.map(oo)}function co(i,s){var g;if(!i)throw new Error("project 가 필요합니다");const a=[],r=new Map;a.push(...kn(i,s)),a.push(...Pn(i.layout||{},(g=i.config)==null?void 0:g.cssFramework)),a.push(...Wn(s)),a.push(Hn(i)),a.push(qn());const u=(i.screens||[]).filter(v=>v.kind==="composite");for(const v of u)a.push(Gn(v,{resourceCollector:r,screens:u}));const n=Yn(u);if(n&&a.push(n),a.push(xn(u)),r.size>0){const v=[...r.values()];a.push(...lo(v))}const p=new Map;for(const v of a)p.set(v.path,v);const y=[...p.values()];return y.sort((v,o)=>v.path.localeCompare(o.path)),y}const Qe="aidot.screen-designer.fileEdits";function uo(){try{const i=sessionStorage.getItem(Qe);if(!i)return{};const s=JSON.parse(i);return s&&typeof s=="object"?s:{}}catch{return{}}}function Pe(i){try{sessionStorage.setItem(Qe,JSON.stringify(i))}catch(s){console.warn("[fileEdits] storage save failed:",s)}}const po=nt("fileEdits",{state:()=>({edits:uo()}),getters:{forProject:i=>s=>i.edits[String(s)]||{}},actions:{get(i,s){const a=this.edits[String(i)];return a?a[s]??null:null},set(i,s,a){const r=String(i);this.edits[r]||(this.edits[r]={}),this.edits[r][s]=a,Pe(this.edits)},clear(i,s){const a=String(i),r=this.edits[a];r&&(delete r[s],Object.keys(r).length===0&&delete this.edits[a],Pe(this.edits))},clearAll(i){delete this.edits[String(i)],Pe(this.edits)},applyTo(i,s){const a=String(i),r=this.edits[a];if(!r)return s;const u=new Set(s.map(p=>p.path));let n=!1;for(const p of Object.keys(r))u.has(p)||(delete r[p],n=!0);return n&&(Object.keys(r).length===0&&delete this.edits[a],Pe(this.edits)),s.map(p=>r[p.path]!=null?{...p,content:r[p.path],edited:!0}:p)},listEditedPaths(i){const s=this.edits[String(i)];return new Set(s?Object.keys(s):[])}}}),fo={class:"code-export-panel"},mo={class:"export-header d-flex justify-content-between align-items-start mb-3"},vo={class:"mb-1"},bo={class:"small text-secondary"},ho={key:0,class:"text-warning ms-1"},go={class:"d-flex gap-2"},yo=["title"],ko=["title"],xo=["disabled"],wo={key:0,class:"spinner-border spinner-border-sm me-1"},$o={key:1,class:"bi bi-file-earmark-zip me-1"},_o={key:0,class:"alert alert-danger small"},Co={key:1,class:"alert alert-danger small"},So={class:"mt-1 text-secondary"},Ao={key:2,class:"export-split"},Po={class:"file-tree"},To={class:"tree-title d-flex justify-content-between"},Eo={class:"code-viewer"},Ro={key:0,class:"viewer-empty"},No={class:"viewer-header"},Lo={class:"small flex-grow-1 text-truncate"},jo={class:"badge bg-light text-dark border ms-2"},zo={key:0,class:"badge bg-warning text-dark ms-1"},Mo=["title"],Wo={class:"viewer-editor-wrap"};function Do(i){return i.endsWith(".vue")?"bi bi-filetype-js text-success":i.endsWith(".js")?"bi bi-filetype-js text-warning":i.endsWith(".json")?"bi bi-filetype-json":i.endsWith(".html")?"bi bi-filetype-html text-danger":i.endsWith(".md")?"bi bi-filetype-md":i.endsWith(".css")?"bi bi-filetype-css text-primary":"bi bi-file-earmark"}const Xe=ot({name:"TreeNode",props:{node:Object,parentPath:String,selected:String,isExpanded:Function,isEdited:Function},emits:["toggle","select"],setup(i,{emit:s}){return()=>{const{node:a,parentPath:r,selected:u,isExpanded:n,isEdited:p}=i;if(a.type==="dir"){const g=r?r+"/"+a.name:a.name,v=n(g),o=pe("button",{class:"tree-dir",onClick:()=>s("toggle",g)},[pe("i",{class:`bi ${v?"bi-folder2-open":"bi-folder"} me-1`}),pe("span",{class:"tree-name"},a.name)]),d=v?pe("div",{class:"tree-children"},a.children.map(x=>pe(Xe,{key:x.type==="file"?x.path:x.name,node:x,parentPath:g,selected:u,isExpanded:n,isEdited:p,onToggle:$=>s("toggle",$),onSelect:$=>s("select",$)}))):null;return pe("div",{class:"tree-dir-wrap"},[o,d])}const y=p(a.path);return pe("button",{class:["tree-file",{selected:u===a.path,edited:y}],onClick:()=>s("select",a.path)},[pe("i",{class:Do(a.name)+" me-1"}),pe("span",{class:"tree-name"},a.name),y?pe("span",{class:"edit-dot ms-auto",title:t("designer.editedMark")},"●"):null])}}}),Io={__name:"CodeExportPanel",props:{project:{type:Object,required:!0}},setup(i){const{t:s}=be(),a=i,r=po(),u=V([]),n=V(null);function p(){n.value=null;try{u.value=co(a.project,ct.value)}catch(C){n.value=String(C.message||C),u.value=[]}}ve(()=>a.project,p,{deep:!0,immediate:!0});const y=K(()=>{var C;return r.applyTo((C=a.project)==null?void 0:C.id,u.value)}),g=K(()=>{var C;return r.listEditedPaths((C=a.project)==null?void 0:C.id)}),v=K(()=>o(y.value));function o(C){const w={type:"dir",name:"",children:[]};for(const O of C){const G=O.path.split("/");let se=w;for(let re=0;re<G.length-1;re++){const le=G[re];let fe=se.children.find(j=>j.type==="dir"&&j.name===le);fe||(fe={type:"dir",name:le,children:[]},se.children.push(fe)),se=fe}se.children.push({type:"file",name:G[G.length-1],path:O.path,source:O.source})}return d(w),w}function d(C){if(C.type==="dir"){C.children.sort((w,O)=>w.type!==O.type?w.type==="dir"?-1:1:w.name.localeCompare(O.name));for(const w of C.children)d(w)}}const x=V(null),$=V(new Set(["","src","src/layouts","src/views","src/stores","src/components","src/api","src/router"]));function P(C){$.value.has(C)?$.value.delete(C):$.value.add(C),$.value=new Set($.value)}function T(C){return $.value.has(C)}function N(C){return g.value.has(C)}async function k(C){var w;S.value&&U.value!==te(S.value)&&U.value!==r.get((w=a.project)==null?void 0:w.id,S.value)&&!await Te({title:s("designer.unsavedEdits"),message:`편집 중인 변경사항이 있습니다.
저장 없이 이동할까요?`,detail:`편집 중: ${S.value}`,confirmText:"이동",cancelText:"계속 편집",variant:"danger"})||(x.value=C,S.value=null,U.value="")}const L=K(()=>y.value.find(C=>C.path===x.value)||null);function A(C){return C&&C.toLowerCase().endsWith(".sql")?"sql":"javascript"}const E=K(()=>{var C;return A((C=L.value)==null?void 0:C.path)});function te(C){const w=u.value.find(O=>O.path===C);return(w==null?void 0:w.content)||""}const S=V(null),U=V("");function M(){L.value&&(S.value=L.value.path,U.value=L.value.content)}function R(){var C;S.value&&(r.set((C=a.project)==null?void 0:C.id,S.value,U.value),S.value=null,U.value="")}function I(){S.value=null,U.value=""}async function q(){var C;L.value&&await Te({title:s("codeExportPanel.k15"),message:s("codeExportPanel.k16"),detail:L.value.path,confirmText:s("codeExportPanel.k17"),variant:"danger"})&&r.clear((C=a.project)==null?void 0:C.id,L.value.path)}async function J(){var C;g.value.size&&await Te({title:s("designer.resetEdits"),message:`이 프로젝트의 편집 ${g.value.size}개를 모두 초기화할까요?`,detail:"되돌릴 수 없습니다.",confirmText:"초기화",variant:"danger"})&&(r.clearAll((C=a.project)==null?void 0:C.id),S.value=null,U.value="")}const ne=V(!1),ie=V(null);async function B(){var C;if(!ne.value){ne.value=!0,ie.value=null;try{const w=await h(),O=new w;for(const le of y.value)O.file(le.path,le.content);const G=await O.generateAsync({type:"blob",compression:"DEFLATE"}),se=URL.createObjectURL(G),re=document.createElement("a");re.href=se,re.download=b((C=a.project)==null?void 0:C.name),document.body.appendChild(re),re.click(),document.body.removeChild(re),URL.revokeObjectURL(se)}catch(w){ie.value=String(w.message||w)}finally{ne.value=!1}}}async function h(){const C=await lt(()=>import("./jszip.min-DvbXqdIg.js").then(w=>w.j),[]);return C.default||C}function b(C){const w=String(C||"project").replace(/[^a-zA-Z0-9가-힣_\-]/g,"_").slice(0,40)||"project",O=new Date,G=[O.getFullYear(),String(O.getMonth()+1).padStart(2,"0"),String(O.getDate()).padStart(2,"0"),"-",String(O.getHours()).padStart(2,"0"),String(O.getMinutes()).padStart(2,"0"),String(O.getSeconds()).padStart(2,"0")].join("");return`${w}-${G}.zip`}const D=K(()=>y.value.reduce((C,w)=>{var O;return C+(((O=w.content)==null?void 0:O.length)||0)},0));return(C,w)=>(c(),f("div",fo,[e("div",mo,[e("div",null,[e("h6",vo,[w[1]||(w[1]=e("i",{class:"bi bi-download me-1"},null,-1)),_(l(m(s)("codeExportPanel.k1")),1)]),e("div",bo,[_(l(m(s)("codeExportPanel.k2")),1),e("strong",null,l(y.value.length),1),_(" "+l(m(s)("designer.fileCount").replace("{n}",""))+" · "+l((D.value/1024).toFixed(1))+" KB) ",1),g.value.size>0?(c(),f("span",ho,[w[2]||(w[2]=_(" · ",-1)),w[3]||(w[3]=e("i",{class:"bi bi-pencil-fill"},null,-1)),_(" "+l(m(s)("designer.editedCount").replace("{n}",g.value.size)),1)])):z("",!0)])]),e("div",go,[g.value.size>0?(c(),f("button",{key:0,class:"btn btn-sm btn-outline-danger",onClick:J,title:m(s)("codeExportPanel.k12")},[w[4]||(w[4]=e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)),_(" "+l(m(s)("codeExportPanel.k3")),1)],8,yo)):z("",!0),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:p,title:m(s)("codeExportPanel.k13")},[w[5]||(w[5]=e("i",{class:"bi bi-arrow-clockwise"},null,-1)),_(" "+l(m(s)("codeExportPanel.k4")),1)],8,ko),e("button",{class:"btn btn-sm btn-primary",onClick:B,disabled:ne.value||y.value.length===0},[ne.value?(c(),f("span",wo)):(c(),f("i",$o)),_(" "+l(m(s)("codeExportPanel.k5")),1)],8,xo)])]),n.value?(c(),f("div",_o,[w[6]||(w[6]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(m(s)("designer.genFailed"))+": "+l(n.value),1)])):z("",!0),ie.value?(c(),f("div",Co,[w[7]||(w[7]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(m(s)("designer.downloadFailed"))+": "+l(ie.value)+" ",1),e("div",So,l(m(s)("codeExportPanel.k6")),1)])):z("",!0),n.value?z("",!0):(c(),f("div",Ao,[e("div",Po,[e("div",To,[e("span",null,l(m(s)("designer.files"))+" ("+l(y.value.length)+")",1)]),(c(!0),f(W,null,ee(v.value.children,O=>(c(),ke(m(Xe),{key:O.type==="file"?O.path:O.name,node:O,"parent-path":"",selected:x.value,"is-expanded":T,"is-edited":N,onToggle:P,onSelect:k},null,8,["node","selected"]))),128))]),e("div",Eo,[L.value?(c(),f(W,{key:1},[e("div",No,[e("code",Lo,l(L.value.path),1),e("span",jo,l(L.value.source),1),N(L.value.path)?(c(),f("span",zo,[w[9]||(w[9]=e("i",{class:"bi bi-pencil-fill"},null,-1)),_(" "+l(m(s)("codeExportPanel.k8")),1)])):z("",!0),S.value?(c(),f(W,{key:2},[e("button",{class:"btn btn-sm btn-success ms-2",onClick:R},[w[12]||(w[12]=e("i",{class:"bi bi-check-lg"},null,-1)),_(" "+l(m(s)("codeExportPanel.k10")),1)]),e("button",{class:"btn btn-sm btn-outline-secondary ms-1",onClick:I},[w[13]||(w[13]=e("i",{class:"bi bi-x-lg"},null,-1)),_(" "+l(m(s)("codeExportPanel.k11")),1)])],64)):(c(),f(W,{key:1},[e("button",{class:"btn btn-sm btn-outline-primary ms-2",onClick:M},[w[10]||(w[10]=e("i",{class:"bi bi-pencil"},null,-1)),_(" "+l(m(s)("codeExportPanel.k9")),1)]),N(L.value.path)?(c(),f("button",{key:0,class:"btn btn-sm btn-outline-secondary ms-1",onClick:q,title:m(s)("codeExportPanel.k14")},[...w[11]||(w[11]=[e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)])],8,Mo)):z("",!0)],64))]),e("div",Wo,[S.value?(c(),ke(Ue,{key:1,modelValue:U.value,"onUpdate:modelValue":w[0]||(w[0]=O=>U.value=O),language:E.value,readonly:!1},null,8,["modelValue","language"])):(c(),ke(Ue,{key:0,"model-value":L.value.content,language:E.value,readonly:!0},null,8,["model-value","language"]))])],64)):(c(),f("div",Ro,[w[8]||(w[8]=e("i",{class:"bi bi-file-earmark-code fs-1 d-block mb-2 opacity-50"},null,-1)),_(" "+l(m(s)("codeExportPanel.k7")),1)]))])]))]))}},Oo=he(Io,[["__scopeId","data-v-a2bedd9e"]]),Vo="/public/vendor/vue.esm-browser.prod.js",Uo="/public/vendor/bootstrap.min.css",Bo=new Set(["top-nav","top-and-side","hero-landing"]),Ko=new Set(["sidebar-left","sidebar-dark","sidebar-both","top-and-side"]),Fo=new Set(["split-panel","card-grid"]);function Fe(i){return Bo.has(i)}function Ho(i){return Ko.has(i)}function qo(i){return!Fo.has(i==null?void 0:i.kind)}function Jo({project:i,authToken:s=""}={}){var $,P,T,N,k,L,A,E,te;if(!i)return Xo("프로젝트 정보가 없습니다");const a=s?`<script>window.__previewToken=${JSON.stringify(String(s))};<\/script>`:"",r=Yo(i.layout),u=(i.screens||[]).filter(S=>S&&S.kind==="composite"),n=[];for(const S of u){const U=[],M=[];for(const R of S.rows||[]){const I=[];for(let q=0;q<(R.widgets||[]).length;q++){const J=R.widgets[q],ne=(($=R.widths)==null?void 0:$[q])||12;let ie=null;((P=J.source)==null?void 0:P.type)==="endpoint"&&J.source.path&&(ie=`ep_${String(J.id).replace(/[^a-zA-Z0-9_]/g,"_")}`,U.push({name:ie,method:J.source.method||"GET",path:J.source.path,resultKey:J.source.resultKey||null})),I.push({widget:J,width:ne,endpointVar:ie})}M.push({row:R,widgets:I})}n.push({screen:S,rowDescriptors:M,endpointVars:U})}let p=Array.isArray((T=r.sidebar)==null?void 0:T.items)?r.sidebar.items:[];p.length?p=p.map(S=>{const U=u.find(M=>M.path===S.path);return{...S,screenId:(U==null?void 0:U.id)||null}}):p=u.map(S=>({label:S.title||"무제",path:S.path||`/screen-${S.id}`,icon:"bi-file-earmark",screenId:S.id}));const y=[],g=new Set;for(const{endpointVars:S}of n)for(const U of S){if(g.has(U.name))continue;g.add(U.name);const M={method:U.method,path:U.path};U.resultKey&&(M.resultKey=U.resultKey),y.push(`const ${U.name} = ${JSON.stringify(M)};`)}const v=JSON.stringify(p.map(S=>({label:S.label,path:S.path,icon:S.icon||"",screenId:S.screenId}))),o=n.map(S=>Go(S)).join(`
`),d=((N=u[0])==null?void 0:N.id)||null,x=((k=p[0])==null?void 0:k.path)||"/";return`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${ye(i.name||"Preview")}</title>
<link rel="stylesheet" href="${Uo}" />
<style>
${el}
${bt}
${Qo(r)}
</style>
</head>
<body>
<div id="app"></div>
${a}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${Vo}';

// ---- Widget components ----
${ht}

// ---- Endpoint definitions (전역 공유) ----
${y.join(`
`)}

// ---- 메뉴 / 화면 라우팅 (간이 SPA) ----
const MENU = ${v};
/* ★ v1.9.2 — 화면 id → 정보. 메뉴에는 없는 화면(수정 화면 등)으로도 이동해야 하므로
   MENU 가 아니라 전체 화면 목록으로 만든다. */
const SCREEN_INDEX = ${JSON.stringify(Object.fromEntries(u.map(S=>[S.id,{id:S.id,title:S.title||S.id,path:S.path||""}])))};
const currentScreenId = ref(${JSON.stringify(d)});
const currentPath = ref(${JSON.stringify(x)});

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
      ${y.map(S=>{var U;return(U=S.match(/const (\w+)/))==null?void 0:U[1]}).filter(Boolean).join(`,
      `)}
    };
  },
  template: \`
    <div class="app-shell layout-kind-${r.kind}">
      <!-- 상단 네비 (kind: top-nav / top-and-side / hero-landing) -->
      <header v-if="${Fe(r.kind)}" class="app-topbar">
        <div class="header-title">${ye(((L=r.title)==null?void 0:L.text)||"")}</div>
        <nav class="topnav">
          <button v-for="m in menu" :key="m.path"
                  class="topnav-item"
                  :class="{ active: currentPath === m.path }"
                  @click="navigate(m)">{{ m.label }}</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- 좌 사이드바 (kind: sidebar-left / sidebar-dark / sidebar-both / top-and-side) -->
        <aside v-if="${Ho(r.kind)}" class="app-sidebar app-sidebar-left">
          ${r.kind!=="top-and-side"?`<div class="sidebar-brand">${ye(((A=r.title)==null?void 0:A.text)||i.name||"App")}</div>`:""}
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
          <header v-if="${!Fe(r.kind)}" class="app-header">
            <div class="header-title">${ye(((E=r.title)==null?void 0:E.text)||"")}</div>
          </header>
          <main class="app-content ${r.kind==="split-panel"?"is-split":""} ${r.kind==="card-grid"?"is-grid":""}">
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
              ${qo(r)?"사이드바에서":""}화면을 선택하세요.
            </div>
          </main>
        </div>

        <!-- 우 사이드바 (kind: sidebar-right) -->
        <aside v-if="${r.kind==="sidebar-right"}" class="app-sidebar app-sidebar-right">
          <div class="sidebar-brand">${ye(((te=r.title)==null?void 0:te.text)||i.name||"App")}</div>
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
        <aside v-if="${r.kind==="sidebar-both"}" class="app-aux-panel">
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
</html>`}function Go({screen:i,rowDescriptors:s,endpointVars:a}){const r=[],u="'"+String(i.id).replace(/'/g,"\\'")+"'";if(r.push(`          <div v-if="currentScreenId === ${u}" class="composite-view">`),i.header&&i.header.kind!=="none"){const n=ye(i.header.title||i.title||""),p=ye(i.header.subtitle||"");r.push('            <div class="composite-header">'),r.push(`              <h2 class="composite-title">${n}</h2>`),p&&r.push(`              <div class="composite-subtitle">${p}</div>`),r.push("            </div>")}for(const{row:n,widgets:p}of s){const g=`gap:${(n.style||{}).gap??16}px`;r.push(`            <div class="row" style="${g}">`);for(const{widget:v,width:o,endpointVar:d}of p)r.push(`              <div class="col-md-${o}">`),r.push(`                ${Zo(v,d)}`),r.push("              </div>");r.push("            </div>")}return r.push("          </div>"),r.join(`
`)}function He(i){const s=i==null?void 0:i.onRowClick;if(!s||s.action!=="navigate"||!s.target)return"";const a=Object.entries(s.params||{}).filter(([,u])=>u).map(([u,n])=>`${u}: '${String(n).replace(/'/g,"")}'`).join(", ");return` :row-clickable="true" @row-click="(row) => __previewNavigate('${String(s.target).replace(/'/g,"")}', { ${a} }, row)"`}function Zo(i,s){const a=i.title||"",r=i.config||{},u=i.source,n=v=>`"${String(v).replace(/"/g,"&quot;")}"`,p=s&&(u==null?void 0:u.type)==="endpoint",y=u&&u.resultKey?`result-key=${n(u.resultKey)}`:"",g=i.id?`widget-id=${n(i.id)}`:"";switch(i.kind){case"stat":return p?`<StatWidget label=${n(a)} :endpoint="${s}" ${y} format=${n(r.format||"number")} color=${n(r.color||"primary")} ${g} />`:`<StatWidget label=${n(a)} :value="null" format=${n(r.format||"number")} color=${n(r.color||"primary")} />`;case"list":return p?`<ListWidget title=${n(a)} :endpoint="${s}" ${y} :max-rows="${Number(r.maxRows)||20}" ${g}${He(i)} />`:`<ListWidget title=${n(a)} :rows="[]" :max-rows="${Number(r.maxRows)||5}"${He(i)} />`;case"listPaged":return p?`<ListPagedWidget title=${n(a)} :endpoint="${s}" ${y} :per-page="${Number(r.perPage)||10}" ${g} />`:`<ListPagedWidget title=${n(a)} :endpoint="null" :per-page="${Number(r.perPage)||10}" />`;case"detail":return p?`<DetailWidget title=${n(a)} :endpoint="${s}" ${y} ${g} />`:`<DetailWidget title=${n(a)} :record="null" />`;case"text":return p?`<TextWidget label=${n(a)} :endpoint="${s}" ${y} format=${n(r.format||"auto")} ${g} />`:`<TextWidget label=${n(a)} :value="null" format=${n(r.format||"auto")} />`;case"markdown":{const v=String(r.body||"");return v?`<MarkdownWidget :body='${JSON.stringify(v).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />'}case"queryForm":{const v=JSON.stringify(r.fields||[]).replace(/'/g,"\\'"),o=r.submitLabel||"조회",d=r.targetWidgetId||"",x=r.endpointHint?`endpoint-hint=${n(r.endpointHint)}`:"";return`<QueryFormWidget title=${n(a)} :fields='${v}' submit-label=${n(o)} target-widget-id=${n(d)} ${x} />`}case"formDialog":{const v=JSON.stringify(r.fields||[]).replace(/'/g,"\\'"),o=r.buttonLabel||"실행",d=r.buttonVariant||"primary",x=r.dialogTitle||a||o,$=!!r.confirmBeforeSubmit,P=r.refreshTargetWidgetId||"",T=p?`:endpoint="${s}"`:"";return`<FormDialogWidget title=${n(a)} ${T} button-label=${n(o)} button-variant=${n(d)} dialog-title=${n(x)} :fields='${v}' :confirm-before-submit="${$}" refresh-target-widget-id=${n(P)} />`}case"button":{const v=String(a||r.label||"버튼"),o=String(r.variant||"primary"),d=i.onRowClick,x=d&&d.action==="navigate"&&d.target?` @click="__previewNavigate('${String(d.target).replace(/'/g,"")}', {}, null)"`:"";return`<div class="card h-100"><div class="card-body d-flex align-items-center"><button type="button" class="btn btn-${o}"${x}>${v.replace(/</g,"&lt;")}</button></div></div>`}default:return`<!-- unknown widget kind: ${i.kind} -->`}}function Yo(i){var a,r,u,n,p,y,g,v,o,d,x;const s=i||{};return{kind:s.kind||"sidebar-left",title:{text:((a=s.title)==null?void 0:a.text)||"",bgColor:((r=s.title)==null?void 0:r.bgColor)||"#ffffff",fgColor:((u=s.title)==null?void 0:u.fgColor)||"#0f172a",height:Number((n=s.title)==null?void 0:n.height)||60,...s.title},sidebar:{items:Array.isArray((p=s.sidebar)==null?void 0:p.items)?s.sidebar.items:[],bgColor:((y=s.sidebar)==null?void 0:y.bgColor)||"#1e2a3a",fgColor:((g=s.sidebar)==null?void 0:g.fgColor)||"#cfd6de",width:Number((v=s.sidebar)==null?void 0:v.width)||220,activeBg:((o=s.sidebar)==null?void 0:o.activeBg)||"#0d6efd",...s.sidebar},mainArea:{bgColor:((d=s.mainArea)==null?void 0:d.bgColor)||"#f5f7fa",padding:Number((x=s.mainArea)==null?void 0:x.padding)||16,...s.mainArea}}}function Qo(i){const s=i.title,a=i.sidebar,r=i.mainArea;return`
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
  height: ${s.height}px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: ${s.bgColor};
  color: ${s.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
}
.header-title { font-weight: 600; font-size: 16px; }

/* ────────── 상단 네비 막대 (top-kind 전용) ────────── */
.app-topbar {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: ${s.height}px;
  background: ${s.bgColor};
  color: ${s.fgColor};
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
  background: ${r.bgColor};
  padding: ${r.padding}px;
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
.layout-kind-hero-landing .composite-view { max-width: 1200px; margin: 0 auto; padding: ${r.padding}px; }

/* split-panel: 메인 영역 2분할 (composite-view 내부 구성은 화면이 담당) */
.layout-kind-split-panel .app-content { padding: ${r.padding}px; }

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
`}function ye(i){return String(i??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Xo(i){return`<!DOCTYPE html><html><body style="padding:32px;font-family:sans-serif;color:#b91c1c">${ye(i)}</body></html>`}const el=`
* { box-sizing: border-box; }
body { margin: 0; }
`,tl={class:"whole-app-preview"},sl={class:"preview-toolbar"},al={class:"d-flex align-items-center gap-2 flex-grow-1"},il={class:"fw-semibold"},rl={class:"text-secondary small"},nl={class:"btn-group btn-group-sm",role:"group"},ol={key:0,class:"empty-state"},ll={class:"mb-2"},dl={class:"small text-secondary"},cl=["srcdoc"],ul=400,pl={__name:"WholeAppPreview",props:{project:{type:Object,required:!0}},setup(i){const{t:s}=be(),a=dt(),r=i,u=V(r.project);let n=null;ve(()=>r.project,o=>{n&&clearTimeout(n),n=setTimeout(()=>{u.value=o,n=null},ul)},{deep:!0}),je(()=>{n&&clearTimeout(n)});const p=K(()=>{try{return Jo({project:u.value,authToken:a.accessToken||""})}catch(o){return`<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(o.message||o).replace(/</g,"&lt;")}</body></html>`}}),y=V("desktop"),g={desktop:"100%",tablet:"1024px",mobile:"375px"},v=K(()=>{var o;return(((o=r.project)==null?void 0:o.screens)||[]).filter(d=>d.kind==="composite").length});return(o,d)=>(c(),f("div",tl,[e("div",sl,[e("div",al,[d[3]||(d[3]=e("i",{class:"bi bi-app-indicator"},null,-1)),e("span",il,l(i.project.name||"전체 앱 미리보기"),1),e("span",rl,"· "+l(m(s)("designer.screenCount").replace("{n}",v.value)),1)]),e("div",nl,[e("button",{class:H(["btn",y.value==="desktop"?"btn-primary":"btn-outline-secondary"]),onClick:d[0]||(d[0]=x=>y.value="desktop")},[...d[4]||(d[4]=[e("i",{class:"bi bi-laptop"},null,-1),_(" Desktop ",-1)])],2),e("button",{class:H(["btn",y.value==="tablet"?"btn-primary":"btn-outline-secondary"]),onClick:d[1]||(d[1]=x=>y.value="tablet")},[...d[5]||(d[5]=[e("i",{class:"bi bi-tablet"},null,-1),_(" Tablet ",-1)])],2),e("button",{class:H(["btn",y.value==="mobile"?"btn-primary":"btn-outline-secondary"]),onClick:d[2]||(d[2]=x=>y.value="mobile")},[...d[6]||(d[6]=[e("i",{class:"bi bi-phone"},null,-1),_(" Mobile ",-1)])],2)])]),v.value?(c(),f("div",{key:1,class:H(["preview-frame-wrap","viewport-"+y.value])},[e("iframe",{class:"preview-iframe",style:F({width:g[y.value]}),srcdoc:p.value,sandbox:"allow-scripts allow-same-origin",referrerpolicy:"no-referrer"},null,12,cl)],2)):(c(),f("div",ol,[d[7]||(d[7]=e("i",{class:"bi bi-easel2 fs-1 d-block mb-2 opacity-50"},null,-1)),e("div",ll,l(m(s)("designer.noScreensYet")),1),e("div",dl,l(m(s)("designer.addScreenHint")),1)]))]))}},fl=he(pl,[["__scopeId","data-v-a52ae946"]]),ml={class:"container-fluid py-3"},vl={class:"d-flex justify-content-between align-items-center mb-3"},bl={class:"d-flex align-items-center gap-2"},hl=["title"],gl={class:"mb-0"},yl={key:0,class:"text-secondary"},kl={key:1},xl={key:2,class:"text-secondary"},wl={key:0,class:"small text-secondary"},$l={key:0},_l={class:"ms-2"},Cl={key:0,class:"opacity-75"},Sl={key:1,class:"small text-secondary"},Al={key:0,class:"d-flex align-items-center gap-2"},Pl={key:0},Tl={key:1},El={class:"text-secondary"},Rl={key:2,class:"text-secondary"},Nl=["disabled","title"],Ll={key:0,class:"alert alert-danger small"},jl={class:"nav nav-tabs mb-3"},zl={class:"nav-item"},Ml={class:"nav-item"},Wl={class:"nav-item"},Dl={class:"nav-item"},Il={key:1},Ol={key:0,class:"card"},Vl={class:"card-body text-center py-5 text-secondary"},Ul={key:2},Bl={key:0,class:"card"},Kl={class:"card-body text-center py-5 text-secondary"},Fl={key:3},Hl={key:0,class:"card"},ql={class:"card-body text-center py-5 text-secondary"},Jl={key:4},Gl={key:0,class:"card"},Zl={class:"card-body text-center py-5 text-secondary"},Yl={__name:"ProjectEditorView",setup(i){const s=st(),{t:a}=be(),r=Je(),u=Ge(),n=Me(),{activeProject:p,loading:y,error:g,saving:v}=Le(n),o=["layout","screens","preview","export"];function d(){const L=r.query.tab;return typeof L=="string"&&o.includes(L)?L:"layout"}const x=V(d());ve(x,L=>{r.query.tab!==L&&u.replace({query:L==="layout"?{}:{...r.query,tab:L}})}),ve(()=>r.query.tab,()=>{const L=d();L!==x.value&&(x.value=L)});const $=V(null);ve(v,(L,A)=>{A===!0&&L===!1&&($.value=new Date)});const P=K(()=>v.value?"저장 중…":$.value?a("designer.allAutoSaved"):a("designer.autoSavedHint"));async function T(){var A;const L=r.params.id;if(L)try{await n.loadById(L)}catch(E){((A=E.response)==null?void 0:A.status)===404&&(ge("존재하지 않는 프로젝트입니다","목록으로 돌아갑니다."),u.replace({name:"screen-projects"}))}}qe(T),ve(()=>r.params.id,T),je(()=>n.clearActive());function N(){u.push({name:"screen-projects"})}async function k(){var A,E,te;if(!p.value){et("저장할 수 없습니다","프로젝트가 아직 로드되지 않았습니다.");return}const L=p.value;console.log("[ProjectEditor] saveNow → PUT /api/admin/screen-projects/"+L.id,{name:L.name,screensCount:(L.screens||[]).length});try{const S=await n.savePatch(L.id,{name:L.name,description:L.description,config:L.config,layout:L.layout,screens:L.screens,vars:L.vars});$.value=new Date,console.log("[ProjectEditor] saveNow ✓ updated id="+((S==null?void 0:S.id)??L.id)),tt("저장되었습니다",`${L.name} · ID ${L.id} · ${s.time($.value)}`)}catch(S){const U=(A=S.response)==null?void 0:A.status,M=((te=(E=S.response)==null?void 0:E.data)==null?void 0:te.message)||S.message;console.error("[ProjectEditor] saveNow ✗",U,M),ge(`저장 실패 (HTTP ${U||"?"})`,M)}}return(L,A)=>(c(),f("div",ml,[e("div",vl,[e("div",bl,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:N,title:m(a)("projectEditor.k12")},[...A[4]||(A[4]=[e("i",{class:"bi bi-arrow-left"},null,-1)])],8,hl),e("div",null,[e("h5",gl,[A[6]||(A[6]=e("i",{class:"bi bi-easel2 me-2"},null,-1)),m(y)&&!m(p)?(c(),f("span",yl,[A[5]||(A[5]=e("span",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(l(m(a)("projectEditor.k1")),1)])):m(p)?(c(),f("span",kl,l(m(p).name),1)):(c(),f("span",xl,l(m(a)("projectEditor.k2")),1))]),m(p)?(c(),f("div",wl,[m(p).description?(c(),f("span",$l,l(m(p).description)+" · ",1)):z("",!0),A[7]||(A[7]=_(" Project ID: ",-1)),e("code",null,l(m(p).id),1),e("span",_l,[e("i",{class:H(["bi",m(v)?"bi-arrow-repeat":"bi-check-circle"])},null,2),_(" "+l(P.value)+" ",1),$.value?(c(),f("span",Cl," ("+l(m(s).time($.value))+") ",1)):z("",!0)])])):(c(),f("div",Sl,[A[8]||(A[8]=_(" Project ID: ",-1)),e("code",null,l(m(r).params.id),1)]))])]),m(p)?(c(),f("div",Al,[e("span",{class:H(["small save-indicator",{saving:m(v),"just-saved":$.value&&!m(v)}])},[m(v)?(c(),f("span",Pl,[A[9]||(A[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),_(l(m(a)("projectEditor.k3")),1)])):$.value?(c(),f("span",Tl,[A[10]||(A[10]=e("i",{class:"bi bi-check-circle-fill me-1 text-success"},null,-1)),_(" "+l(m(a)("projectEditor.k4"))+" ",1),e("span",El,"("+l(m(s).time($.value))+")",1)])):(c(),f("span",Rl,[A[11]||(A[11]=e("i",{class:"bi bi-cloud me-1"},null,-1)),_(l(m(a)("projectEditor.k5")),1)]))],2),e("button",{class:"btn btn-sm btn-outline-primary",onClick:k,disabled:m(v),title:m(a)("projectEditor.k6")},[A[12]||(A[12]=e("i",{class:"bi bi-save me-1"},null,-1)),_(l(m(a)("projectEditor.k6")),1)],8,Nl)])):z("",!0)]),m(g)?(c(),f("div",Ll,[A[13]||(A[13]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),_(l(m(g)),1)])):z("",!0),e("ul",jl,[e("li",zl,[e("button",{class:H(["nav-link",{active:x.value==="layout"}]),onClick:A[0]||(A[0]=E=>x.value="layout")},[A[14]||(A[14]=e("i",{class:"bi bi-layout-sidebar me-1"},null,-1)),_(l(m(a)("projectEditor.k7")),1)],2)]),e("li",Ml,[e("button",{class:H(["nav-link",{active:x.value==="screens"}]),onClick:A[1]||(A[1]=E=>x.value="screens")},[A[15]||(A[15]=e("i",{class:"bi bi-collection me-1"},null,-1)),_(l(m(a)("projectEditor.k8")),1)],2)]),e("li",Wl,[e("button",{class:H(["nav-link",{active:x.value==="preview"}]),onClick:A[2]||(A[2]=E=>x.value="preview")},[A[16]||(A[16]=e("i",{class:"bi bi-eye me-1"},null,-1)),_(l(m(a)("projectEditor.k9")),1)],2)]),e("li",Dl,[e("button",{class:H(["nav-link",{active:x.value==="export"}]),onClick:A[3]||(A[3]=E=>x.value="export")},[A[17]||(A[17]=e("i",{class:"bi bi-download me-1"},null,-1)),_(l(m(a)("projectEditor.k10")),1)],2)])]),x.value==="layout"?(c(),f("div",Il,[m(p)?(c(),ke(Ra,{key:1})):(c(),f("div",Ol,[e("div",Vl,[A[18]||(A[18]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(l(m(a)("projectEditor.k11")),1)])]))])):z("",!0),x.value==="screens"?(c(),f("div",Ul,[m(p)?(c(),ke(mn,{key:1})):(c(),f("div",Bl,[e("div",Kl,[A[19]||(A[19]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(l(m(a)("projectEditor.k11")),1)])]))])):z("",!0),x.value==="preview"?(c(),f("div",Fl,[m(p)?(c(),ke(fl,{key:1,project:m(p)},null,8,["project"])):(c(),f("div",Hl,[e("div",ql,[A[20]||(A[20]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(l(m(a)("projectEditor.k11")),1)])]))])):z("",!0),x.value==="export"?(c(),f("div",Jl,[m(p)?(c(),ke(Oo,{key:1,project:m(p)},null,8,["project"])):(c(),f("div",Gl,[e("div",Zl,[A[21]||(A[21]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),_(l(m(a)("projectEditor.k11")),1)])]))])):z("",!0)]))}},ld=he(Yl,[["__scopeId","data-v-2cb4d6d1"]]);export{ld as default};
