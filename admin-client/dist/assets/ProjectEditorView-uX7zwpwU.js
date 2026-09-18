import{n as ge,a as at,b as it}from"./useNotify-DJB_BCim.js";import{u as rt}from"./useFormat-BjkdVqyn.js";import{x as l,c,F as I,r as ee,a as e,D as Re,n as H,b as ae,f as V,t as o,d as u,p as B,e as S,h as Y,v as Q,O as nt,S as K,M as je,m as M,w as be,K as Ve,B as _e,o as Ze,I as Oe,g as Ie,ad as ot,C as lt,k as Se,s as Ye,q as Xe,A as xe,an as dt,X as ct,a9 as fe,ao as ut,u as pt}from"./index-BSRpQhPF.js";import{u as De}from"./screenProjects-Bi776GNb.js";import{u as me,l as Ne}from"./useI18n-Dm4Xvc_m.js";import{_ as he}from"./_plugin-vue_export-helper-DlAUqK2U.js";import{d as Ee,b as ft}from"./useConfirm-rP9i9uIO.js";import{c as mt,a as vt,b as Ae,d as Pe,g as bt,p as ht,W as gt,e as yt}from"./previewRuntimes-D0tG2n4R.js";import{_ as Ue}from"./CodeEditor-D0OAD1rE.js";import"./toasts-Bltmr_sU.js";const xt={class:"row g-3"},kt=["onClick","onKeyup"],wt={class:"schematic"},$t={viewBox:"0 0 120 70",xmlns:"http://www.w3.org/2000/svg",preserveAspectRatio:"xMidYMid meet"},_t=["fill"],Ct=["fill"],St=["fill"],At=["fill"],Pt={class:"pick-body"},Tt={class:"d-flex align-items-center mb-1"},Et={class:"fw-semibold"},Rt={key:0,class:"badge bg-primary ms-auto"},Nt={key:1,class:"badge bg-light text-secondary ms-auto small"},Lt={class:"small text-secondary mb-0"},jt={__name:"LayoutPicker",props:{modelValue:{type:String,default:"sidebar-left"}},emits:["update:modelValue"],setup(a,{expose:s,emit:t}){const i=a,d=t,{t:r}=me(),p=[{kind:"sidebar-left",labelKey:"lay_sidebarLeft",descKey:"lay_sidebarLeftD",category:"admin"},{kind:"sidebar-dark",labelKey:"lay_sidebarDark",descKey:"lay_sidebarDarkD",category:"admin"},{kind:"top-nav",labelKey:"lay_topNav",descKey:"lay_topNavD",category:"web"},{kind:"sidebar-right",labelKey:"lay_sidebarRight",descKey:"lay_sidebarRightD",category:"admin"},{kind:"sidebar-both",labelKey:"lay_sidebarBoth",descKey:"lay_sidebarBothD",category:"admin"},{kind:"top-and-side",labelKey:"lay_topAndSide",descKey:"lay_topAndSideD",category:"admin"},{kind:"hero-landing",labelKey:"lay_heroLanding",descKey:"lay_heroLandingD",category:"web"},{kind:"split-panel",labelKey:"lay_splitPanel",descKey:"lay_splitPanelD",category:"app"},{kind:"card-grid",labelKey:"lay_cardGrid",descKey:"lay_cardGridD",category:"app"}];function x(m){m!==i.modelValue&&d("update:modelValue",m)}const k=B(()=>p.find(m=>m.kind===i.modelValue)||p[0]);return s({currentPreset:k,presets:p}),(m,f)=>(l(),c("div",xt,[(l(),c(I,null,ee(p,n=>e("div",{key:n.kind,class:"col-md-4 col-sm-6"},[e("div",{class:H(["pick-card h-100",{selected:a.modelValue===n.kind}]),onClick:g=>x(n.kind),tabindex:"0",role:"button",onKeyup:Re(g=>x(n.kind),["enter"])},[e("div",wt,[(l(),c("svg",$t,[f[8]||(f[8]=e("rect",{width:"120",height:"70",fill:"#f8fafc",rx:"3"},null,-1)),n.kind==="sidebar-left"||n.kind==="sidebar-dark"?(l(),c(I,{key:0},[e("rect",{x:"0",y:"0",width:"30",height:"70",fill:n.kind==="sidebar-dark"?"#1e2a3a":"#e2e8f0",rx:"3"},null,8,_t),e("rect",{x:"5",y:"8",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,Ct),e("rect",{x:"5",y:"14",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,St),e("rect",{x:"5",y:"20",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,At),f[0]||(f[0]=ae('<rect x="30" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="30" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="36" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="36" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="36" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="77" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',6))],64)):n.kind==="top-nav"?(l(),c(I,{key:1},[f[1]||(f[1]=ae('<rect x="0" y="0" width="120" height="12" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="12" x2="120" y2="12" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="4" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="50" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="82" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="98" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="6" y="18" width="108" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="62" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):n.kind==="sidebar-right"?(l(),c(I,{key:2},[f[2]||(f[2]=ae('<rect x="0" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="10" x2="90" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="90" y="0" width="30" height="70" fill="#e2e8f0" rx="3" data-v-b3652270></rect><rect x="95" y="8" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="14" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="20" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="6" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="47" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):n.kind==="sidebar-both"?(l(),c(I,{key:3},[f[3]||(f[3]=ae('<rect x="0" y="0" width="24" height="70" fill="#1e2a3a" rx="3" data-v-b3652270></rect><rect x="4" y="8" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="14" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="20" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="96" y="0" width="24" height="70" fill="#f1f5f9" rx="3" data-v-b3652270></rect><rect x="100" y="8" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="100" y="14" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="24" y="0" width="72" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="24" y1="10" x2="96" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="28" y="3" width="22" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="28" y="16" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="28" y="42" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',12))],64)):n.kind==="top-and-side"?(l(),c(I,{key:4},[f[4]||(f[4]=ae('<rect x="0" y="0" width="120" height="10" fill="#1e2a3a" data-v-b3652270></rect><rect x="6" y="3" width="22" height="4" rx="1" fill="#fff" data-v-b3652270></rect><rect x="50" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="64" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="78" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="0" y="10" width="28" height="60" fill="#e2e8f0" data-v-b3652270></rect><rect x="4" y="16" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="22" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="28" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="32" y="14" width="84" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="32" y="38" width="84" height="28" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',11))],64)):n.kind==="hero-landing"?(l(),c(I,{key:5},[f[5]||(f[5]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="18" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="80" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="92" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="104" y="4" width="12" height="4" rx="1" fill="#0d6efd" data-v-b3652270></rect><rect x="0" y="10" width="120" height="32" fill="#f1f5f9" data-v-b3652270></rect><rect x="20" y="18" width="80" height="5" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="30" y="26" width="60" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="42" y="33" width="18" height="5" rx="2" fill="#0d6efd" data-v-b3652270></rect><rect x="62" y="33" width="18" height="5" rx="2" fill="#fff" stroke="#0d6efd" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',13))],64)):n.kind==="split-panel"?(l(),c(I,{key:6},[f[6]||(f[6]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="52" height="50" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="26" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="32" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="38" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="62" y="16" width="52" height="50" rx="2" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.5" data-v-b3652270></rect><rect x="66" y="22" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="66" y="30" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="35" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="40" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',13))],64)):n.kind==="card-grid"?(l(),c(I,{key:7},[f[7]||(f[7]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="10" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',15))],64)):V("",!0)]))]),e("div",Pt,[e("div",Tt,[e("span",Et,o(u(r)("designer."+n.labelKey)),1),a.modelValue===n.kind?(l(),c("span",Rt,[...f[9]||(f[9]=[e("i",{class:"bi bi-check-lg"},null,-1)])])):(l(),c("span",Nt,o(n.category),1))]),e("p",Lt,o(u(r)("designer."+n.descKey)),1)])],42,kt)])),64))]))}},Vt=he(jt,[["__scopeId","data-v-b3652270"]]),It={class:"accordion",id:"layoutCustomizerAccordion"},Dt={class:"accordion-item"},Wt={class:"accordion-header"},zt={class:"accordion-button",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccTitle","aria-expanded":"true"},Mt={id:"cAccTitle",class:"accordion-collapse collapse show"},Ot={class:"accordion-body"},Ut={class:"row g-3"},Bt={class:"col-md-6"},Kt={class:"form-label small"},Ft=["placeholder"],qt={class:"col-md-6"},Ht={class:"form-label small"},Jt={class:"text-secondary"},Gt={class:"col-md-4"},Zt={class:"form-label small"},Yt={class:"input-group input-group-sm"},Xt={class:"col-md-4"},Qt={class:"form-label small"},es={class:"input-group input-group-sm"},ts={class:"col-md-4"},ss={class:"form-label small"},as={key:0,class:"accordion-item"},is={class:"accordion-header"},rs={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccSidebar"},ns={id:"cAccSidebar",class:"accordion-collapse collapse"},os={class:"accordion-body"},ls={key:0,class:"row g-3 mb-3"},ds={class:"col-md-3"},cs={class:"form-label small"},us={class:"input-group input-group-sm"},ps={class:"col-md-3"},fs={class:"form-label small"},ms={class:"input-group input-group-sm"},vs={class:"col-md-3"},bs={class:"form-label small"},hs={class:"input-group input-group-sm"},gs={class:"col-md-3"},ys={class:"form-label small"},xs={key:1,class:"text-secondary small mb-3"},ks={class:"d-flex justify-content-between align-items-center mb-2"},ws={class:"form-label small mb-0"},$s={key:2,class:"text-secondary small py-2"},_s={key:3,class:"menu-item-list"},Cs=["onUpdate:modelValue"],Ss=["value"],As=["onUpdate:modelValue","placeholder"],Ps=["onUpdate:modelValue"],Ts={class:"btn-group"},Es=["onClick","disabled","title"],Rs=["onClick","disabled","title"],Ns=["onClick","title"],Ls={class:"accordion-item"},js={class:"accordion-header"},Vs={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccMain"},Is={id:"cAccMain",class:"accordion-collapse collapse"},Ds={class:"accordion-body"},Ws={class:"row g-3"},zs={class:"col-md-6"},Ms={class:"form-label small"},Os={class:"input-group input-group-sm"},Us={class:"col-md-6"},Bs={class:"form-label small"},Ks={__name:"LayoutCustomizer",props:{layout:{type:Object,required:!0}},emits:["update:layout"],setup(a,{emit:s}){const{t}=me(),i=a,d=s,r=B({get:()=>i.layout,set:_=>d("update:layout",_)}),p=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-nav","top-and-side"]),x=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both"]),k=B(()=>{var _;return p.has((_=i.layout)==null?void 0:_.kind)}),m=B(()=>{var _;return x.has((_=i.layout)==null?void 0:_.kind)}),f=B(()=>{var y;const _=(y=i.layout)==null?void 0:y.kind;return t(_==="top-nav"||_==="top-and-side"?"designer.topNavMenu":"designer.sidebarMenu")}),n=B(()=>{var y;const _=(y=i.layout)==null?void 0:y.kind;return _==="top-nav"||_==="top-and-side"?"bi-menu-button-wide":"bi-layout-sidebar"}),g=["bi-house-door","bi-list","bi-grid","bi-person","bi-gear","bi-file-text","bi-bar-chart","bi-cart","bi-bell","bi-envelope","bi-calendar","bi-folder","bi-images","bi-book"];function w(){r.value.sidebar||(r.value.sidebar={items:[]}),Array.isArray(r.value.sidebar.items)||(r.value.sidebar.items=[]),r.value.sidebar.items.push({icon:"bi-house-door",label:t("layoutCustomizer.k21"),path:"/"})}function $(_){r.value.sidebar.items.splice(_,1)}function h(_,y){const R=r.value.sidebar.items,P=_+y;if(P<0||P>=R.length)return;const[A]=R.splice(_,1);R.splice(P,0,A)}return(_,y)=>{var R,P;return l(),c("div",It,[e("div",Dt,[e("h2",Wt,[e("button",zt,[y[17]||(y[17]=e("i",{class:"bi bi-window me-2"},null,-1)),S(o(u(t)("layoutCustomizer.k1")),1)])]),e("div",Mt,[e("div",Ot,[e("div",Ut,[e("div",Bt,[e("label",Kt,o(u(t)("layoutCustomizer.k2")),1),Y(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[0]||(y[0]=A=>r.value.title.text=A),placeholder:u(t)("layoutCustomizer.k16")},null,8,Ft),[[Q,r.value.title.text]])]),e("div",qt,[e("label",Ht,[S(o(u(t)("layoutCustomizer.k3"))+" ",1),e("span",Jt,o(u(t)("layoutCustomizer.k4")),1)]),Y(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[1]||(y[1]=A=>r.value.title.logoUrl=A),placeholder:"https://..."},null,512),[[Q,r.value.title.logoUrl]])]),e("div",Gt,[e("label",Zt,o(u(t)("layoutCustomizer.k5")),1),e("div",Yt,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[2]||(y[2]=A=>r.value.title.bgColor=A)},null,512),[[Q,r.value.title.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[3]||(y[3]=A=>r.value.title.bgColor=A)},null,512),[[Q,r.value.title.bgColor]])])]),e("div",Xt,[e("label",Qt,o(u(t)("layoutCustomizer.k6")),1),e("div",es,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[4]||(y[4]=A=>r.value.title.fgColor=A)},null,512),[[Q,r.value.title.fgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[5]||(y[5]=A=>r.value.title.fgColor=A)},null,512),[[Q,r.value.title.fgColor]])])]),e("div",ts,[e("label",ss,o(u(t)("layoutCustomizer.k7")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"40",max:"120","onUpdate:modelValue":y[6]||(y[6]=A=>r.value.title.height=A)},null,512),[[Q,r.value.title.height,void 0,{number:!0}]])])])])])]),k.value?(l(),c("div",as,[e("h2",is,[e("button",rs,[e("i",{class:H(["bi me-2",n.value])},null,2),S(o(f.value),1)])]),e("div",ns,[e("div",os,[m.value?(l(),c("div",ls,[e("div",ds,[e("label",cs,o(u(t)("layoutCustomizer.k5")),1),e("div",us,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[7]||(y[7]=A=>r.value.sidebar.bgColor=A)},null,512),[[Q,r.value.sidebar.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[8]||(y[8]=A=>r.value.sidebar.bgColor=A)},null,512),[[Q,r.value.sidebar.bgColor]])])]),e("div",ps,[e("label",fs,o(u(t)("layoutCustomizer.k6")),1),e("div",ms,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[9]||(y[9]=A=>r.value.sidebar.fgColor=A)},null,512),[[Q,r.value.sidebar.fgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[10]||(y[10]=A=>r.value.sidebar.fgColor=A)},null,512),[[Q,r.value.sidebar.fgColor]])])]),e("div",vs,[e("label",bs,o(u(t)("layoutCustomizer.k8")),1),e("div",hs,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[11]||(y[11]=A=>r.value.sidebar.activeBg=A)},null,512),[[Q,r.value.sidebar.activeBg]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[12]||(y[12]=A=>r.value.sidebar.activeBg=A)},null,512),[[Q,r.value.sidebar.activeBg]])])]),e("div",gs,[e("label",ys,o(u(t)("layoutCustomizer.k9")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"160",max:"320","onUpdate:modelValue":y[13]||(y[13]=A=>r.value.sidebar.width=A)},null,512),[[Q,r.value.sidebar.width,void 0,{number:!0}]])])])):(l(),c("div",xs,[y[18]||(y[18]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),S(" "+o(u(t)("layoutCustomizer.k10")),1)])),e("div",ks,[e("label",ws,o(u(t)("layoutCustomizer.k11")),1),e("button",{class:"btn btn-sm btn-outline-primary",onClick:w},[y[19]||(y[19]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),S(o(u(t)("layoutCustomizer.k12")),1)])]),(P=(R=r.value.sidebar)==null?void 0:R.items)!=null&&P.length?(l(),c("div",_s,[(l(!0),c(I,null,ee(r.value.sidebar.items,(A,te)=>(l(),c("div",{key:te,class:"menu-item-row"},[Y(e("select",{"onUpdate:modelValue":j=>A.icon=j,class:"form-select form-select-sm icon-select"},[(l(),c(I,null,ee(g,j=>e("option",{key:j,value:j},o(j),9,Ss)),64))],8,Cs),[[nt,A.icon]]),Y(e("input",{"onUpdate:modelValue":j=>A.label=j,class:"form-control form-control-sm",placeholder:u(t)("layoutCustomizer.k17")},null,8,As),[[Q,A.label]]),Y(e("input",{"onUpdate:modelValue":j=>A.path=j,class:"form-control form-control-sm",placeholder:"/path"},null,8,Ps),[[Q,A.path]]),e("div",Ts,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:j=>h(te,-1),disabled:te===0,title:u(t)("layoutCustomizer.k18")},[...y[20]||(y[20]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,Es),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:j=>h(te,1),disabled:te===r.value.sidebar.items.length-1,title:u(t)("layoutCustomizer.k19")},[...y[21]||(y[21]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,Rs),e("button",{class:"btn btn-sm btn-outline-danger",onClick:j=>$(te),title:u(t)("layoutCustomizer.k20")},[...y[22]||(y[22]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,Ns)])]))),128))])):(l(),c("div",$s,o(u(t)("layoutCustomizer.k13")),1))])])])):V("",!0),e("div",Ls,[e("h2",js,[e("button",Vs,[y[23]||(y[23]=e("i",{class:"bi bi-columns me-2"},null,-1)),S(o(u(t)("layoutCustomizer.k14")),1)])]),e("div",Is,[e("div",Ds,[e("div",Ws,[e("div",zs,[e("label",Ms,o(u(t)("layoutCustomizer.k5")),1),e("div",Os,[Y(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[14]||(y[14]=A=>r.value.mainArea.bgColor=A)},null,512),[[Q,r.value.mainArea.bgColor]]),Y(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[15]||(y[15]=A=>r.value.mainArea.bgColor=A)},null,512),[[Q,r.value.mainArea.bgColor]])])]),e("div",Us,[e("label",Bs,o(u(t)("layoutCustomizer.k15")),1),Y(e("input",{type:"number",class:"form-control form-control-sm",min:"0",max:"64","onUpdate:modelValue":y[16]||(y[16]=A=>r.value.mainArea.padding=A)},null,512),[[Q,r.value.mainArea.padding,void 0,{number:!0}]])])])])])])])}}},Fs=he(Ks,[["__scopeId","data-v-0fdebd42"]]),qs=["src"],Hs={class:"mini-title-text"},Js={class:"mini-menu-label"},Gs={key:0,class:"mini-menu-empty"},Zs=["src"],Ys={class:"mini-title-text"},Xs={class:"mini-topnav"},Qs=["src"],ea={class:"mini-title-text"},ta={class:"mini-menu-label"},sa={key:0,class:"mini-menu-empty"},aa={class:"mini-menu-label"},ia={key:0,class:"mini-menu-empty"},ra={class:"mini-center"},na={class:"mini-title-text"},oa={class:"mini-title-text"},la={class:"mini-topnav"},da={class:"mini-menu-label"},ca={key:0,class:"mini-menu-empty"},ua={class:"mini-title-text"},pa={class:"mini-topnav"},fa={class:"mini-title-text"},ma={class:"mini-split-list"},va={class:"mini-title-text"},Be=400,ve=240,ba={__name:"LayoutPreview",props:{layout:{type:Object,required:!0}},setup(a){const s=a,t=B(()=>{var $;return(($=s.layout)==null?void 0:$.kind)||"sidebar-left"}),i=B(()=>{var $;return(($=s.layout)==null?void 0:$.title)||{}}),d=B(()=>{var $;return(($=s.layout)==null?void 0:$.sidebar)||{}}),r=B(()=>{var $;return(($=s.layout)==null?void 0:$.mainArea)||{}}),p=B(()=>d.value.items||[]),x=B(()=>ve/600),k=B(()=>Be/1e3),m=B(()=>Math.max(18,(i.value.height||60)*x.value)),f=B(()=>Math.max(40,(d.value.width||220)*k.value)),n=B(()=>Math.max(4,(r.value.padding||16)*k.value)),g=B(()=>{const $=t.value;return $==="sidebar-right"?"sidebar-right":$==="sidebar-both"?"sidebar-both":$==="top-and-side"?"top-and-side":$==="hero-landing"?"hero-landing":$==="split-panel"?"split-panel":$==="card-grid"?"card-grid":$==="top-nav"?"top-nav":"sidebar-left"});function w($,h){return($||[]).slice(0,h)}return($,h)=>(l(),c("div",{class:"mini-wrapper",style:K({width:Be+"px",height:ve+"px"})},[g.value==="sidebar-left"?(l(),c(I,{key:0},[e("div",{class:"mini-title",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(l(),c("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,qs)):V("",!0),e("span",Hs,o(i.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:K({height:ve-m.value+"px"})},[e("div",{class:"mini-sidebar",style:K({width:f.value+"px",backgroundColor:d.value.bgColor||(t.value==="sidebar-dark"?"#1e2a3a":"#e2e8f0"),color:d.value.fgColor||(t.value==="sidebar-dark"?"#cfd6de":"#334155")})},[(l(!0),c(I,null,ee(w(p.value,8),(_,y)=>(l(),c("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?d.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([_.icon,"mini-menu-icon"])},null,2),e("span",Js,o(_.label),1)],6))),128)),p.value.length?V("",!0):(l(),c("div",Gs,"(메뉴 없음)"))],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...h[0]||(h[0]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):g.value==="top-nav"?(l(),c(I,{key:1},[e("div",{class:"mini-title mini-title--nav",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(l(),c("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Zs)):V("",!0),e("span",Ys,o(i.value.text||"My App"),1),e("div",Xs,[(l(!0),c(I,null,ee(w(p.value,5),(_,y)=>(l(),c("span",{key:y,class:"mini-topnav-item"},o(_.label),1))),128))])],4),e("div",{class:"mini-main mini-main--full",style:K({height:ve-m.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...h[1]||(h[1]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],64)):g.value==="sidebar-right"?(l(),c(I,{key:2},[e("div",{class:"mini-title",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[i.value.logoUrl?(l(),c("img",{key:0,src:i.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Qs)):V("",!0),e("span",ea,o(i.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:K({height:ve-m.value+"px"})},[e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...h[2]||(h[2]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4),e("div",{class:"mini-sidebar",style:K({width:f.value+"px",backgroundColor:d.value.bgColor||"#e2e8f0",color:d.value.fgColor||"#334155"})},[(l(!0),c(I,null,ee(w(p.value,8),(_,y)=>(l(),c("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?d.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([_.icon,"mini-menu-icon"])},null,2),e("span",ta,o(_.label),1)],6))),128)),p.value.length?V("",!0):(l(),c("div",sa,"(메뉴 없음)"))],4)],4)],64)):g.value==="sidebar-both"?(l(),c("div",{key:3,class:"mini-body",style:K({height:ve+"px"})},[e("div",{class:"mini-sidebar",style:K({width:f.value+"px",backgroundColor:d.value.bgColor||"#1e2a3a",color:d.value.fgColor||"#cfd6de"})},[(l(!0),c(I,null,ee(w(p.value,8),(_,y)=>(l(),c("div",{key:y,class:H(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?d.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([_.icon,"mini-menu-icon"])},null,2),e("span",aa,o(_.label),1)],6))),128)),p.value.length?V("",!0):(l(),c("div",ia,"(메뉴 없음)"))],4),e("div",ra,[e("div",{class:"mini-title",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",na,o(i.value.text||"My App"),1)],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...h[3]||(h[3]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)]),e("div",{class:"mini-sidebar mini-sidebar--aux",style:K({width:Math.min(f.value,70)+"px",backgroundColor:"#f1f5f9",color:"#64748b"})},[...h[4]||(h[4]=[ae('<div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder short" data-v-582ff2b9></div></div>',3)])],4)],4)):g.value==="top-and-side"?(l(),c(I,{key:4},[e("div",{class:"mini-title mini-title--nav",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#1e2a3a",color:i.value.fgColor||"#ffffff"})},[e("span",oa,o(i.value.text||"My App"),1),e("div",la,[(l(!0),c(I,null,ee(w(p.value,3),(_,y)=>(l(),c("span",{key:y,class:"mini-topnav-item"},o(_.label),1))),128))])],4),e("div",{class:"mini-body",style:K({height:ve-m.value+"px"})},[e("div",{class:"mini-sidebar",style:K({width:f.value+"px",backgroundColor:d.value.bgColor||"#e2e8f0",color:d.value.fgColor||"#334155"})},[(l(!0),c(I,null,ee(w(p.value.slice(3),6),(_,y)=>(l(),c("div",{key:y,class:H(["mini-menu-item mini-menu-item--sub",{active:y===0}]),style:K({backgroundColor:y===0?d.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:H([_.icon,"mini-menu-icon"])},null,2),e("span",da,o(_.label),1)],6))),128)),p.value.length<=3?(l(),c("div",ca,"(서브 메뉴)")):V("",!0)],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...h[5]||(h[5]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):g.value==="hero-landing"?(l(),c(I,{key:5},[e("div",{class:"mini-title mini-title--nav mini-title--compact",style:K({backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",ua,o(i.value.text||"Landing"),1),e("div",pa,[(l(!0),c(I,null,ee(w(p.value,4),(_,y)=>(l(),c("span",{key:y,class:"mini-topnav-item"},o(_.label),1))),128)),h[6]||(h[6]=e("span",{class:"mini-topnav-cta"},"시작",-1))])],4),e("div",{class:"mini-hero",style:K({backgroundColor:r.value.bgColor||"#eef2ff"})},[...h[7]||(h[7]=[ae('<div class="mini-hero-title" data-v-582ff2b9></div><div class="mini-hero-sub" data-v-582ff2b9></div><div class="mini-hero-buttons" data-v-582ff2b9><div class="mini-hero-btn primary" data-v-582ff2b9></div><div class="mini-hero-btn" data-v-582ff2b9></div></div>',3)])],4),h[8]||(h[8]=e("div",{class:"mini-landing-features"},[e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"})],-1))],64)):g.value==="split-panel"?(l(),c(I,{key:6},[e("div",{class:"mini-title",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",fa,o(i.value.text||"My App"),1)],4),e("div",{class:"mini-split",style:K({height:ve-m.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[e("div",ma,[(l(),c(I,null,ee(5,_=>e("div",{key:_,class:H(["mini-split-row",{active:_===1}])},null,2)),64))]),h[9]||(h[9]=ae('<div class="mini-split-detail" data-v-582ff2b9><div class="mini-split-detail-title" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div></div>',1))],4)],64)):g.value==="card-grid"?(l(),c(I,{key:7},[e("div",{class:"mini-title",style:K({height:m.value+"px",backgroundColor:i.value.bgColor||"#ffffff",color:i.value.fgColor||"#0f172a"})},[e("span",va,o(i.value.text||"My App"),1)],4),e("div",{class:"mini-grid",style:K({height:ve-m.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[(l(),c(I,null,ee(6,_=>e("div",{key:_,class:"mini-grid-card"},[...h[10]||(h[10]=[e("div",{class:"mini-grid-card-dot"},null,-1),e("div",{class:"mini-grid-card-line"},null,-1)])])),64))],4)],64)):V("",!0)],4))}},ha=he(ba,[["__scopeId","data-v-582ff2b9"]]),ga={class:"d-flex justify-content-between align-items-center mb-3"},ya={class:"text-secondary small mb-0"},xa={class:"text-muted"},ka={class:"save-indicator"},wa={key:0,class:"text-secondary small"},$a={key:1,class:"text-danger small"},_a={class:"row g-3"},Ca={class:"col-lg-6"},Sa={class:"mb-2"},Aa={class:"col-lg-6"},Pa={class:"right-sticky"},Ta={class:"mb-2"},Ea={class:"mb-2 mt-4"},Ra=500,Na={__name:"LayoutTab",setup(a){var w;const{t:s}=me(),t=De(),{activeId:i,activeProject:d,saving:r}=je(t),p=M("idle"),x=M(null);let k=null;function m($){const h={...$||{}};return h.kind=h.kind||"sidebar-left",h.title={text:"My App",logoUrl:"",bgColor:"#ffffff",fgColor:"#0f172a",height:60,...h.title||{}},h.sidebar={items:[],bgColor:"#1e2a3a",fgColor:"#cfd6de",width:220,activeBg:"#0d6efd",...h.sidebar||{}},Array.isArray(h.sidebar.items)||(h.sidebar.items=[]),h.mainArea={bgColor:"#f5f7fa",padding:16,...h.mainArea||{}},h}const f=M(m((w=d.value)==null?void 0:w.layout));let n=JSON.stringify(f.value);be(()=>{var $;return($=d.value)==null?void 0:$.id},()=>{var $;f.value=m(($=d.value)==null?void 0:$.layout),n=JSON.stringify(f.value),p.value="idle",k&&(clearTimeout(k),k=null)}),be(f,()=>{i.value&&JSON.stringify(f.value)!==n&&(p.value="pending",k&&clearTimeout(k),k=setTimeout(async()=>{if(k=null,JSON.stringify(f.value)===n){p.value="idle";return}p.value="saving";try{await t.savePatch(i.value,{layout:f.value}),n=JSON.stringify(f.value),p.value="saved",x.value&&clearTimeout(x.value),x.value=setTimeout(()=>{p.value="idle",x.value=null},2e3)}catch{p.value="error"}},Ra))},{deep:!0}),Ve(async()=>{if(k&&(clearTimeout(k),k=null,i.value&&JSON.stringify(f.value)!==n))try{await t.savePatch(i.value,{layout:f.value})}catch{}x.value&&clearTimeout(x.value)});function g($){f.value={...f.value,kind:$}}return($,h)=>(l(),c("div",null,[e("div",ga,[e("p",ya,[S(o(u(s)("designer.layoutHint"))+" ",1),e("span",xa,o(u(s)("designer.autoSaved")),1)]),e("div",ka,[p.value==="pending"?(l(),c("span",wa,[h[1]||(h[1]=e("i",{class:"bi bi-pencil-square me-1"},null,-1)),S(o(u(s)("designer.editing")),1)])):p.value==="error"?(l(),c("span",$a,[h[2]||(h[2]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(u(s)("designer.saveFailed")),1)])):V("",!0)])]),e("div",_a,[e("div",Ca,[e("h6",Sa,[h[3]||(h[3]=e("i",{class:"bi bi-grid-1x2 me-1"},null,-1)),S(o(u(s)("designer.pickStructure")),1)]),_e(Vt,{"model-value":f.value.kind,"onUpdate:modelValue":g},null,8,["model-value"])]),e("div",Aa,[e("div",Pa,[e("h6",Ta,[h[4]||(h[4]=e("i",{class:"bi bi-eye me-1"},null,-1)),S(o(u(s)("designer.preview")),1)]),_e(ha,{layout:f.value},null,8,["layout"]),e("h6",Ea,[h[5]||(h[5]=e("i",{class:"bi bi-sliders me-1"},null,-1)),S(o(u(s)("designer.details")),1)]),_e(Fs,{layout:f.value,"onUpdate:layout":h[0]||(h[0]=_=>f.value=_)},null,8,["layout"])])])])]))}},La=he(Na,[["__scopeId","data-v-d21e1ea0"]]),ja={class:"modal-content"},Va={class:"modal-header"},Ia={class:"modal-title"},Da={key:0,class:"text-muted fs-6"},Wa={key:0,class:"modal-body"},za={class:"text-muted small mb-3"},Ma={class:"row g-3"},Oa=["onClick","onMouseenter"],Ua={class:"kind-icon"},Ba={viewBox:"0 0 80 60",xmlns:"http://www.w3.org/2000/svg"},Ka=["x1","x2"],Fa=["y1","y2"],qa={class:"kind-body"},Ha={class:"kind-label"},Ja={class:"kind-desc"},Ga={key:1,class:"modal-body"},Za={class:"mb-3"},Ya={class:"form-label"},Xa=["placeholder"],Qa={class:"form-text"},ei={class:"mb-3"},ti={class:"form-label"},si={class:"form-text"},ai={key:0,class:"form-text text-primary d-flex align-items-start gap-1 mt-1"},ii=["innerHTML"],ri={key:1,class:"alert alert-warning py-2 px-2 small mt-2 mb-0"},ni=["innerHTML"],oi={class:"alert alert-info small mb-0 py-2"},li={key:0,class:"text-danger small mt-2"},di={class:"modal-footer"},ci={__name:"ScreenCreateModal",emits:["close","created"],setup(a,{emit:s}){const{t}=me(),i=s,d=[{kind:"list",label:t("screenCreate.k1"),description:t("screenCreate.k2"),category:"data",icon:"list"},{kind:"detail",label:t("screenCreate.k3"),description:t("screenCreate.k4"),category:"data",icon:"detail"},{kind:"form-new",label:t("screenCreate.k5"),description:t("screenCreate.k6"),category:"form",icon:"form-new"},{kind:"form-edit",label:t("screenCreate.k7"),description:t("screenCreate.k8"),category:"form",icon:"form-edit"},{kind:"dashboard",label:t("screenCreate.k9"),description:t("screenCreate.k10"),category:"summary",icon:"dashboard"},{kind:"kanban",label:t("screenCreate.k11"),description:t("screenCreate.k12"),category:"summary",icon:"kanban"},{kind:"calendar",label:t("screenCreate.k13"),description:t("screenCreate.k14"),category:"summary",icon:"calendar"},{kind:"chart",label:t("screenCreate.k15"),description:t("screenCreate.k16"),category:"summary",icon:"chart"},{kind:"report",label:t("screenCreate.k17"),description:t("screenCreate.k18"),category:"summary",icon:"report"},{kind:"empty",label:t("screenCreate.k19"),description:t("screenCreate.k20"),category:"blank",icon:"empty"}],r=M(1),p=M("list"),x=B(()=>d.find(O=>O.kind===p.value)||d[0]),k=M(""),m=M(""),f=M(!1),n=M(null),g=M(null),w={학생:"student",사용자:"user",회원:"member",관리자:"admin",상품:"product",주문:"order",결제:"payment",배송:"shipping",게시판:"board",게시글:"post",댓글:"comment",공지:"notice",공지사항:"notice",문의:"inquiry",알림:"notification",고객:"customer",직원:"employee",부서:"department",팀:"team",회사:"company",교사:"teacher",강사:"instructor",과목:"subject",수업:"lesson",카테고리:"category",태그:"tag",파일:"file",이미지:"image",정산:"settlement",재고:"inventory",매출:"sales",통화:"currency",보고서:"report",리포트:"report",책:"book",도서:"book",간식:"snack",학교:"school",선생님:"teacher",친구:"friend",반:"class",숙제:"homework",점수:"score",시험:"exam",급식:"meal",동아리:"club",환자:"patient",진료:"care",진료과:"department",처방:"prescription",병동:"ward",의사:"doctor",간호사:"nurse",예약:"reservation",목록:"list",리스트:"list",상세:"detail",조회:"view",보기:"view",확인:"view",추가:"add",등록:"register",생성:"create",신규:"new",수정:"edit",편집:"edit",변경:"change",삭제:"delete",제거:"remove",검색:"search",필터:"filter",정렬:"sort",가져오기:"import",내보내기:"export",업로드:"upload",다운로드:"download",로그인:"login",로그아웃:"logout",가입:"signup",회원가입:"signup",인증:"auth",권한:"permission",대시보드:"dashboard",홈:"home",메뉴:"menu",네비:"nav",설정:"settings",환경설정:"settings",프로필:"profile",계정:"account",비밀번호:"password",통계:"stats",차트:"chart",그래프:"graph",분석:"analytics",리뷰:"review",평가:"rating",캘린더:"calendar",일정:"schedule",관리:"manage",페이지:"page",화면:"screen",탭:"tab",및:"and",또는:"or",모든:"all",전체:"all",나의:"my",내:"my"},$=["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"],h=["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","yi","i"],_=["","g","kk","gs","n","nj","nh","d","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];function y(O){const b=O.charCodeAt(0);if(b<44032||b>55203)return null;const v=b-44032,D=Math.floor(v/588),Z=Math.floor(v%588/28),U=v%28;return $[D]+h[Z]+_[U]}function R(O){const b=O.charCodeAt(0);return b>=44032&&b<=55203}function P(O){return O?w[O]?w[O]:[...O].some(R)?[...O].map(v=>R(v)?y(v):v).join("-"):O:""}function A(O){const b=String(O||"").trim();return b?b.split(/\s+/).map(P).join("-").toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,60):""}const te=new Set(["detail","form-edit"]),j=B(()=>te.has(p.value)),q=B(()=>/:[A-Za-z_]\w*/.test(m.value||""));function N(O,b){const v=A(O);return v?te.has(b)?`/${v}/:id`:`/${v}`:""}function T(){f.value||(m.value=N(k.value,p.value))}function W(){f.value=!0}function J(O){p.value=O,f.value||(m.value=N(k.value,O)),r.value=2,Oe(()=>{var b;return(b=g.value)==null?void 0:b.focus()})}function G(){r.value=1,n.value=null}function ue(){const O=k.value.trim();if(!O){n.value=O("designer.titleRequired");return}let b=m.value.trim()||"/untitled";b.startsWith("/")||(b="/"+b);const v=mt(p.value,{title:O,path:b});i("created",v),i("close")}Ze(async()=>{var O;await Oe(),(O=g.value)==null||O.focus()});function le(O){O.key==="Escape"&&i("close")}return(O,b)=>(l(),c("div",{class:"modal-backdrop-custom",onClick:b[4]||(b[4]=Ie(v=>i("close"),["self"])),onKeydown:le,tabindex:"-1"},[e("div",{class:"modal-dialog modal-dialog-centered",style:K({maxWidth:r.value===1?"900px":"560px"})},[e("div",ja,[e("div",Va,[e("h5",Ia,[b[5]||(b[5]=e("i",{class:"bi bi-plus-square me-2"},null,-1)),S(" "+o(u(t)("screenCreate.title"))+" ",1),r.value===2?(l(),c("span",Da,"— "+o(x.value.label),1)):V("",!0)]),e("button",{type:"button",class:"btn-close",onClick:b[0]||(b[0]=v=>i("close"))})]),r.value===1?(l(),c("div",Wa,[e("p",za,o(u(t)("screenCreate.pickKind")),1),e("div",Ma,[(l(),c(I,null,ee(d,v=>e("div",{key:v.kind,class:"col-md-4 col-sm-6"},[e("button",{class:H(["kind-card",{selected:p.value===v.kind}]),onClick:D=>J(v.kind),onMouseenter:D=>p.value=v.kind},[e("div",Ua,[(l(),c("svg",Ba,[b[22]||(b[22]=e("rect",{width:"80",height:"60",fill:"#f8fafc",rx:"3"},null,-1)),v.icon==="list"?(l(),c(I,{key:0},[b[6]||(b[6]=ae('<rect x="6" y="8" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="20" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="32" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="44" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="12" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="24" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="36" width="20" height="2" fill="#94a3b8" data-v-d30fe811></rect>',7))],64)):v.icon==="detail"?(l(),c(I,{key:1},[b[7]||(b[7]=ae('<rect x="6" y="6" width="68" height="48" rx="3" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="12" y="14" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="14" width="36" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="22" width="12" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="22" width="30" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="30" width="14" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="30" width="26" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="38" width="18" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="38" width="32" height="3" fill="#0f172a" data-v-d30fe811></rect>',9))],64)):v.icon==="form-new"?(l(),c(I,{key:2},[b[8]||(b[8]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#198754" data-v-d30fe811></rect><rect x="52" y="49" width="12" height="3" fill="#fff" data-v-d30fe811></rect>',5))],64)):v.icon==="form-edit"?(l(),c(I,{key:3},[b[9]||(b[9]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="11" width="20" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="23" width="30" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="35" width="24" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#0d6efd" data-v-d30fe811></rect><rect x="53" y="49" width="10" height="3" fill="#fff" data-v-d30fe811></rect>',8))],64)):v.icon==="dashboard"?(l(),c(I,{key:4},[b[10]||(b[10]=ae('<rect x="4" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="23" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="42" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="61" y="6" width="15" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="8" y="14" width="8" height="6" fill="#0d6efd" data-v-d30fe811></rect><rect x="27" y="14" width="8" height="6" fill="#198754" data-v-d30fe811></rect><rect x="46" y="14" width="8" height="6" fill="#ffc107" data-v-d30fe811></rect><rect x="65" y="14" width="7" height="6" fill="#dc3545" data-v-d30fe811></rect><rect x="4" y="30" width="72" height="24" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><polyline points="10,50 20,42 30,46 40,36 50,40 60,32 70,38" stroke="#0d6efd" stroke-width="1.5" fill="none" data-v-d30fe811></polyline>',10))],64)):v.icon==="kanban"?(l(),c(I,{key:5},[b[11]||(b[11]=ae('<rect x="4" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="29" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="54" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="7" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="7" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="32" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="57" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect>',9))],64)):v.icon==="calendar"?(l(),c(I,{key:6},[b[12]||(b[12]=e("rect",{x:"4",y:"6",width:"72",height:"48",rx:"3",fill:"#fff",stroke:"#cbd5e1"},null,-1)),b[13]||(b[13]=e("rect",{x:"4",y:"6",width:"72",height:"10",fill:"#f1f5f9"},null,-1)),(l(),c(I,null,ee(6,D=>e("line",{key:"vl"+D,x1:4+D*12,y1:"6",x2:4+D*12,y2:"54",stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Ka)),64)),(l(),c(I,null,ee(3,D=>e("line",{key:"hl"+D,x1:"4",y1:16+D*10,x2:"76",y2:16+D*10,stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Fa)),64)),b[14]||(b[14]=e("circle",{cx:"28",cy:"30",r:"2",fill:"#0d6efd"},null,-1)),b[15]||(b[15]=e("circle",{cx:"52",cy:"40",r:"2",fill:"#198754"},null,-1)),b[16]||(b[16]=e("circle",{cx:"16",cy:"50",r:"2",fill:"#ffc107"},null,-1))],64)):v.icon==="chart"?(l(),c(I,{key:7},[b[17]||(b[17]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><line x1="10" y1="46" x2="70" y2="46" stroke="#94a3b8" data-v-d30fe811></line><line x1="10" y1="12" x2="10" y2="46" stroke="#94a3b8" data-v-d30fe811></line><rect x="14" y="30" width="8" height="16" fill="#0d6efd" data-v-d30fe811></rect><rect x="26" y="20" width="8" height="26" fill="#198754" data-v-d30fe811></rect><rect x="38" y="26" width="8" height="20" fill="#ffc107" data-v-d30fe811></rect><rect x="50" y="14" width="8" height="32" fill="#dc3545" data-v-d30fe811></rect><rect x="62" y="22" width="8" height="24" fill="#6610f2" data-v-d30fe811></rect>',8))],64)):v.icon==="report"?(l(),c(I,{key:8},[b[18]||(b[18]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="10" width="40" height="4" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="17" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><line x1="10" y1="23" x2="70" y2="23" stroke="#e2e8f0" data-v-d30fe811></line><rect x="10" y="26" width="60" height="4" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="37" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="42" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="47" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect>',9))],64)):v.icon==="empty"?(l(),c(I,{key:9},[b[19]||(b[19]=e("rect",{x:"8",y:"10",width:"64",height:"40",rx:"3",fill:"none",stroke:"#cbd5e1","stroke-width":"1.5","stroke-dasharray":"3 2"},null,-1)),b[20]||(b[20]=e("circle",{cx:"40",cy:"30",r:"4",fill:"#cbd5e1"},null,-1)),b[21]||(b[21]=e("rect",{x:"36",y:"28",width:"8",height:"4",fill:"#cbd5e1"},null,-1))],64)):V("",!0)]))]),e("div",qa,[e("div",Ha,o(v.label),1),e("div",Ja,o(v.description),1)])],42,Oa)])),64))])])):(l(),c("div",Ga,[e("div",Za,[e("label",Ya,[S(o(u(t)("screenCreate.screenTitle"))+" ",1),b[23]||(b[23]=e("span",{class:"text-danger"},"*",-1))]),Y(e("input",{ref_key:"nameInput",ref:g,"onUpdate:modelValue":b[1]||(b[1]=v=>k.value=v),onInput:T,type:"text",class:"form-control",placeholder:u(t)("screenCreate.titlePlaceholder"),maxlength:"100",onKeyup:Re(ue,["enter"])},null,40,Xa),[[Q,k.value]]),e("div",Qa,o(u(t)("screenCreate.titleHint")),1)]),e("div",ei,[e("label",ti,o(u(t)("screenCreate.pathLabel")),1),Y(e("input",{"onUpdate:modelValue":b[2]||(b[2]=v=>m.value=v),onInput:W,type:"text",class:"form-control",placeholder:"/dashboard",maxlength:"100"},null,544),[[Q,m.value]]),e("div",si,o(u(t)("screenCreate.pathHint")),1),j.value?(l(),c("div",ai,[b[24]||(b[24]=e("i",{class:"bi bi-info-circle mt-1"},null,-1)),e("span",{innerHTML:u(t)("screenCreate.idParamHint")},null,8,ii)])):V("",!0),j.value&&!q.value?(l(),c("div",ri,[b[25]||(b[25]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("span",{innerHTML:u(t)("screenCreate.noIdWarn")},null,8,ni)])):V("",!0)]),e("div",oi,[b[26]||(b[26]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),S(" "+o(u(t)("screenCreate.createdAs",{label:x.value.label}))+" "+o(u(t)("designer.wizardHint")),1)]),n.value?(l(),c("div",li,[b[27]||(b[27]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(n.value),1)])):V("",!0)])),e("div",di,[r.value===2?(l(),c("button",{key:0,class:"btn btn-link me-auto",onClick:G},[b[28]||(b[28]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),S(o(u(t)("screenCreate.pickAgain")),1)])):V("",!0),e("button",{class:"btn btn-secondary",onClick:b[3]||(b[3]=v=>i("close"))},o(u(t)("common.cancel")),1),r.value===2?(l(),c("button",{key:1,class:"btn btn-primary",onClick:ue},[b[29]||(b[29]=e("i",{class:"bi bi-check2 me-1"},null,-1)),S(o(u(t)("screenCreate.create")),1)])):V("",!0)])])],4)],32))}},ui=he(ci,[["__scopeId","data-v-d30fe811"]]),pi={class:"wizard-modal"},fi={class:"wizard-header"},mi={class:"mb-0"},vi={class:"wizard-steps"},bi={class:"step-num"},hi={class:"step-label"},gi={class:"wizard-body"},yi={key:0,class:"step-pane"},xi={class:"step-title"},ki={class:"input-group input-group-sm mb-2"},wi=["placeholder"],$i={key:0,class:"alert alert-danger small"},_i={key:1,class:"text-center py-4 text-secondary small"},Ci={key:2,class:"ctrl-list"},Si={key:0,class:"empty-state"},Ai={class:"fw-semibold mb-1"},Pi={class:"text-secondary small mb-3"},Ti={class:"text-secondary small mt-3"},Ei=["checked","onChange"],Ri={class:"flex-grow-1"},Ni={class:"fw-semibold"},Li={class:"text-secondary small"},ji={key:0,class:"text-secondary small text-center py-3"},Vi={key:1,class:"step-pane"},Ii={class:"step-title"},Di={class:"small text-secondary mb-2"},Wi={key:0,class:"text-secondary small text-center py-3"},zi=["checked","onChange"],Mi={class:"route-path"},Oi={class:"text-secondary small ms-auto"},Ui={key:1,class:"alert alert-warning small mt-3"},Bi={key:2,class:"step-pane"},Ki={class:"step-title"},Fi={class:"route-summary mb-3"},qi={class:"ms-2"},Hi={key:0,class:"text-center py-3 text-secondary small"},Ji={key:1},Gi={key:0,class:"text-secondary small mb-3"},Zi={class:"form-label small mb-1"},Yi={key:0,class:"text-danger"},Xi={class:"text-secondary ms-1"},Qi=["onUpdate:modelValue","placeholder"],er=["onUpdate:modelValue","placeholder"],tr={key:2,class:"form-text"},sr={key:1,class:"deps-summary"},ar={class:"section-label mt-3"},ir={class:"small text-secondary"},rr={key:0,class:"ms-2"},nr={key:3,class:"step-pane"},or={class:"step-title"},lr={class:"route-summary mb-3"},dr={class:"ms-2"},cr={key:0,class:"text-center py-4"},ur=["disabled"],pr={key:0,class:"spinner-border spinner-border-sm me-1"},fr={key:1,class:"bi bi-play-fill me-1"},mr={class:"small text-secondary mt-2"},vr={key:1},br={key:0,class:"alert alert-danger small"},hr={class:"fw-semibold"},gr={class:"mt-1"},yr={key:1},xr={class:"alert alert-success small py-2"},kr={key:0},wr={key:0,class:"mb-3"},$r={class:"section-label"},_r={class:"output-fields"},Cr={class:"text-secondary"},Sr={key:0,class:"text-secondary ms-1"},Ar={class:"mb-3"},Pr={class:"small text-secondary",style:{cursor:"pointer"}},Tr={class:"sample-json"},Er={class:"wizard-footer"},Rr=["disabled"],Nr=["disabled"],Lr={key:0,class:"spinner-border spinner-border-sm me-1"},jr={__name:"ScreenWizardModal",props:{show:{type:Boolean,default:!1}},emits:["close","create"],setup(a,{emit:s}){const{t}=me(),i=a,d=s,r=M(1),p=M([]),x=M(!1),k=M(null),m=M(""),f=M(null),n=M(null),g=M(!1),w=M(null),$=M({});function h(){const b=new Date,v=(U,E=2)=>String(U).padStart(E,"0"),D=`${b.getFullYear()}${v(b.getMonth()+1)}${v(b.getDate())}-${v(b.getHours())}${v(b.getMinutes())}${v(b.getSeconds())}`,Z=Math.floor(Math.random()*65536).toString(16).padStart(4,"0");return`req-${D}-${Z}`}const _=M(!1),y=M(null),R=M(!1),P=B(()=>{const b=m.value.trim().toLowerCase();return b?p.value.filter(v=>[v.name,v.base_path,v.basePath,v.description].filter(Boolean).join(" ").toLowerCase().includes(b)):p.value}),A=B(()=>n.value?["POST","PUT","PATCH","DELETE"].includes((n.value.method||"GET").toUpperCase()):!1),te=B(()=>r.value===1?!!f.value:r.value===2?!!n.value:r.value===3?!!w.value:r.value===4?!!y.value&&y.value.ok:!1);function j(b){const v=(b||"GET").toUpperCase();return{GET:"bg-success",POST:"bg-warning text-dark",PUT:"bg-info text-dark",PATCH:"bg-info text-dark",DELETE:"bg-danger"}[v]||"bg-secondary"}function q(b){const v=b.type||"string",D=b.source||"";return D==="path"?t("designer.valueIn").replace("{type}",v):D==="query"?t("designer.valueQuery").replace("{type}",v):t("designer.valuePlain").replace("{type}",v)}function N(){r.value=1,f.value=null,n.value=null,w.value=null,$.value={},y.value=null,R.value=!1}function T(){N(),d("close")}async function W(){var b,v,D;x.value=!0,k.value=null;try{const Z=await Se.get("/api/admin/controllers/paged",{params:{page:1,perPage:200}});p.value=((b=Z.data)==null?void 0:b.data)||[]}catch(Z){k.value=((D=(v=Z.response)==null?void 0:v.data)==null?void 0:D.message)||Z.message}finally{x.value=!1}}async function J(b){var v,D,Z;f.value=b,n.value=null;try{const E=((v=(await Se.get(`/api/admin/controllers/${encodeURIComponent(b.id)}`)).data)==null?void 0:v.data)||{};Array.isArray(E.routes)&&(E.routes=E.routes.map(C=>({...C,handler:C.handler||C.handlerName||null}))),f.value={...b,...E}}catch(U){k.value=`${t("designer.ctrlDetailFailed")}: ${((Z=(D=U.response)==null?void 0:D.data)==null?void 0:Z.message)||U.message}`}}function G(b){n.value=b}async function ue(){var b,v;if(!(!f.value||!n.value)){g.value=!0,w.value=null;try{const D=await Se.get("/api/admin/screen-wizard/analyze",{params:{controllerId:f.value.name||f.value.id,handler:n.value.handler}});w.value=((b=D.data)==null?void 0:b.data)||null;const Z={};for(const U of((v=w.value)==null?void 0:v.inputs)||[])U.default!=null&&(Z[U.name]=U.default);Z.requestCode=h(),w.value&&!w.value.inputs.some(U=>U.name==="requestCode")&&w.value.inputs.unshift({name:"requestCode",type:"string",source:"auto",required:!1,default:Z.requestCode,desc:t("screenWizard.k10")}),$.value=Z}catch(D){ge(t("designer.analyzeFailed"),D)}finally{g.value=!1}}}async function le(){var b,v,D,Z;if(!(A.value&&!await Ee({title:t("designer.runRouteTitle").replace("{m}",n.value.method),message:t("designer.runRouteMsg").replace(/\{m\}/g,n.value.method),detail:t("designer.runRouteDetail"),confirmText:t("screenWizard.k11"),variant:"danger",icon:"bi-exclamation-triangle"}))){_.value=!0,y.value=null;try{const U={};for(const C of((b=w.value)==null?void 0:b.inputs)||[]){let z=$.value[C.name];z===""||z==null||(C.type==="number"&&(z=Number(z)),C.type==="boolean"&&(z=z===!0||z==="true"),U[C.name]=z)}const E=await Se.post("/api/admin/screen-wizard/probe",{controllerId:f.value.name||f.value.id,handler:n.value.handler,params:U});y.value=((v=E.data)==null?void 0:v.data)||null}catch(U){y.value={ok:!1,error:((Z=(D=U.response)==null?void 0:D.data)==null?void 0:Z.message)||U.message,outputFields:[]}}finally{_.value=!1}}}function O(){const b=w.value,v=y.value;if(!b||!v||!v.ok)return;const D=(b.method||"GET").toUpperCase(),Z=D==="POST"||D==="PUT"||D==="PATCH"||D==="DELETE";let U=b.suggestedWidget||"text";v.shape==="pagedRows"||v.shape==="rowsArray"?U="list":v.shape==="object"&&(U="detail");const E=b.handler.replace(/([A-Z])/g," $1").replace(/^./,X=>X.toUpperCase()).trim(),C=`${b.controllerName.replace(/Controller$/i,"")} ${E}`.trim(),z=`/${b.handler.toLowerCase()}`.replace(/[^a-z0-9\-/]/g,"-"),ie=v.listPath||null,re=(b.inputs||[]).filter(X=>X.name!=="requestCode"),oe=re.filter(X=>X.source==="path"),L=re.filter(X=>X.source!=="path"),se=f.value.name||f.value.id,de=vt({title:C,path:z}),we=(b.fullPath||"").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,"{$1}");if(Z){const X=Ae({kind:"formDialog"});X.title=C,X.source={type:"endpoint",method:D,path:we,controllerId:se,handlerName:b.handler};const $e=D==="DELETE"?"danger":D==="POST"?"success":"primary",pe=t(D==="POST"?"designer.actCreate":D==="DELETE"?"designer.actDelete":"designer.actUpdate");X.config={buttonLabel:pe,buttonVariant:$e,dialogTitle:`${C} — ${pe}`,fields:re.map(ke=>({name:ke.name,label:ke.name,type:ke.type||"string",required:!!ke.required,default:ke.default!=null?ke.default:"",placeholder:q(ke)})),confirmBeforeSubmit:D==="DELETE",refreshTargetWidgetId:null},de.rows=[Pe({widths:[12],widgets:[X]})]}else if(oe.length>0||L.length>0&&U==="detail"){const X=Ae({kind:U});X.title=C+" 결과",X.source={type:"endpoint",method:D,path:we,resultKey:ie,controllerId:se,handlerName:b.handler},U==="list"?X.config={maxRows:20}:U==="stat"&&(X.config={format:"number",color:"primary"});const $e=Ae({kind:"queryForm"});$e.title=C+" 조회",$e.source={type:"endpoint",method:D,path:we,resultKey:ie,controllerId:se,handlerName:b.handler},$e.config={endpointHint:`${D} ${we}`,fields:re.map(pe=>({name:pe.name,label:pe.name,type:pe.type||"string",required:!!pe.required,default:pe.default!=null?pe.default:"",placeholder:q(pe)})),submitLabel:"조회",targetWidgetId:X.id},de.rows=[Pe({widths:[12],widgets:[$e]}),Pe({widths:[12],widgets:[X]})]}else{const X=Ae({kind:U});X.title=C,X.source={type:"endpoint",method:D,path:b.fullPath,resultKey:ie,controllerId:se,handlerName:b.handler},U==="list"?X.config={maxRows:20}:U==="stat"&&(X.config={format:"number",color:"primary"}),de.rows=[Pe({widths:[12],widgets:[X]})]}d("create",de),T()}return be(()=>i.show,b=>{b&&(N(),p.value.length||W())}),(b,v)=>{var Z,U,E,C,z,ie,re,oe;const D=ot("router-link");return a.show?(l(),c("div",{key:0,class:"wizard-backdrop",onClick:Ie(T,["self"])},[e("div",pi,[e("div",fi,[e("h5",mi,[v[6]||(v[6]=e("i",{class:"bi bi-magic me-2"},null,-1)),S(o(u(t)("wizard.title")),1)]),e("button",{class:"btn btn-sm btn-link text-secondary",onClick:T},[...v[7]||(v[7]=[e("i",{class:"bi bi-x-lg"},null,-1)])])]),e("div",vi,[(l(),c(I,null,ee(4,L=>e("div",{key:L,class:H(["step-item",{active:r.value===L,done:r.value>L}])},[e("span",bi,o(L),1),e("span",hi,o([u(t)("screenWizard.k2"),u(t)("screenWizard.k5"),u(t)("screenWizard.k6"),u(t)("screenWizard.k7")][L-1]),1)],2)),64))]),e("div",gi,[r.value===1?(l(),c("div",yi,[e("div",xi,o(u(t)("wizard.step1")),1),e("div",ki,[v[8]||(v[8]=e("span",{class:"input-group-text"},[e("i",{class:"bi bi-search"})],-1)),Y(e("input",{"onUpdate:modelValue":v[0]||(v[0]=L=>m.value=L),class:"form-control",placeholder:u(t)("wiz2.searchByNameOrPath")},null,8,wi),[[Q,m.value]])]),k.value?(l(),c("div",$i,o(k.value),1)):V("",!0),x.value?(l(),c("div",_i,[v[9]||(v[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),S(o(u(t)("wizard.loading")),1)])):(l(),c("div",Ci,[p.value.length?(l(),c(I,{key:1},[(l(!0),c(I,null,ee(P.value,L=>{var se,de;return l(),c("label",{key:L.id,class:H(["ctrl-item",{selected:((se=f.value)==null?void 0:se.id)===L.id}])},[e("input",{type:"radio",checked:((de=f.value)==null?void 0:de.id)===L.id,onChange:we=>J(L)},null,40,Ei),e("div",Ri,[e("div",Ni,o(L.name),1),e("div",Li,[e("code",null,o(L.base_path||L.basePath||"-"),1)])])],2)}),128)),P.value.length?V("",!0):(l(),c("div",ji,[v[13]||(v[13]=e("i",{class:"bi bi-search me-1"},null,-1)),S('"'+o(m.value)+'" 로 검색한 결과가 없습니다 ',1)]))],64)):(l(),c("div",Si,[v[12]||(v[12]=e("div",{class:"empty-icon"},[e("i",{class:"bi bi-collection"})],-1)),e("div",Ai,o(u(t)("wizard.noControllers")),1),e("div",Pi,[S(o(u(t)("wizard.intro")),1),v[10]||(v[10]=e("br",null,null,-1)),S(" "+o(u(t)("screenWizard.k1"))+" ",1),e("strong",null,o(u(t)("screenWizard.k2")),1),S(" "+o(u(t)("screenWizard.k3")),1)]),_e(D,{to:{name:"controllers"},class:"btn btn-sm btn-primary",onClick:v[1]||(v[1]=L=>d("close"))},{default:lt(()=>[v[11]||(v[11]=e("i",{class:"bi bi-arrow-right me-1"},null,-1)),S(o(u(t)("wizard.goControllers")),1)]),_:1}),e("div",Ti,o(u(t)("screenWizard.k4")),1)]))]))])):r.value===2?(l(),c("div",Vi,[e("div",Ii,o(u(t)("wizard.step2")),1),e("div",Di,[e("strong",null,o((Z=f.value)==null?void 0:Z.name),1),S(" "+o(u(t)("wiz2.routesOf")),1)]),(E=(U=f.value)==null?void 0:U.routes)!=null&&E.length?V("",!0):(l(),c("div",Wi,o(u(t)("wizard.noRoutesFor")),1)),(l(!0),c(I,null,ee(((C=f.value)==null?void 0:C.routes)||[],L=>{var se,de;return l(),c("label",{key:L.handler,class:H(["route-item",{selected:((se=n.value)==null?void 0:se.handler)===L.handler}])},[e("input",{type:"radio",checked:((de=n.value)==null?void 0:de.handler)===L.handler,onChange:we=>G(L)},null,40,zi),e("span",{class:H(["badge route-method-badge",j(L.method)])},o((L.method||"GET").toUpperCase()),3),e("code",Mi,o(L.path||"/"),1),e("span",Oi,o(L.handler),1)],2)}),128)),n.value&&A.value?(l(),c("div",Ui,[v[14]||(v[14]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("strong",null,o(n.value.method),1),S(" 라우트를 선택했습니다. 이 타입은 서버 데이터를 변경할 수 있으며, "+o(u(t)("wiz2.next"))+" 단계에서 실제 호출 시 경고 대화상자가 표시됩니다. ",1)])):V("",!0)])):r.value===3?(l(),c("div",Bi,[e("div",Ki,o(u(t)("wizard.step3")),1),e("div",Fi,[e("span",{class:H(["badge",j(n.value.method)])},o(n.value.method),3),e("code",qi,o(((z=w.value)==null?void 0:z.fullPath)||(((ie=f.value)==null?void 0:ie.base_path)||((re=f.value)==null?void 0:re.basePath)||"")+n.value.path),1)]),g.value?(l(),c("div",Hi,[v[15]||(v[15]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),S(o(u(t)("wiz2.analyzing")),1)])):w.value?(l(),c("div",Ji,[w.value.inputs.length?V("",!0):(l(),c("div",Gi,o(u(t)("wizard.noInputParams")),1)),(l(!0),c(I,null,ee(w.value.inputs,L=>(l(),c("div",{key:L.name,class:"input-field mb-2"},[e("label",Zi,[e("strong",null,o(L.name),1),L.required?(l(),c("span",Yi,"*")):V("",!0),e("span",Xi,"("+o(L.type)+", "+o(L.source)+")",1)]),L.type==="number"?Y((l(),c("input",{key:0,type:"number",class:"form-control form-control-sm","onUpdate:modelValue":se=>$.value[L.name]=se,placeholder:String(L.default??"")},null,8,Qi)),[[Q,$.value[L.name]]]):Y((l(),c("input",{key:1,type:"text",class:"form-control form-control-sm","onUpdate:modelValue":se=>$.value[L.name]=se,placeholder:L.desc||String(L.default??"")},null,8,er)),[[Q,$.value[L.name]]]),L.desc?(l(),c("div",tr,o(L.desc),1)):V("",!0)]))),128)),w.value.dependencies?(l(),c("div",sr,[e("div",ar,o(u(t)("wiz2.reference")),1),e("div",ir,[v[16]||(v[16]=S(" Services: ",-1)),e("strong",null,o(w.value.dependencies.services.length),1),v[17]||(v[17]=S(" · SQL files: ",-1)),e("strong",null,o(w.value.dependencies.sqls.length),1),w.value.dependencies.services.length?(l(),c("span",rr," ("+o(w.value.dependencies.services.map(L=>L.name).join(", "))+") ",1)):V("",!0)])])):V("",!0)])):V("",!0)])):r.value===4?(l(),c("div",nr,[e("div",or,o(u(t)("wizard.step4")),1),e("div",lr,[e("span",{class:H(["badge",j(n.value.method)])},o(n.value.method),3),e("code",dr,o((oe=w.value)==null?void 0:oe.fullPath),1)]),y.value?(l(),c("div",vr,[y.value.ok?(l(),c("div",yr,[e("div",xr,[v[21]||(v[21]=e("i",{class:"bi bi-check-circle me-1"},null,-1)),S(" "+o(u(t)("wiz2.responseOk"))+" ",1),e("code",null,o(y.value.shape),1),y.value.listPath?(l(),c("span",kr,[v[20]||(v[20]=S(", listPath: ",-1)),e("code",null,o(y.value.listPath),1)])):V("",!0)]),y.value.outputFields.length?(l(),c("div",wr,[e("div",$r,"추출된 Output 필드 ("+o(y.value.outputFields.length)+"개)",1),e("div",_r,[(l(!0),c(I,null,ee(y.value.outputFields,L=>(l(),c("div",{key:L.name,class:"field-tag"},[e("strong",null,o(L.name),1),e("span",Cr,": "+o(L.type),1),L.sample!=null?(l(),c("span",Sr," ≈ "+o(typeof L.sample=="string"&&L.sample.length>24?L.sample.slice(0,24)+"...":L.sample),1)):V("",!0)]))),128))])])):V("",!0),e("details",Ar,[e("summary",Pr,o(u(t)("wiz2.viewRawJson")),1),e("pre",Tr,[e("code",null,o(JSON.stringify(y.value.sample,null,2).slice(0,2e3)),1)])]),e("button",{class:"btn btn-success w-100",onClick:O},[v[22]||(v[22]=e("i",{class:"bi bi-magic me-1"},null,-1)),S(" "+o(u(t)("wiz2.buildFromThis"))+" (widget: ",1),e("strong",null,o(w.value.suggestedWidget),1),v[23]||(v[23]=S(") ",-1))])])):(l(),c("div",br,[e("div",hr,[v[18]||(v[18]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(u(t)("wiz2.runFailed")),1)]),e("div",gr,o(y.value.error),1),e("button",{class:"btn btn-sm btn-outline-secondary mt-2",onClick:v[2]||(v[2]=L=>y.value=null)},[v[19]||(v[19]=e("i",{class:"bi bi-arrow-counterclockwise me-1"},null,-1)),S(o(u(t)("wiz2.retry")),1)])]))])):(l(),c("div",cr,[e("button",{class:H(["btn btn-primary",{"btn-warning text-dark":A.value}]),disabled:_.value,onClick:le},[_.value?(l(),c("span",pr)):(l(),c("i",fr)),S(" "+o(A.value?"⚠️ "+n.value.method+u(t)("screenWizard.k8"):u(t)("screenWizard.k9")),1)],10,ur),e("div",mr,o(u(t)("wizard.step4Hint")),1)]))])):V("",!0)]),e("div",Er,[r.value>1?(l(),c("button",{key:0,class:"btn btn-outline-secondary btn-sm",onClick:v[3]||(v[3]=L=>r.value=r.value-1)},[v[24]||(v[24]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),S(o(u(t)("wiz2.prev")),1)])):V("",!0),v[28]||(v[28]=e("span",{class:"ms-auto"},null,-1)),r.value<4&&r.value!==3?(l(),c("button",{key:1,class:"btn btn-primary btn-sm",disabled:!te.value,onClick:v[4]||(v[4]=L=>r.value=r.value+1)},[S(o(u(t)("wiz2.next"))+" ",1),v[25]||(v[25]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))],8,Rr)):V("",!0),r.value===3&&!w.value?(l(),c("button",{key:2,class:"btn btn-primary btn-sm",disabled:!n.value||g.value,onClick:ue},[g.value?(l(),c("span",Lr)):V("",!0),S(" "+o(u(t)("wiz2.analyze"))+" ",1),v[26]||(v[26]=e("i",{class:"bi bi-search ms-1"},null,-1))],8,Nr)):r.value===3&&w.value?(l(),c("button",{key:3,class:"btn btn-primary btn-sm",onClick:v[5]||(v[5]=L=>r.value=4)},[S(o(u(t)("wiz2.next"))+" ",1),v[27]||(v[27]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))])):V("",!0)])])])):V("",!0)}}},Vr=he(jr,[["__scopeId","data-v-5679dbca"]]),Ir={class:"d-flex justify-content-between align-items-center mb-3"},Dr={class:"mb-1"},Wr={class:"badge bg-secondary ms-2"},zr={class:"text-secondary small mb-0"},Mr=["disabled"],Or=["disabled"],Ur={key:0,class:"card"},Br={class:"card-body text-center py-5 text-secondary"},Kr={class:"mb-2"},Fr={class:"small"},qr={key:1,class:"card"},Hr={class:"table-responsive"},Jr={class:"table table-hover mb-0"},Gr={class:"table-light"},Zr={style:{width:"110px"}},Yr={style:{width:"240px"}},Xr={class:"text-secondary small"},Qr={key:0,class:"d-flex gap-1"},en=["onKeyup"],tn=["onClick","title"],sn=["title"],an=["onClick"],rn={class:"small"},nn={class:"small text-secondary"},on={class:"small text-secondary"},ln=["onClick","title"],dn={class:"btn-group me-1"},cn=["onClick","disabled","title"],un=["onClick","disabled","title"],pn=["onClick","title"],fn=["onClick","disabled","title"],mn={key:0,class:"spinner-border spinner-border-sm"},vn={key:1,class:"bi bi-trash"},bn={__name:"ScreensTab",setup(a){const{t:s}=me();Ye();const t=Xe(),i=De(),{activeId:d,activeProject:r,saving:p}=je(i),x=M(!1),k=M(!1),m=M(null),f=M(null),n=M(""),g=B(()=>{var N;return((N=r.value)==null?void 0:N.screens)||[]});async function w(N){if(!r.value)return;const T=[...g.value,N];try{await i.savePatch(d.value,{screens:T})}catch(W){ge("화면 생성 실패",W)}}async function $(N){if(!r.value)return;const T=[...g.value,N];try{await i.savePatch(d.value,{screens:T}),t.push({name:"screen-studio",params:{id:d.value,screenId:N.id}})}catch(W){ge("화면 생성 실패",W)}}async function h(N){if(!await ft(N.title,{title:s("screensTab.k21")}))return;m.value=N.id;const T=g.value.filter(W=>W.id!==N.id);try{await i.savePatch(d.value,{screens:T})}catch(W){ge("삭제 실패",W)}finally{m.value=null}}function _(N){f.value=N.id,n.value=N.title}function y(){f.value=null,n.value=""}async function R(N){const T=n.value.trim();if(!T){y();return}if(T===N.title){y();return}const W=g.value.map(J=>J.id===N.id?{...J,title:T,header:{...J.header||{},title:T}}:J);try{await i.savePatch(d.value,{screens:W})}catch(J){ge("이름 변경 실패",J)}finally{y()}}async function P(N,T){const W=g.value.findIndex(le=>le.id===N.id),J=W+T;if(W<0||J<0||J>=g.value.length)return;const G=[...g.value],[ue]=G.splice(W,1);G.splice(J,0,ue);try{await i.savePatch(d.value,{screens:G})}catch(le){ge("이동 실패",le)}}function A(N){t.push({name:"screen-studio",params:{id:d.value,screenId:N.id}})}function te(N){return N.kind!=="composite"||!Array.isArray(N.rows)?0:N.rows.reduce((T,W)=>{var J;return T+(((J=W.widgets)==null?void 0:J.length)||0)},0)}function j(N){return Array.isArray(N==null?void 0:N.rows)?N.rows.length:0}function q(N){var W;const T=((W=N.header)==null?void 0:W.kind)||"page-title";return bt(T).label}return(N,T)=>(l(),c("div",null,[e("div",Ir,[e("div",null,[e("h6",Dr,[T[5]||(T[5]=e("i",{class:"bi bi-collection me-1"},null,-1)),S(o(u(s)("screensTab.k1"))+" ",1),e("span",Wr,o(g.value.length),1)]),e("p",zr,o(u(s)("screensTab.k2")),1)]),e("button",{class:"btn btn-outline-primary btn-sm me-2",onClick:T[0]||(T[0]=W=>k.value=!0),disabled:u(p)},[T[6]||(T[6]=e("i",{class:"bi bi-magic me-1"},null,-1)),S(o(u(s)("screensTab.k3")),1)],8,Mr),e("button",{class:"btn btn-primary btn-sm",onClick:T[1]||(T[1]=W=>x.value=!0),disabled:u(p)},[T[7]||(T[7]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),S(o(u(s)("screensTab.k4")),1)],8,Or)]),g.value.length===0?(l(),c("div",Ur,[e("div",Br,[T[8]||(T[8]=e("i",{class:"bi bi-collection fs-1 d-block mb-3 opacity-50"},null,-1)),e("div",Kr,o(u(s)("screensTab.k5")),1),e("div",Fr,[S(o(u(s)("screensTab.k6"))+" ",1),e("em",null,o(u(s)("screensTab.k7")),1),S(" "+o(u(s)("screensTab.k8")),1)])])])):(l(),c("div",qr,[e("div",Hr,[e("table",Jr,[e("thead",Gr,[e("tr",null,[T[9]||(T[9]=e("th",{style:{width:"40px"}},"#",-1)),e("th",null,o(u(s)("screensTab.k9")),1),e("th",null,o(u(s)("screensTab.k10")),1),e("th",Zr,o(u(s)("screensTab.k11")),1),T[10]||(T[10]=e("th",{style:{width:"90px"}},"Row / Widget",-1)),e("th",Yr,o(u(s)("screensTab.k12")),1)])]),e("tbody",null,[(l(!0),c(I,null,ee(g.value,(W,J)=>(l(),c("tr",{key:W.id},[e("td",Xr,o(J+1),1),e("td",null,[f.value===W.id?(l(),c("div",Qr,[Y(e("input",{"onUpdate:modelValue":T[2]||(T[2]=G=>n.value=G),class:"form-control form-control-sm",onKeyup:[Re(G=>R(W),["enter"]),Re(y,["escape"])],ref_for:!0,ref:"renameInputEl"},null,40,en),[[Q,n.value]]),e("button",{class:"btn btn-sm btn-success",onClick:G=>R(W),title:u(s)("screensTab.k14")},[...T[11]||(T[11]=[e("i",{class:"bi bi-check-lg"},null,-1)])],8,tn),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:y,title:u(s)("screensTab.k15")},[...T[12]||(T[12]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,sn)])):(l(),c("a",{key:1,href:"#",class:"text-decoration-none",onClick:Ie(G=>A(W),["prevent"])},[e("strong",null,o(W.title),1)],8,an))]),e("td",rn,[e("code",null,o(W.path),1)]),e("td",nn,o(q(W)),1),e("td",on,o(j(W))+" / "+o(te(W)),1),e("td",null,[e("button",{class:"btn btn-sm btn-outline-primary me-1",onClick:G=>A(W),title:u(s)("screensTab.k16")},[T[13]||(T[13]=e("i",{class:"bi bi-pencil-square"},null,-1)),S(" "+o(u(s)("screensTab.k13")),1)],8,ln),e("div",dn,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:G=>P(W,-1),disabled:J===0,title:u(s)("screensTab.k17")},[...T[14]||(T[14]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,cn),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:G=>P(W,1),disabled:J===g.value.length-1,title:u(s)("screensTab.k18")},[...T[15]||(T[15]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,un)]),e("button",{class:"btn btn-sm btn-outline-secondary me-1",onClick:G=>_(W),title:u(s)("screensTab.k19")},[...T[16]||(T[16]=[e("i",{class:"bi bi-pencil"},null,-1)])],8,pn),e("button",{class:"btn btn-sm btn-outline-danger",onClick:G=>h(W),disabled:m.value===W.id,title:u(s)("screensTab.k20")},[m.value===W.id?(l(),c("span",mn)):(l(),c("i",vn))],8,fn)])]))),128))])])])])),x.value?(l(),xe(ui,{key:2,onClose:T[3]||(T[3]=W=>x.value=!1),onCreated:w})):V("",!0),_e(Vr,{show:k.value,onClose:T[4]||(T[4]=W=>k.value=!1),onCreate:$},null,8,["show"])]))}};function ce(a){return String(a||"").replace(/(?:^|[-_\s])(.)/g,(s,t)=>t.toUpperCase())}function Qe(a){const s=ce(a);return s.charAt(0).toLowerCase()+s.slice(1)}function Ke(a){return String(a||"").replace(/[^a-zA-Z0-9_\-.]/g,"")||"screen"}function hn(a,s="  "){return String(a||"").split(`
`).map(t=>t.length?s+t:t).join(`
`)}function F(a){return String(a??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function gn(a){if(!a)return"item";const s=String(a).split("/").filter(Boolean);for(let t=s.length-1;t>=0;t--){const i=s[t];if(!i||i.startsWith(":")||i.startsWith("{")||/^(api|admin|v\d+|auth|internal)$/i.test(i)||/^(paged|search|count|summary|export|import|batch|bulk|new|edit)$/i.test(i)||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(i))continue;let d=i.toLowerCase();return d.endsWith("ies")?d=d.slice(0,-3)+"y":d.endsWith("s")&&!d.endsWith("ss")&&(d=d.slice(0,-1)),d||"item"}return"item"}function yn({imports:a=[],setup:s="",template:t="",style:i=""}={}){const r=[a.filter(Boolean).join(`
`),"",s].filter(Boolean).join(`
`),p=[];return p.push("<script setup>"),p.push(r),p.push("<\/script>"),p.push(""),p.push("<template>"),p.push(hn(t,"  ")),p.push("</template>"),i&&i.trim()&&(p.push(""),p.push("<style scoped>"),p.push(i.trim()),p.push("</style>")),p.push(""),p.join(`
`)}function Fe(a){const s=a==null?void 0:a.onRowClick;return!s||s.action!=="navigate"||!s.target?"":` :row-clickable="true" @row-click="onRowClick_${a.id}"`}function xn(a,s=[]){const t=[];let i=!1;for(const d of(a==null?void 0:a.rows)||[])for(const r of d.widgets||[]){const p=r==null?void 0:r.onRowClick;if(!p||p.action!=="navigate"||!p.target)continue;i=!0;const x=s.find(f=>f.id===p.target),k=ce(x?Ce(x):p.target),m=Object.entries(p.params||{}).filter(([,f])=>f).map(([f,n])=>/^row\.([\w$]+)$/.test(n)?`${f}: row.${/^row\.([\w$]+)$/.exec(n)[1]}`:`${f}: ${JSON.stringify(n)}`);t.push(""),t.push(`/** 화면 디자이너: '${r.title||r.kind}' 행 클릭 → ${(x==null?void 0:x.title)||p.target} */`),t.push(`function onRowClick_${r.id}(row) {`),t.push(`  router.push({ name: '${k}'${m.length?`, params: { ${m.join(", ")} }`:""} });`),t.push("}")}return{needsRouter:i,lines:t}}function kn(a,{resourceCollector:s=new Map,screens:t=[]}={}){const i=et(a,s);i.rowClick=xn(a,t);const d=$n(i),r=_n(i),p=Cn(i);return{path:`src/views/${Ce(a)}.vue`,content:yn({imports:d,setup:r,template:p,style:Tn}),source:"screen",specId:a.id,kind:"composite"}}function Te(a){const s=String((a==null?void 0:a.path)||"/").replace(/\/+$/,"")||"/",t=Array.isArray(a==null?void 0:a.params)?a.params:[];if(!t.length)return(a==null?void 0:a.path)||"/";const i=new Set([...String((a==null?void 0:a.path)||"").matchAll(/(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)\??/g)].map(r=>r[1])),d=t.filter(r=>!i.has(r.name)).map(r=>`:${r.name}${r.required===!1?"?":""}`);return d.length?`${s==="/"?"":s}/${d.join("/")}`:(a==null?void 0:a.path)||"/"}function Ce(a){if(a.generatedViewName)return a.generatedViewName;const s=Ke(ce(a.title||""));if(s.toLowerCase()!=="screen")return s+"View";const t=Ke(ce(String(a.path||"").replace(/:/g,"").split("/").filter(Boolean).join("-")));if(t.toLowerCase()!=="screen")return t+"View";const i=String(a.id||"").replace(/[^\w]/g,"").slice(-6)||"Main";return"Screen"+ce(i)+"View"}function wn(a,s){const t=a.flatMap(d=>(d.rows||[]).flatMap(r=>r.widgets||[])).filter(d=>{var r;return((r=d.source)==null?void 0:r.type)==="endpoint"}),i=d=>["GET","HEAD"].includes(String(d.source.method||"GET").toUpperCase())?/[{:]/.test(d.source.path||"")?2:["list","listPaged"].includes(d.kind)?0:1:3;t.sort((d,r)=>i(d)-i(r)),et({rows:[{widgets:t}]},s)}function et(a,s){var m;const t=new Map,i=new Map,d=[],r=new Set;let p=0;function x(f,n){let g=Qe(f);if(!g)return null;if(n){const $=_=>JSON.stringify([_.method.toUpperCase(),_.endpointPath,_.resultKey||null]),h=[...s.entries()].find(([,_])=>$(_)===$(n));if(h)g=h[0];else if(s.has(g)){const _=ce(n.method.toLowerCase())+ce(n.endpointPath.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"")),y=g+_;g=y;let R=2;for(;s.has(g);)g=y+R++}}s.has(g)||s.set(g,{key:g,Pascal:ce(g),endpointPath:(n==null?void 0:n.endpointPath)||`/api/${g}s`,method:(n==null?void 0:n.method)||"GET",resultKey:(n==null?void 0:n.resultKey)||null,realtime:!!(n!=null&&n.realtime)&&!!(n!=null&&n.streamPath),streamPath:(n==null?void 0:n.streamPath)||null});const w=s.get(g);return n!=null&&n.realtime&&n.streamPath&&(w.realtime=!0,w.streamPath=n.streamPath),t.set(g,w),g}function k(f){const n={primary:"null",rowsExpr:"[]",loading:"false",error:"''"},g=f.source;if(!g)return n;if(g.type==="endpoint"){const w=gn(g.path||""),$=x(w,{endpointPath:g.path,method:g.method||"GET",resultKey:g.resultKey||null,realtime:g.realtime,streamPath:g.streamPath});if(!$)return n;const h=!!(g.realtime&&g.streamPath);return{storePrefix:$,primary:`${$}CurrentItem`,rowsExpr:`${$}Rows`,loading:`${$}Loading`,error:`${$}Error`,realtime:h,realtimeConnectedExpr:h?`${$}Store.realtimeConnected`:null}}if(g.type==="storeState"){if(!g.resourceKey||!g.stateName)return n;const w=x(g.resourceKey,null);if(!w)return n;const $=`${w}${ce(g.stateName)}`;return{storePrefix:w,primary:$,rowsExpr:`${w}Rows`,loading:`${w}Loading`,error:`${w}Error`}}if(g.type==="storeCompute"){if(!g.resourceKey||!g.stateName)return n;const w=x(g.resourceKey,null);if(!w)return n;const $=`${w}${ce(g.stateName)}`,h=`c${++p}`;return d.push(`const ${h} = computed(() => ${Pn($,g)});`),{storePrefix:w,primary:h,rowsExpr:$,loading:`${w}Loading`,error:`${w}Error`}}return g.type==="customVar"&&g.varName?{primary:g.varName,rowsExpr:g.varName,loading:"false",error:"''"}:n}for(const f of a.rows||[])for(const n of f.widgets||[])((m=n.source)==null?void 0:m.type)==="endpoint"&&i.set(n.id,k(n));for(const f of a.rows||[])for(const n of f.widgets||[])i.has(n.id)||i.set(n.id,k(n));return{spec:a,usedResources:t,widgetBindings:i,computedDecls:d,exposed:r}}function $n(a){var t;const s=[];if(s.push("import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';"),(t=a.rowClick)!=null&&t.needsRouter&&s.push("import { useRouter } from 'vue-router';"),a.usedResources.size>0){s.push("import { storeToRefs } from 'pinia';");for(const[i,d]of a.usedResources)s.push(`import { use${d.Pascal}Store } from '@/stores/${i}Store';`)}return s.push(""),s.push("import StatWidget from '@/components/widgets/StatWidget.vue';"),s.push("import ListWidget from '@/components/widgets/ListWidget.vue';"),s.push("import ListPagedWidget from '@/components/widgets/ListPagedWidget.vue';"),s.push("import DetailWidget from '@/components/widgets/DetailWidget.vue';"),s.push("import TextWidget from '@/components/widgets/TextWidget.vue';"),s.push("import MarkdownWidget from '@/components/widgets/MarkdownWidget.vue';"),s.push("import QueryFormWidget from '@/components/widgets/QueryFormWidget.vue';"),s.push("import FormDialogWidget from '@/components/widgets/FormDialogWidget.vue';"),s}function _n(a){var m,f,n,g,w,$;const s=[];(m=a.rowClick)!=null&&m.needsRouter&&s.push("const router = useRouter();");for(const[h,_]of a.usedResources)s.push(`const ${h}Store = use${_.Pascal}Store();`),s.push(`const { rows: ${h}Rows, currentItem: ${h}CurrentItem, loading: ${h}Loading, error: ${h}Error, total: ${h}Total, page: ${h}Page, perPage: ${h}PerPage, totalPages: ${h}TotalPages } = storeToRefs(${h}Store);`);if((f=a.spec.customFns)!=null&&f.length){s.push(""),s.push("// User-defined functions");for(const h of a.spec.customFns){const _=(h.params||[]).join(", "),y=(h.body||"return null;").split(`
`).map(R=>"  "+R).join(`
`);s.push(`function ${h.name}(${_}) {`),s.push(y),s.push("}")}}if((n=a.spec.customVars)!=null&&n.length){s.push(""),s.push("// User-defined computed vars");for(const h of a.spec.customVars)s.push(`const ${h.name} = computed(() => (${h.expression||"null"}));`)}if(a.computedDecls.length){s.push(""),s.push("// Widget-level computeds (storeCompute sources)");for(const h of a.computedDecls)s.push(h)}const t=Array.isArray(a.spec.params)&&a.spec.params.length?a.spec.params:ht(a.spec.path);t.length&&(s.push(""),s.push(`const props = defineProps({ ${t.map(h=>`${h.name}: { type: [String, Number], default: null }`).join(", ")} });`));const i=h=>t.some(_=>new RegExp(`(\\{${_.name}\\}|/:${_.name}(?![A-Za-z0-9_]))`).test(String(h.endpointPath||""))),d=[...a.usedResources].filter(([,h])=>["GET","HEAD"].includes(h.method.toUpperCase())),r=h=>(a.spec.rows||[]).flatMap(_=>_.widgets||[]).filter(_=>{var y;return((y=a.widgetBindings.get(_.id))==null?void 0:y.storePrefix)===h}),p=d.filter(([h,_])=>r(h).some(y=>!["formDialog","queryForm"].includes(y.kind))&&(!/[{:]/.test(_.endpointPath)||i(_))),x=[];for(const[h,_]of p)if(t.length&&i(_)){const y=t.map(R=>`${R.name}: props.${R.name}`).join(", ");s.push(`watch(() => [${t.map(R=>`props.${R.name}`).join(", ")}], () => {`),s.push(`  void ${h}Store.fetchOne({ ${y} });`),s.push("}, { immediate: true });")}else{const y=r(h).every(A=>["detail","queryForm"].includes(A.kind)),R=r(h).find(A=>A.kind==="listPaged"),P=R?`{ perPage: ${Math.max(1,Number((g=R.config)==null?void 0:g.perPage)||10)} }`:"";x.push(`  void ${h}Store.${y?"fetchOne":"fetchList"}(${P});`)}const k=d.filter(([,h])=>h.realtime).map(([h])=>h);for(const h of k)x.push(`  ${h}Store.subscribeRealtime();`);if(x.length&&s.push("onMounted(() => {",...x,"});"),a.usedResources.size){s.push("onBeforeUnmount(() => {");for(const[h]of a.usedResources)s.push(`  ${h}Store.cancelReads();`);for(const h of k)s.push(`  ${h}Store.unsubscribeRealtime();`);s.push("});")}return s.push("async function refreshData() {"),s.push(`  await Promise.all([${p.map(([h])=>`${h}Store.refresh()`).join(", ")}]);`),s.push("}"),($=(w=a.rowClick)==null?void 0:w.lines)!=null&&$.length&&s.push(...a.rowClick.lines),s.join(`
`)}function Cn(a){var i;const{spec:s}=a,t=[];if(t.push('<div class="container-fluid py-3">'),s.header&&s.header.kind!=="none"){const d=F(s.header.title||s.title||""),r=F(s.header.subtitle||"");t.push('  <div class="mb-3 pb-2 border-bottom">'),t.push(`    <h2 class="h4 mb-1 fw-semibold">${d}</h2>`),r&&t.push(`    <div class="text-muted small">${r}</div>`),t.push("  </div>")}if(!((i=s.rows)!=null&&i.length))return t.push('  <div class="text-muted text-center py-4">(빈 화면)</div>'),t.push("</div>"),t.join(`
`);for(const d of s.rows){const r=d.style||{},p=r.gap!=null&&r.gap!==16,x=p?"row mb-3":"row g-3 mb-3",k=[];p&&k.push(`gap: ${r.gap}px`),r.padding&&k.push(`padding: ${r.padding}px`),r.bgColor&&k.push(`background-color: ${r.bgColor}`);const m=k.length?` style="${k.join("; ")}"`:"";t.push(`  <div class="${x}"${m}>`);for(let f=0;f<d.widgets.length;f++){const n=d.widgets[f],g=d.widths[f],w=a.widgetBindings.get(n.id)||{primary:"null",rowsExpr:"[]",loading:"false",error:"''"},$=Sn(n);t.push(`    <div class="col-md-${g}"${$}>`),t.push(`      ${An(n,w,a.usedResources.keys().next().value||null)}`),t.push("    </div>")}t.push("  </div>")}return t.push("</div>"),t.join(`
`)}function Sn(a){const s=a.style||{},t=[];return s.height&&s.height!=="auto"&&t.push(`min-height: ${s.height}px`),t.length?` style="${t.join("; ")}"`:""}function An(a,s,t=null){var x;const i=F(a.title||""),d=a.config||{};switch({chart:"list",progress:"stat",timeline:"list",form:"detail",button:"markdown",search:"text",image:"markdown"}[a.kind]||a.kind){case"stat":return`<StatWidget label="${i}" :value="${s.primary}" format="${F(d.format||"number")}" color="${F(d.color||"primary")}" />`;case"list":{const k=s.realtime?` :realtime="true" :realtime-connected="${s.realtimeConnectedExpr}"`:"";return`<ListWidget title="${i}" :rows="${s.rowsExpr}" :loading="${s.loading}" :error="${s.error}" :max-rows="${Number(d.maxRows)||5}"${k}${Fe(a)} />`}case"listPaged":{const k=Number(d.perPage)||10,m=/^[A-Za-z_$][\w$]*Rows$/.test(String(s.rowsExpr))?String(s.rowsExpr).replace(/Rows$/,""):null,f=s.storePrefix||m||t;return f?`<ListPagedWidget title="${i}" :rows="${s.rowsExpr}" :loading="${s.loading}" :error="${s.error}" :page="${f}Page" :per-page="${f}PerPage" :total-pages="${f}TotalPages" :total="${f}Total" :default-per-page="${k}" @change-page="(p) => ${f}Store.fetchList({ page: p, perPage: ${f}PerPage })"${Fe(a)} />`:`<ListPagedWidget title="${i}" :rows="${s.rowsExpr}" :default-per-page="${k}" />`}case"detail":return`<DetailWidget title="${i}" :record="${s.primary}" :loading="${s.loading}" :error="${s.error}" />`;case"text":return`<TextWidget label="${i}" :value="${s.primary}" format="${F(d.format||"auto")}" />`;case"queryForm":{const k=s.storePrefix||t,m=F(JSON.stringify(d.fields||[])),f=F(d.submitLabel||"조회"),n=d.endpointHint?` endpoint-hint="${F(d.endpointHint)}"`:"",g=k?` @submit="(params) => ${k}Store.fetchOne(params)"`:"";return`<QueryFormWidget title="${i}" :fields="${m}" submit-label="${f}"${n} ${g} />`}case"formDialog":{const k=s.storePrefix||t,m=F(JSON.stringify(d.fields||[])),f=F(d.buttonLabel||"실행"),n=F(d.buttonVariant||"primary"),g=F(d.dialogTitle||a.title||f),w=!!d.confirmBeforeSubmit,$=F(((x=a.source)==null?void 0:x.method)||"POST");return`<FormDialogWidget title="${i}" button-label="${f}" button-variant="${n}" dialog-title="${g}" :fields="${m}" :confirm-before-submit="${w}" method="${$}"${k?` :submit-action="(params) => ${k}Store.submitForm('${$}', params)"`:""} @success="refreshData" />`}case"markdown":{let k=String(d.body||"");if(a.kind==="button"){const m=String(a.title||d.label||"버튼"),f=String(d.variant||"primary"),n=a.onRowClick,g=n&&n.action==="navigate"&&n.target?` @click="onRowClick_${a.id}({})"`:"";return`<div class="card h-100"><div class="card-body"><button type="button" class="btn btn-${f}"${g}>${F(m)}</button></div></div>`}return a.kind==="image"?'<div class="card h-100"><div class="card-body text-center"><i class="bi bi-image fs-1 text-muted"></i><div class="small text-muted">(image widget — placeholder)</div></div></div>':(!k&&a.kind!=="markdown"&&(k=`[${a.kind} widget — Phase 24 beta]`),k?`<MarkdownWidget :body="${F(JSON.stringify(k))}" />`:'<MarkdownWidget body="" />')}default:return`<!-- unknown widget kind: ${a.kind} -->`}}function Pn(a,s){const t=s.op||"count",i=s.field,d=s.value,r=a+".value",p=k=>String(k).replace(/[^a-zA-Z0-9_$]/g,""),x=k=>{const m=String(k??"");return m==="true"?"true":m==="false"?"false":m!==""&&!isNaN(Number(m))?String(Number(m)):JSON.stringify(m)};switch(t){case"count":return`(${r} || []).length`;case"sum":return i?`(${r} || []).reduce((a, r) => a + Number(r?.${p(i)} || 0), 0)`:"0";case"avg":return i?`((${r} || []).length === 0 ? 0 : (${r} || []).reduce((a, r) => a + Number(r?.${p(i)} || 0), 0) / (${r} || []).length)`:"0";case"min":return i?`Math.min(...((${r} || []).map((r) => Number(r?.${p(i)} || 0))))`:"0";case"max":return i?`Math.max(...((${r} || []).map((r) => Number(r?.${p(i)} || 0))))`:"0";case"filterCount":return i?`(${r} || []).filter((r) => r?.${p(i)} === ${x(d)}).length`:`(${r} || []).length`;case"pluck":return i?`((${r} || {})?.${p(i)})`:r;case"custom":return s.fnName?`${s.fnName}(${r})`:"null";default:return"null"}}const Tn="",En=Object.freeze({"@eonasdan/tempus-dominus":"6.10.4","@fortawesome/fontawesome-free":"7.3.1",axios:"1.20.0",bootstrap:"5.3.8","bootstrap-icons":"1.13.1","chart.js":"4.5.1","chartjs-plugin-annotation":"3.1.0",moment:"2.31.0",pinia:"4.0.3",vue:"3.5.43","vue-chartjs":"5.3.4","vue-router":"5.3.1"}),Rn=Object.freeze({"@vitejs/plugin-vue":"6.0.9",vite:"8.3.0"}),ne=(a,s)=>({path:a,content:s,source:"scaffold"}),qe=a=>String(a).replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s]);function Nn(a,s){var d;const t=((d=a.config)==null?void 0:d.cssFramework)==="metronic",i=String(a.name||"generated-app").toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^[._-]+|[._-]+$/g,"").slice(0,80)||"generated-app";return[ne("package.json",JSON.stringify({name:i,version:"0.1.0",private:!0,type:"module",engines:{node:">=22.19.0"},scripts:{dev:"vite",build:"vite build",preview:"vite preview"},dependencies:En,devDependencies:Rn},null,2)+`
`),ne("index.html",`<!DOCTYPE html>
<html lang="${String(s||"ko").startsWith("en")?"en":"ko"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${qe(a.name||"App")}</title>
${t?`  <!-- Copy your licensed Metronic assets to public/assets, as in WT-frontend. -->
  <link rel="stylesheet" href="%BASE_URL%assets/plugins/global/plugins.bundle.css" />
  <link rel="stylesheet" href="%BASE_URL%assets/css/style.bundle.css" />`:""}
</head>
<body${t?' id="kt_app_body" class="app-default"':""}>
  <div id="app"></div>
  <script type="module" src="/src/main.js"><\/script>
</body>
</html>
`),ne("vite.config.js",`import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:7901';
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxyPath = apiBase.startsWith('/') && !apiBase.startsWith('//') ? apiBase : '/api';
  return {
    base: env.VITE_APP_BASE || '/',
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      proxy: { [proxyPath]: { target, changeOrigin: true, secure: true } },
    },
  };
});
`),ne("jsconfig.json",JSON.stringify({compilerOptions:{baseUrl:".",paths:{"@/*":["./src/*"]}},exclude:["node_modules","dist"]},null,2)+`
`),ne(".gitignore",`node_modules/
dist/
.env.local
.env.*.local
*.log
`),ne(".env",He(a)),ne(".env.example",He(a)),ne("src/main.js",`import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/main.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

async function start() {
  if (import.meta.env.VITE_AUTH_ENABLED === 'true') await useAuthStore(pinia).bootstrap();
  await router.isReady();
  app.mount('#app');
}
start(); // Font loading must not delay the application.
`),ne("src/App.vue",`<template>
  <AppLayout><RouterView /></AppLayout>
</template>

<script setup>
import { RouterView } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
<\/script>
`),ne("src/assets/base.css",`:root { font-family: "Segoe UI", "Malgun Gothic", sans-serif; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
button, input, select, textarea { font: inherit; }
button:focus-visible, a:focus-visible { outline: 3px solid #93b4fa; outline-offset: 3px; }
`),ne("src/assets/main.css",`@import './base.css';

#app { min-height: 100dvh; width: 100%; }
main, .composite-view, .row > * { min-width: 0; }
.composite-view { width: 100%; }
.table-responsive { overscroll-behavior-x: contain; }
@media (max-width: 767px) {
  [data-layout-kind] > .d-flex.flex-grow-1 { flex-direction: column; }
  [data-layout-kind] > .d-flex.flex-grow-1 > aside { width: 100% !important; border-right: 0 !important; }
  [data-layout-kind] main { padding: 12px !important; }
}
/* Metronic's drawer normally needs its theme runtime. Keep mobile navigation
   usable with Vue and CSS, without a second Bootstrap/DOM runtime. */
@media (max-width: 991.98px) {
  #kt_app_wrapper { margin-left: 0 !important; margin-right: 0 !important; padding-left: 0 !important; padding-right: 0 !important; display: flex !important; flex-direction: column !important; }
  #kt_app_sidebar { display: flex !important; position: static !important; transform: none !important; width: 100% !important; height: auto !important; margin: 0 !important; }
  #kt_app_sidebar .app-sidebar-logo { display: none !important; }
  #kt_app_sidebar_menu_wrapper { margin: 8px 0 !important; }
  #kt_app_main { width: 100%; min-width: 0; margin: 0 !important; }
  #kt_app_header { left: 0 !important; right: 0 !important; width: auto !important; }
  #kt_app_content .app-container { padding: 12px !important; }
}
`),ne("public/assets/README.md",`# Static assets

Keep images, fonts and theme bundles here, matching WT-frontend.
They are served from /assets (or the configured VITE_APP_BASE).

For Metronic, copy your licensed WT-frontend public/assets contents here.
Required CSS: plugins/global/plugins.bundle.css and css/style.bundle.css.
The generator uses Vue for navigation and dialog state; do not add duplicate
Bootstrap, jQuery, charts or unused CDN scripts to index.html.
`),ne("src/views/WelcomeView.vue",`<script setup>
// The initial route when the project has no parameter-free screen.
<\/script>

<template><section class="card"><div class="card-body"><h1 class="h5">${qe(a.name||"App")}</h1><p class="text-secondary mb-0">${String(s||"").startsWith("en")?"Choose a screen from the menu.":"메뉴에서 화면을 선택해 주세요."}</p></div></section></template>
`),jn(a,s)]}function He(a){var d;let s="http://localhost:7901",t="/api";const i=String(((d=a.config)==null?void 0:d.apiBaseUrl)||"").trim();if(i)if(/^https?:\/\//i.test(i)){const r=new URL(i);if(r.username||r.password||r.search||r.hash)throw new Error("API URL must not include credentials, query or fragment");s=r.origin,r.pathname!=="/"&&r.pathname!=="/api"&&r.pathname!=="/api/"&&(t=r.origin+r.pathname.replace(/\/$/,""))}else if(/^\/(?!\/)[^\r\n#'"`]*$/.test(i))t=i.replace(/\/$/,"")||"/api";else throw new Error("Use an HTTP(S) server URL or an absolute API path");return`# Public client configuration only; never put secrets in VITE_* variables.
VITE_API_BASE_URL=${t}
VITE_API_PROXY_TARGET=${s}
VITE_API_TIMEOUT=15000
VITE_AUTH_ENABLED=false
VITE_APP_BASE=/
# HTTPS private CA, if required for the Vite proxy: set NODE_EXTRA_CA_CERTS before npm run dev.
`}function Ln(a=[]){const s=a.map(t=>`    { path: ${JSON.stringify(Te(t))}, name: ${JSON.stringify(ce(Ce(t)))}, props: true, component: () => import('../views/${Ce(t)}.vue') },`);if(!a.some(t=>Te(t)==="/")){const t=a.find(i=>!Te(i).includes(":"));s.unshift(t?`    { path: '/', redirect: ${JSON.stringify(Te(t))} },`:"    { path: '/', name: 'Welcome', component: () => import('../views/WelcomeView.vue') },")}return ne("src/router/index.js",`import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
${s.join(`
`)}
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
`)}function jn(a,s){const i=String(s||"").startsWith("en")?`# ${a.name||"Generated project"}

Vue 3 + Vite, preserving the WT-frontend teaching structure. All Vue components
use JavaScript with script setup. Run with Node.js 22.19+ (Node 24 recommended).

\`npm install\` → \`npm run dev\`; production build: \`npm run build\`.
Commit the generated package-lock.json and use \`npm ci\` for subsequent installs.

- src/main.js and src/App.vue: application entry and RouterView.
- src/router/index.js: all routes, with lazy imports from src/views.
- src/api/axios.js: shared Axios instance, configuration, errors and authentication.
- src/stores: ref + defineStore setup stores; views use storeToRefs.
- src/views: generated screens. src/components: layouts and reusable widgets.
- src/assets/base.css and main.css: base and responsive application styles.
- public/assets: static images, fonts and optional licensed Metronic bundles.

Edit .env: VITE_API_PROXY_TARGET points to your API server. Development uses /api
through the Vite proxy; production must proxy /api as well, or set
VITE_API_BASE_URL to an explicit API origin and configure server CORS.
Set VITE_AUTH_ENABLED=true when using the application's /api/auth endpoints.
Do not put secrets in VITE_* variables. For a private HTTPS certificate, trust its
CA with NODE_EXTRA_CA_CERTS before running Vite; TLS verification stays enabled.

Stores preserve query/page state, cancel superseded reads and expose errors.
Writes reject on failure; a form closes only after the write succeeds.
Axios responses keep the normal res.data shape; unwrapResponse(res) extracts the
aidot-express envelope. /api is not duplicated when endpoint paths already have it.

Metronic selection: copy your licensed public/assets from WT-frontend into this
project before running it. No commercial theme binaries are redistributed here.
The supplied chart/date/icon packages remain available for your lesson code.
`:`# ${a.name||"생성된 프로젝트"}

WT-frontend의 강의용 기본 구조를 유지한 Vue3 + Vite 프로젝트입니다.
JavaScript와 script setup을 사용합니다. Node.js 22.19 이상에서 실행하세요.

\`npm install\` → \`npm run dev\`; 배포 빌드는 \`npm run build\`입니다.
처음 설치 후 생긴 package-lock.json을 보관하고 이후에는 \`npm ci\`를 사용하세요.

- src/main.js · src/App.vue: 앱 생성, Pinia/Router 등록, RouterView
- src/router/index.js: 화면 라우트와 views의 지연 로딩
- src/api/axios.js: 공통 Axios 인스턴스, 서버 주소, 오류·인증 처리
- src/stores: ref + defineStore 방식; 화면에서는 storeToRefs로 상태 사용
- src/views: 화면 파일; src/components: 공통 레이아웃과 위젯
- src/assets/base.css · main.css: 기본 스타일과 반응형 화면
- public/assets: 이미지·폰트·선택한 Metronic 테마

.env의 VITE_API_PROXY_TARGET에 서버 주소를 넣으세요. 개발 중 /api 요청은
Vite가 프록시합니다. 배포 시에도 /api를 서버로 프록시하거나
VITE_API_BASE_URL에 실제 API 주소를 넣고 서버의 CORS를 설정하세요.
일반 사용자 /api/auth 인증을 사용하면 VITE_AUTH_ENABLED=true로 설정합니다.
VITE_*에는 비밀 값을 넣지 마세요. 자체 HTTPS 인증서는 Vite 실행 전에
NODE_EXTRA_CA_CERTS로 신뢰할 CA를 지정합니다.

조회는 검색조건·페이지를 유지하고 이전 요청을 취소해 응답 역전을 막습니다.
저장은 실패 시 오류를 전달하며 대화상자는 성공한 뒤에 닫힙니다.
Axios의 res.data 형식은 그대로 유지하고, unwrapResponse(res)로 서버의
data를 꺼냅니다. /api가 중복되는 경로도 공통 모듈에서 처리합니다.

Metronic을 선택했다면 사용 권한이 있는 WT-frontend의 public/assets를
이 프로젝트의 public/assets로 복사하세요. 상용 테마 파일은 포함하지 않습니다.
참조 프로젝트의 차트·날짜·아이콘 패키지도 강의 코드에서 사용할 수 있습니다.
`;return ne("README.md",i)}const We=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-and-side"]),ze=new Set(["top-nav","top-and-side","hero-landing"]),Me=new Set(["sidebar-both"]);function Vn(a,s="bootstrap"){const t=a||{},i=t.kind||"sidebar-left",d=t.title||{},r=t.sidebar||{},p=t.mainArea||{},x=s==="metronic",k=[];return k.push(In(i,d,r,p,x)),k.push(Mn(d,x,i)),We.has(i)&&k.push(On(r,i==="sidebar-dark"||i==="sidebar-both",x)),ze.has(i)&&k.push(Un(r,x,i)),Me.has(i)&&k.push(Bn(x)),k.map(m=>({...m,path:m.path.replace("src/layouts/components/","src/components/").replace("src/layouts/","src/components/"),content:m.content.replaceAll("from './components/","from './").replaceAll("<RouterView />","<slot />")}))}function In(a,s,t,i,d){return d?Wn(a):Dn(a,s,t,i)}function Dn(a,s,t,i){const d=Math.max(160,Math.min(320,Number(t.width)||220)),r=i.bgColor||"#f5f7fa",p=Math.max(0,Math.min(48,Number(i.padding)||16)),x=["AppHeader"];We.has(a)&&x.push("AppSidebar"),ze.has(a)&&x.push("AppTopNav"),Me.has(a)&&x.push("AppAuxPanel");const k=x.map(n=>`import ${n} from './components/${n}.vue';`).join(`
`);let m;switch(a){case"sidebar-left":case"sidebar-dark":{m=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${d}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`;break}case"sidebar-right":{m=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${d}px;">
        <AppSidebar />
      </aside>
    </div>`;break}case"sidebar-both":{const n=Math.round(d*.6);m=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${d}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${n}px;">
        <AppAuxPanel />
      </aside>
    </div>`;break}case"top-nav":{m=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
      <RouterView />
    </main>`;break}case"top-and-side":{m=`
    <AppTopNav />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${d}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`;break}case"hero-landing":{m=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r};">
      <RouterView />
    </main>`;break}case"split-panel":{m=`
    <AppHeader />
    <main class="flex-grow-1 d-flex" style="background-color: ${r}; padding: ${p}px;">
      <RouterView />
    </main>`;break}case"card-grid":{m=`
    <AppHeader />
    <main class="flex-grow-1 container-fluid" style="background-color: ${r}; padding: ${p}px;">
      <RouterView />
    </main>`;break}default:m=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${d}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${p}px;">
        <RouterView />
      </main>
    </div>`}return{path:"src/layouts/AppLayout.vue",content:`<script setup>
${k}
<\/script>

<template>
  <div class="d-flex flex-column min-vh-100" data-layout-kind="${a}">${m}
  </div>
</template>
`,source:"scaffold"}}function Wn(a,s,t,i){const d=["AppHeader"];We.has(a)&&d.push("AppSidebar"),ze.has(a)&&d.push("AppTopNav"),Me.has(a)&&d.push("AppAuxPanel");const r=d.map(f=>`import ${f} from './components/${f}.vue';`).join(`
`),p=zn(a);let x;switch(a){case"sidebar-left":case"sidebar-dark":x=`
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
      </div>`;break;case"sidebar-right":x=`
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
      </div>`;break;case"sidebar-both":x=`
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
      </div>`;break;case"top-nav":x=`
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
      </div>`;break;case"top-and-side":x=`
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
      </div>`;break;case"hero-landing":x=`
      <AppTopNav />
      <div class="flex-column-fluid" id="kt_app_content">
        <RouterView />
      </div>`;break;case"split-panel":x=`
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
      </div>`;break;case"card-grid":x=`
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
      </div>`;break;default:x=`
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
      </div>`}const k=Object.entries(p).map(([f,n])=>`[${JSON.stringify(f)}, ${JSON.stringify(n)}]`).join(", ");return{path:"src/layouts/AppLayout.vue",content:`<script setup>
// Metronic 은 body 의 data-kt-app-* attribute 조합으로 layout 모양을 결정합니다.
// demo38 의 body 를 참고하여 mount 시점에 적절한 속성을 설정합니다.
import { onMounted, onBeforeUnmount } from 'vue';
${r}

const BODY_ATTRS = [${k}];
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
  <div class="d-flex flex-column flex-root app-root" id="kt_app_root" data-layout-kind="${a}">
    <div class="app-page flex-column flex-column-fluid" id="kt_app_page">${x}
    </div>
  </div>
</template>
`,source:"scaffold"}}function zn(a){const s={"data-kt-app-layout":"dark-sidebar","data-kt-app-header-fixed":"true","data-kt-app-header-fixed-mobile":"true","data-kt-app-sidebar-enabled":"true","data-kt-app-sidebar-fixed":"true","data-kt-app-sidebar-hoverable":"true","data-kt-app-sidebar-push-header":"true","data-kt-app-sidebar-push-toolbar":"true","data-kt-app-sidebar-push-footer":"true","data-kt-app-toolbar-enabled":"true"};switch(a){case"sidebar-left":return{...s,"data-kt-app-layout":"light-sidebar"};case"sidebar-dark":return{...s,"data-kt-app-layout":"dark-sidebar"};case"sidebar-right":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-position":"end"};case"sidebar-both":return{...s,"data-kt-app-layout":"dark-sidebar","data-kt-app-aside-enabled":"true"};case"top-nav":return{"data-kt-app-layout":"dark-header","data-kt-app-header-fixed":"true","data-kt-app-sidebar-enabled":"false","data-kt-app-toolbar-enabled":"true"};case"top-and-side":return{...s,"data-kt-app-layout":"dark-header"};case"hero-landing":return{"data-kt-app-layout":"blank","data-kt-app-sidebar-enabled":"false","data-kt-app-header-fixed":"false"};case"split-panel":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};case"card-grid":return{...s,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};default:return s}}function Mn(a,s,t){const i=a.text||"",d=a.logoUrl||"",r=Math.max(40,Math.min(120,Number(a.height)||60));if(s)return t==="hero-landing"?{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <div class="landing-header" data-kt-sticky="true" data-kt-sticky-name="landing-header" data-kt-sticky-offset="{default: '200px', lg: '300px'}">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-equal">
          ${d?`<img alt="logo" src="${F(d)}" class="h-40px" />`:""}
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
        ${d?`<img src="${F(d)}" alt="logo" class="h-40px me-3" />`:""}
        <h3 class="app-header-title m-0 fw-bold">${i}</h3>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"};const p=a.bgColor||"#ffffff",x=a.fgColor||"#0f172a";return{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <header class="d-flex align-items-center border-bottom px-3"
          style="height: ${r}px; background-color: ${p}; color: ${x};">
    ${d?`<img src="${F(d)}" alt="logo" class="me-2" style="max-height: ${r-16}px;" />`:""}
    <h1 class="h5 m-0">${i}</h1>
  </header>
</template>
`,source:"scaffold"}}function On(a,s,t){const i=Array.isArray(a.items)?a.items:[];if(t){const x=i.map(m=>{const f=F(m.label||""),n=F(m.path||"#"),g=m.icon||"bi-circle";return`        <div class="menu-item">
          <RouterLink to="${n}" class="menu-link">
            <span class="menu-icon">
              <i class="bi ${g}"></i>
            </span>
            <span class="menu-title">${f}</span>
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
        <span class="fs-3 fw-bold ${s?"text-white":"text-body"}">${F(a.brand||"App")}</span>
      </RouterLink>
    </div>
    <div class="app-sidebar-menu overflow-hidden flex-column-fluid">
      <div id="kt_app_sidebar_menu_wrapper"
           class="app-sidebar-wrapper hover-scroll-overlay-y my-5">
        <div class="menu menu-column menu-rounded menu-sub-indention px-3">
${x||"          <!-- 메뉴 항목 없음 -->"}
        </div>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"}}const d=s?"bg-dark text-white":"bg-light",r=i.map(x=>{const k=F(x.label||""),m=F(x.path||"#"),f=x.icon||"bi-file-earmark";return`    <li class="nav-item">
      <RouterLink to="${m}" class="nav-link ${s?"text-white-50":""}">
        <i class="bi ${f} me-2"></i>${k}
      </RouterLink>
    </li>`}).join(`
`);return{path:"src/layouts/components/AppSidebar.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="d-flex flex-column h-100 ${d} p-2">
    <ul class="nav flex-column">
${r||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function Un(a,s,t){const i=Array.isArray(a.items)?a.items:[];if(s)return t==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div class="landing-menu-wrapper d-flex align-items-center flex-equal flex-lg-end" data-kt-drawer="true" data-kt-drawer-name="landing-menu">
    <div class="menu menu-rounded menu-column menu-lg-row menu-title-gray-500 menu-state-title-primary fw-semibold fs-6" id="kt_landing_menu">
${i.map(f=>{const n=F(f.label||"");return`      <div class="menu-item">
        <RouterLink to="${F(f.path||"#")}" class="menu-link nav-link py-3 px-4 px-xxl-6">
          <span class="menu-title">${n}</span>
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
${i.map(k=>{const m=F(k.label||"");return`      <div class="menu-item">
        <RouterLink to="${F(k.path||"#")}" class="menu-link">
          <span class="menu-title">${m}</span>
        </RouterLink>
      </div>`}).join(`
`)||"      <!-- 메뉴 항목 없음 -->"}
    </div>
  </div>
</template>
`,source:"scaffold"};const d=i.map(p=>{const x=F(p.label||"");return`      <li class="nav-item">
        <RouterLink to="${F(p.path||"#")}" class="nav-link">${x}</RouterLink>
      </li>`}).join(`
`);return t==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top">
    <div class="container">
      <div class="navbar-nav d-flex flex-row gap-3">
${d||"        <!-- 메뉴 항목 없음 -->"}
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
${d||"      <!-- 메뉴 항목 없음 -->"}
    </ul>
  </nav>
</template>
`,source:"scaffold"}}function Bn(a){return a?{path:"src/layouts/components/AppAuxPanel.vue",content:`<script setup><\/script>

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
`,source:"scaffold"}}const Kn={loading:"불러오는 중…",noData:"데이터가 없습니다.",noSelection:"선택된 항목이 없습니다.",yes:"예",no:"아니오",done:"완료되었습니다.",confirmProceed:"계속 진행할까요?",live:"실시간",disconnected:"연결 끊김",refreshed:"갱신됨",moreCount:"{n}개 더",totalCount:"총 {n}건",submitQuery:"조회",submitRun:"실행",valueRequired:" 값을 입력하세요.",close:"닫기",cancel:"취소",first:"맨앞",prev:"이전",next:"다음",last:"맨뒤"},Fn={loading:"Loading…",noData:"No data.",noSelection:"Nothing selected.",yes:"Yes",no:"No",done:"Done.",confirmProceed:"Go ahead?",live:"Live",disconnected:"Disconnected",refreshed:"Updated",moreCount:"{n} more",totalCount:"{n} total",submitQuery:"Search",submitRun:"Run",valueRequired:" is required.",close:"Close",cancel:"Cancel",first:"First",prev:"Previous",next:"Next",last:"Last"};function qn(a){return String(a||"").startsWith("en")?Fn:Kn}function Hn(a){const s=qn(a);return[{path:"src/components/widgets/StatWidget.vue",content:Jn,source:"widget"},{path:"src/components/widgets/ListWidget.vue",content:Gn(s),source:"widget"},{path:"src/components/widgets/ListPagedWidget.vue",content:Qn(s),source:"widget"},{path:"src/components/widgets/DetailWidget.vue",content:Zn(s),source:"widget"},{path:"src/components/widgets/TextWidget.vue",content:Yn(s),source:"widget"},{path:"src/components/widgets/MarkdownWidget.vue",content:Xn,source:"widget"},{path:"src/components/widgets/QueryFormWidget.vue",content:eo(s),source:"widget"},{path:"src/components/widgets/FormDialogWidget.vue",content:to(s),source:"widget"}]}const Jn=`<script setup>
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
`,Gn=a=>`<script setup>
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
  if (typeof value === 'boolean') return value ? '${a.yes}' : '${a.no}';
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
          {{ realtimeConnected ? '${a.live}' : '${a.disconnected}' }}
        </span>
        <span v-if="justUpdated" class="badge bg-primary ms-2">${a.refreshed}</span>
      </span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${a.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!effectiveRows.length" class="text-center text-muted py-4">${a.noData}</div>
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
        +{{ hiddenCount }}${a.moreCount.replace("{n}","")}
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
`,Zn=a=>`<script setup>
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
  if (typeof value === 'boolean') return value ? '${a.yes}' : '${a.no}';
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
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${a.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-center text-muted py-4">${a.noSelection}</div>
      <dl v-else class="row mb-0 small">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt class="col-sm-4 text-muted fw-normal">{{ f.label }}</dt>
          <dd class="col-sm-8 mb-2">{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
`,Yn=a=>`<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String, Boolean], default: null },
  format: { type: String, default: 'auto' },
});

const display = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${a.yes}' : '${a.no}';
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
`,Xn=`<script setup>
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
`,Qn=a=>`<script setup>
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
  if (typeof v === 'boolean') return v ? '${a.yes}' : '${a.no}';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge bg-secondary ms-2">${a.totalCount.replace("{n}","")}{{ total }}</span>
      <span v-if="totalPages > 1" class="text-muted small ms-auto">{{ page }} / {{ totalPages }}</span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>${a.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!(rows || []).length" class="text-center text-muted py-4">${a.noData}</div>
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
`,eo=a=>`<script setup>
/**
 * QueryFormWidget — 입력값을 입력받아 상위에 @submit 이벤트로 전달.
 *   사용자 코드에서 이 이벤트를 받아 store.fetchOne(params) 를 호출.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },       // [{ name, label, type, required, default, placeholder }]
  submitLabel: { type: String, default: '${a.submitQuery}' },
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
      localError.value = f.label + '${a.valueRequired}';
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
`,to=a=>`<script setup>
/**
 * FormDialogWidget — 버튼 + 모달 + 폼.
 *   [버튼] 클릭 → 모달 열림 → 사용자 입력 → [제출] → submitAction(params) 비동기 함수.
 *   submitAction에서 store.submitForm(method, params)를 기다리고, 성공 시 @success 이벤트로 refresh 유도.
 */
import { ref, reactive, onBeforeUnmount, useId } from 'vue';
import { errorMessage } from '@/api/axios';

const props = defineProps({
  title: { type: String, default: '' },
  buttonLabel: { type: String, default: '${a.submitRun}' },
  buttonVariant: { type: String, default: 'primary' },
  dialogTitle: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  confirmBeforeSubmit: { type: Boolean, default: false },
  method: { type: String, default: 'POST' },
  submitAction: { type: Function, default: null },
});
const emit = defineEmits(['success']);
const titleId = useId();
let closeTimer = null;
let disposed = false;
onBeforeUnmount(() => { disposed = true; clearTimeout(closeTimer); });

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
function openDialog() { clearTimeout(closeTimer); reset(); open.value = true; }
function closeDialog() { if (!submitting.value) open.value = false; }

async function doSubmit() {
  if (submitting.value || success.value) return;
  error.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      error.value = f.label + '${a.valueRequired}';
      return;
    }
  }
  if (props.confirmBeforeSubmit && !confirm('${a.confirmProceed}')) return;
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
    // Vue emit() does not return the parent's Promise; await the action prop.
    if (!props.submitAction) throw new Error('API 연결을 설정해 주세요.');
    await props.submitAction(out);
    if (disposed) return;
    success.value = '${a.done}';
    emit('success');
    closeTimer = setTimeout(() => { open.value = false; }, 600);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    submitting.value = false;
  }
}
<\/script>

<template>
  <div class="d-inline-block">
    <button :class="'btn btn-' + (buttonVariant || 'primary')" @click="openDialog">{{ buttonLabel }}</button>
    <div v-if="open" role="dialog" aria-modal="true" :aria-labelledby="titleId" @keydown.esc="closeDialog"
         class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
         style="background: rgba(15, 23, 42, 0.45); z-index: 2000;"
         @click.self="closeDialog">
      <div class="card" style="width: 100%; max-width: 480px;">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 :id="titleId" class="mb-0">{{ dialogTitle || buttonLabel }}</h5>
          <button type="button" class="btn-close" @click="closeDialog" :disabled="submitting" aria-label="Close"></button>
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
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">${a.cancel}</button>
          <button :class="'btn btn-sm btn-' + (buttonVariant || 'primary')"
                  @click="doSubmit" :disabled="submitting || !!success">
            <span v-if="submitting">…</span>
            <span v-else>{{ buttonLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;function so(){return{path:"src/api/axios.js",source:"common",content:`import axios from 'axios';

const env = import.meta.env || {};
const BASE_URL = String(env.VITE_API_BASE_URL || '/api').replace(/\\/$/, '');
const timeout = Math.max(1000, Number(env.VITE_API_TIMEOUT) || 15000);
const api = axios.create({ baseURL: BASE_URL, timeout, withCredentials: true });
const authApi = axios.create({ baseURL: BASE_URL, timeout, withCredentials: true });
let accessToken = null;
let refreshPromise = null;
let sessionVersion = 0;
const listeners = new Set();

export function setAccessToken(token) {
  sessionVersion++;
  accessToken = token || null;
  for (const callback of listeners) callback(accessToken);
}
export function getAccessToken() { return accessToken; }
export function onAccessTokenChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Axios keeps its normal response shape: response.data is the server body.
export function unwrapResponse(response) {
  const body = response?.data;
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.hasOwn(body, 'data') && ('code' in body || 'header' in body || 'message' in body || Object.keys(body).length === 1)
    ? body.data : body;
}
export function errorMessage(error) {
  return error?.response?.data?.message || error?.message || '요청을 처리하지 못했습니다.';
}
export function isCanceled(error) { return axios.isCancel(error) || error?.name === 'AbortError'; }

// Accept both api.get('/books') and designer endpoints such as '/api/books'.
export function apiPath(input) {
  let value = String(input || '');
  if (/^(?:[a-z][a-z\\d+.-]*:)?\\/\\//i.test(value)) throw new Error('Use a relative API path');
  const basePath = new URL(BASE_URL, 'http://local.invalid').pathname.replace(/\\/$/, '');
  if (basePath.endsWith('/api') && (value === '/api' || value.startsWith('/api/'))) value = value.slice(4) || '/';
  return value;
}
export function apiUrl(input) {
  const origin = globalThis.location?.origin || 'http://localhost';
  return new URL(BASE_URL + '/' + apiPath(input).replace(/^\\//, ''), origin).href;
}
export function requestPath(template, values = {}) {
  const params = { ...values };
  const take = name => {
    const value = params[name];
    if (value === undefined || value === null || value === '') throw new Error('필수 경로 값이 없습니다: ' + name);
    delete params[name];
    return encodeURIComponent(String(value));
  };
  const url = String(template).replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => take(name))
    .replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => '/' + take(name));
  return { url, params };
}
export function resultValue(data, key) {
  return key ? String(key).split('.').reduce((value, part) => value?.[part], data) ?? data : data;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    const version = sessionVersion;
    refreshPromise = authApi.post(apiPath('/api/auth/refresh'), {})
      .then(response => {
        const token = unwrapResponse(response)?.accessToken || null;
        if (version === sessionVersion) setAccessToken(token);
        return version + 1 === sessionVersion ? accessToken : null;
      })
      .catch(() => { if (version === sessionVersion) setAccessToken(null); return null; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.request.use(config => {
  config.url = apiPath(config.url);
  config._authToken = accessToken;
  config._sessionVersion = sessionVersion;
  if (accessToken) config.headers.set('Authorization', 'Bearer ' + accessToken);
  else config.headers.delete('Authorization');
  return config;
});
api.interceptors.response.use(response => response, async error => {
  const original = error.config;
  const authCall = /(?:^|\\/)auth(?:\\/|$)/.test(original?.url || '');
  if (original && error.response?.status === 401 && !original._retried && !authCall && !original.signal?.aborted) {
    original._retried = true;
    const token = accessToken && accessToken !== original._authToken ? accessToken : (original._sessionVersion === sessionVersion ? await refreshAccessToken() : null);
    if (token && !original.signal?.aborted) return api(original);
  }
  return Promise.reject(error);
});

export default api;
`}}function ao(){return{path:"src/stores/auth.js",source:"common",content:`import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import api, { unwrapResponse, setAccessToken, getAccessToken, onAccessTokenChange, refreshAccessToken } from '@/api/axios';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(getAccessToken());
  const authReady = ref(false);
  const loading = ref(false);
  const isAuthenticated = computed(() => !!token.value);
  let bootstrapPromise = null;
  let revision = 0;
  const unsubscribe = onAccessTokenChange(value => { token.value = value; if (!value) user.value = null; });
  onScopeDispose(unsubscribe);

  async function login(credentials) {
    const ownRevision = ++revision;
    loading.value = true;
    try {
      const data = unwrapResponse(await api.post('/api/auth/login', credentials));
      if (ownRevision !== revision) return null;
      setAccessToken(data?.accessToken);
      user.value = data?.user || null;
      authReady.value = true;
      return data;
    } finally { if (ownRevision === revision) loading.value = false; }
  }
  async function bootstrap() {
    if (authReady.value) return isAuthenticated.value;
    if (!bootstrapPromise) {
      const ownRevision = revision;
      bootstrapPromise = (async () => {
        const restored = await refreshAccessToken();
        if (restored && ownRevision === revision) {
          try {
            const data = unwrapResponse(await api.get('/api/auth/me'));
            if (ownRevision === revision) user.value = data?.user || data || null;
          } catch { if (ownRevision === revision) clearLocal(); }
        }
        authReady.value = true;
        return isAuthenticated.value;
      })().finally(() => { bootstrapPromise = null; });
    }
    return bootstrapPromise;
  }
  function clearLocal() {
    revision++;
    user.value = null;
    loading.value = false;
    authReady.value = true;
    setAccessToken(null);
  }
  async function logout() {
    clearLocal(); // A pending refresh/login cannot restore a logged-out session.
    try { await api.post('/api/auth/logout'); } catch { /* local logout already completed */ }
  }
  return { user, authReady, loading, isAuthenticated, login, bootstrap, logout, clearLocal };
});
`}}function io(a){const{key:s,endpointPath:t,method:i="GET",resultKey:d=null,realtime:r=!1,streamPath:p=null}=a,x=Qe(s),k=`import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import api, { unwrapResponse, errorMessage, isCanceled, requestPath, resultValue${r&&p?", apiUrl":""} } from '@/api/axios';

export const use${ce(s)}Store = defineStore('${x}', () => {
  const rows = ref([]);
  const currentItem = ref(null);
  const error = ref('');
  const reading = ref(false);
  const saving = ref(false);
  const loading = computed(() => reading.value || saving.value);
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(10);
  const totalPages = ref(1);
  const query = ref({});
  let readController = null;
  let readVersion = 0;
  let lastRead = 'list';
  let detailParams = {};

  function cancelReads() {
    readVersion++;
    readController?.abort();
    readController = null;
    reading.value = false;
  }
  function beginRead() {
    cancelReads();
    readController = new AbortController();
    reading.value = true;
    error.value = '';
    return { version: readVersion, signal: readController.signal };
  }
  async function read(params, signal) {
    const target = requestPath(${JSON.stringify(t)}, params);
    const method = ${JSON.stringify(i.toLowerCase())};
    const config = { url: target.url, method, signal };
    config[['post', 'put', 'patch'].includes(method) ? 'data' : 'params'] = target.params;
    return unwrapResponse(await api.request(config));
  }
  async function fetchList(opts = {}) {
    const changesFilter = Object.keys(opts).some(key => !['page', 'perPage'].includes(key));
    query.value = { ...query.value, ...opts, page: opts.page ?? (changesFilter ? 1 : page.value), perPage: opts.perPage ?? perPage.value };
    lastRead = 'list';
    const { version, signal } = beginRead();
    try {
      const body = await read(query.value, signal);
      if (version !== readVersion) return;
      const data = resultValue(body, ${JSON.stringify(d)});
      const list = Array.isArray(data) ? data : (data?.rows ?? data?.items ?? data?.records ?? data?.data ?? []);
      if (!Array.isArray(list)) throw new Error('목록 응답이 배열이 아닙니다. resultKey를 확인하세요.');
      rows.value = list;
      const meta = Array.isArray(data) ? body : data;
      total.value = Math.max(0, Number(meta?.total) || list.length);
      page.value = Math.max(1, Number(meta?.page ?? query.value.page) || 1);
      perPage.value = Math.max(1, Number(meta?.perPage ?? query.value.perPage) || 10);
      totalPages.value = Math.max(1, Number(meta?.totalPages) || Math.ceil(total.value / perPage.value));
      currentItem.value = list[0] ?? null;
      return list;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) error.value = errorMessage(cause);
    } finally {
      if (version === readVersion) { reading.value = false; readController = null; }
    }
  }
  async function fetchOne(params = {}) {
    lastRead = 'detail';
    detailParams = { ...params };
    const { version, signal } = beginRead();
    currentItem.value = null;
    try {
      const body = await read(detailParams, signal);
      if (version !== readVersion) return;
      const data = resultValue(body, ${JSON.stringify(d)});
      currentItem.value = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
      return currentItem.value;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) error.value = errorMessage(cause);
    } finally {
      if (version === readVersion) { reading.value = false; readController = null; }
    }
  }
  function refresh() { return lastRead === 'detail' ? fetchOne(detailParams) : fetchList(); }

  async function submitForm(httpMethod, params = {}) {
    if (saving.value) throw new Error('저장 중입니다. 잠시 기다려 주세요.');
    saving.value = true;
    error.value = '';
    try {
      const target = requestPath(${JSON.stringify(t)}, params);
      const method = String(httpMethod || ${JSON.stringify(i)}).toLowerCase();
      const config = { url: target.url, method };
      config[['post', 'put', 'patch'].includes(method) ? 'data' : 'params'] = target.params;
      return unwrapResponse(await api.request(config));
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause; // The dialog must stay open when saving fails.
    } finally { saving.value = false; }
  }
${r&&p?`
  const realtimeConnected = ref(false);
  let eventSource = null;
  let refreshTimer = null;
  let subscribers = 0;
  function subscribeRealtime() {
    subscribers++;
    if (eventSource) return;
    try {
      eventSource = new EventSource(apiUrl(${JSON.stringify(p)}), { withCredentials: true });
      eventSource.addEventListener('change', () => {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => { refreshTimer = null; void refresh(); }, 250);
      });
      eventSource.onopen = () => { realtimeConnected.value = true; };
      eventSource.onerror = () => { realtimeConnected.value = false; };
    } catch (cause) { error.value = errorMessage(cause); }
  }
  function unsubscribeRealtime() {
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers) return;
    eventSource?.close();
    eventSource = null;
    clearTimeout(refreshTimer);
    refreshTimer = null;
    realtimeConnected.value = false;
  }
  onScopeDispose(() => { subscribers = 0; unsubscribeRealtime(); });
`:""}
  onScopeDispose(cancelReads);
  return { rows, currentItem, loading, saving, error, total, page, perPage, totalPages, query,
    fetchList, fetchOne, submitForm, refresh, cancelReads${r&&p?", realtimeConnected, subscribeRealtime, unsubscribeRealtime":""} };
});
`;return{path:`src/stores/${x}Store.js`,content:k,source:"store",resourceKey:x}}function ro(a){return a.map(io)}function no(a,s){var k;if(!a)throw new Error("project 가 필요합니다");const t=[],i=new Map;t.push(...Nn(a,s)),t.push(...Vn(a.layout||{},(k=a.config)==null?void 0:k.cssFramework)),t.push(...Hn(s)),t.push(so()),t.push(ao());const d=new Set(["WelcomeView"]),r=(a.screens||[]).filter(m=>m.kind==="composite").map(m=>{const f=Ce(m);let n=f,g=2;for(;d.has(n);)n=f.replace(/View$/,"")+g+++"View";return d.add(n),{...m,generatedViewName:n}});wn(r,i);for(const m of r)t.push(kn(m,{resourceCollector:i,screens:r}));if(t.push(Ln(r)),i.size>0){const m=[...i.values()];t.push(...ro(m))}const p=new Map;for(const m of t)p.set(m.path,m);const x=[...p.values()];return x.sort((m,f)=>m.path.localeCompare(f.path)),x}const tt="aidot.screen-designer.fileEdits";function oo(){try{const a=sessionStorage.getItem(tt);if(!a)return{};const s=JSON.parse(a);return s&&typeof s=="object"?s:{}}catch{return{}}}function Le(a){try{sessionStorage.setItem(tt,JSON.stringify(a))}catch(s){console.warn("[fileEdits] storage save failed:",s)}}const lo=dt("fileEdits",{state:()=>({edits:oo()}),getters:{forProject:a=>s=>a.edits[String(s)]||{}},actions:{get(a,s){const t=this.edits[String(a)];return t?t[s]??null:null},set(a,s,t){const i=String(a);this.edits[i]||(this.edits[i]={}),this.edits[i][s]=t,Le(this.edits)},clear(a,s){const t=String(a),i=this.edits[t];i&&(delete i[s],Object.keys(i).length===0&&delete this.edits[t],Le(this.edits))},clearAll(a){delete this.edits[String(a)],Le(this.edits)},applyTo(a,s){const t=String(a),i=this.edits[t];return i?s.map(d=>i[d.path]!=null?{...d,content:i[d.path],edited:!0}:d):s},listEditedPaths(a){const s=this.edits[String(a)];return new Set(s?Object.keys(s):[])}}}),co={class:"code-export-panel"},uo={key:0,class:"alert alert-warning small"},po={class:"export-header d-flex justify-content-between align-items-start mb-3"},fo={class:"mb-1"},mo={class:"small text-secondary"},vo={key:0,class:"text-warning ms-1"},bo={class:"d-flex gap-2"},ho=["title"],go=["title"],yo=["disabled"],xo={key:0,class:"spinner-border spinner-border-sm me-1"},ko={key:1,class:"bi bi-file-earmark-zip me-1"},wo={key:1,class:"alert alert-danger small"},$o={key:2,class:"alert alert-danger small"},_o={class:"mt-1 text-secondary"},Co={key:3,class:"export-split"},So={class:"file-tree"},Ao={class:"tree-title d-flex justify-content-between"},Po={class:"code-viewer"},To={key:0,class:"viewer-empty"},Eo={class:"viewer-header"},Ro={class:"small flex-grow-1 text-truncate"},No={class:"badge bg-light text-dark border ms-2"},Lo={key:0,class:"badge bg-warning text-dark ms-1"},jo=["title"],Vo={class:"viewer-editor-wrap"};function Io(a){return a.endsWith(".vue")?"bi bi-filetype-js text-success":a.endsWith(".js")?"bi bi-filetype-js text-warning":a.endsWith(".json")?"bi bi-filetype-json":a.endsWith(".html")?"bi bi-filetype-html text-danger":a.endsWith(".md")?"bi bi-filetype-md":a.endsWith(".css")?"bi bi-filetype-css text-primary":"bi bi-file-earmark"}const st=ct({name:"TreeNode",props:{node:Object,parentPath:String,selected:String,isExpanded:Function,isEdited:Function},emits:["toggle","select"],setup(a,{emit:s}){const{t}=me();return()=>{const{node:i,parentPath:d,selected:r,isExpanded:p,isEdited:x}=a;if(i.type==="dir"){const m=d?d+"/"+i.name:i.name,f=p(m),n=fe("button",{class:"tree-dir",onClick:()=>s("toggle",m)},[fe("i",{class:`bi ${f?"bi-folder2-open":"bi-folder"} me-1`}),fe("span",{class:"tree-name"},i.name)]),g=f?fe("div",{class:"tree-children"},i.children.map(w=>fe(st,{key:w.type==="file"?w.path:w.name,node:w,parentPath:m,selected:r,isExpanded:p,isEdited:x,onToggle:$=>s("toggle",$),onSelect:$=>s("select",$)}))):null;return fe("div",{class:"tree-dir-wrap"},[n,g])}const k=x(i.path);return fe("button",{class:["tree-file",{selected:r===i.path,edited:k}],onClick:()=>s("select",i.path)},[fe("i",{class:Io(i.name)+" me-1"}),fe("span",{class:"tree-name"},i.name),k?fe("span",{class:"edit-dot ms-auto",title:t("designer.editedMark")},"●"):null])}}}),Do={__name:"CodeExportPanel",props:{project:{type:Object,required:!0}},setup(a){const{t:s}=me(),t=a,i=lo(),d=M([]),r=M(null);function p(){r.value=null;try{d.value=no(t.project,Ne.value)}catch(E){r.value=String(E.message||E),d.value=[]}}be(()=>t.project,p,{deep:!0,immediate:!0});const x=B(()=>{var E;return i.applyTo((E=t.project)==null?void 0:E.id,d.value)}),k=B(()=>{var E;return i.listEditedPaths((E=t.project)==null?void 0:E.id)}),m=B(()=>{const E=new Set(d.value.map(C=>C.path));return[...k.value].filter(C=>!E.has(C))});function f(){var ie,re;const E={projectId:(ie=t.project)==null?void 0:ie.id,edits:i.forProject((re=t.project)==null?void 0:re.id)},C=URL.createObjectURL(new Blob([JSON.stringify(E,null,2)],{type:"application/json"})),z=document.createElement("a");z.href=C,z.download="screen-designer-edited-files.json",z.click(),setTimeout(()=>URL.revokeObjectURL(C),1e3)}const n=B(()=>g(x.value));function g(E){const C={type:"dir",name:"",children:[]};for(const z of E){const ie=z.path.split("/");let re=C;for(let oe=0;oe<ie.length-1;oe++){const L=ie[oe];let se=re.children.find(de=>de.type==="dir"&&de.name===L);se||(se={type:"dir",name:L,children:[]},re.children.push(se)),re=se}re.children.push({type:"file",name:ie[ie.length-1],path:z.path,source:z.source})}return w(C),C}function w(E){if(E.type==="dir"){E.children.sort((C,z)=>C.type!==z.type?C.type==="dir"?-1:1:C.name.localeCompare(z.name));for(const C of E.children)w(C)}}const $=M(null),h=M(new Set(["","src","src/assets","src/views","src/stores","src/components","src/api","src/router"]));function _(E){h.value.has(E)?h.value.delete(E):h.value.add(E),h.value=new Set(h.value)}function y(E){return h.value.has(E)}function R(E){return k.value.has(E)}async function P(E){var C;N.value&&T.value!==q(N.value)&&T.value!==i.get((C=t.project)==null?void 0:C.id,N.value)&&!await Ee({title:s("designer.unsavedEdits"),message:`편집 중인 변경사항이 있습니다.
저장 없이 이동할까요?`,detail:`편집 중: ${N.value}`,confirmText:"이동",cancelText:"계속 편집",variant:"danger"})||($.value=E,N.value=null,T.value="")}const A=B(()=>x.value.find(E=>E.path===$.value)||null);function te(E){return E&&E.toLowerCase().endsWith(".sql")?"sql":"javascript"}const j=B(()=>{var E;return te((E=A.value)==null?void 0:E.path)});function q(E){const C=d.value.find(z=>z.path===E);return(C==null?void 0:C.content)||""}const N=M(null),T=M("");function W(){A.value&&(N.value=A.value.path,T.value=A.value.content)}function J(){var E;N.value&&(i.set((E=t.project)==null?void 0:E.id,N.value,T.value),N.value=null,T.value="")}function G(){N.value=null,T.value=""}async function ue(){var E;A.value&&await Ee({title:s("codeExportPanel.k15"),message:s("codeExportPanel.k16"),detail:A.value.path,confirmText:s("codeExportPanel.k17"),variant:"danger"})&&i.clear((E=t.project)==null?void 0:E.id,A.value.path)}async function le(){var E;k.value.size&&await Ee({title:s("designer.resetEdits"),message:`이 프로젝트의 편집 ${k.value.size}개를 모두 초기화할까요?`,detail:"되돌릴 수 없습니다.",confirmText:"초기화",variant:"danger"})&&(i.clearAll((E=t.project)==null?void 0:E.id),N.value=null,T.value="")}const O=M(!1),b=M(null);async function v(){var E;if(!O.value){O.value=!0,b.value=null;try{const C=await D(),z=new C;for(const L of x.value)z.file(L.path,L.content);const ie=await z.generateAsync({type:"blob",compression:"DEFLATE"}),re=URL.createObjectURL(ie),oe=document.createElement("a");oe.href=re,oe.download=Z((E=t.project)==null?void 0:E.name),document.body.appendChild(oe),oe.click(),document.body.removeChild(oe),URL.revokeObjectURL(re)}catch(C){b.value=String(C.message||C)}finally{O.value=!1}}}async function D(){const E=await ut(()=>import("./jszip.min-DvbXqdIg.js").then(C=>C.j),[]);return E.default||E}function Z(E){const C=String(E||"project").replace(/[^a-zA-Z0-9가-힣_\-]/g,"_").slice(0,40)||"project",z=new Date,ie=[z.getFullYear(),String(z.getMonth()+1).padStart(2,"0"),String(z.getDate()).padStart(2,"0"),"-",String(z.getHours()).padStart(2,"0"),String(z.getMinutes()).padStart(2,"0"),String(z.getSeconds()).padStart(2,"0")].join("");return`${C}-${ie}.zip`}const U=B(()=>x.value.reduce((E,C)=>{var z;return E+(((z=C.content)==null?void 0:z.length)||0)},0));return(E,C)=>(l(),c("div",co,[m.value.length?(l(),c("div",uo,[S(o(u(Ne).startsWith("en")?"Some edited file paths changed. Back up your edits and move them to the new files.":"구조 변경으로 경로가 달라진 편집 파일이 있습니다. 편집본을 백업한 뒤 새 파일에 옮겨 주세요.")+" ",1),(l(!0),c(I,null,ee(m.value,z=>(l(),c("div",{key:z},[e("code",null,o(z),1)]))),128))])):V("",!0),e("div",po,[e("div",null,[e("h6",fo,[C[1]||(C[1]=e("i",{class:"bi bi-download me-1"},null,-1)),S(o(u(s)("codeExportPanel.k1")),1)]),e("div",mo,[S(o(u(s)("codeExportPanel.k2")),1),e("strong",null,o(x.value.length),1),S(" "+o(u(s)("designer.fileCount").replace("{n}",""))+" · "+o((U.value/1024).toFixed(1))+" KB) ",1),k.value.size>0?(l(),c("span",vo,[C[2]||(C[2]=S(" · ",-1)),C[3]||(C[3]=e("i",{class:"bi bi-pencil-fill"},null,-1)),S(" "+o(u(s)("designer.editedCount").replace("{n}",k.value.size)),1)])):V("",!0)])]),e("div",bo,[k.value.size?(l(),c("button",{key:0,class:"btn btn-sm btn-outline-secondary",onClick:f},o(u(Ne).startsWith("en")?"Back up edits":"편집본 백업"),1)):V("",!0),k.value.size>0?(l(),c("button",{key:1,class:"btn btn-sm btn-outline-danger",onClick:le,title:u(s)("codeExportPanel.k12")},[C[4]||(C[4]=e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)),S(" "+o(u(s)("codeExportPanel.k3")),1)],8,ho)):V("",!0),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:p,title:u(s)("codeExportPanel.k13")},[C[5]||(C[5]=e("i",{class:"bi bi-arrow-clockwise"},null,-1)),S(" "+o(u(s)("codeExportPanel.k4")),1)],8,go),e("button",{class:"btn btn-sm btn-primary",onClick:v,disabled:O.value||x.value.length===0},[O.value?(l(),c("span",xo)):(l(),c("i",ko)),S(" "+o(u(s)("codeExportPanel.k5")),1)],8,yo)])]),r.value?(l(),c("div",wo,[C[6]||(C[6]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(u(s)("designer.genFailed"))+": "+o(r.value),1)])):V("",!0),b.value?(l(),c("div",$o,[C[7]||(C[7]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(u(s)("designer.downloadFailed"))+": "+o(b.value)+" ",1),e("div",_o,o(u(s)("codeExportPanel.k6")),1)])):V("",!0),r.value?V("",!0):(l(),c("div",Co,[e("div",So,[e("div",Ao,[e("span",null,o(u(s)("designer.files"))+" ("+o(x.value.length)+")",1)]),(l(!0),c(I,null,ee(n.value.children,z=>(l(),xe(u(st),{key:z.type==="file"?z.path:z.name,node:z,"parent-path":"",selected:$.value,"is-expanded":y,"is-edited":R,onToggle:_,onSelect:P},null,8,["node","selected"]))),128))]),e("div",Po,[A.value?(l(),c(I,{key:1},[e("div",Eo,[e("code",Ro,o(A.value.path),1),e("span",No,o(A.value.source),1),R(A.value.path)?(l(),c("span",Lo,[C[9]||(C[9]=e("i",{class:"bi bi-pencil-fill"},null,-1)),S(" "+o(u(s)("codeExportPanel.k8")),1)])):V("",!0),N.value?(l(),c(I,{key:2},[e("button",{class:"btn btn-sm btn-success ms-2",onClick:J},[C[12]||(C[12]=e("i",{class:"bi bi-check-lg"},null,-1)),S(" "+o(u(s)("codeExportPanel.k10")),1)]),e("button",{class:"btn btn-sm btn-outline-secondary ms-1",onClick:G},[C[13]||(C[13]=e("i",{class:"bi bi-x-lg"},null,-1)),S(" "+o(u(s)("codeExportPanel.k11")),1)])],64)):(l(),c(I,{key:1},[e("button",{class:"btn btn-sm btn-outline-primary ms-2",onClick:W},[C[10]||(C[10]=e("i",{class:"bi bi-pencil"},null,-1)),S(" "+o(u(s)("codeExportPanel.k9")),1)]),R(A.value.path)?(l(),c("button",{key:0,class:"btn btn-sm btn-outline-secondary ms-1",onClick:ue,title:u(s)("codeExportPanel.k14")},[...C[11]||(C[11]=[e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)])],8,jo)):V("",!0)],64))]),e("div",Vo,[N.value?(l(),xe(Ue,{key:1,modelValue:T.value,"onUpdate:modelValue":C[0]||(C[0]=z=>T.value=z),language:j.value,readonly:!1},null,8,["modelValue","language"])):(l(),xe(Ue,{key:0,"model-value":A.value.content,language:j.value,readonly:!0},null,8,["model-value","language"]))])],64)):(l(),c("div",To,[C[8]||(C[8]=e("i",{class:"bi bi-file-earmark-code fs-1 d-block mb-2 opacity-50"},null,-1)),S(" "+o(u(s)("codeExportPanel.k7")),1)]))])]))]))}},Wo=he(Do,[["__scopeId","data-v-839284b9"]]),zo="/public/vendor/vue.esm-browser.prod.js",Mo="/public/vendor/bootstrap.min.css",Oo=new Set(["top-nav","top-and-side","hero-landing"]),Uo=new Set(["sidebar-left","sidebar-dark","sidebar-both","top-and-side"]),Bo=new Set(["split-panel","card-grid"]);function Je(a){return Oo.has(a)}function Ko(a){return Uo.has(a)}function Fo(a){return!Bo.has(a==null?void 0:a.kind)}function qo({project:a,authToken:s=""}={}){var w,$,h,_,y,R,P,A,te;if(!a)return Yo("프로젝트 정보가 없습니다");const t=s?`<script>window.__previewToken=${JSON.stringify(String(s))};<\/script>`:"",i=Go(a.layout),d=(a.screens||[]).filter(j=>j&&j.kind==="composite"),r=[];for(const j of d){const q=[],N=[];for(const T of j.rows||[]){const W=[];for(let J=0;J<(T.widgets||[]).length;J++){const G=T.widgets[J],ue=((w=T.widths)==null?void 0:w[J])||12;let le=null;(($=G.source)==null?void 0:$.type)==="endpoint"&&G.source.path&&(le=`ep_${String(G.id).replace(/[^a-zA-Z0-9_]/g,"_")}`,q.push({name:le,method:G.source.method||"GET",path:G.source.path,resultKey:G.source.resultKey||null})),W.push({widget:G,width:ue,endpointVar:le})}N.push({row:T,widgets:W})}r.push({screen:j,rowDescriptors:N,endpointVars:q})}let p=Array.isArray((h=i.sidebar)==null?void 0:h.items)?i.sidebar.items:[];p.length?p=p.map(j=>{const q=d.find(N=>N.path===j.path);return{...j,screenId:(q==null?void 0:q.id)||null}}):p=d.map(j=>({label:j.title||"무제",path:j.path||`/screen-${j.id}`,icon:"bi-file-earmark",screenId:j.id}));const x=[],k=new Set;for(const{endpointVars:j}of r)for(const q of j){if(k.has(q.name))continue;k.add(q.name);const N={method:q.method,path:q.path};q.resultKey&&(N.resultKey=q.resultKey),x.push(`const ${q.name} = ${JSON.stringify(N)};`)}const m=JSON.stringify(p.map(j=>({label:j.label,path:j.path,icon:j.icon||"",screenId:j.screenId}))),f=r.map(j=>Ho(j)).join(`
`),n=((_=d[0])==null?void 0:_.id)||null,g=((y=p[0])==null?void 0:y.path)||"/";return`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${ye(a.name||"Preview")}</title>
<link rel="stylesheet" href="${Mo}" />
<style>
${Xo}
${gt}
${Zo(i)}
</style>
</head>
<body>
<div id="app"></div>
${t}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${zo}';

// ---- Widget components ----
${yt}

// ---- Endpoint definitions (전역 공유) ----
${x.join(`
`)}

// ---- 메뉴 / 화면 라우팅 (간이 SPA) ----
const MENU = ${m};
/* ★ v1.9.2 — 화면 id → 정보. 메뉴에는 없는 화면(수정 화면 등)으로도 이동해야 하므로
   MENU 가 아니라 전체 화면 목록으로 만든다. */
const SCREEN_INDEX = ${JSON.stringify(Object.fromEntries(d.map(j=>[j.id,{id:j.id,title:j.title||j.id,path:j.path||""}])))};
const currentScreenId = ref(${JSON.stringify(n)});
const currentPath = ref(${JSON.stringify(g)});

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
      ${x.map(j=>{var q;return(q=j.match(/const (\w+)/))==null?void 0:q[1]}).filter(Boolean).join(`,
      `)}
    };
  },
  template: \`
    <div class="app-shell layout-kind-${i.kind}">
      <!-- 상단 네비 (kind: top-nav / top-and-side / hero-landing) -->
      <header v-if="${Je(i.kind)}" class="app-topbar">
        <div class="header-title">${ye(((R=i.title)==null?void 0:R.text)||"")}</div>
        <nav class="topnav">
          <button v-for="m in menu" :key="m.path"
                  class="topnav-item"
                  :class="{ active: currentPath === m.path }"
                  @click="navigate(m)">{{ m.label }}</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- 좌 사이드바 (kind: sidebar-left / sidebar-dark / sidebar-both / top-and-side) -->
        <aside v-if="${Ko(i.kind)}" class="app-sidebar app-sidebar-left">
          ${i.kind!=="top-and-side"?`<div class="sidebar-brand">${ye(((P=i.title)==null?void 0:P.text)||a.name||"App")}</div>`:""}
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
          <header v-if="${!Je(i.kind)}" class="app-header">
            <div class="header-title">${ye(((A=i.title)==null?void 0:A.text)||"")}</div>
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
${f}
            <div v-if="!currentScreenId" class="text-center text-muted py-5">
              ${Fo(i)?"사이드바에서":""}화면을 선택하세요.
            </div>
          </main>
        </div>

        <!-- 우 사이드바 (kind: sidebar-right) -->
        <aside v-if="${i.kind==="sidebar-right"}" class="app-sidebar app-sidebar-right">
          <div class="sidebar-brand">${ye(((te=i.title)==null?void 0:te.text)||a.name||"App")}</div>
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
</html>`}function Ho({screen:a,rowDescriptors:s,endpointVars:t}){const i=[],d="'"+String(a.id).replace(/'/g,"\\'")+"'";if(i.push(`          <div v-if="currentScreenId === ${d}" class="composite-view">`),a.header&&a.header.kind!=="none"){const r=ye(a.header.title||a.title||""),p=ye(a.header.subtitle||"");i.push('            <div class="composite-header">'),i.push(`              <h2 class="composite-title">${r}</h2>`),p&&i.push(`              <div class="composite-subtitle">${p}</div>`),i.push("            </div>")}for(const{row:r,widgets:p}of s){const k=`gap:${(r.style||{}).gap??16}px`;i.push(`            <div class="row" style="${k}">`);for(const{widget:m,width:f,endpointVar:n}of p)i.push(`              <div class="col-md-${f}">`),i.push(`                ${Jo(m,n)}`),i.push("              </div>");i.push("            </div>")}return i.push("          </div>"),i.join(`
`)}function Ge(a){const s=a==null?void 0:a.onRowClick;if(!s||s.action!=="navigate"||!s.target)return"";const t=Object.entries(s.params||{}).filter(([,d])=>d).map(([d,r])=>`${d}: '${String(r).replace(/'/g,"")}'`).join(", ");return` :row-clickable="true" @row-click="(row) => __previewNavigate('${String(s.target).replace(/'/g,"")}', { ${t} }, row)"`}function Jo(a,s){const t=a.title||"",i=a.config||{},d=a.source,r=m=>`"${String(m).replace(/"/g,"&quot;")}"`,p=s&&(d==null?void 0:d.type)==="endpoint",x=d&&d.resultKey?`result-key=${r(d.resultKey)}`:"",k=a.id?`widget-id=${r(a.id)}`:"";switch(a.kind){case"stat":return p?`<StatWidget label=${r(t)} :endpoint="${s}" ${x} format=${r(i.format||"number")} color=${r(i.color||"primary")} ${k} />`:`<StatWidget label=${r(t)} :value="null" format=${r(i.format||"number")} color=${r(i.color||"primary")} />`;case"list":return p?`<ListWidget title=${r(t)} :endpoint="${s}" ${x} :max-rows="${Number(i.maxRows)||20}" ${k}${Ge(a)} />`:`<ListWidget title=${r(t)} :rows="[]" :max-rows="${Number(i.maxRows)||5}"${Ge(a)} />`;case"listPaged":return p?`<ListPagedWidget title=${r(t)} :endpoint="${s}" ${x} :per-page="${Number(i.perPage)||10}" ${k} />`:`<ListPagedWidget title=${r(t)} :endpoint="null" :per-page="${Number(i.perPage)||10}" />`;case"detail":return p?`<DetailWidget title=${r(t)} :endpoint="${s}" ${x} ${k} />`:`<DetailWidget title=${r(t)} :record="null" />`;case"text":return p?`<TextWidget label=${r(t)} :endpoint="${s}" ${x} format=${r(i.format||"auto")} ${k} />`:`<TextWidget label=${r(t)} :value="null" format=${r(i.format||"auto")} />`;case"markdown":{const m=String(i.body||"");return m?`<MarkdownWidget :body='${JSON.stringify(m).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />'}case"queryForm":{const m=JSON.stringify(i.fields||[]).replace(/'/g,"\\'"),f=i.submitLabel||"조회",n=i.targetWidgetId||"",g=i.endpointHint?`endpoint-hint=${r(i.endpointHint)}`:"";return`<QueryFormWidget title=${r(t)} :fields='${m}' submit-label=${r(f)} target-widget-id=${r(n)} ${g} />`}case"formDialog":{const m=JSON.stringify(i.fields||[]).replace(/'/g,"\\'"),f=i.buttonLabel||"실행",n=i.buttonVariant||"primary",g=i.dialogTitle||t||f,w=!!i.confirmBeforeSubmit,$=i.refreshTargetWidgetId||"",h=p?`:endpoint="${s}"`:"";return`<FormDialogWidget title=${r(t)} ${h} button-label=${r(f)} button-variant=${r(n)} dialog-title=${r(g)} :fields='${m}' :confirm-before-submit="${w}" refresh-target-widget-id=${r($)} />`}case"button":{const m=String(t||i.label||"버튼"),f=String(i.variant||"primary"),n=a.onRowClick,g=n&&n.action==="navigate"&&n.target?` @click="__previewNavigate('${String(n.target).replace(/'/g,"")}', {}, null)"`:"";return`<div class="card h-100"><div class="card-body d-flex align-items-center"><button type="button" class="btn btn-${f}"${g}>${m.replace(/</g,"&lt;")}</button></div></div>`}default:return`<!-- unknown widget kind: ${a.kind} -->`}}function Go(a){var t,i,d,r,p,x,k,m,f,n,g;const s=a||{};return{kind:s.kind||"sidebar-left",title:{text:((t=s.title)==null?void 0:t.text)||"",bgColor:((i=s.title)==null?void 0:i.bgColor)||"#ffffff",fgColor:((d=s.title)==null?void 0:d.fgColor)||"#0f172a",height:Number((r=s.title)==null?void 0:r.height)||60,...s.title},sidebar:{items:Array.isArray((p=s.sidebar)==null?void 0:p.items)?s.sidebar.items:[],bgColor:((x=s.sidebar)==null?void 0:x.bgColor)||"#1e2a3a",fgColor:((k=s.sidebar)==null?void 0:k.fgColor)||"#cfd6de",width:Number((m=s.sidebar)==null?void 0:m.width)||220,activeBg:((f=s.sidebar)==null?void 0:f.activeBg)||"#0d6efd",...s.sidebar},mainArea:{bgColor:((n=s.mainArea)==null?void 0:n.bgColor)||"#f5f7fa",padding:Number((g=s.mainArea)==null?void 0:g.padding)||16,...s.mainArea}}}function Zo(a){const s=a.title,t=a.sidebar,i=a.mainArea;return`
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
  width: ${t.width}px;
  flex-shrink: 0;
  background: ${t.bgColor};
  color: ${t.fgColor};
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
  color: ${t.fgColor};
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.sidebar-item:hover { background: rgba(255, 255, 255, 0.05); }
.sidebar-item.active { background: ${t.activeBg}; color: #fff; }
.sidebar-item i { width: 16px; text-align: center; font-size: 14px; }

/* ────────── 우측 보조 패널 (sidebar-both 전용) ────────── */
.app-aux-panel {
  width: ${Math.round(t.width*.6)}px;
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
`}function ye(a){return String(a??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Yo(a){return`<!DOCTYPE html><html><body style="padding:32px;font-family:sans-serif;color:#b91c1c">${ye(a)}</body></html>`}const Xo=`
* { box-sizing: border-box; }
body { margin: 0; }
`,Qo={class:"whole-app-preview"},el={class:"preview-toolbar"},tl={class:"d-flex align-items-center gap-2 flex-grow-1"},sl={class:"fw-semibold"},al={class:"text-secondary small"},il={class:"btn-group btn-group-sm",role:"group"},rl={key:0,class:"empty-state"},nl={class:"mb-2"},ol={class:"small text-secondary"},ll=["srcdoc"],dl=400,cl={__name:"WholeAppPreview",props:{project:{type:Object,required:!0}},setup(a){const{t:s}=me(),t=pt(),i=a,d=M(i.project);let r=null;be(()=>i.project,f=>{r&&clearTimeout(r),r=setTimeout(()=>{d.value=f,r=null},dl)},{deep:!0}),Ve(()=>{r&&clearTimeout(r)});const p=B(()=>{try{return qo({project:d.value,authToken:t.accessToken||""})}catch(f){return`<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(f.message||f).replace(/</g,"&lt;")}</body></html>`}}),x=M("desktop"),k={desktop:"100%",tablet:"1024px",mobile:"375px"},m=B(()=>{var f;return(((f=i.project)==null?void 0:f.screens)||[]).filter(n=>n.kind==="composite").length});return(f,n)=>(l(),c("div",Qo,[e("div",el,[e("div",tl,[n[3]||(n[3]=e("i",{class:"bi bi-app-indicator"},null,-1)),e("span",sl,o(a.project.name||"전체 앱 미리보기"),1),e("span",al,"· "+o(u(s)("designer.screenCount").replace("{n}",m.value)),1)]),e("div",il,[e("button",{class:H(["btn",x.value==="desktop"?"btn-primary":"btn-outline-secondary"]),onClick:n[0]||(n[0]=g=>x.value="desktop")},[...n[4]||(n[4]=[e("i",{class:"bi bi-laptop"},null,-1),S(" Desktop ",-1)])],2),e("button",{class:H(["btn",x.value==="tablet"?"btn-primary":"btn-outline-secondary"]),onClick:n[1]||(n[1]=g=>x.value="tablet")},[...n[5]||(n[5]=[e("i",{class:"bi bi-tablet"},null,-1),S(" Tablet ",-1)])],2),e("button",{class:H(["btn",x.value==="mobile"?"btn-primary":"btn-outline-secondary"]),onClick:n[2]||(n[2]=g=>x.value="mobile")},[...n[6]||(n[6]=[e("i",{class:"bi bi-phone"},null,-1),S(" Mobile ",-1)])],2)])]),m.value?(l(),c("div",{key:1,class:H(["preview-frame-wrap","viewport-"+x.value])},[e("iframe",{class:"preview-iframe",style:K({width:k[x.value]}),srcdoc:p.value,sandbox:"allow-scripts allow-same-origin",referrerpolicy:"no-referrer"},null,12,ll)],2)):(l(),c("div",rl,[n[7]||(n[7]=e("i",{class:"bi bi-easel2 fs-1 d-block mb-2 opacity-50"},null,-1)),e("div",nl,o(u(s)("designer.noScreensYet")),1),e("div",ol,o(u(s)("designer.addScreenHint")),1)]))]))}},ul=he(cl,[["__scopeId","data-v-a52ae946"]]),pl={class:"container-fluid py-3"},fl={class:"d-flex justify-content-between align-items-center mb-3"},ml={class:"d-flex align-items-center gap-2"},vl=["title"],bl={class:"mb-0"},hl={key:0,class:"text-secondary"},gl={key:1},yl={key:2,class:"text-secondary"},xl={key:0,class:"small text-secondary"},kl={key:0},wl={class:"ms-2"},$l={key:0,class:"opacity-75"},_l={key:1,class:"small text-secondary"},Cl={key:0,class:"d-flex align-items-center gap-2"},Sl={key:0},Al={key:1},Pl={class:"text-secondary"},Tl={key:2,class:"text-secondary"},El=["disabled","title"],Rl={key:0,class:"alert alert-danger small"},Nl={class:"nav nav-tabs mb-3"},Ll={class:"nav-item"},jl={class:"nav-item"},Vl={class:"nav-item"},Il={class:"nav-item"},Dl={key:1},Wl={key:0,class:"card"},zl={class:"card-body text-center py-5 text-secondary"},Ml={key:2},Ol={key:0,class:"card"},Ul={class:"card-body text-center py-5 text-secondary"},Bl={key:3},Kl={key:0,class:"card"},Fl={class:"card-body text-center py-5 text-secondary"},ql={key:4},Hl={key:0,class:"card"},Jl={class:"card-body text-center py-5 text-secondary"},Gl={__name:"ProjectEditorView",setup(a){const s=rt(),{t}=me(),i=Ye(),d=Xe(),r=De(),{activeProject:p,loading:x,error:k,saving:m}=je(r),f=["layout","screens","preview","export"];function n(){const R=i.query.tab;return typeof R=="string"&&f.includes(R)?R:"layout"}const g=M(n());be(g,R=>{i.query.tab!==R&&d.replace({query:R==="layout"?{}:{...i.query,tab:R}})}),be(()=>i.query.tab,()=>{const R=n();R!==g.value&&(g.value=R)});const w=M(null);be(m,(R,P)=>{P===!0&&R===!1&&(w.value=new Date)});const $=B(()=>m.value?"저장 중…":w.value?t("designer.allAutoSaved"):t("designer.autoSavedHint"));async function h(){var P;const R=i.params.id;if(R)try{await r.loadById(R)}catch(A){((P=A.response)==null?void 0:P.status)===404&&(ge("존재하지 않는 프로젝트입니다","목록으로 돌아갑니다."),d.replace({name:"screen-projects"}))}}Ze(h),be(()=>i.params.id,h),Ve(()=>r.clearActive());function _(){d.push({name:"screen-projects"})}async function y(){var P,A,te;if(!p.value){at("저장할 수 없습니다","프로젝트가 아직 로드되지 않았습니다.");return}const R=p.value;console.log("[ProjectEditor] saveNow → PUT /api/admin/screen-projects/"+R.id,{name:R.name,screensCount:(R.screens||[]).length});try{const j=await r.savePatch(R.id,{name:R.name,description:R.description,config:R.config,layout:R.layout,screens:R.screens,vars:R.vars});w.value=new Date,console.log("[ProjectEditor] saveNow ✓ updated id="+((j==null?void 0:j.id)??R.id)),it("저장되었습니다",`${R.name} · ID ${R.id} · ${s.time(w.value)}`)}catch(j){const q=(P=j.response)==null?void 0:P.status,N=((te=(A=j.response)==null?void 0:A.data)==null?void 0:te.message)||j.message;console.error("[ProjectEditor] saveNow ✗",q,N),ge(`저장 실패 (HTTP ${q||"?"})`,N)}}return(R,P)=>(l(),c("div",pl,[e("div",fl,[e("div",ml,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:_,title:u(t)("projectEditor.k12")},[...P[4]||(P[4]=[e("i",{class:"bi bi-arrow-left"},null,-1)])],8,vl),e("div",null,[e("h5",bl,[P[6]||(P[6]=e("i",{class:"bi bi-easel2 me-2"},null,-1)),u(x)&&!u(p)?(l(),c("span",hl,[P[5]||(P[5]=e("span",{class:"spinner-border spinner-border-sm me-2"},null,-1)),S(o(u(t)("projectEditor.k1")),1)])):u(p)?(l(),c("span",gl,o(u(p).name),1)):(l(),c("span",yl,o(u(t)("projectEditor.k2")),1))]),u(p)?(l(),c("div",xl,[u(p).description?(l(),c("span",kl,o(u(p).description)+" · ",1)):V("",!0),P[7]||(P[7]=S(" Project ID: ",-1)),e("code",null,o(u(p).id),1),e("span",wl,[e("i",{class:H(["bi",u(m)?"bi-arrow-repeat":"bi-check-circle"])},null,2),S(" "+o($.value)+" ",1),w.value?(l(),c("span",$l," ("+o(u(s).time(w.value))+") ",1)):V("",!0)])])):(l(),c("div",_l,[P[8]||(P[8]=S(" Project ID: ",-1)),e("code",null,o(u(i).params.id),1)]))])]),u(p)?(l(),c("div",Cl,[e("span",{class:H(["small save-indicator",{saving:u(m),"just-saved":w.value&&!u(m)}])},[u(m)?(l(),c("span",Sl,[P[9]||(P[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),S(o(u(t)("projectEditor.k3")),1)])):w.value?(l(),c("span",Al,[P[10]||(P[10]=e("i",{class:"bi bi-check-circle-fill me-1 text-success"},null,-1)),S(" "+o(u(t)("projectEditor.k4"))+" ",1),e("span",Pl,"("+o(u(s).time(w.value))+")",1)])):(l(),c("span",Tl,[P[11]||(P[11]=e("i",{class:"bi bi-cloud me-1"},null,-1)),S(o(u(t)("projectEditor.k5")),1)]))],2),e("button",{class:"btn btn-sm btn-outline-primary",onClick:y,disabled:u(m),title:u(t)("projectEditor.k6")},[P[12]||(P[12]=e("i",{class:"bi bi-save me-1"},null,-1)),S(o(u(t)("projectEditor.k6")),1)],8,El)])):V("",!0)]),u(k)?(l(),c("div",Rl,[P[13]||(P[13]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),S(o(u(k)),1)])):V("",!0),e("ul",Nl,[e("li",Ll,[e("button",{class:H(["nav-link",{active:g.value==="layout"}]),onClick:P[0]||(P[0]=A=>g.value="layout")},[P[14]||(P[14]=e("i",{class:"bi bi-layout-sidebar me-1"},null,-1)),S(o(u(t)("projectEditor.k7")),1)],2)]),e("li",jl,[e("button",{class:H(["nav-link",{active:g.value==="screens"}]),onClick:P[1]||(P[1]=A=>g.value="screens")},[P[15]||(P[15]=e("i",{class:"bi bi-collection me-1"},null,-1)),S(o(u(t)("projectEditor.k8")),1)],2)]),e("li",Vl,[e("button",{class:H(["nav-link",{active:g.value==="preview"}]),onClick:P[2]||(P[2]=A=>g.value="preview")},[P[16]||(P[16]=e("i",{class:"bi bi-eye me-1"},null,-1)),S(o(u(t)("projectEditor.k9")),1)],2)]),e("li",Il,[e("button",{class:H(["nav-link",{active:g.value==="export"}]),onClick:P[3]||(P[3]=A=>g.value="export")},[P[17]||(P[17]=e("i",{class:"bi bi-download me-1"},null,-1)),S(o(u(t)("projectEditor.k10")),1)],2)])]),g.value==="layout"?(l(),c("div",Dl,[u(p)?(l(),xe(La,{key:1})):(l(),c("div",Wl,[e("div",zl,[P[18]||(P[18]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),S(o(u(t)("projectEditor.k11")),1)])]))])):V("",!0),g.value==="screens"?(l(),c("div",Ml,[u(p)?(l(),xe(bn,{key:1})):(l(),c("div",Ol,[e("div",Ul,[P[19]||(P[19]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),S(o(u(t)("projectEditor.k11")),1)])]))])):V("",!0),g.value==="preview"?(l(),c("div",Bl,[u(p)?(l(),xe(ul,{key:1,project:u(p)},null,8,["project"])):(l(),c("div",Kl,[e("div",Fl,[P[20]||(P[20]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),S(o(u(t)("projectEditor.k11")),1)])]))])):V("",!0),g.value==="export"?(l(),c("div",ql,[u(p)?(l(),xe(Wo,{key:1,project:u(p)},null,8,["project"])):(l(),c("div",Hl,[e("div",Jl,[P[21]||(P[21]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),S(o(u(t)("projectEditor.k11")),1)])]))])):V("",!0)]))}},nd=he(Gl,[["__scopeId","data-v-2cb4d6d1"]]);export{nd as default};
