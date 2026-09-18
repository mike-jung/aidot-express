import{n as ge,a as at,b as it}from"./useNotify-CVCFyKjb.js";import{u as rt}from"./useFormat-BrzmchHy.js";import{x as d,c as u,F as z,r as te,a as e,D as Re,n as J,b as ae,f as D,t as o,d as m,q as F,e as C,h as X,v as ee,O as nt,U as K,M as je,m as U,w as be,K as Ve,B as _e,o as Ze,I as Oe,g as De,ae as ot,C as lt,k as Se,l as Ye,s as Xe,A as xe,ao as dt,Y as ct,aa as fe,ap as ut,u as pt}from"./index-B8FqGxAd.js";import{u as Ie}from"./screenProjects-D_lFZ44Y.js";import{u as me,l as Ne}from"./useI18n-CVSfpEjb.js";import{_ as he}from"./_plugin-vue_export-helper-DlAUqK2U.js";import{d as Ee,b as ft}from"./useConfirm-CQnNoENN.js";import{c as mt,a as vt,b as Ae,d as Pe,g as bt,p as ht,W as gt,e as yt}from"./previewRuntimes-D0tG2n4R.js";import{_ as Ue}from"./CodeEditor-B3L_-GDg.js";import"./toasts-DMh6PZp7.js";const xt={class:"row g-3"},kt=["onClick","onKeyup"],wt={class:"schematic"},$t={viewBox:"0 0 120 70",xmlns:"http://www.w3.org/2000/svg",preserveAspectRatio:"xMidYMid meet"},_t=["fill"],Ct=["fill"],St=["fill"],At=["fill"],Pt={class:"pick-body"},Tt={class:"d-flex align-items-center mb-1"},Et={class:"fw-semibold"},Rt={key:0,class:"badge bg-primary ms-auto"},Nt={key:1,class:"badge bg-light text-secondary ms-auto small"},Lt={class:"small text-secondary mb-0"},jt={__name:"LayoutPicker",props:{modelValue:{type:String,default:"sidebar-left"}},emits:["update:modelValue"],setup(s,{expose:i,emit:t}){const a=s,p=t,{t:r}=me(),l=[{kind:"sidebar-left",labelKey:"lay_sidebarLeft",descKey:"lay_sidebarLeftD",category:"admin"},{kind:"sidebar-dark",labelKey:"lay_sidebarDark",descKey:"lay_sidebarDarkD",category:"admin"},{kind:"top-nav",labelKey:"lay_topNav",descKey:"lay_topNavD",category:"web"},{kind:"sidebar-right",labelKey:"lay_sidebarRight",descKey:"lay_sidebarRightD",category:"admin"},{kind:"sidebar-both",labelKey:"lay_sidebarBoth",descKey:"lay_sidebarBothD",category:"admin"},{kind:"top-and-side",labelKey:"lay_topAndSide",descKey:"lay_topAndSideD",category:"admin"},{kind:"hero-landing",labelKey:"lay_heroLanding",descKey:"lay_heroLandingD",category:"web"},{kind:"split-panel",labelKey:"lay_splitPanel",descKey:"lay_splitPanelD",category:"app"},{kind:"card-grid",labelKey:"lay_cardGrid",descKey:"lay_cardGridD",category:"app"}];function g(f){f!==a.modelValue&&p("update:modelValue",f)}const x=F(()=>l.find(f=>f.kind===a.modelValue)||l[0]);return i({currentPreset:x,presets:l}),(f,c)=>(d(),u("div",xt,[(d(),u(z,null,te(l,n=>e("div",{key:n.kind,class:"col-md-4 col-sm-6"},[e("div",{class:J(["pick-card h-100",{selected:s.modelValue===n.kind}]),onClick:v=>g(n.kind),tabindex:"0",role:"button",onKeyup:Re(v=>g(n.kind),["enter"])},[e("div",wt,[(d(),u("svg",$t,[c[8]||(c[8]=e("rect",{width:"120",height:"70",fill:"#f8fafc",rx:"3"},null,-1)),n.kind==="sidebar-left"||n.kind==="sidebar-dark"?(d(),u(z,{key:0},[e("rect",{x:"0",y:"0",width:"30",height:"70",fill:n.kind==="sidebar-dark"?"#1e2a3a":"#e2e8f0",rx:"3"},null,8,_t),e("rect",{x:"5",y:"8",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,Ct),e("rect",{x:"5",y:"14",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,St),e("rect",{x:"5",y:"20",width:"20",height:"3",rx:"1",fill:n.kind==="sidebar-dark"?"#64748b":"#94a3b8"},null,8,At),c[0]||(c[0]=ae('<rect x="30" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="30" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="36" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="36" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="36" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="77" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',6))],64)):n.kind==="top-nav"?(d(),u(z,{key:1},[c[1]||(c[1]=ae('<rect x="0" y="0" width="120" height="12" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="12" x2="120" y2="12" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="4" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="50" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="82" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="98" y="5" width="12" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="6" y="18" width="108" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="62" y="42" width="52" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):n.kind==="sidebar-right"?(d(),u(z,{key:2},[c[2]||(c[2]=ae('<rect x="0" y="0" width="90" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="0" y1="10" x2="90" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="3" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="90" y="0" width="30" height="70" fill="#e2e8f0" rx="3" data-v-b3652270></rect><rect x="95" y="8" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="14" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="95" y="20" width="20" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="6" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="47" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',10))],64)):n.kind==="sidebar-both"?(d(),u(z,{key:3},[c[3]||(c[3]=ae('<rect x="0" y="0" width="24" height="70" fill="#1e2a3a" rx="3" data-v-b3652270></rect><rect x="4" y="8" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="14" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="20" width="16" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="96" y="0" width="24" height="70" fill="#f1f5f9" rx="3" data-v-b3652270></rect><rect x="100" y="8" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="100" y="14" width="16" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="24" y="0" width="72" height="10" fill="#ffffff" data-v-b3652270></rect><line x1="24" y1="10" x2="96" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="28" y="3" width="22" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="28" y="16" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="28" y="42" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',12))],64)):n.kind==="top-and-side"?(d(),u(z,{key:4},[c[4]||(c[4]=ae('<rect x="0" y="0" width="120" height="10" fill="#1e2a3a" data-v-b3652270></rect><rect x="6" y="3" width="22" height="4" rx="1" fill="#fff" data-v-b3652270></rect><rect x="50" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="64" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="78" y="4" width="10" height="2" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="0" y="10" width="28" height="60" fill="#e2e8f0" data-v-b3652270></rect><rect x="4" y="16" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="22" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="4" y="28" width="20" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="32" y="14" width="84" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="32" y="38" width="84" height="28" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',11))],64)):n.kind==="hero-landing"?(d(),u(z,{key:5},[c[5]||(c[5]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="18" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="80" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="92" y="5" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="104" y="4" width="12" height="4" rx="1" fill="#0d6efd" data-v-b3652270></rect><rect x="0" y="10" width="120" height="32" fill="#f1f5f9" data-v-b3652270></rect><rect x="20" y="18" width="80" height="5" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="30" y="26" width="60" height="3" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="42" y="33" width="18" height="5" rx="2" fill="#0d6efd" data-v-b3652270></rect><rect x="62" y="33" width="18" height="5" rx="2" fill="#fff" stroke="#0d6efd" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect>',13))],64)):n.kind==="split-panel"?(d(),u(z,{key:6},[c[6]||(c[6]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="52" height="50" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="26" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="32" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="10" y="38" width="44" height="3" rx="1" fill="#94a3b8" data-v-b3652270></rect><rect x="62" y="16" width="52" height="50" rx="2" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.5" data-v-b3652270></rect><rect x="66" y="22" width="30" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><rect x="66" y="30" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="35" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="66" y="40" width="44" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',13))],64)):n.kind==="card-grid"?(d(),u(z,{key:7},[c[7]||(c[7]=ae('<rect x="0" y="0" width="120" height="10" fill="#ffffff" data-v-b3652270></rect><rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" data-v-b3652270></rect><line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></line><rect x="6" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="6" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="43" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="80" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" data-v-b3652270></rect><rect x="10" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="20" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="10" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="47" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect><rect x="84" y="46" width="10" height="2" rx="1" fill="#64748b" data-v-b3652270></rect>',15))],64)):D("",!0)]))]),e("div",Pt,[e("div",Tt,[e("span",Et,o(m(r)("designer."+n.labelKey)),1),s.modelValue===n.kind?(d(),u("span",Rt,[...c[9]||(c[9]=[e("i",{class:"bi bi-check-lg"},null,-1)])])):(d(),u("span",Nt,o(n.category),1))]),e("p",Lt,o(m(r)("designer."+n.descKey)),1)])],42,kt)])),64))]))}},Vt=he(jt,[["__scopeId","data-v-b3652270"]]),Dt={class:"accordion",id:"layoutCustomizerAccordion"},It={class:"accordion-item"},zt={class:"accordion-header"},Mt={class:"accordion-button",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccTitle","aria-expanded":"true"},Wt={id:"cAccTitle",class:"accordion-collapse collapse show"},Ot={class:"accordion-body"},Ut={class:"row g-3"},Bt={class:"col-md-6"},qt={class:"form-label small"},Ft=["placeholder"],Kt={class:"col-md-6"},Ht={class:"form-label small"},Jt={class:"text-secondary"},Gt={class:"col-md-4"},Zt={class:"form-label small"},Yt={class:"input-group input-group-sm"},Xt={class:"col-md-4"},Qt={class:"form-label small"},es={class:"input-group input-group-sm"},ts={class:"col-md-4"},ss={class:"form-label small"},as={key:0,class:"accordion-item"},is={class:"accordion-header"},rs={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccSidebar"},ns={id:"cAccSidebar",class:"accordion-collapse collapse"},os={class:"accordion-body"},ls={key:0,class:"row g-3 mb-3"},ds={class:"col-md-3"},cs={class:"form-label small"},us={class:"input-group input-group-sm"},ps={class:"col-md-3"},fs={class:"form-label small"},ms={class:"input-group input-group-sm"},vs={class:"col-md-3"},bs={class:"form-label small"},hs={class:"input-group input-group-sm"},gs={class:"col-md-3"},ys={class:"form-label small"},xs={key:1,class:"text-secondary small mb-3"},ks={class:"d-flex justify-content-between align-items-center mb-2"},ws={class:"form-label small mb-0"},$s={key:2,class:"text-secondary small py-2"},_s={key:3,class:"menu-item-list"},Cs=["onUpdate:modelValue"],Ss=["value"],As=["onUpdate:modelValue","placeholder"],Ps=["onUpdate:modelValue"],Ts={class:"btn-group"},Es=["onClick","disabled","title"],Rs=["onClick","disabled","title"],Ns=["onClick","title"],Ls={class:"accordion-item"},js={class:"accordion-header"},Vs={class:"accordion-button collapsed",type:"button","data-bs-toggle":"collapse","data-bs-target":"#cAccMain"},Ds={id:"cAccMain",class:"accordion-collapse collapse"},Is={class:"accordion-body"},zs={class:"row g-3"},Ms={class:"col-md-6"},Ws={class:"form-label small"},Os={class:"input-group input-group-sm"},Us={class:"col-md-6"},Bs={class:"form-label small"},qs={__name:"LayoutCustomizer",props:{layout:{type:Object,required:!0}},emits:["update:layout"],setup(s,{emit:i}){const{t}=me(),a=s,p=i,r=F({get:()=>a.layout,set:P=>p("update:layout",P)}),l=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-nav","top-and-side"]),g=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both"]),x=F(()=>{var P;return l.has((P=a.layout)==null?void 0:P.kind)}),f=F(()=>{var P;return g.has((P=a.layout)==null?void 0:P.kind)}),c=F(()=>{var y;const P=(y=a.layout)==null?void 0:y.kind;return t(P==="top-nav"||P==="top-and-side"?"designer.topNavMenu":"designer.sidebarMenu")}),n=F(()=>{var y;const P=(y=a.layout)==null?void 0:y.kind;return P==="top-nav"||P==="top-and-side"?"bi-menu-button-wide":"bi-layout-sidebar"}),v=["bi-house-door","bi-list","bi-grid","bi-person","bi-gear","bi-file-text","bi-bar-chart","bi-cart","bi-bell","bi-envelope","bi-calendar","bi-folder","bi-images","bi-book"];function k(){r.value.sidebar||(r.value.sidebar={items:[]}),Array.isArray(r.value.sidebar.items)||(r.value.sidebar.items=[]),r.value.sidebar.items.push({icon:"bi-house-door",label:t("layoutCustomizer.k21"),path:"/"})}function w(P){r.value.sidebar.items.splice(P,1)}function $(P,y){const V=r.value.sidebar.items,T=P+y;if(T<0||T>=V.length)return;const[S]=V.splice(P,1);V.splice(T,0,S)}return(P,y)=>{var V,T;return d(),u("div",Dt,[e("div",It,[e("h2",zt,[e("button",Mt,[y[17]||(y[17]=e("i",{class:"bi bi-window me-2"},null,-1)),C(o(m(t)("layoutCustomizer.k1")),1)])]),e("div",Wt,[e("div",Ot,[e("div",Ut,[e("div",Bt,[e("label",qt,o(m(t)("layoutCustomizer.k2")),1),X(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[0]||(y[0]=S=>r.value.title.text=S),placeholder:m(t)("layoutCustomizer.k16")},null,8,Ft),[[ee,r.value.title.text]])]),e("div",Kt,[e("label",Ht,[C(o(m(t)("layoutCustomizer.k3"))+" ",1),e("span",Jt,o(m(t)("layoutCustomizer.k4")),1)]),X(e("input",{class:"form-control form-control-sm","onUpdate:modelValue":y[1]||(y[1]=S=>r.value.title.logoUrl=S),placeholder:"https://..."},null,512),[[ee,r.value.title.logoUrl]])]),e("div",Gt,[e("label",Zt,o(m(t)("layoutCustomizer.k5")),1),e("div",Yt,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[2]||(y[2]=S=>r.value.title.bgColor=S)},null,512),[[ee,r.value.title.bgColor]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[3]||(y[3]=S=>r.value.title.bgColor=S)},null,512),[[ee,r.value.title.bgColor]])])]),e("div",Xt,[e("label",Qt,o(m(t)("layoutCustomizer.k6")),1),e("div",es,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[4]||(y[4]=S=>r.value.title.fgColor=S)},null,512),[[ee,r.value.title.fgColor]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[5]||(y[5]=S=>r.value.title.fgColor=S)},null,512),[[ee,r.value.title.fgColor]])])]),e("div",ts,[e("label",ss,o(m(t)("layoutCustomizer.k7")),1),X(e("input",{type:"number",class:"form-control form-control-sm",min:"40",max:"120","onUpdate:modelValue":y[6]||(y[6]=S=>r.value.title.height=S)},null,512),[[ee,r.value.title.height,void 0,{number:!0}]])])])])])]),x.value?(d(),u("div",as,[e("h2",is,[e("button",rs,[e("i",{class:J(["bi me-2",n.value])},null,2),C(o(c.value),1)])]),e("div",ns,[e("div",os,[f.value?(d(),u("div",ls,[e("div",ds,[e("label",cs,o(m(t)("layoutCustomizer.k5")),1),e("div",us,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[7]||(y[7]=S=>r.value.sidebar.bgColor=S)},null,512),[[ee,r.value.sidebar.bgColor]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[8]||(y[8]=S=>r.value.sidebar.bgColor=S)},null,512),[[ee,r.value.sidebar.bgColor]])])]),e("div",ps,[e("label",fs,o(m(t)("layoutCustomizer.k6")),1),e("div",ms,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[9]||(y[9]=S=>r.value.sidebar.fgColor=S)},null,512),[[ee,r.value.sidebar.fgColor]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[10]||(y[10]=S=>r.value.sidebar.fgColor=S)},null,512),[[ee,r.value.sidebar.fgColor]])])]),e("div",vs,[e("label",bs,o(m(t)("layoutCustomizer.k8")),1),e("div",hs,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[11]||(y[11]=S=>r.value.sidebar.activeBg=S)},null,512),[[ee,r.value.sidebar.activeBg]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[12]||(y[12]=S=>r.value.sidebar.activeBg=S)},null,512),[[ee,r.value.sidebar.activeBg]])])]),e("div",gs,[e("label",ys,o(m(t)("layoutCustomizer.k9")),1),X(e("input",{type:"number",class:"form-control form-control-sm",min:"160",max:"320","onUpdate:modelValue":y[13]||(y[13]=S=>r.value.sidebar.width=S)},null,512),[[ee,r.value.sidebar.width,void 0,{number:!0}]])])])):(d(),u("div",xs,[y[18]||(y[18]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),C(" "+o(m(t)("layoutCustomizer.k10")),1)])),e("div",ks,[e("label",ws,o(m(t)("layoutCustomizer.k11")),1),e("button",{class:"btn btn-sm btn-outline-primary",onClick:k},[y[19]||(y[19]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),C(o(m(t)("layoutCustomizer.k12")),1)])]),(T=(V=r.value.sidebar)==null?void 0:V.items)!=null&&T.length?(d(),u("div",_s,[(d(!0),u(z,null,te(r.value.sidebar.items,(S,j)=>(d(),u("div",{key:j,class:"menu-item-row"},[X(e("select",{"onUpdate:modelValue":N=>S.icon=N,class:"form-select form-select-sm icon-select"},[(d(),u(z,null,te(v,N=>e("option",{key:N,value:N},o(N),9,Ss)),64))],8,Cs),[[nt,S.icon]]),X(e("input",{"onUpdate:modelValue":N=>S.label=N,class:"form-control form-control-sm",placeholder:m(t)("layoutCustomizer.k17")},null,8,As),[[ee,S.label]]),X(e("input",{"onUpdate:modelValue":N=>S.path=N,class:"form-control form-control-sm",placeholder:"/path"},null,8,Ps),[[ee,S.path]]),e("div",Ts,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:N=>$(j,-1),disabled:j===0,title:m(t)("layoutCustomizer.k18")},[...y[20]||(y[20]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,Es),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:N=>$(j,1),disabled:j===r.value.sidebar.items.length-1,title:m(t)("layoutCustomizer.k19")},[...y[21]||(y[21]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,Rs),e("button",{class:"btn btn-sm btn-outline-danger",onClick:N=>w(j),title:m(t)("layoutCustomizer.k20")},[...y[22]||(y[22]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,Ns)])]))),128))])):(d(),u("div",$s,o(m(t)("layoutCustomizer.k13")),1))])])])):D("",!0),e("div",Ls,[e("h2",js,[e("button",Vs,[y[23]||(y[23]=e("i",{class:"bi bi-columns me-2"},null,-1)),C(o(m(t)("layoutCustomizer.k14")),1)])]),e("div",Ds,[e("div",Is,[e("div",zs,[e("div",Ms,[e("label",Ws,o(m(t)("layoutCustomizer.k5")),1),e("div",Os,[X(e("input",{type:"color",class:"form-control form-control-color",style:{"max-width":"50px"},"onUpdate:modelValue":y[14]||(y[14]=S=>r.value.mainArea.bgColor=S)},null,512),[[ee,r.value.mainArea.bgColor]]),X(e("input",{type:"text",class:"form-control","onUpdate:modelValue":y[15]||(y[15]=S=>r.value.mainArea.bgColor=S)},null,512),[[ee,r.value.mainArea.bgColor]])])]),e("div",Us,[e("label",Bs,o(m(t)("layoutCustomizer.k15")),1),X(e("input",{type:"number",class:"form-control form-control-sm",min:"0",max:"64","onUpdate:modelValue":y[16]||(y[16]=S=>r.value.mainArea.padding=S)},null,512),[[ee,r.value.mainArea.padding,void 0,{number:!0}]])])])])])])])}}},Fs=he(qs,[["__scopeId","data-v-0fdebd42"]]),Ks=["src"],Hs={class:"mini-title-text"},Js={class:"mini-menu-label"},Gs={key:0,class:"mini-menu-empty"},Zs=["src"],Ys={class:"mini-title-text"},Xs={class:"mini-topnav"},Qs=["src"],ea={class:"mini-title-text"},ta={class:"mini-menu-label"},sa={key:0,class:"mini-menu-empty"},aa={class:"mini-menu-label"},ia={key:0,class:"mini-menu-empty"},ra={class:"mini-center"},na={class:"mini-title-text"},oa={class:"mini-title-text"},la={class:"mini-topnav"},da={class:"mini-menu-label"},ca={key:0,class:"mini-menu-empty"},ua={class:"mini-title-text"},pa={class:"mini-topnav"},fa={class:"mini-title-text"},ma={class:"mini-split-list"},va={class:"mini-title-text"},Be=400,ve=240,ba={__name:"LayoutPreview",props:{layout:{type:Object,required:!0}},setup(s){const i=s,t=F(()=>{var w;return((w=i.layout)==null?void 0:w.kind)||"sidebar-left"}),a=F(()=>{var w;return((w=i.layout)==null?void 0:w.title)||{}}),p=F(()=>{var w;return((w=i.layout)==null?void 0:w.sidebar)||{}}),r=F(()=>{var w;return((w=i.layout)==null?void 0:w.mainArea)||{}}),l=F(()=>p.value.items||[]),g=F(()=>ve/600),x=F(()=>Be/1e3),f=F(()=>Math.max(18,(a.value.height||60)*g.value)),c=F(()=>Math.max(40,(p.value.width||220)*x.value)),n=F(()=>Math.max(4,(r.value.padding||16)*x.value)),v=F(()=>{const w=t.value;return w==="sidebar-right"?"sidebar-right":w==="sidebar-both"?"sidebar-both":w==="top-and-side"?"top-and-side":w==="hero-landing"?"hero-landing":w==="split-panel"?"split-panel":w==="card-grid"?"card-grid":w==="top-nav"?"top-nav":"sidebar-left"});function k(w,$){return(w||[]).slice(0,$)}return(w,$)=>(d(),u("div",{class:"mini-wrapper",style:K({width:Be+"px",height:ve+"px"})},[v.value==="sidebar-left"?(d(),u(z,{key:0},[e("div",{class:"mini-title",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[a.value.logoUrl?(d(),u("img",{key:0,src:a.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Ks)):D("",!0),e("span",Hs,o(a.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:K({height:ve-f.value+"px"})},[e("div",{class:"mini-sidebar",style:K({width:c.value+"px",backgroundColor:p.value.bgColor||(t.value==="sidebar-dark"?"#1e2a3a":"#e2e8f0"),color:p.value.fgColor||(t.value==="sidebar-dark"?"#cfd6de":"#334155")})},[(d(!0),u(z,null,te(k(l.value,8),(P,y)=>(d(),u("div",{key:y,class:J(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:J([P.icon,"mini-menu-icon"])},null,2),e("span",Js,o(P.label),1)],6))),128)),l.value.length?D("",!0):(d(),u("div",Gs,"(메뉴 없음)"))],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...$[0]||($[0]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):v.value==="top-nav"?(d(),u(z,{key:1},[e("div",{class:"mini-title mini-title--nav",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[a.value.logoUrl?(d(),u("img",{key:0,src:a.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Zs)):D("",!0),e("span",Ys,o(a.value.text||"My App"),1),e("div",Xs,[(d(!0),u(z,null,te(k(l.value,5),(P,y)=>(d(),u("span",{key:y,class:"mini-topnav-item"},o(P.label),1))),128))])],4),e("div",{class:"mini-main mini-main--full",style:K({height:ve-f.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...$[1]||($[1]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],64)):v.value==="sidebar-right"?(d(),u(z,{key:2},[e("div",{class:"mini-title",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[a.value.logoUrl?(d(),u("img",{key:0,src:a.value.logoUrl,class:"mini-logo",alt:"logo"},null,8,Qs)):D("",!0),e("span",ea,o(a.value.text||"My App"),1)],4),e("div",{class:"mini-body",style:K({height:ve-f.value+"px"})},[e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...$[2]||($[2]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4),e("div",{class:"mini-sidebar",style:K({width:c.value+"px",backgroundColor:p.value.bgColor||"#e2e8f0",color:p.value.fgColor||"#334155"})},[(d(!0),u(z,null,te(k(l.value,8),(P,y)=>(d(),u("div",{key:y,class:J(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:J([P.icon,"mini-menu-icon"])},null,2),e("span",ta,o(P.label),1)],6))),128)),l.value.length?D("",!0):(d(),u("div",sa,"(메뉴 없음)"))],4)],4)],64)):v.value==="sidebar-both"?(d(),u("div",{key:3,class:"mini-body",style:K({height:ve+"px"})},[e("div",{class:"mini-sidebar",style:K({width:c.value+"px",backgroundColor:p.value.bgColor||"#1e2a3a",color:p.value.fgColor||"#cfd6de"})},[(d(!0),u(z,null,te(k(l.value,8),(P,y)=>(d(),u("div",{key:y,class:J(["mini-menu-item",{active:y===0}]),style:K({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:J([P.icon,"mini-menu-icon"])},null,2),e("span",aa,o(P.label),1)],6))),128)),l.value.length?D("",!0):(d(),u("div",ia,"(메뉴 없음)"))],4),e("div",ra,[e("div",{class:"mini-title",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[e("span",na,o(a.value.text||"My App"),1)],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...$[3]||($[3]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)]),e("div",{class:"mini-sidebar mini-sidebar--aux",style:K({width:Math.min(c.value,70)+"px",backgroundColor:"#f1f5f9",color:"#64748b"})},[...$[4]||($[4]=[ae('<div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder" data-v-582ff2b9></div></div><div class="mini-menu-item aux-dim" data-v-582ff2b9><div class="mini-menu-placeholder short" data-v-582ff2b9></div></div>',3)])],4)],4)):v.value==="top-and-side"?(d(),u(z,{key:4},[e("div",{class:"mini-title mini-title--nav",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#1e2a3a",color:a.value.fgColor||"#ffffff"})},[e("span",oa,o(a.value.text||"My App"),1),e("div",la,[(d(!0),u(z,null,te(k(l.value,3),(P,y)=>(d(),u("span",{key:y,class:"mini-topnav-item"},o(P.label),1))),128))])],4),e("div",{class:"mini-body",style:K({height:ve-f.value+"px"})},[e("div",{class:"mini-sidebar",style:K({width:c.value+"px",backgroundColor:p.value.bgColor||"#e2e8f0",color:p.value.fgColor||"#334155"})},[(d(!0),u(z,null,te(k(l.value.slice(3),6),(P,y)=>(d(),u("div",{key:y,class:J(["mini-menu-item mini-menu-item--sub",{active:y===0}]),style:K({backgroundColor:y===0?p.value.activeBg||"#0d6efd":"transparent"})},[e("i",{class:J([P.icon,"mini-menu-icon"])},null,2),e("span",da,o(P.label),1)],6))),128)),l.value.length<=3?(d(),u("div",ca,"(서브 메뉴)")):D("",!0)],4),e("div",{class:"mini-main",style:K({backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[...$[5]||($[5]=[e("div",{class:"mini-card"},null,-1),e("div",{class:"mini-card-row"},[e("div",{class:"mini-card half"}),e("div",{class:"mini-card half"})],-1)])],4)],4)],64)):v.value==="hero-landing"?(d(),u(z,{key:5},[e("div",{class:"mini-title mini-title--nav mini-title--compact",style:K({backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[e("span",ua,o(a.value.text||"Landing"),1),e("div",pa,[(d(!0),u(z,null,te(k(l.value,4),(P,y)=>(d(),u("span",{key:y,class:"mini-topnav-item"},o(P.label),1))),128)),$[6]||($[6]=e("span",{class:"mini-topnav-cta"},"시작",-1))])],4),e("div",{class:"mini-hero",style:K({backgroundColor:r.value.bgColor||"#eef2ff"})},[...$[7]||($[7]=[ae('<div class="mini-hero-title" data-v-582ff2b9></div><div class="mini-hero-sub" data-v-582ff2b9></div><div class="mini-hero-buttons" data-v-582ff2b9><div class="mini-hero-btn primary" data-v-582ff2b9></div><div class="mini-hero-btn" data-v-582ff2b9></div></div>',3)])],4),$[8]||($[8]=e("div",{class:"mini-landing-features"},[e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"}),e("div",{class:"mini-landing-card"})],-1))],64)):v.value==="split-panel"?(d(),u(z,{key:6},[e("div",{class:"mini-title",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[e("span",fa,o(a.value.text||"My App"),1)],4),e("div",{class:"mini-split",style:K({height:ve-f.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[e("div",ma,[(d(),u(z,null,te(5,P=>e("div",{key:P,class:J(["mini-split-row",{active:P===1}])},null,2)),64))]),$[9]||($[9]=ae('<div class="mini-split-detail" data-v-582ff2b9><div class="mini-split-detail-title" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div><div class="mini-split-detail-line" data-v-582ff2b9></div></div>',1))],4)],64)):v.value==="card-grid"?(d(),u(z,{key:7},[e("div",{class:"mini-title",style:K({height:f.value+"px",backgroundColor:a.value.bgColor||"#ffffff",color:a.value.fgColor||"#0f172a"})},[e("span",va,o(a.value.text||"My App"),1)],4),e("div",{class:"mini-grid",style:K({height:ve-f.value+"px",backgroundColor:r.value.bgColor||"#f5f7fa",padding:n.value+"px"})},[(d(),u(z,null,te(6,P=>e("div",{key:P,class:"mini-grid-card"},[...$[10]||($[10]=[e("div",{class:"mini-grid-card-dot"},null,-1),e("div",{class:"mini-grid-card-line"},null,-1)])])),64))],4)],64)):D("",!0)],4))}},ha=he(ba,[["__scopeId","data-v-582ff2b9"]]),ga={class:"d-flex justify-content-between align-items-center mb-3"},ya={class:"text-secondary small mb-0"},xa={class:"text-muted"},ka={class:"save-indicator"},wa={key:0,class:"text-secondary small"},$a={key:1,class:"text-danger small"},_a={class:"row g-3"},Ca={class:"col-lg-6"},Sa={class:"mb-2"},Aa={class:"col-lg-6"},Pa={class:"right-sticky"},Ta={class:"mb-2"},Ea={class:"mb-2 mt-4"},Ra=500,Na={__name:"LayoutTab",setup(s){var k;const{t:i}=me(),t=Ie(),{activeId:a,activeProject:p,saving:r}=je(t),l=U("idle"),g=U(null);let x=null;function f(w){const $={...w||{}};return $.kind=$.kind||"sidebar-left",$.title={text:"My App",logoUrl:"",bgColor:"#ffffff",fgColor:"#0f172a",height:60,...$.title||{}},$.sidebar={items:[],bgColor:"#1e2a3a",fgColor:"#cfd6de",width:220,activeBg:"#0d6efd",...$.sidebar||{}},Array.isArray($.sidebar.items)||($.sidebar.items=[]),$.mainArea={bgColor:"#f5f7fa",padding:16,...$.mainArea||{}},$}const c=U(f((k=p.value)==null?void 0:k.layout));let n=JSON.stringify(c.value);be(()=>{var w;return(w=p.value)==null?void 0:w.id},()=>{var w;c.value=f((w=p.value)==null?void 0:w.layout),n=JSON.stringify(c.value),l.value="idle",x&&(clearTimeout(x),x=null)}),be(c,()=>{a.value&&JSON.stringify(c.value)!==n&&(l.value="pending",x&&clearTimeout(x),x=setTimeout(async()=>{if(x=null,JSON.stringify(c.value)===n){l.value="idle";return}l.value="saving";try{await t.savePatch(a.value,{layout:c.value}),n=JSON.stringify(c.value),l.value="saved",g.value&&clearTimeout(g.value),g.value=setTimeout(()=>{l.value="idle",g.value=null},2e3)}catch{l.value="error"}},Ra))},{deep:!0}),Ve(async()=>{if(x&&(clearTimeout(x),x=null,a.value&&JSON.stringify(c.value)!==n))try{await t.savePatch(a.value,{layout:c.value})}catch{}g.value&&clearTimeout(g.value)});function v(w){c.value={...c.value,kind:w}}return(w,$)=>(d(),u("div",null,[e("div",ga,[e("p",ya,[C(o(m(i)("designer.layoutHint"))+" ",1),e("span",xa,o(m(i)("designer.autoSaved")),1)]),e("div",ka,[l.value==="pending"?(d(),u("span",wa,[$[1]||($[1]=e("i",{class:"bi bi-pencil-square me-1"},null,-1)),C(o(m(i)("designer.editing")),1)])):l.value==="error"?(d(),u("span",$a,[$[2]||($[2]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(m(i)("designer.saveFailed")),1)])):D("",!0)])]),e("div",_a,[e("div",Ca,[e("h6",Sa,[$[3]||($[3]=e("i",{class:"bi bi-grid-1x2 me-1"},null,-1)),C(o(m(i)("designer.pickStructure")),1)]),_e(Vt,{"model-value":c.value.kind,"onUpdate:modelValue":v},null,8,["model-value"])]),e("div",Aa,[e("div",Pa,[e("h6",Ta,[$[4]||($[4]=e("i",{class:"bi bi-eye me-1"},null,-1)),C(o(m(i)("designer.preview")),1)]),_e(ha,{layout:c.value},null,8,["layout"]),e("h6",Ea,[$[5]||($[5]=e("i",{class:"bi bi-sliders me-1"},null,-1)),C(o(m(i)("designer.details")),1)]),_e(Fs,{layout:c.value,"onUpdate:layout":$[0]||($[0]=P=>c.value=P)},null,8,["layout"])])])])]))}},La=he(Na,[["__scopeId","data-v-d21e1ea0"]]),ja={class:"modal-content"},Va={class:"modal-header"},Da={class:"modal-title"},Ia={key:0,class:"text-muted fs-6"},za={key:0,class:"modal-body"},Ma={class:"text-muted small mb-3"},Wa={class:"row g-3"},Oa=["onClick","onMouseenter"],Ua={class:"kind-icon"},Ba={viewBox:"0 0 80 60",xmlns:"http://www.w3.org/2000/svg"},qa=["x1","x2"],Fa=["y1","y2"],Ka={class:"kind-body"},Ha={class:"kind-label"},Ja={class:"kind-desc"},Ga={key:1,class:"modal-body"},Za={class:"mb-3"},Ya={class:"form-label"},Xa=["placeholder"],Qa={class:"form-text"},ei={class:"mb-3"},ti={class:"form-label"},si={class:"form-text"},ai={key:0,class:"form-text text-primary d-flex align-items-start gap-1 mt-1"},ii=["innerHTML"],ri={key:1,class:"alert alert-warning py-2 px-2 small mt-2 mb-0"},ni=["innerHTML"],oi={class:"alert alert-info small mb-0 py-2"},li={key:0,class:"text-danger small mt-2"},di={class:"modal-footer"},ci={__name:"ScreenCreateModal",emits:["close","created"],setup(s,{emit:i}){const{t}=me(),a=i,p=[{kind:"list",label:t("screenCreate.k1"),description:t("screenCreate.k2"),category:"data",icon:"list"},{kind:"detail",label:t("screenCreate.k3"),description:t("screenCreate.k4"),category:"data",icon:"detail"},{kind:"form-new",label:t("screenCreate.k5"),description:t("screenCreate.k6"),category:"form",icon:"form-new"},{kind:"form-edit",label:t("screenCreate.k7"),description:t("screenCreate.k8"),category:"form",icon:"form-edit"},{kind:"dashboard",label:t("screenCreate.k9"),description:t("screenCreate.k10"),category:"summary",icon:"dashboard"},{kind:"kanban",label:t("screenCreate.k11"),description:t("screenCreate.k12"),category:"summary",icon:"kanban"},{kind:"calendar",label:t("screenCreate.k13"),description:t("screenCreate.k14"),category:"summary",icon:"calendar"},{kind:"chart",label:t("screenCreate.k15"),description:t("screenCreate.k16"),category:"summary",icon:"chart"},{kind:"report",label:t("screenCreate.k17"),description:t("screenCreate.k18"),category:"summary",icon:"report"},{kind:"empty",label:t("screenCreate.k19"),description:t("screenCreate.k20"),category:"blank",icon:"empty"}],r=U(1),l=U("list"),g=F(()=>p.find(B=>B.kind===l.value)||p[0]),x=U(""),f=U(""),c=U(!1),n=U(null),v=U(null),k={학생:"student",사용자:"user",회원:"member",관리자:"admin",상품:"product",주문:"order",결제:"payment",배송:"shipping",게시판:"board",게시글:"post",댓글:"comment",공지:"notice",공지사항:"notice",문의:"inquiry",알림:"notification",고객:"customer",직원:"employee",부서:"department",팀:"team",회사:"company",교사:"teacher",강사:"instructor",과목:"subject",수업:"lesson",카테고리:"category",태그:"tag",파일:"file",이미지:"image",정산:"settlement",재고:"inventory",매출:"sales",통화:"currency",보고서:"report",리포트:"report",책:"book",도서:"book",간식:"snack",학교:"school",선생님:"teacher",친구:"friend",반:"class",숙제:"homework",점수:"score",시험:"exam",급식:"meal",동아리:"club",환자:"patient",진료:"care",진료과:"department",처방:"prescription",병동:"ward",의사:"doctor",간호사:"nurse",예약:"reservation",목록:"list",리스트:"list",상세:"detail",조회:"view",보기:"view",확인:"view",추가:"add",등록:"register",생성:"create",신규:"new",수정:"edit",편집:"edit",변경:"change",삭제:"delete",제거:"remove",검색:"search",필터:"filter",정렬:"sort",가져오기:"import",내보내기:"export",업로드:"upload",다운로드:"download",로그인:"login",로그아웃:"logout",가입:"signup",회원가입:"signup",인증:"auth",권한:"permission",대시보드:"dashboard",홈:"home",메뉴:"menu",네비:"nav",설정:"settings",환경설정:"settings",프로필:"profile",계정:"account",비밀번호:"password",통계:"stats",차트:"chart",그래프:"graph",분석:"analytics",리뷰:"review",평가:"rating",캘린더:"calendar",일정:"schedule",관리:"manage",페이지:"page",화면:"screen",탭:"tab",및:"and",또는:"or",모든:"all",전체:"all",나의:"my",내:"my"},w=["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"],$=["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","yi","i"],P=["","g","kk","gs","n","nj","nh","d","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];function y(B){const h=B.charCodeAt(0);if(h<44032||h>55203)return null;const b=h-44032,M=Math.floor(b/588),Y=Math.floor(b%588/28),q=b%28;return w[M]+$[Y]+P[q]}function V(B){const h=B.charCodeAt(0);return h>=44032&&h<=55203}function T(B){return B?k[B]?k[B]:[...B].some(V)?[...B].map(b=>V(b)?y(b):b).join("-"):B:""}function S(B){const h=String(B||"").trim();return h?h.split(/\s+/).map(T).join("-").toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,60):""}const j=new Set(["detail","form-edit"]),N=F(()=>j.has(l.value)),O=F(()=>/:[A-Za-z_]\w*/.test(f.value||""));function A(B,h){const b=S(B);return b?j.has(h)?`/${b}/:id`:`/${b}`:""}function E(){c.value||(f.value=A(x.value,l.value))}function I(){c.value=!0}function G(B){l.value=B,c.value||(f.value=A(x.value,B)),r.value=2,Oe(()=>{var h;return(h=v.value)==null?void 0:h.focus()})}function Z(){r.value=1,n.value=null}function ue(){const B=x.value.trim();if(!B){n.value=B("designer.titleRequired");return}let h=f.value.trim()||"/untitled";h.startsWith("/")||(h="/"+h);const b=mt(l.value,{title:B,path:h});a("created",b),a("close")}Ze(async()=>{var B;await Oe(),(B=v.value)==null||B.focus()});function de(B){B.key==="Escape"&&a("close")}return(B,h)=>(d(),u("div",{class:"modal-backdrop-custom",onClick:h[4]||(h[4]=De(b=>a("close"),["self"])),onKeydown:de,tabindex:"-1"},[e("div",{class:"modal-dialog modal-dialog-centered",style:K({maxWidth:r.value===1?"900px":"560px"})},[e("div",ja,[e("div",Va,[e("h5",Da,[h[5]||(h[5]=e("i",{class:"bi bi-plus-square me-2"},null,-1)),C(" "+o(m(t)("screenCreate.title"))+" ",1),r.value===2?(d(),u("span",Ia,"— "+o(g.value.label),1)):D("",!0)]),e("button",{type:"button",class:"btn-close",onClick:h[0]||(h[0]=b=>a("close"))})]),r.value===1?(d(),u("div",za,[e("p",Ma,o(m(t)("screenCreate.pickKind")),1),e("div",Wa,[(d(),u(z,null,te(p,b=>e("div",{key:b.kind,class:"col-md-4 col-sm-6"},[e("button",{class:J(["kind-card",{selected:l.value===b.kind}]),onClick:M=>G(b.kind),onMouseenter:M=>l.value=b.kind},[e("div",Ua,[(d(),u("svg",Ba,[h[22]||(h[22]=e("rect",{width:"80",height:"60",fill:"#f8fafc",rx:"3"},null,-1)),b.icon==="list"?(d(),u(z,{key:0},[h[6]||(h[6]=ae('<rect x="6" y="8" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="20" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="32" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="6" y="44" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="12" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="24" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="10" y="36" width="20" height="2" fill="#94a3b8" data-v-d30fe811></rect>',7))],64)):b.icon==="detail"?(d(),u(z,{key:1},[h[7]||(h[7]=ae('<rect x="6" y="6" width="68" height="48" rx="3" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="12" y="14" width="16" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="14" width="36" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="22" width="12" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="22" width="30" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="30" width="14" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="30" width="26" height="3" fill="#0f172a" data-v-d30fe811></rect><rect x="12" y="38" width="18" height="2" fill="#94a3b8" data-v-d30fe811></rect><rect x="32" y="38" width="32" height="3" fill="#0f172a" data-v-d30fe811></rect>',9))],64)):b.icon==="form-new"?(d(),u(z,{key:2},[h[8]||(h[8]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#198754" data-v-d30fe811></rect><rect x="52" y="49" width="12" height="3" fill="#fff" data-v-d30fe811></rect>',5))],64)):b.icon==="form-edit"?(d(),u(z,{key:3},[h[9]||(h[9]=ae('<rect x="10" y="8" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="11" width="20" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="20" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="23" width="30" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" data-v-d30fe811></rect><rect x="14" y="35" width="24" height="2" fill="#0f172a" data-v-d30fe811></rect><rect x="46" y="46" width="24" height="9" rx="2" fill="#0d6efd" data-v-d30fe811></rect><rect x="53" y="49" width="10" height="3" fill="#fff" data-v-d30fe811></rect>',8))],64)):b.icon==="dashboard"?(d(),u(z,{key:4},[h[10]||(h[10]=ae('<rect x="4" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="23" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="42" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="61" y="6" width="15" height="20" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="8" y="14" width="8" height="6" fill="#0d6efd" data-v-d30fe811></rect><rect x="27" y="14" width="8" height="6" fill="#198754" data-v-d30fe811></rect><rect x="46" y="14" width="8" height="6" fill="#ffc107" data-v-d30fe811></rect><rect x="65" y="14" width="7" height="6" fill="#dc3545" data-v-d30fe811></rect><rect x="4" y="30" width="72" height="24" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><polyline points="10,50 20,42 30,46 40,36 50,40 60,32 70,38" stroke="#0d6efd" stroke-width="1.5" fill="none" data-v-d30fe811></polyline>',10))],64)):b.icon==="kanban"?(d(),u(z,{key:5},[h[11]||(h[11]=ae('<rect x="4" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="29" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="54" y="6" width="22" height="48" rx="2" fill="#f1f5f9" data-v-d30fe811></rect><rect x="7" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="7" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="32" y="32" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="57" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect>',9))],64)):b.icon==="calendar"?(d(),u(z,{key:6},[h[12]||(h[12]=e("rect",{x:"4",y:"6",width:"72",height:"48",rx:"3",fill:"#fff",stroke:"#cbd5e1"},null,-1)),h[13]||(h[13]=e("rect",{x:"4",y:"6",width:"72",height:"10",fill:"#f1f5f9"},null,-1)),(d(),u(z,null,te(6,M=>e("line",{key:"vl"+M,x1:4+M*12,y1:"6",x2:4+M*12,y2:"54",stroke:"#e2e8f0","stroke-width":"0.5"},null,8,qa)),64)),(d(),u(z,null,te(3,M=>e("line",{key:"hl"+M,x1:"4",y1:16+M*10,x2:"76",y2:16+M*10,stroke:"#e2e8f0","stroke-width":"0.5"},null,8,Fa)),64)),h[14]||(h[14]=e("circle",{cx:"28",cy:"30",r:"2",fill:"#0d6efd"},null,-1)),h[15]||(h[15]=e("circle",{cx:"52",cy:"40",r:"2",fill:"#198754"},null,-1)),h[16]||(h[16]=e("circle",{cx:"16",cy:"50",r:"2",fill:"#ffc107"},null,-1))],64)):b.icon==="chart"?(d(),u(z,{key:7},[h[17]||(h[17]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><line x1="10" y1="46" x2="70" y2="46" stroke="#94a3b8" data-v-d30fe811></line><line x1="10" y1="12" x2="10" y2="46" stroke="#94a3b8" data-v-d30fe811></line><rect x="14" y="30" width="8" height="16" fill="#0d6efd" data-v-d30fe811></rect><rect x="26" y="20" width="8" height="26" fill="#198754" data-v-d30fe811></rect><rect x="38" y="26" width="8" height="20" fill="#ffc107" data-v-d30fe811></rect><rect x="50" y="14" width="8" height="32" fill="#dc3545" data-v-d30fe811></rect><rect x="62" y="22" width="8" height="24" fill="#6610f2" data-v-d30fe811></rect>',8))],64)):b.icon==="report"?(d(),u(z,{key:8},[h[18]||(h[18]=ae('<rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" data-v-d30fe811></rect><rect x="10" y="10" width="40" height="4" fill="#0f172a" data-v-d30fe811></rect><rect x="10" y="17" width="24" height="2" fill="#94a3b8" data-v-d30fe811></rect><line x1="10" y1="23" x2="70" y2="23" stroke="#e2e8f0" data-v-d30fe811></line><rect x="10" y="26" width="60" height="4" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="32" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="37" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect><rect x="10" y="42" width="60" height="3" rx="0.5" fill="#e2e8f0" data-v-d30fe811></rect><rect x="10" y="47" width="60" height="3" rx="0.5" fill="#f1f5f9" data-v-d30fe811></rect>',9))],64)):b.icon==="empty"?(d(),u(z,{key:9},[h[19]||(h[19]=e("rect",{x:"8",y:"10",width:"64",height:"40",rx:"3",fill:"none",stroke:"#cbd5e1","stroke-width":"1.5","stroke-dasharray":"3 2"},null,-1)),h[20]||(h[20]=e("circle",{cx:"40",cy:"30",r:"4",fill:"#cbd5e1"},null,-1)),h[21]||(h[21]=e("rect",{x:"36",y:"28",width:"8",height:"4",fill:"#cbd5e1"},null,-1))],64)):D("",!0)]))]),e("div",Ka,[e("div",Ha,o(b.label),1),e("div",Ja,o(b.description),1)])],42,Oa)])),64))])])):(d(),u("div",Ga,[e("div",Za,[e("label",Ya,[C(o(m(t)("screenCreate.screenTitle"))+" ",1),h[23]||(h[23]=e("span",{class:"text-danger"},"*",-1))]),X(e("input",{ref_key:"nameInput",ref:v,"onUpdate:modelValue":h[1]||(h[1]=b=>x.value=b),onInput:E,type:"text",class:"form-control",placeholder:m(t)("screenCreate.titlePlaceholder"),maxlength:"100",onKeyup:Re(ue,["enter"])},null,40,Xa),[[ee,x.value]]),e("div",Qa,o(m(t)("screenCreate.titleHint")),1)]),e("div",ei,[e("label",ti,o(m(t)("screenCreate.pathLabel")),1),X(e("input",{"onUpdate:modelValue":h[2]||(h[2]=b=>f.value=b),onInput:I,type:"text",class:"form-control",placeholder:"/dashboard",maxlength:"100"},null,544),[[ee,f.value]]),e("div",si,o(m(t)("screenCreate.pathHint")),1),N.value?(d(),u("div",ai,[h[24]||(h[24]=e("i",{class:"bi bi-info-circle mt-1"},null,-1)),e("span",{innerHTML:m(t)("screenCreate.idParamHint")},null,8,ii)])):D("",!0),N.value&&!O.value?(d(),u("div",ri,[h[25]||(h[25]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("span",{innerHTML:m(t)("screenCreate.noIdWarn")},null,8,ni)])):D("",!0)]),e("div",oi,[h[26]||(h[26]=e("i",{class:"bi bi-info-circle me-1"},null,-1)),C(" "+o(m(t)("screenCreate.createdAs",{label:g.value.label}))+" "+o(m(t)("designer.wizardHint")),1)]),n.value?(d(),u("div",li,[h[27]||(h[27]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(n.value),1)])):D("",!0)])),e("div",di,[r.value===2?(d(),u("button",{key:0,class:"btn btn-link me-auto",onClick:Z},[h[28]||(h[28]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),C(o(m(t)("screenCreate.pickAgain")),1)])):D("",!0),e("button",{class:"btn btn-secondary",onClick:h[3]||(h[3]=b=>a("close"))},o(m(t)("common.cancel")),1),r.value===2?(d(),u("button",{key:1,class:"btn btn-primary",onClick:ue},[h[29]||(h[29]=e("i",{class:"bi bi-check2 me-1"},null,-1)),C(o(m(t)("screenCreate.create")),1)])):D("",!0)])])],4)],32))}},ui=he(ci,[["__scopeId","data-v-d30fe811"]]),pi={class:"wizard-modal"},fi={class:"wizard-header"},mi={class:"mb-0"},vi={class:"wizard-steps"},bi={class:"step-num"},hi={class:"step-label"},gi={class:"wizard-body"},yi={key:0,class:"step-pane"},xi={class:"step-title"},ki={class:"input-group input-group-sm mb-2"},wi=["placeholder"],$i={key:0,class:"alert alert-danger small"},_i={key:1,class:"text-center py-4 text-secondary small"},Ci={key:2,class:"ctrl-list"},Si={key:0,class:"empty-state"},Ai={class:"fw-semibold mb-1"},Pi={class:"text-secondary small mb-3"},Ti={class:"text-secondary small mt-3"},Ei=["checked","onChange"],Ri={class:"flex-grow-1"},Ni={class:"fw-semibold"},Li={class:"text-secondary small"},ji={key:0,class:"text-secondary small text-center py-3"},Vi={key:1,class:"step-pane"},Di={class:"step-title"},Ii={class:"small text-secondary mb-2"},zi={key:0,class:"text-secondary small text-center py-3"},Mi=["checked","onChange"],Wi={class:"route-path"},Oi={class:"text-secondary small ms-auto"},Ui={key:1,class:"alert alert-warning small mt-3"},Bi={key:2,class:"step-pane"},qi={class:"step-title"},Fi={class:"route-summary mb-3"},Ki={class:"ms-2"},Hi={key:0,class:"text-center py-3 text-secondary small"},Ji={key:1},Gi={key:0,class:"text-secondary small mb-3"},Zi={class:"form-label small mb-1"},Yi={key:0,class:"text-danger"},Xi={class:"text-secondary ms-1"},Qi=["onUpdate:modelValue","placeholder"],er=["onUpdate:modelValue","placeholder"],tr={key:2,class:"form-text"},sr={key:1,class:"deps-summary"},ar={class:"section-label mt-3"},ir={class:"small text-secondary"},rr={key:0,class:"ms-2"},nr={key:3,class:"step-pane"},or={class:"step-title"},lr={class:"route-summary mb-3"},dr={class:"ms-2"},cr={key:0,class:"text-center py-4"},ur=["disabled"],pr={key:0,class:"spinner-border spinner-border-sm me-1"},fr={key:1,class:"bi bi-play-fill me-1"},mr={class:"small text-secondary mt-2"},vr={key:1},br={key:0,class:"alert alert-danger small"},hr={class:"fw-semibold"},gr={class:"mt-1"},yr={key:1},xr={class:"alert alert-success small py-2"},kr={key:0},wr={key:0,class:"mb-3"},$r={class:"section-label"},_r={class:"output-fields"},Cr={class:"text-secondary"},Sr={key:0,class:"text-secondary ms-1"},Ar={class:"mb-3"},Pr={class:"small text-secondary",style:{cursor:"pointer"}},Tr={class:"sample-json"},Er={class:"wizard-footer"},Rr=["disabled"],Nr=["disabled"],Lr={key:0,class:"spinner-border spinner-border-sm me-1"},jr={__name:"ScreenWizardModal",props:{show:{type:Boolean,default:!1}},emits:["close","create"],setup(s,{emit:i}){const{t}=me(),a=s,p=i,r=U(1),l=U([]),g=U(!1),x=U(null),f=U(""),c=U(null),n=U(null),v=U(!1),k=U(null),w=U({});function $(){const h=new Date,b=(q,R=2)=>String(q).padStart(R,"0"),M=`${h.getFullYear()}${b(h.getMonth()+1)}${b(h.getDate())}-${b(h.getHours())}${b(h.getMinutes())}${b(h.getSeconds())}`,Y=Math.floor(Math.random()*65536).toString(16).padStart(4,"0");return`req-${M}-${Y}`}const P=U(!1),y=U(null),V=U(!1),T=F(()=>{const h=f.value.trim().toLowerCase();return h?l.value.filter(b=>[b.name,b.base_path,b.basePath,b.description].filter(Boolean).join(" ").toLowerCase().includes(h)):l.value}),S=F(()=>n.value?["POST","PUT","PATCH","DELETE"].includes((n.value.method||"GET").toUpperCase()):!1),j=F(()=>r.value===1?!!c.value:r.value===2?!!n.value:r.value===3?!!k.value:r.value===4?!!y.value&&y.value.ok:!1);function N(h){const b=(h||"GET").toUpperCase();return{GET:"bg-success",POST:"bg-warning text-dark",PUT:"bg-info text-dark",PATCH:"bg-info text-dark",DELETE:"bg-danger"}[b]||"bg-secondary"}function O(h){const b=h.type||"string",M=h.source||"";return M==="path"?t("designer.valueIn").replace("{type}",b):M==="query"?t("designer.valueQuery").replace("{type}",b):t("designer.valuePlain").replace("{type}",b)}function A(){r.value=1,c.value=null,n.value=null,k.value=null,w.value={},y.value=null,V.value=!1}function E(){A(),p("close")}async function I(){var h,b,M;g.value=!0,x.value=null;try{const Y=await Se.get("/api/admin/controllers/paged",{params:{page:1,perPage:200}});l.value=((h=Y.data)==null?void 0:h.data)||[]}catch(Y){x.value=((M=(b=Y.response)==null?void 0:b.data)==null?void 0:M.message)||Y.message}finally{g.value=!1}}async function G(h){var b,M,Y;c.value=h,n.value=null;try{const R=((b=(await Se.get(`/api/admin/controllers/${encodeURIComponent(h.id)}`)).data)==null?void 0:b.data)||{};Array.isArray(R.routes)&&(R.routes=R.routes.map(_=>({..._,handler:_.handler||_.handlerName||null}))),c.value={...h,...R}}catch(q){x.value=`${t("designer.ctrlDetailFailed")}: ${((Y=(M=q.response)==null?void 0:M.data)==null?void 0:Y.message)||q.message}`}}function Z(h){n.value=h}async function ue(){var h,b;if(!(!c.value||!n.value)){v.value=!0,k.value=null;try{const M=await Se.get("/api/admin/screen-wizard/analyze",{params:{controllerId:c.value.name||c.value.id,handler:n.value.handler}});k.value=((h=M.data)==null?void 0:h.data)||null;const Y={};for(const q of((b=k.value)==null?void 0:b.inputs)||[])q.default!=null&&(Y[q.name]=q.default);Y.requestCode=$(),k.value&&!k.value.inputs.some(q=>q.name==="requestCode")&&k.value.inputs.unshift({name:"requestCode",type:"string",source:"auto",required:!1,default:Y.requestCode,desc:t("screenWizard.k10")}),w.value=Y}catch(M){ge(t("designer.analyzeFailed"),M)}finally{v.value=!1}}}async function de(){var h,b,M,Y;if(!(S.value&&!await Ee({title:t("designer.runRouteTitle").replace("{m}",n.value.method),message:t("designer.runRouteMsg").replace(/\{m\}/g,n.value.method),detail:t("designer.runRouteDetail"),confirmText:t("screenWizard.k11"),variant:"danger",icon:"bi-exclamation-triangle"}))){P.value=!0,y.value=null;try{const q={};for(const _ of((h=k.value)==null?void 0:h.inputs)||[]){let W=w.value[_.name];W===""||W==null||(_.type==="number"&&(W=Number(W)),_.type==="boolean"&&(W=W===!0||W==="true"),q[_.name]=W)}const R=await Se.post("/api/admin/screen-wizard/probe",{controllerId:c.value.name||c.value.id,handler:n.value.handler,params:q});y.value=((b=R.data)==null?void 0:b.data)||null}catch(q){y.value={ok:!1,error:((Y=(M=q.response)==null?void 0:M.data)==null?void 0:Y.message)||q.message,outputFields:[]}}finally{P.value=!1}}}function B(){const h=k.value,b=y.value;if(!h||!b||!b.ok)return;const M=(h.method||"GET").toUpperCase(),Y=M==="POST"||M==="PUT"||M==="PATCH"||M==="DELETE";let q=h.suggestedWidget||"text";b.shape==="pagedRows"||b.shape==="rowsArray"?q="list":b.shape==="object"&&(q="detail");const R=h.handler.replace(/([A-Z])/g," $1").replace(/^./,Q=>Q.toUpperCase()).trim(),_=`${h.controllerName.replace(/Controller$/i,"")} ${R}`.trim(),W=`/${h.handler.toLowerCase()}`.replace(/[^a-z0-9\-/]/g,"-"),ie=b.listPath||null,re=(h.inputs||[]).filter(Q=>Q.name!=="requestCode"),le=re.filter(Q=>Q.source==="path"),L=re.filter(Q=>Q.source!=="path"),se=c.value.name||c.value.id,ce=vt({title:_,path:W}),we=(h.fullPath||"").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g,"{$1}");if(Y){const Q=Ae({kind:"formDialog"});Q.title=_,Q.source={type:"endpoint",method:M,path:we,controllerId:se,handlerName:h.handler};const $e=M==="DELETE"?"danger":M==="POST"?"success":"primary",pe=t(M==="POST"?"designer.actCreate":M==="DELETE"?"designer.actDelete":"designer.actUpdate");Q.config={buttonLabel:pe,buttonVariant:$e,dialogTitle:`${_} — ${pe}`,fields:re.map(ke=>({name:ke.name,label:ke.name,type:ke.type||"string",required:!!ke.required,default:ke.default!=null?ke.default:"",placeholder:O(ke)})),confirmBeforeSubmit:M==="DELETE",refreshTargetWidgetId:null},ce.rows=[Pe({widths:[12],widgets:[Q]})]}else if(le.length>0||L.length>0&&q==="detail"){const Q=Ae({kind:q});Q.title=_+" 결과",Q.source={type:"endpoint",method:M,path:we,resultKey:ie,controllerId:se,handlerName:h.handler},q==="list"?Q.config={maxRows:20}:q==="stat"&&(Q.config={format:"number",color:"primary"});const $e=Ae({kind:"queryForm"});$e.title=_+" 조회",$e.source={type:"endpoint",method:M,path:we,resultKey:ie,controllerId:se,handlerName:h.handler},$e.config={endpointHint:`${M} ${we}`,fields:re.map(pe=>({name:pe.name,label:pe.name,type:pe.type||"string",required:!!pe.required,default:pe.default!=null?pe.default:"",placeholder:O(pe)})),submitLabel:"조회",targetWidgetId:Q.id},ce.rows=[Pe({widths:[12],widgets:[$e]}),Pe({widths:[12],widgets:[Q]})]}else{const Q=Ae({kind:q});Q.title=_,Q.source={type:"endpoint",method:M,path:h.fullPath,resultKey:ie,controllerId:se,handlerName:h.handler},q==="list"?Q.config={maxRows:20}:q==="stat"&&(Q.config={format:"number",color:"primary"}),ce.rows=[Pe({widths:[12],widgets:[Q]})]}p("create",ce),E()}return be(()=>a.show,h=>{h&&(A(),l.value.length||I())}),(h,b)=>{var Y,q,R,_,W,ie,re,le;const M=ot("router-link");return s.show?(d(),u("div",{key:0,class:"wizard-backdrop",onClick:De(E,["self"])},[e("div",pi,[e("div",fi,[e("h5",mi,[b[6]||(b[6]=e("i",{class:"bi bi-magic me-2"},null,-1)),C(o(m(t)("wizard.title")),1)]),e("button",{class:"btn btn-sm btn-link text-secondary",onClick:E},[...b[7]||(b[7]=[e("i",{class:"bi bi-x-lg"},null,-1)])])]),e("div",vi,[(d(),u(z,null,te(4,L=>e("div",{key:L,class:J(["step-item",{active:r.value===L,done:r.value>L}])},[e("span",bi,o(L),1),e("span",hi,o([m(t)("screenWizard.k2"),m(t)("screenWizard.k5"),m(t)("screenWizard.k6"),m(t)("screenWizard.k7")][L-1]),1)],2)),64))]),e("div",gi,[r.value===1?(d(),u("div",yi,[e("div",xi,o(m(t)("wizard.step1")),1),e("div",ki,[b[8]||(b[8]=e("span",{class:"input-group-text"},[e("i",{class:"bi bi-search"})],-1)),X(e("input",{"onUpdate:modelValue":b[0]||(b[0]=L=>f.value=L),class:"form-control",placeholder:m(t)("wiz2.searchByNameOrPath")},null,8,wi),[[ee,f.value]])]),x.value?(d(),u("div",$i,o(x.value),1)):D("",!0),g.value?(d(),u("div",_i,[b[9]||(b[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),C(o(m(t)("wizard.loading")),1)])):(d(),u("div",Ci,[l.value.length?(d(),u(z,{key:1},[(d(!0),u(z,null,te(T.value,L=>{var se,ce;return d(),u("label",{key:L.id,class:J(["ctrl-item",{selected:((se=c.value)==null?void 0:se.id)===L.id}])},[e("input",{type:"radio",checked:((ce=c.value)==null?void 0:ce.id)===L.id,onChange:we=>G(L)},null,40,Ei),e("div",Ri,[e("div",Ni,o(L.name),1),e("div",Li,[e("code",null,o(L.base_path||L.basePath||"-"),1)])])],2)}),128)),T.value.length?D("",!0):(d(),u("div",ji,[b[13]||(b[13]=e("i",{class:"bi bi-search me-1"},null,-1)),C('"'+o(f.value)+'" 로 검색한 결과가 없습니다 ',1)]))],64)):(d(),u("div",Si,[b[12]||(b[12]=e("div",{class:"empty-icon"},[e("i",{class:"bi bi-collection"})],-1)),e("div",Ai,o(m(t)("wizard.noControllers")),1),e("div",Pi,[C(o(m(t)("wizard.intro")),1),b[10]||(b[10]=e("br",null,null,-1)),C(" "+o(m(t)("screenWizard.k1"))+" ",1),e("strong",null,o(m(t)("screenWizard.k2")),1),C(" "+o(m(t)("screenWizard.k3")),1)]),_e(M,{to:{name:"controllers"},class:"btn btn-sm btn-primary",onClick:b[1]||(b[1]=L=>p("close"))},{default:lt(()=>[b[11]||(b[11]=e("i",{class:"bi bi-arrow-right me-1"},null,-1)),C(o(m(t)("wizard.goControllers")),1)]),_:1}),e("div",Ti,o(m(t)("screenWizard.k4")),1)]))]))])):r.value===2?(d(),u("div",Vi,[e("div",Di,o(m(t)("wizard.step2")),1),e("div",Ii,[e("strong",null,o((Y=c.value)==null?void 0:Y.name),1),C(" "+o(m(t)("wiz2.routesOf")),1)]),(R=(q=c.value)==null?void 0:q.routes)!=null&&R.length?D("",!0):(d(),u("div",zi,o(m(t)("wizard.noRoutesFor")),1)),(d(!0),u(z,null,te(((_=c.value)==null?void 0:_.routes)||[],L=>{var se,ce;return d(),u("label",{key:L.handler,class:J(["route-item",{selected:((se=n.value)==null?void 0:se.handler)===L.handler}])},[e("input",{type:"radio",checked:((ce=n.value)==null?void 0:ce.handler)===L.handler,onChange:we=>Z(L)},null,40,Mi),e("span",{class:J(["badge route-method-badge",N(L.method)])},o((L.method||"GET").toUpperCase()),3),e("code",Wi,o(L.path||"/"),1),e("span",Oi,o(L.handler),1)],2)}),128)),n.value&&S.value?(d(),u("div",Ui,[b[14]||(b[14]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),e("strong",null,o(n.value.method),1),C(" 라우트를 선택했습니다. 이 타입은 서버 데이터를 변경할 수 있으며, "+o(m(t)("wiz2.next"))+" 단계에서 실제 호출 시 경고 대화상자가 표시됩니다. ",1)])):D("",!0)])):r.value===3?(d(),u("div",Bi,[e("div",qi,o(m(t)("wizard.step3")),1),e("div",Fi,[e("span",{class:J(["badge",N(n.value.method)])},o(n.value.method),3),e("code",Ki,o(((W=k.value)==null?void 0:W.fullPath)||(((ie=c.value)==null?void 0:ie.base_path)||((re=c.value)==null?void 0:re.basePath)||"")+n.value.path),1)]),v.value?(d(),u("div",Hi,[b[15]||(b[15]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),C(o(m(t)("wiz2.analyzing")),1)])):k.value?(d(),u("div",Ji,[k.value.inputs.length?D("",!0):(d(),u("div",Gi,o(m(t)("wizard.noInputParams")),1)),(d(!0),u(z,null,te(k.value.inputs,L=>(d(),u("div",{key:L.name,class:"input-field mb-2"},[e("label",Zi,[e("strong",null,o(L.name),1),L.required?(d(),u("span",Yi,"*")):D("",!0),e("span",Xi,"("+o(L.type)+", "+o(L.source)+")",1)]),L.type==="number"?X((d(),u("input",{key:0,type:"number",class:"form-control form-control-sm","onUpdate:modelValue":se=>w.value[L.name]=se,placeholder:String(L.default??"")},null,8,Qi)),[[ee,w.value[L.name]]]):X((d(),u("input",{key:1,type:"text",class:"form-control form-control-sm","onUpdate:modelValue":se=>w.value[L.name]=se,placeholder:L.desc||String(L.default??"")},null,8,er)),[[ee,w.value[L.name]]]),L.desc?(d(),u("div",tr,o(L.desc),1)):D("",!0)]))),128)),k.value.dependencies?(d(),u("div",sr,[e("div",ar,o(m(t)("wiz2.reference")),1),e("div",ir,[b[16]||(b[16]=C(" Services: ",-1)),e("strong",null,o(k.value.dependencies.services.length),1),b[17]||(b[17]=C(" · SQL files: ",-1)),e("strong",null,o(k.value.dependencies.sqls.length),1),k.value.dependencies.services.length?(d(),u("span",rr," ("+o(k.value.dependencies.services.map(L=>L.name).join(", "))+") ",1)):D("",!0)])])):D("",!0)])):D("",!0)])):r.value===4?(d(),u("div",nr,[e("div",or,o(m(t)("wizard.step4")),1),e("div",lr,[e("span",{class:J(["badge",N(n.value.method)])},o(n.value.method),3),e("code",dr,o((le=k.value)==null?void 0:le.fullPath),1)]),y.value?(d(),u("div",vr,[y.value.ok?(d(),u("div",yr,[e("div",xr,[b[21]||(b[21]=e("i",{class:"bi bi-check-circle me-1"},null,-1)),C(" "+o(m(t)("wiz2.responseOk"))+" ",1),e("code",null,o(y.value.shape),1),y.value.listPath?(d(),u("span",kr,[b[20]||(b[20]=C(", listPath: ",-1)),e("code",null,o(y.value.listPath),1)])):D("",!0)]),y.value.outputFields.length?(d(),u("div",wr,[e("div",$r,"추출된 Output 필드 ("+o(y.value.outputFields.length)+"개)",1),e("div",_r,[(d(!0),u(z,null,te(y.value.outputFields,L=>(d(),u("div",{key:L.name,class:"field-tag"},[e("strong",null,o(L.name),1),e("span",Cr,": "+o(L.type),1),L.sample!=null?(d(),u("span",Sr," ≈ "+o(typeof L.sample=="string"&&L.sample.length>24?L.sample.slice(0,24)+"...":L.sample),1)):D("",!0)]))),128))])])):D("",!0),e("details",Ar,[e("summary",Pr,o(m(t)("wiz2.viewRawJson")),1),e("pre",Tr,[e("code",null,o(JSON.stringify(y.value.sample,null,2).slice(0,2e3)),1)])]),e("button",{class:"btn btn-success w-100",onClick:B},[b[22]||(b[22]=e("i",{class:"bi bi-magic me-1"},null,-1)),C(" "+o(m(t)("wiz2.buildFromThis"))+" (widget: ",1),e("strong",null,o(k.value.suggestedWidget),1),b[23]||(b[23]=C(") ",-1))])])):(d(),u("div",br,[e("div",hr,[b[18]||(b[18]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(m(t)("wiz2.runFailed")),1)]),e("div",gr,o(y.value.error),1),e("button",{class:"btn btn-sm btn-outline-secondary mt-2",onClick:b[2]||(b[2]=L=>y.value=null)},[b[19]||(b[19]=e("i",{class:"bi bi-arrow-counterclockwise me-1"},null,-1)),C(o(m(t)("wiz2.retry")),1)])]))])):(d(),u("div",cr,[e("button",{class:J(["btn btn-primary",{"btn-warning text-dark":S.value}]),disabled:P.value,onClick:de},[P.value?(d(),u("span",pr)):(d(),u("i",fr)),C(" "+o(S.value?"⚠️ "+n.value.method+m(t)("screenWizard.k8"):m(t)("screenWizard.k9")),1)],10,ur),e("div",mr,o(m(t)("wizard.step4Hint")),1)]))])):D("",!0)]),e("div",Er,[r.value>1?(d(),u("button",{key:0,class:"btn btn-outline-secondary btn-sm",onClick:b[3]||(b[3]=L=>r.value=r.value-1)},[b[24]||(b[24]=e("i",{class:"bi bi-arrow-left me-1"},null,-1)),C(o(m(t)("wiz2.prev")),1)])):D("",!0),b[28]||(b[28]=e("span",{class:"ms-auto"},null,-1)),r.value<4&&r.value!==3?(d(),u("button",{key:1,class:"btn btn-primary btn-sm",disabled:!j.value,onClick:b[4]||(b[4]=L=>r.value=r.value+1)},[C(o(m(t)("wiz2.next"))+" ",1),b[25]||(b[25]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))],8,Rr)):D("",!0),r.value===3&&!k.value?(d(),u("button",{key:2,class:"btn btn-primary btn-sm",disabled:!n.value||v.value,onClick:ue},[v.value?(d(),u("span",Lr)):D("",!0),C(" "+o(m(t)("wiz2.analyze"))+" ",1),b[26]||(b[26]=e("i",{class:"bi bi-search ms-1"},null,-1))],8,Nr)):r.value===3&&k.value?(d(),u("button",{key:3,class:"btn btn-primary btn-sm",onClick:b[5]||(b[5]=L=>r.value=4)},[C(o(m(t)("wiz2.next"))+" ",1),b[27]||(b[27]=e("i",{class:"bi bi-arrow-right ms-1"},null,-1))])):D("",!0)])])])):D("",!0)}}},Vr=he(jr,[["__scopeId","data-v-5679dbca"]]),Dr={class:"d-flex justify-content-between align-items-center mb-3"},Ir={class:"mb-1"},zr={class:"badge bg-secondary ms-2"},Mr={class:"text-secondary small mb-0"},Wr=["disabled"],Or=["disabled"],Ur={key:0,class:"card"},Br={class:"card-body text-center py-5 text-secondary"},qr={class:"mb-2"},Fr={class:"small"},Kr={key:1,class:"card"},Hr={class:"table-responsive"},Jr={class:"table table-hover mb-0"},Gr={class:"table-light"},Zr={style:{width:"110px"}},Yr={style:{width:"240px"}},Xr={class:"text-secondary small"},Qr={key:0,class:"d-flex gap-1"},en=["onKeyup"],tn=["onClick","title"],sn=["title"],an=["onClick"],rn={class:"small"},nn={class:"small text-secondary"},on={class:"small text-secondary"},ln=["onClick","title"],dn={class:"btn-group me-1"},cn=["onClick","disabled","title"],un=["onClick","disabled","title"],pn=["onClick","title"],fn=["onClick","disabled","title"],mn={key:0,class:"spinner-border spinner-border-sm"},vn={key:1,class:"bi bi-trash"},bn={__name:"ScreensTab",setup(s){const{t:i}=me();Ye();const t=Xe(),a=Ie(),{activeId:p,activeProject:r,saving:l}=je(a),g=U(!1),x=U(!1),f=U(null),c=U(null),n=U(""),v=F(()=>{var A;return((A=r.value)==null?void 0:A.screens)||[]});async function k(A){if(!r.value)return;const E=[...v.value,A];try{await a.savePatch(p.value,{screens:E})}catch(I){ge("화면 생성 실패",I)}}async function w(A){if(!r.value)return;const E=[...v.value,A];try{await a.savePatch(p.value,{screens:E}),t.push({name:"screen-studio",params:{id:p.value,screenId:A.id}})}catch(I){ge("화면 생성 실패",I)}}async function $(A){if(!await ft(A.title,{title:i("screensTab.k21")}))return;f.value=A.id;const E=v.value.filter(I=>I.id!==A.id);try{await a.savePatch(p.value,{screens:E})}catch(I){ge("삭제 실패",I)}finally{f.value=null}}function P(A){c.value=A.id,n.value=A.title}function y(){c.value=null,n.value=""}async function V(A){const E=n.value.trim();if(!E){y();return}if(E===A.title){y();return}const I=v.value.map(G=>G.id===A.id?{...G,title:E,header:{...G.header||{},title:E}}:G);try{await a.savePatch(p.value,{screens:I})}catch(G){ge("이름 변경 실패",G)}finally{y()}}async function T(A,E){const I=v.value.findIndex(de=>de.id===A.id),G=I+E;if(I<0||G<0||G>=v.value.length)return;const Z=[...v.value],[ue]=Z.splice(I,1);Z.splice(G,0,ue);try{await a.savePatch(p.value,{screens:Z})}catch(de){ge("이동 실패",de)}}function S(A){t.push({name:"screen-studio",params:{id:p.value,screenId:A.id}})}function j(A){return A.kind!=="composite"||!Array.isArray(A.rows)?0:A.rows.reduce((E,I)=>{var G;return E+(((G=I.widgets)==null?void 0:G.length)||0)},0)}function N(A){return Array.isArray(A==null?void 0:A.rows)?A.rows.length:0}function O(A){var I;const E=((I=A.header)==null?void 0:I.kind)||"page-title";return bt(E).label}return(A,E)=>(d(),u("div",null,[e("div",Dr,[e("div",null,[e("h6",Ir,[E[5]||(E[5]=e("i",{class:"bi bi-collection me-1"},null,-1)),C(o(m(i)("screensTab.k1"))+" ",1),e("span",zr,o(v.value.length),1)]),e("p",Mr,o(m(i)("screensTab.k2")),1)]),e("button",{class:"btn btn-outline-primary btn-sm me-2",onClick:E[0]||(E[0]=I=>x.value=!0),disabled:m(l)},[E[6]||(E[6]=e("i",{class:"bi bi-magic me-1"},null,-1)),C(o(m(i)("screensTab.k3")),1)],8,Wr),e("button",{class:"btn btn-primary btn-sm",onClick:E[1]||(E[1]=I=>g.value=!0),disabled:m(l)},[E[7]||(E[7]=e("i",{class:"bi bi-plus-lg me-1"},null,-1)),C(o(m(i)("screensTab.k4")),1)],8,Or)]),v.value.length===0?(d(),u("div",Ur,[e("div",Br,[E[8]||(E[8]=e("i",{class:"bi bi-collection fs-1 d-block mb-3 opacity-50"},null,-1)),e("div",qr,o(m(i)("screensTab.k5")),1),e("div",Fr,[C(o(m(i)("screensTab.k6"))+" ",1),e("em",null,o(m(i)("screensTab.k7")),1),C(" "+o(m(i)("screensTab.k8")),1)])])])):(d(),u("div",Kr,[e("div",Hr,[e("table",Jr,[e("thead",Gr,[e("tr",null,[E[9]||(E[9]=e("th",{style:{width:"40px"}},"#",-1)),e("th",null,o(m(i)("screensTab.k9")),1),e("th",null,o(m(i)("screensTab.k10")),1),e("th",Zr,o(m(i)("screensTab.k11")),1),E[10]||(E[10]=e("th",{style:{width:"90px"}},"Row / Widget",-1)),e("th",Yr,o(m(i)("screensTab.k12")),1)])]),e("tbody",null,[(d(!0),u(z,null,te(v.value,(I,G)=>(d(),u("tr",{key:I.id},[e("td",Xr,o(G+1),1),e("td",null,[c.value===I.id?(d(),u("div",Qr,[X(e("input",{"onUpdate:modelValue":E[2]||(E[2]=Z=>n.value=Z),class:"form-control form-control-sm",onKeyup:[Re(Z=>V(I),["enter"]),Re(y,["escape"])],ref_for:!0,ref:"renameInputEl"},null,40,en),[[ee,n.value]]),e("button",{class:"btn btn-sm btn-success",onClick:Z=>V(I),title:m(i)("screensTab.k14")},[...E[11]||(E[11]=[e("i",{class:"bi bi-check-lg"},null,-1)])],8,tn),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:y,title:m(i)("screensTab.k15")},[...E[12]||(E[12]=[e("i",{class:"bi bi-x-lg"},null,-1)])],8,sn)])):(d(),u("a",{key:1,href:"#",class:"text-decoration-none",onClick:De(Z=>S(I),["prevent"])},[e("strong",null,o(I.title),1)],8,an))]),e("td",rn,[e("code",null,o(I.path),1)]),e("td",nn,o(O(I)),1),e("td",on,o(N(I))+" / "+o(j(I)),1),e("td",null,[e("button",{class:"btn btn-sm btn-outline-primary me-1",onClick:Z=>S(I),title:m(i)("screensTab.k16")},[E[13]||(E[13]=e("i",{class:"bi bi-pencil-square"},null,-1)),C(" "+o(m(i)("screensTab.k13")),1)],8,ln),e("div",dn,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:Z=>T(I,-1),disabled:G===0,title:m(i)("screensTab.k17")},[...E[14]||(E[14]=[e("i",{class:"bi bi-arrow-up"},null,-1)])],8,cn),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:Z=>T(I,1),disabled:G===v.value.length-1,title:m(i)("screensTab.k18")},[...E[15]||(E[15]=[e("i",{class:"bi bi-arrow-down"},null,-1)])],8,un)]),e("button",{class:"btn btn-sm btn-outline-secondary me-1",onClick:Z=>P(I),title:m(i)("screensTab.k19")},[...E[16]||(E[16]=[e("i",{class:"bi bi-pencil"},null,-1)])],8,pn),e("button",{class:"btn btn-sm btn-outline-danger",onClick:Z=>$(I),disabled:f.value===I.id,title:m(i)("screensTab.k20")},[f.value===I.id?(d(),u("span",mn)):(d(),u("i",vn))],8,fn)])]))),128))])])])])),g.value?(d(),xe(ui,{key:2,onClose:E[3]||(E[3]=I=>g.value=!1),onCreated:k})):D("",!0),_e(Vr,{show:x.value,onClose:E[4]||(E[4]=I=>x.value=!1),onCreate:w},null,8,["show"])]))}};function oe(s){return String(s||"").replace(/(?:^|[-_\s])(.)/g,(i,t)=>t.toUpperCase())}function Qe(s){const i=oe(s);return i.charAt(0).toLowerCase()+i.slice(1)}function qe(s){return String(s||"").replace(/[^a-zA-Z0-9_\-.]/g,"")||"screen"}function hn(s,i="  "){return String(s||"").split(`
`).map(t=>t.length?i+t:t).join(`
`)}function H(s){return String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function gn(s){if(!s)return"item";const i=String(s).split("/").filter(Boolean);for(let t=i.length-1;t>=0;t--){const a=i[t];if(!a||a.startsWith(":")||a.startsWith("{")||/^(api|admin|v\d+|auth|internal)$/i.test(a)||/^(paged|search|count|summary|export|import|batch|bulk|new|edit)$/i.test(a)||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(a))continue;let p=a.toLowerCase();return p.endsWith("ies")?p=p.slice(0,-3)+"y":p.endsWith("s")&&!p.endsWith("ss")&&(p=p.slice(0,-1)),p||"item"}return"item"}function yn({imports:s=[],setup:i="",template:t="",style:a=""}={}){const r=[s.filter(Boolean).join(`
`),i].filter(Boolean).join(`

`),l=[];return l.push("<script setup>"),l.push(r),l.push("<\/script>"),l.push(""),l.push("<template>"),l.push(hn(t,"  ")),l.push("</template>"),a&&a.trim()&&(l.push(""),l.push("<style scoped>"),l.push(a.trim()),l.push("</style>")),l.push(""),l.join(`
`)}function Fe(s){const i=s==null?void 0:s.onRowClick;return!i||i.action!=="navigate"||!i.target?"":` :row-clickable="true" @row-click="onRowClick_${s.id}"`}function xn(s,i=[]){const t=[];let a=!1;for(const p of(s==null?void 0:s.rows)||[])for(const r of p.widgets||[]){const l=r==null?void 0:r.onRowClick;if(!l||l.action!=="navigate"||!l.target)continue;a=!0;const g=i.find(c=>c.id===l.target),x=oe(g?Ce(g):l.target),f=Object.entries(l.params||{}).filter(([,c])=>c).map(([c,n])=>/^row\.([\w$]+)$/.test(n)?`${c}: row.${/^row\.([\w$]+)$/.exec(n)[1]}`:`${c}: ${JSON.stringify(n)}`);t.push(""),t.push(`/** 화면 디자이너: '${r.title||r.kind}' 행 클릭 → ${(g==null?void 0:g.title)||l.target} */`),t.push(`function onRowClick_${r.id}(row) {`),t.push(`  router.push({ name: '${x}'${f.length?`, params: { ${f.join(", ")} }`:""} });`),t.push("}")}return{needsRouter:a,lines:t}}function kn(s,{resourceCollector:i=new Map,screens:t=[]}={}){var x;const a=et(s,i);a.rowClick=xn(s,t),a.lifecycle=_n(a),a.formFields=new Map;for(const f of(s.rows||[]).flatMap(c=>c.widgets||[]))["formDialog","queryForm"].includes(f.kind)&&a.formFields.set(f.id,{name:`formFields${a.formFields.size+1}`,fields:((x=f.config)==null?void 0:x.fields)||[]});const p=Sn(a),r=Cn(a,p),l=$n(a,r,p);return{path:`src/views/${Ce(s)}.vue`,content:yn({imports:l,setup:r,template:p,style:Rn}),source:"screen",specId:s.id,kind:"composite"}}function Te(s){const i=String((s==null?void 0:s.path)||"/").replace(/\/+$/,"")||"/",t=Array.isArray(s==null?void 0:s.params)?s.params:[];if(!t.length)return(s==null?void 0:s.path)||"/";const a=new Set([...String((s==null?void 0:s.path)||"").matchAll(/(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)\??/g)].map(r=>r[1])),p=t.filter(r=>!a.has(r.name)).map(r=>`:${r.name}${r.required===!1?"?":""}`);return p.length?`${i==="/"?"":i}/${p.join("/")}`:(s==null?void 0:s.path)||"/"}function Ce(s){if(s.generatedViewName)return s.generatedViewName;const i=qe(oe(s.title||""));if(i.toLowerCase()!=="screen")return i+"View";const t=qe(oe(String(s.path||"").replace(/:/g,"").split("/").filter(Boolean).join("-")));if(t.toLowerCase()!=="screen")return t+"View";const a=String(s.id||"").replace(/[^\w]/g,"").slice(-6)||"Main";return"Screen"+oe(a)+"View"}function wn(s,i){const t=s.flatMap(p=>(p.rows||[]).flatMap(r=>r.widgets||[])).filter(p=>{var r;return((r=p.source)==null?void 0:r.type)==="endpoint"}),a=p=>["GET","HEAD"].includes(String(p.source.method||"GET").toUpperCase())?/[{:]/.test(p.source.path||"")?2:["list","listPaged"].includes(p.kind)?0:1:3;t.sort((p,r)=>a(p)-a(r)),et({rows:[{widgets:t}]},i)}function et(s,i){var f;const t=new Map,a=new Map,p=[],r=new Set;let l=0;function g(c,n){let v=Qe(c);if(!v)return null;if(n){const w=P=>JSON.stringify([P.method.toUpperCase(),P.endpointPath,P.resultKey||null]),$=[...i.entries()].find(([,P])=>w(P)===w(n));if($)v=$[0];else if(i.has(v)){const P=oe(n.method.toLowerCase())+oe(n.endpointPath.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"")),y=v+P;v=y;let V=2;for(;i.has(v);)v=y+V++}}i.has(v)||i.set(v,{key:v,Pascal:oe(v),endpointPath:(n==null?void 0:n.endpointPath)||`/api/${v}s`,method:(n==null?void 0:n.method)||"GET",resultKey:(n==null?void 0:n.resultKey)||null,realtime:!!(n!=null&&n.realtime)&&!!(n!=null&&n.streamPath),streamPath:(n==null?void 0:n.streamPath)||null});const k=i.get(v);return n!=null&&n.realtime&&n.streamPath&&(k.realtime=!0,k.streamPath=n.streamPath),t.set(v,k),v}function x(c){const n={primary:"null",rowsExpr:"[]",loading:"false",error:"''"},v=c.source;if(!v)return n;if(v.type==="endpoint"){const k=gn(v.path||""),w=g(k,{endpointPath:v.path,method:v.method||"GET",resultKey:v.resultKey||null,realtime:v.realtime,streamPath:v.streamPath});if(!w)return n;const $=!!(v.realtime&&v.streamPath);return{storePrefix:w,primary:`${w}CurrentItem`,rowsExpr:`${w}Rows`,loading:`${w}Loading`,error:`${w}Error`,realtime:$,realtimeConnectedExpr:$?`${w}Store.realtimeConnected`:null}}if(v.type==="storeState"){if(!v.resourceKey||!v.stateName)return n;const k=g(v.resourceKey,null);if(!k)return n;const w=`${k}${oe(v.stateName)}`;return{storePrefix:k,primary:w,rowsExpr:`${k}Rows`,loading:`${k}Loading`,error:`${k}Error`}}if(v.type==="storeCompute"){if(!v.resourceKey||!v.stateName)return n;const k=g(v.resourceKey,null);if(!k)return n;const w=`${k}${oe(v.stateName)}`,$=`c${++l}`;return p.push(`const ${$} = computed(() => ${En(w,v)});`),{storePrefix:k,primary:$,rowsExpr:w,loading:`${k}Loading`,error:`${k}Error`}}return v.type==="customVar"&&v.varName?{primary:v.varName,rowsExpr:v.varName,loading:"false",error:"''"}:n}for(const c of s.rows||[])for(const n of c.widgets||[])((f=n.source)==null?void 0:f.type)==="endpoint"&&a.set(n.id,x(n));for(const c of s.rows||[])for(const n of c.widgets||[])a.has(n.id)||a.set(n.id,x(n));return{spec:s,usedResources:t,widgetBindings:a,computedDecls:p,exposed:r}}function $n(s,i,t){var l;const a=[],p=["ref","computed","watch","onMounted","onBeforeUnmount"].filter(g=>new RegExp(`\\b${g}\\s*\\(`).test(i));p.length&&a.push(`import { ${p.join(", ")} } from 'vue';`),(l=s.rowClick)!=null&&l.needsRouter&&a.push("import { useRouter } from 'vue-router';"),i.includes("storeToRefs(")&&a.push("import { storeToRefs } from 'pinia';");for(const[g,x]of s.usedResources)a.push(`import { use${x.Pascal}Store } from '@/stores/${g}Store';`);const r=["StatWidget","ListWidget","ListPagedWidget","DetailWidget","TextWidget","MarkdownWidget","QueryFormWidget","FormDialogWidget"];for(const g of r)new RegExp(`<${g}\\s`).test(t)&&a.push(`import ${g} from '@/components/widgets/${g}.vue';`);return a}function _n(s){var x;const i=(x=s.spec.params)!=null&&x.length?s.spec.params:ht(s.spec.path),t=f=>(s.spec.rows||[]).flatMap(c=>c.widgets||[]).filter(c=>{var n;return((n=s.widgetBindings.get(c.id))==null?void 0:n.storePrefix)===f}),a=f=>i.some(c=>new RegExp(`(\\{${c.name}\\}|/:${c.name}(?![A-Za-z0-9_]))`).test(f.endpointPath||"")),p=[...s.usedResources].filter(([f])=>t(f).some(c=>c.kind!=="formDialog")),r=p.filter(([f,c])=>["GET","HEAD"].includes(c.method.toUpperCase())&&t(f).some(n=>n.kind!=="queryForm")&&(!/[{:]/.test(c.endpointPath)||a(c))),l=p.filter(([,f])=>f.realtime&&["GET","HEAD"].includes(f.method.toUpperCase())).map(([f])=>f),g=(s.spec.rows||[]).some(f=>(f.widgets||[]).some(c=>c.kind==="formDialog"));return{screenParams:i,widgetsFor:t,usesParam:a,autoResources:r,realtimeKeys:l,cleanupKeys:p.map(([f])=>f),refreshAfterSave:g&&r.length>0}}function Cn(s,i){var $,P,y,V,T,S;const t=[];($=s.rowClick)!=null&&$.needsRouter&&t.push("const router = useRouter();","");const a=[...(s.spec.customFns||[]).map(j=>j.body),...(s.spec.customVars||[]).map(j=>j.expression),...s.computedDecls].join(`
`),p=i+`
`+a,r=["rows","currentItem","loading","error","total","page","perPage","totalPages"];s.usedResources.size&&t.push("// 화면에 필요한 상태만 Store에서 꺼낸다. storeToRefs는 반응성을 유지한다.");for(const[j,N]of s.usedResources){t.push(`const ${j}Store = use${N.Pascal}Store();`);const O=r.filter(A=>new RegExp(`\\b${j}${oe(A)}\\b`).test(p));if(O.length){t.push("const {");for(const A of O)t.push(`  ${A}: ${j}${oe(A)},`);t.push(`} = storeToRefs(${j}Store);`)}t.push("")}for(const{name:j,fields:N}of s.formFields.values()){t.push("// 폼의 필드 이름은 서버가 받는 파라미터 이름과 맞춘다.");const O=JSON.stringify(N,null,2).replace(/</g,"\\u003c");t.push(`const ${j} = ${O};`,"")}if((P=s.spec.customFns)!=null&&P.length){t.push(""),t.push("// 디자이너에서 추가한 사용자 함수");for(const j of s.spec.customFns){const N=(j.params||[]).join(", "),O=(j.body||"return null;").split(`
`).map(A=>"  "+A).join(`
`);t.push(`function ${j.name}(${N}) {`),t.push(O),t.push("}")}}if((y=s.spec.customVars)!=null&&y.length){t.push(""),t.push("// 다른 상태에서 계산한 화면 값");for(const j of s.spec.customVars)t.push(`const ${j.name} = computed(() => (${j.expression||"null"}));`)}if(s.computedDecls.length){t.push(""),t.push("// 위젯에서 사용하는 계산 값");for(const j of s.computedDecls)t.push(j)}const{screenParams:l,widgetsFor:g,usesParam:x,autoResources:f,realtimeKeys:c,cleanupKeys:n,refreshAfterSave:v}=s.lifecycle,k=f.some(([,j])=>x(j));if(l.length&&(k||/\bprops\b/.test(p))){t.push("// router의 props: true 설정으로 경로 파라미터를 전달받는다."),t.push("const props = defineProps({");for(const j of l)t.push(`  ${j.name}: {`),t.push("    type: [String, Number],"),t.push("    default: null,"),t.push("  },");t.push("});","")}const w=[];for(const[j,N]of f)if(l.length&&x(N)){const O=l.map(A=>`${A.name}: props.${A.name}`).join(", ");t.push("// 같은 상세 화면에서 id만 바뀌는 경우에도 다시 조회한다."),t.push("watch("),t.push(`  () => [${l.map(A=>`props.${A.name}`).join(", ")}],`),t.push("  () => {"),t.push(`    ${j}Store.fetchOne({ ${O} });`),t.push("  },"),t.push("  { immediate: true },"),t.push(");","")}else{const O=g(j).every(I=>["detail","queryForm"].includes(I.kind)),A=g(j).find(I=>I.kind==="listPaged"),E=A?`{ perPage: ${Math.max(1,Number((V=A.config)==null?void 0:V.perPage)||10)} }`:"";w.push(`  ${j}Store.${O?"fetchOne":"fetchList"}(${E});`)}for(const j of c)w.push(`  ${j}Store.subscribeRealtime();`);if(w.length&&(t.push("// 화면이 열리면 조회한다. 조회 오류는 Store의 error 상태에 표시된다."),t.push("onMounted(() => {",...w,"});","")),n.length){t.push("// 화면을 떠나면 진행 중인 조회와 실시간 구독을 정리한다."),t.push("onBeforeUnmount(() => {");for(const j of n)t.push(`  ${j}Store.cancelReads();`);for(const j of c)t.push(`  ${j}Store.unsubscribeRealtime();`);t.push("});","")}if(v){if(t.push("// 저장이 성공한 뒤 현재 화면의 데이터를 갱신한다."),t.push("function refreshData() {"),f.length===1)t.push(`  return ${f[0][0]}Store.refresh();`);else{t.push("  return Promise.all([");for(const[j]of f)t.push(`    ${j}Store.refresh(),`);t.push("  ]);")}t.push("}","")}return(S=(T=s.rowClick)==null?void 0:T.lines)!=null&&S.length&&t.push(...s.rowClick.lines),t.join(`
`).replace(/\n{3,}/g,`

`).trim()}function Sn(s){var a,p;const{spec:i}=s,t=[];if(t.push('<div class="container-fluid py-3">'),i.header&&i.header.kind!=="none"){const r=H(i.header.title||i.title||""),l=H(i.header.subtitle||"");t.push('  <div class="mb-3 pb-2 border-bottom">'),t.push(`    <h2 class="h4 mb-1 fw-semibold">${r}</h2>`),l&&t.push(`    <div class="text-muted small">${l}</div>`),t.push("  </div>")}if(!((a=i.rows)!=null&&a.length))return t.push('  <div class="text-muted text-center py-4">(빈 화면)</div>'),t.push("</div>"),t.join(`
`);for(const r of i.rows){const l=r.style||{},g=l.gap!=null&&l.gap!==16,x=g?"row mb-3":"row g-3 mb-3",f=[];g&&f.push(`gap: ${l.gap}px`),l.padding&&f.push(`padding: ${l.padding}px`),l.bgColor&&f.push(`background-color: ${l.bgColor}`);const c=f.length?` style="${f.join("; ")}"`:"";t.push(`  <div class="${x}"${c}>`);for(let n=0;n<r.widgets.length;n++){const v=r.widgets[n],k=r.widths[n],w=s.widgetBindings.get(v.id)||{primary:"null",rowsExpr:"[]",loading:"false",error:"''"},$=Pn(v);t.push(`    <div class="col-md-${k}"${$}>`);const P=Tn(v,w,s.usedResources.keys().next().value||null,s.lifecycle.refreshAfterSave,(p=s.formFields.get(v.id))==null?void 0:p.name);t.push(...An(P).split(`
`).map(y=>"      "+y)),t.push("    </div>")}t.push("  </div>")}return t.push("</div>"),t.join(`
`)}function An(s){const i=/^<([A-Z][A-Za-z0-9]*)\s+([\s\S]*?)\s*\/>$/.exec(s);if(!i||s.length<100)return s;const t=i[2].match(/[^\s=]+(?:=(?:"[^"]*"|'[^']*'))?/g)||[];return[`<${i[1]}`,...t.map(a=>"  "+a),"/>"].join(`
`)}function Pn(s){const i=s.style||{},t=[];return i.height&&i.height!=="auto"&&t.push(`min-height: ${i.height}px`),t.length?` style="${t.join("; ")}"`:""}function Tn(s,i,t=null,a=!1,p=null){var f;const r=H(s.title||""),l=s.config||{};switch({chart:"list",progress:"stat",timeline:"list",form:"detail",button:"markdown",search:"text",image:"markdown"}[s.kind]||s.kind){case"stat":return`<StatWidget label="${r}" :value="${i.primary}" format="${H(l.format||"number")}" color="${H(l.color||"primary")}" />`;case"list":{const c=i.realtime?` :realtime="true" :realtime-connected="${i.realtimeConnectedExpr}"`:"";return`<ListWidget title="${r}" :rows="${i.rowsExpr}" :loading="${i.loading}" :error="${i.error}" :max-rows="${Number(l.maxRows)||5}"${c}${Fe(s)} />`}case"listPaged":{const c=Number(l.perPage)||10,n=/^[A-Za-z_$][\w$]*Rows$/.test(String(i.rowsExpr))?String(i.rowsExpr).replace(/Rows$/,""):null,v=i.storePrefix||n||t;return v?`<ListPagedWidget title="${r}" :rows="${i.rowsExpr}" :loading="${i.loading}" :error="${i.error}" :page="${v}Page" :per-page="${v}PerPage" :total-pages="${v}TotalPages" :total="${v}Total" :default-per-page="${c}" @change-page="(p) => ${v}Store.fetchList({ page: p, perPage: ${v}PerPage })"${Fe(s)} />`:`<ListPagedWidget title="${r}" :rows="${i.rowsExpr}" :default-per-page="${c}" />`}case"detail":return`<DetailWidget title="${r}" :record="${i.primary}" :loading="${i.loading}" :error="${i.error}" />`;case"text":return`<TextWidget label="${r}" :value="${i.primary}" format="${H(l.format||"auto")}" />`;case"queryForm":{const c=i.storePrefix||t,n=p||H(JSON.stringify(l.fields||[])),v=H(l.submitLabel||"조회"),k=l.endpointHint?` endpoint-hint="${H(l.endpointHint)}"`:"",w=c?` @submit="(params) => ${c}Store.fetchOne(params)"`:"";return`<QueryFormWidget title="${r}" :fields="${n}" submit-label="${v}"${k} ${w} />`}case"formDialog":{const c=i.storePrefix||t,n=p||H(JSON.stringify(l.fields||[])),v=H(l.buttonLabel||"실행"),k=H(l.buttonVariant||"primary"),w=H(l.dialogTitle||s.title||v),$=!!l.confirmBeforeSubmit,P=H(((f=s.source)==null?void 0:f.method)||"POST");return`<FormDialogWidget title="${r}" button-label="${v}" button-variant="${k}" dialog-title="${w}" :fields="${n}" :confirm-before-submit="${$}" method="${P}"${c?` :submit-action="(params) => ${c}Store.submitForm('${P}', params)"`:""}${a?' @success="refreshData"':""} />`}case"markdown":{let c=String(l.body||"");if(s.kind==="button"){const n=String(s.title||l.label||"버튼"),v=String(l.variant||"primary"),k=s.onRowClick,w=k&&k.action==="navigate"&&k.target?` @click="onRowClick_${s.id}({})"`:"";return`<div class="card h-100"><div class="card-body"><button type="button" class="btn btn-${v}"${w}>${H(n)}</button></div></div>`}return s.kind==="image"?'<div class="card h-100"><div class="card-body text-center"><i class="bi bi-image fs-1 text-muted"></i><div class="small text-muted">(image widget — placeholder)</div></div></div>':(!c&&s.kind!=="markdown"&&(c=`[${s.kind} widget — Phase 24 beta]`),c?`<MarkdownWidget :body="${H(JSON.stringify(c))}" />`:'<MarkdownWidget body="" />')}default:return`<!-- unknown widget kind: ${s.kind} -->`}}function En(s,i){const t=i.op||"count",a=i.field,p=i.value,r=s+".value",l=x=>String(x).replace(/[^a-zA-Z0-9_$]/g,""),g=x=>{const f=String(x??"");return f==="true"?"true":f==="false"?"false":f!==""&&!isNaN(Number(f))?String(Number(f)):JSON.stringify(f)};switch(t){case"count":return`(${r} || []).length`;case"sum":return a?`(${r} || []).reduce((a, r) => a + Number(r?.${l(a)} || 0), 0)`:"0";case"avg":return a?`((${r} || []).length === 0 ? 0 : (${r} || []).reduce((a, r) => a + Number(r?.${l(a)} || 0), 0) / (${r} || []).length)`:"0";case"min":return a?`Math.min(...((${r} || []).map((r) => Number(r?.${l(a)} || 0))))`:"0";case"max":return a?`Math.max(...((${r} || []).map((r) => Number(r?.${l(a)} || 0))))`:"0";case"filterCount":return a?`(${r} || []).filter((r) => r?.${l(a)} === ${g(p)}).length`:`(${r} || []).length`;case"pluck":return a?`((${r} || {})?.${l(a)})`:r;case"custom":return i.fnName?`${i.fnName}(${r})`:"null";default:return"null"}}const Rn="",Nn=Object.freeze({"@eonasdan/tempus-dominus":"6.10.4","@fortawesome/fontawesome-free":"7.3.1",axios:"1.20.0",bootstrap:"5.3.8","bootstrap-icons":"1.13.1","chart.js":"4.5.1","chartjs-plugin-annotation":"3.1.0",moment:"2.31.0",pinia:"4.0.3",vue:"3.5.43","vue-chartjs":"5.3.4","vue-router":"5.3.1"}),Ln=Object.freeze({"@vitejs/plugin-vue":"6.0.9",vite:"8.3.0"}),ne=(s,i)=>({path:s,content:i,source:"scaffold"}),Ke=s=>String(s).replace(/[&<>"']/g,i=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[i]);function jn(s,i){var p;const t=((p=s.config)==null?void 0:p.cssFramework)==="metronic",a=String(s.name||"generated-app").toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^[._-]+|[._-]+$/g,"").slice(0,80)||"generated-app";return[ne("package.json",JSON.stringify({name:a,version:"0.1.0",private:!0,type:"module",engines:{node:">=22.19.0"},scripts:{dev:"vite",build:"vite build",preview:"vite preview"},dependencies:Nn,devDependencies:Ln},null,2)+`
`),ne("index.html",`<!DOCTYPE html>
<html lang="${String(i||"ko").startsWith("en")?"en":"ko"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${Ke(s.name||"App")}</title>
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
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // 개발 중 API 요청을 서버로 전달한다. HTTPS 인증서 검증은 유지한다.
      proxy: {
        [proxyPath]: {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
`),ne("jsconfig.json",JSON.stringify({compilerOptions:{baseUrl:".",paths:{"@/*":["./src/*"]}},exclude:["node_modules","dist"]},null,2)+`
`),ne(".gitignore",`node_modules/
dist/
.env.local
.env.*.local
*.log
`),ne(".env",He(s)),ne(".env.example",He(s)),ne("src/main.js",`import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';

// 모든 화면이 같은 Pinia와 Router 인스턴스를 사용한다.
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

async function start() {
  // 인증을 사용하는 프로젝트는 쿠키로 로그인 상태를 먼저 복원한다.
  if (import.meta.env.VITE_AUTH_ENABLED === 'true') {
    await useAuthStore(pinia).bootstrap();
  }

  await router.isReady();
  app.mount('#app');
}

start();
`),ne("src/App.vue",`<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
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

<template><section class="card"><div class="card-body"><h1 class="h5">${Ke(s.name||"App")}</h1><p class="text-secondary mb-0">${String(i||"").startsWith("en")?"Choose a screen from the menu.":"메뉴에서 화면을 선택해 주세요."}</p></div></section></template>
`),Dn(s,i)]}function He(s){var p;let i="http://localhost:7901",t="/api";const a=String(((p=s.config)==null?void 0:p.apiBaseUrl)||"").trim();if(a)if(/^https?:\/\//i.test(a)){const r=new URL(a);if(r.username||r.password||r.search||r.hash)throw new Error("API URL must not include credentials, query or fragment");i=r.origin,r.pathname!=="/"&&r.pathname!=="/api"&&r.pathname!=="/api/"&&(t=r.origin+r.pathname.replace(/\/$/,""))}else if(/^\/(?!\/)[^\r\n#'"`]*$/.test(a))t=a.replace(/\/$/,"")||"/api";else throw new Error("Use an HTTP(S) server URL or an absolute API path");return`# Public client configuration only; never put secrets in VITE_* variables.
VITE_API_BASE_URL=${t}
VITE_API_PROXY_TARGET=${i}
VITE_API_TIMEOUT=15000
VITE_AUTH_ENABLED=false
VITE_APP_BASE=/
# HTTPS private CA, if required for the Vite proxy: set NODE_EXTRA_CA_CERTS before npm run dev.
`}function Vn(s=[]){const i=s.map(t=>`    {
      path: ${JSON.stringify(Te(t))},
      name: ${JSON.stringify(oe(Ce(t)))},
      props: true,
      component: () => import('../views/${Ce(t)}.vue'),
    },`);if(!s.some(t=>Te(t)==="/")){const t=s.find(a=>!Te(a).includes(":"));i.unshift(t?`    { path: '/', redirect: ${JSON.stringify(Te(t))} },`:`    {
      path: '/',
      name: 'Welcome',
      component: () => import('../views/WelcomeView.vue'),
    },`)}return ne("src/router/index.js",`import { createRouter, createWebHistory } from 'vue-router';

// 화면은 처음 이동할 때 불러오고, 경로 파라미터는 props로 전달한다.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
${i.join(`
`)}
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
`)}function Dn(s,i){const a=String(i||"").startsWith("en")?`# ${s.name||"Generated project"}

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

Reading the code: View → Store → api/axios.js → server.
The Axios module shares server settings, authentication and response helpers.
Stores own data/loading/error state; views bind that state and call actions.
A one-off request can also import the same api instance directly in a view.
Read actions handle errors in the store, so lifecycle calls need no void prefix.
Write actions reject on failure, so forms must await them before closing.
`:`# ${s.name||"생성된 프로젝트"}

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

코드를 읽는 순서: View → Store → api/axios.js → 서버.
공통 Axios 모듈은 서버 주소·인증·응답 처리를, Store는 데이터·로딩·오류 상태를,
View는 화면 표시와 사용자 동작을 담당합니다. 한 화면에서만 쓰는 일회성 요청은
View에서도 같은 api 인스턴스를 가져와 호출할 수 있습니다.
조회 함수는 Store에서 오류를 처리하므로 생명주기 호출에 void가 필요하지 않습니다.
저장 함수는 실패를 호출자에게 전달하므로 폼에서는 await로 성공 여부를 확인합니다.
`;return ne("README.md",a)}const ze=new Set(["sidebar-left","sidebar-dark","sidebar-right","sidebar-both","top-and-side"]),Me=new Set(["top-nav","top-and-side","hero-landing"]),We=new Set(["sidebar-both"]);function In(s,i="bootstrap"){const t=s||{},a=t.kind||"sidebar-left",p=t.title||{},r=t.sidebar||{},l=t.mainArea||{},g=i==="metronic",x=[];return x.push(zn(a,p,r,l,g)),x.push(Un(p,g,a)),ze.has(a)&&x.push(Bn(r,a==="sidebar-dark"||a==="sidebar-both",g)),Me.has(a)&&x.push(qn(r,g,a)),We.has(a)&&x.push(Fn(g)),x.map(f=>({...f,path:f.path.replace("src/layouts/components/","src/components/").replace("src/layouts/","src/components/"),content:f.content.replaceAll("from './components/","from './").replaceAll("<RouterView />","<slot />")}))}function zn(s,i,t,a,p){return p?Wn(s):Mn(s,i,t,a)}function Mn(s,i,t,a){const p=Math.max(160,Math.min(320,Number(t.width)||220)),r=a.bgColor||"#f5f7fa",l=Math.max(0,Math.min(48,Number(a.padding)||16)),g=["AppHeader"];ze.has(s)&&g.push("AppSidebar"),Me.has(s)&&g.push("AppTopNav"),We.has(s)&&g.push("AppAuxPanel");const x=g.map(n=>`import ${n} from './components/${n}.vue';`).join(`
`);let f;switch(s){case"sidebar-left":case"sidebar-dark":{f=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
        <RouterView />
      </main>
    </div>`;break}case"sidebar-right":{f=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
    </div>`;break}case"sidebar-both":{const n=Math.round(p*.6);f=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${n}px;">
        <AppAuxPanel />
      </aside>
    </div>`;break}case"top-nav":{f=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
      <RouterView />
    </main>`;break}case"top-and-side":{f=`
    <AppTopNav />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
        <RouterView />
      </main>
    </div>`;break}case"hero-landing":{f=`
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${r};">
      <RouterView />
    </main>`;break}case"split-panel":{f=`
    <AppHeader />
    <main class="flex-grow-1 d-flex" style="background-color: ${r}; padding: ${l}px;">
      <RouterView />
    </main>`;break}case"card-grid":{f=`
    <AppHeader />
    <main class="flex-grow-1 container-fluid" style="background-color: ${r}; padding: ${l}px;">
      <RouterView />
    </main>`;break}default:f=`
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${p}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${r}; padding: ${l}px;">
        <RouterView />
      </main>
    </div>`}return{path:"src/layouts/AppLayout.vue",content:`<script setup>
${x}
<\/script>

<template>
  <div class="d-flex flex-column min-vh-100" data-layout-kind="${s}">${f}
  </div>
</template>
`,source:"scaffold"}}function Wn(s,i,t,a){const p=["AppHeader"];ze.has(s)&&p.push("AppSidebar"),Me.has(s)&&p.push("AppTopNav"),We.has(s)&&p.push("AppAuxPanel");const r=p.map(c=>`import ${c} from './components/${c}.vue';`).join(`
`),l=On(s);let g;switch(s){case"sidebar-left":case"sidebar-dark":g=`
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
      </div>`}const x=Object.entries(l).map(([c,n])=>`[${JSON.stringify(c)}, ${JSON.stringify(n)}]`).join(", ");return{path:"src/layouts/AppLayout.vue",content:`<script setup>
// Metronic 은 body 의 data-kt-app-* attribute 조합으로 layout 모양을 결정합니다.
// demo38 의 body 를 참고하여 mount 시점에 적절한 속성을 설정합니다.
import { onMounted, onBeforeUnmount } from 'vue';
${r}

const BODY_ATTRS = [${x}];
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
`,source:"scaffold"}}function On(s){const i={"data-kt-app-layout":"dark-sidebar","data-kt-app-header-fixed":"true","data-kt-app-header-fixed-mobile":"true","data-kt-app-sidebar-enabled":"true","data-kt-app-sidebar-fixed":"true","data-kt-app-sidebar-hoverable":"true","data-kt-app-sidebar-push-header":"true","data-kt-app-sidebar-push-toolbar":"true","data-kt-app-sidebar-push-footer":"true","data-kt-app-toolbar-enabled":"true"};switch(s){case"sidebar-left":return{...i,"data-kt-app-layout":"light-sidebar"};case"sidebar-dark":return{...i,"data-kt-app-layout":"dark-sidebar"};case"sidebar-right":return{...i,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-position":"end"};case"sidebar-both":return{...i,"data-kt-app-layout":"dark-sidebar","data-kt-app-aside-enabled":"true"};case"top-nav":return{"data-kt-app-layout":"dark-header","data-kt-app-header-fixed":"true","data-kt-app-sidebar-enabled":"false","data-kt-app-toolbar-enabled":"true"};case"top-and-side":return{...i,"data-kt-app-layout":"dark-header"};case"hero-landing":return{"data-kt-app-layout":"blank","data-kt-app-sidebar-enabled":"false","data-kt-app-header-fixed":"false"};case"split-panel":return{...i,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};case"card-grid":return{...i,"data-kt-app-layout":"light-sidebar","data-kt-app-sidebar-enabled":"false"};default:return i}}function Un(s,i,t){const a=s.text||"",p=s.logoUrl||"",r=Math.max(40,Math.min(120,Number(s.height)||60));if(i)return t==="hero-landing"?{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <div class="landing-header" data-kt-sticky="true" data-kt-sticky-name="landing-header" data-kt-sticky-offset="{default: '200px', lg: '300px'}">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-equal">
          ${p?`<img alt="logo" src="${H(p)}" class="h-40px" />`:""}
          <span class="h3 m-0 ms-3 fw-bold">${a}</span>
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
        ${p?`<img src="${H(p)}" alt="logo" class="h-40px me-3" />`:""}
        <h3 class="app-header-title m-0 fw-bold">${a}</h3>
      </div>
    </div>
  </div>
</template>
`,source:"scaffold"};const l=s.bgColor||"#ffffff",g=s.fgColor||"#0f172a";return{path:"src/layouts/components/AppHeader.vue",content:`<script setup><\/script>

<template>
  <header class="d-flex align-items-center border-bottom px-3"
          style="height: ${r}px; background-color: ${l}; color: ${g};">
    ${p?`<img src="${H(p)}" alt="logo" class="me-2" style="max-height: ${r-16}px;" />`:""}
    <h1 class="h5 m-0">${a}</h1>
  </header>
</template>
`,source:"scaffold"}}function Bn(s,i,t){const a=Array.isArray(s.items)?s.items:[];if(t){const g=a.map(f=>{const c=H(f.label||""),n=H(f.path||"#"),v=f.icon||"bi-circle";return`        <div class="menu-item">
          <RouterLink to="${n}" class="menu-link">
            <span class="menu-icon">
              <i class="bi ${v}"></i>
            </span>
            <span class="menu-title">${c}</span>
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
        <span class="fs-3 fw-bold ${i?"text-white":"text-body"}">${H(s.brand||"App")}</span>
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
`,source:"scaffold"}}const p=i?"bg-dark text-white":"bg-light",r=a.map(g=>{const x=H(g.label||""),f=H(g.path||"#"),c=g.icon||"bi-file-earmark";return`    <li class="nav-item">
      <RouterLink to="${f}" class="nav-link ${i?"text-white-50":""}">
        <i class="bi ${c} me-2"></i>${x}
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
`,source:"scaffold"}}function qn(s,i,t){const a=Array.isArray(s.items)?s.items:[];if(i)return t==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
import { RouterLink } from 'vue-router';
<\/script>

<template>
  <div class="landing-menu-wrapper d-flex align-items-center flex-equal flex-lg-end" data-kt-drawer="true" data-kt-drawer-name="landing-menu">
    <div class="menu menu-rounded menu-column menu-lg-row menu-title-gray-500 menu-state-title-primary fw-semibold fs-6" id="kt_landing_menu">
${a.map(c=>{const n=H(c.label||"");return`      <div class="menu-item">
        <RouterLink to="${H(c.path||"#")}" class="menu-link nav-link py-3 px-4 px-xxl-6">
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
${a.map(x=>{const f=H(x.label||"");return`      <div class="menu-item">
        <RouterLink to="${H(x.path||"#")}" class="menu-link">
          <span class="menu-title">${f}</span>
        </RouterLink>
      </div>`}).join(`
`)||"      <!-- 메뉴 항목 없음 -->"}
    </div>
  </div>
</template>
`,source:"scaffold"};const p=a.map(l=>{const g=H(l.label||"");return`      <li class="nav-item">
        <RouterLink to="${H(l.path||"#")}" class="nav-link">${g}</RouterLink>
      </li>`}).join(`
`);return t==="hero-landing"?{path:"src/layouts/components/AppTopNav.vue",content:`<script setup>
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
`,source:"scaffold"}}function Fn(s){return s?{path:"src/layouts/components/AppAuxPanel.vue",content:`<script setup><\/script>

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
`,source:"scaffold"}}const Kn={loading:"불러오는 중…",noData:"데이터가 없습니다.",noSelection:"선택된 항목이 없습니다.",yes:"예",no:"아니오",done:"완료되었습니다.",confirmProceed:"계속 진행할까요?",live:"실시간",disconnected:"연결 끊김",refreshed:"갱신됨",moreCount:"{n}개 더",totalCount:"총 {n}건",submitQuery:"조회",submitRun:"실행",valueRequired:" 값을 입력하세요.",close:"닫기",cancel:"취소",first:"맨앞",prev:"이전",next:"다음",last:"맨뒤"},Hn={loading:"Loading…",noData:"No data.",noSelection:"Nothing selected.",yes:"Yes",no:"No",done:"Done.",confirmProceed:"Go ahead?",live:"Live",disconnected:"Disconnected",refreshed:"Updated",moreCount:"{n} more",totalCount:"{n} total",submitQuery:"Search",submitRun:"Run",valueRequired:" is required.",close:"Close",cancel:"Cancel",first:"First",prev:"Previous",next:"Next",last:"Last"};function Jn(s){return String(s||"").startsWith("en")?Hn:Kn}function Gn(s){const i=Jn(s);return[{path:"src/components/widgets/StatWidget.vue",content:Zn,source:"widget"},{path:"src/components/widgets/ListWidget.vue",content:Yn(i),source:"widget"},{path:"src/components/widgets/ListPagedWidget.vue",content:to(i),source:"widget"},{path:"src/components/widgets/DetailWidget.vue",content:Xn(i),source:"widget"},{path:"src/components/widgets/TextWidget.vue",content:Qn(i),source:"widget"},{path:"src/components/widgets/MarkdownWidget.vue",content:eo,source:"widget"},{path:"src/components/widgets/QueryFormWidget.vue",content:so(i),source:"widget"},{path:"src/components/widgets/FormDialogWidget.vue",content:ao(i),source:"widget"}]}const Zn=`<script setup>
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
`,Yn=s=>`<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';

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
  if (typeof value === 'boolean') return value ? '${s.yes}' : '${s.no}';
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
  flashTimer = setTimeout(() => {
    justUpdated.value = false;
  }, 1200);
});

// 화면이 없어지면 표시용 타이머도 해제한다.
onBeforeUnmount(() => {
  clearTimeout(flashTimer);
});
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title || realtime" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <!-- 실시간 배지: 연결되면 초록, 끊기면 회색. 새 데이터가 오면 잠깐 "갱신됨" -->
      <span v-if="realtime" class="ms-auto d-inline-flex align-items-center small">
        <span class="rt-dot" :class="realtimeConnected ? 'on' : 'off'"></span>
        <span :class="realtimeConnected ? 'text-success' : 'text-muted'">
          {{ realtimeConnected ? '${s.live}' : '${s.disconnected}' }}
        </span>
        <span v-if="justUpdated" class="badge bg-primary ms-2">${s.refreshed}</span>
      </span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${s.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!effectiveRows.length" class="text-center text-muted py-4">${s.noData}</div>
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
        +{{ hiddenCount }}${s.moreCount.replace("{n}","")}
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
`,Xn=s=>`<script setup>
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
  if (typeof value === 'boolean') return value ? '${s.yes}' : '${s.no}';
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
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${s.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-center text-muted py-4">${s.noSelection}</div>
      <dl v-else class="row mb-0 small">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt class="col-sm-4 text-muted fw-normal">{{ f.label }}</dt>
          <dd class="col-sm-8 mb-2">{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
`,Qn=s=>`<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String, Boolean], default: null },
  format: { type: String, default: 'auto' },
});

const display = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${s.yes}' : '${s.no}';
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
`,eo=`<script setup>
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
`,to=s=>`<script setup>
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
  rowClickable: { type: Boolean, default: false },
});
const emit = defineEmits(['change-page', 'row-click']);

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
  if (end > tp) {
    end = tp;
    start = Math.max(1, end - size + 1);
  }

  const arr = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }

  return arr;
});

const hasPrev = computed(() => props.page > 1);
const hasNext = computed(() => props.page < props.totalPages);

function go(page) {
  if (page < 1 || page > props.totalPages || page === props.page) {
    return;
  }

  emit('change-page', page);
}

// 일반 목록과 페이지 목록 모두 같은 행 선택 이벤트를 제공한다.
function selectRow(row) {
  if (props.rowClickable) {
    emit('row-click', row);
  }
}

const formatCell = (v) => {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${s.yes}' : '${s.no}';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};
<\/script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge bg-secondary ms-2">${s.totalCount.replace("{n}","")}{{ total }}</span>
      <span v-if="totalPages > 1" class="text-muted small ms-auto">{{ page }} / {{ totalPages }}</span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>${s.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!(rows || []).length" class="text-center text-muted py-4">${s.noData}</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted text-uppercase small">
            <tr><th v-for="c in effectiveColumns" :key="c.name" class="fw-semibold">{{ c.label }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="row.id ?? i"
                :class="{ 'row-clickable': rowClickable }"
                :tabindex="rowClickable ? 0 : undefined"
                :role="rowClickable ? 'button' : undefined"
                @click="selectRow(row)"
                @keyup.enter="selectRow(row)">
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

<style scoped>
.row-clickable { cursor: pointer; }
.row-clickable:focus-visible { outline: 2px solid var(--bs-primary, #0d6efd); outline-offset: -2px; }
</style>
`,so=s=>`<script setup>
/**
 * QueryFormWidget — 입력값을 입력받아 상위에 @submit 이벤트로 전달.
 *   사용자 코드에서 이 이벤트를 받아 store.fetchOne(params) 를 호출.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },       // [{ name, label, type, required, default, placeholder }]
  submitLabel: { type: String, default: '${s.submitQuery}' },
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
      localError.value = f.label + '${s.valueRequired}';
      return;
    }
  }
  const out = {};
  for (const f of (props.fields || [])) {
    let v = values[f.name];
    if (v === '' || v == null) {
      continue;
    }

    if (f.type === 'number') {
      v = Number(v);
    } else if (f.type === 'boolean') {
      v = v === true || v === 'true';
    }

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
`,ao=s=>`<script setup>
/**
 * FormDialogWidget — 버튼 + 모달 + 폼.
 *   [버튼] 클릭 → 모달 열림 → 사용자 입력 → [제출] → submitAction(params) 비동기 함수.
 *   submitAction에서 store.submitForm(method, params)를 기다리고, 성공 시 @success 이벤트로 refresh 유도.
 */
import { ref, reactive, onBeforeUnmount, useId } from 'vue';
import { errorMessage } from '@/api/axios';

const props = defineProps({
  title: { type: String, default: '' },
  buttonLabel: { type: String, default: '${s.submitRun}' },
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
// 응답을 기다리는 동안 화면을 떠나면 닫힌 대화상자를 다시 갱신하지 않는다.
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(closeTimer);
});

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

function openDialog() {
  clearTimeout(closeTimer);
  reset();
  open.value = true;
}

function closeDialog() {
  if (!submitting.value) {
    open.value = false;
  }
}

async function doSubmit() {
  if (submitting.value || success.value) {
    return;
  }

  error.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      error.value = f.label + '${s.valueRequired}';
      return;
    }
  }
  if (props.confirmBeforeSubmit && !confirm('${s.confirmProceed}')) {
    return;
  }

  submitting.value = true;
  try {
    const out = {};
    for (const f of (props.fields || [])) {
      let v = values[f.name];
      if (v === '' || v == null) {
        continue;
      }

      if (f.type === 'number') {
        v = Number(v);
      } else if (f.type === 'boolean') {
        v = v === true || v === 'true';
      }

      out[f.name] = v;
    }
    // emit()은 비동기 결과를 반환하지 않으므로 전달받은 저장 함수를 직접 기다린다.
    if (!props.submitAction) {
      throw new Error('API 연결을 설정해 주세요.');
    }

    await props.submitAction(out);

    if (disposed) {
      return;
    }

    success.value = '${s.done}';
    emit('success');
    closeTimer = setTimeout(() => {
      open.value = false;
    }, 600);
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
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">${s.cancel}</button>
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
`;function io(){return{path:"src/api/axios.js",source:"common",content:String.raw`import axios from 'axios';

// Store와 View에서 같은 인스턴스를 가져와 api.get()/api.post()로 요청한다.
// 서버 주소와 제한 시간은 .env에서 설정한다. 응답은 Axios의 response.data를 유지한다.
const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const timeout = Math.max(1000, Number(import.meta.env.VITE_API_TIMEOUT) || 15000);
const config = {
  baseURL,
  timeout,
  withCredentials: true,
};

const api = axios.create(config);

// 토큰 갱신에는 재시도 인터셉터가 없는 인스턴스를 사용해 무한 반복을 막는다.
const authApi = axios.create(config);
let accessToken = null;
let refreshPromise = null;
let sessionVersion = 0;
const tokenListeners = new Set();

// 요청 전: API 경로를 맞추고 현재 토큰을 헤더에 넣는다.
api.interceptors.request.use(config => {
  config.url = apiPath(config.url);
  config._authToken = accessToken;
  config._sessionVersion = sessionVersion;

  if (accessToken) {
    config.headers.set('Authorization', 'Bearer ' + accessToken);
  } else {
    config.headers.delete('Authorization');
  }

  return config;
});

// 응답 후: 인증이 만료된 요청만 토큰 갱신 후 한 번 재시도한다.
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const isAuthRequest = /(?:^|\/)auth(?:\/|$)/.test(original?.url || '');

    if (!original || error.response?.status !== 401 || isAuthRequest
        || original._retried || original.signal?.aborted) {
      throw error;
    }

    original._retried = true;
    let token = accessToken;

    if (!token || token === original._authToken) {
      // 요청 중 로그아웃했다면 예전 요청으로 인증을 복구하지 않는다.
      if (original._sessionVersion !== sessionVersion) {
        throw error;
      }

      token = await refreshAccessToken();
    }

    if (!token || original.signal?.aborted) {
      throw error;
    }

    return api.request(original);
  },
);

export default api;

// 응답 처리: aidot-express의 { code, data } 등을 벗기고 일반 응답은 그대로 돌려준다.
export function unwrapResponse(response) {
  const body = response.data;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const isEnvelope = Object.hasOwn(body, 'data') && (
    'code' in body || 'header' in body || 'message' in body || Object.keys(body).length === 1
  );

  return isEnvelope ? body.data : body;
}

export function errorMessage(error) {
  return error?.response?.data?.message
    || error?.message
    || '요청을 처리하지 못했습니다.';
}

export function isCanceled(error) {
  return axios.isCancel(error) || error?.name === 'AbortError';
}

// 디자이너의 /api/books와 직접 작성한 /books를 모두 지원한다.
export function apiPath(path) {
  const value = String(path || '');

  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(value)) {
    throw new Error('Use a relative API path');
  }

  const basePath = new URL(baseURL, 'http://local.invalid').pathname.replace(/\/$/, '');
  const hasApiPrefix = value === '/api' || value.startsWith('/api/');

  if (basePath.endsWith('/api') && hasApiPrefix) {
    return value.slice(4) || '/';
  }

  return value;
}

// EventSource처럼 절대 주소가 필요한 클라이언트도 같은 서버 설정을 사용한다.
export function apiUrl(path) {
  const origin = globalThis.location?.origin || 'http://localhost';
  const relativePath = apiPath(path).replace(/^\//, '');

  return new URL(baseURL + '/' + relativePath, origin).href;
}

// :id 또는 {id}는 URL에 넣고, 나머지 값은 쿼리/본문으로 반환한다.
export function requestPath(template, values = {}) {
  const params = { ...values };

  function pathValue(name) {
    const value = values[name];

    if (value === undefined || value === null || value === '') {
      throw new Error('필수 경로 값이 없습니다: ' + name);
    }

    delete params[name];
    return encodeURIComponent(String(value));
  }

  const url = String(template)
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => pathValue(name))
    .replace(/\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => '/' + pathValue(name));

  return { url, params };
}

// 디자이너의 resultKey(예: rows, result.items)로 필요한 데이터를 선택한다.
export function resultValue(data, key) {
  if (!key) {
    return data;
  }

  let value = data;

  for (const part of key.split('.')) {
    value = value?.[part];
  }

  return value ?? data;
}

// 인증 Store와 Axios가 같은 메모리 토큰을 사용하도록 동기화한다.
export function setAccessToken(token) {
  sessionVersion++;
  accessToken = token || null;

  for (const listener of tokenListeners) {
    listener(accessToken);
  }
}

export function getAccessToken() {
  return accessToken;
}

export function onAccessTokenChange(listener) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

// 여러 요청이 동시에 401을 받아도 토큰 갱신은 한 번만 실행한다.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = requestAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function requestAccessToken() {
  const version = sessionVersion;

  try {
    const response = await authApi.post(apiPath('/api/auth/refresh'), {});
    const data = unwrapResponse(response);

    // 갱신 도중 로그인/로그아웃했다면 그 상태를 우선한다.
    if (version !== sessionVersion) {
      return null;
    }

    setAccessToken(data?.accessToken);
    return accessToken;
  } catch {
    if (version === sessionVersion) {
      setAccessToken(null);
    }

    return null;
  }
}
`}}function ro(){return{path:"src/stores/auth.js",source:"common",content:`import { ref, computed, onScopeDispose } from 'vue';
import { defineStore } from 'pinia';
import api, {
  unwrapResponse,
  setAccessToken,
  getAccessToken,
  onAccessTokenChange,
  refreshAccessToken,
} from '@/api/axios';

export const useAuthStore = defineStore('auth', () => {
  // 사용자와 인증 상태를 화면에 제공한다. 토큰은 디스크에 저장하지 않는다.
  const user = ref(null);
  const token = ref(getAccessToken());
  const authReady = ref(false);
  const loading = ref(false);
  const isAuthenticated = computed(() => !!token.value);

  let bootstrapPromise = null;
  let revision = 0;

  const unsubscribe = onAccessTokenChange(value => {
    token.value = value;

    if (!value) {
      user.value = null;
    }
  });

  onScopeDispose(unsubscribe);

  // 로그인 요청 중 로그아웃한 경우에는 늦은 응답을 적용하지 않는다.
  async function login(credentials) {
    const ownRevision = ++revision;
    loading.value = true;

    try {
      const response = await api.post('/api/auth/login', credentials);
      const data = unwrapResponse(response);

      if (ownRevision !== revision) {
        return null;
      }

      setAccessToken(data?.accessToken);
      user.value = data?.user || null;
      authReady.value = true;

      return data;
    } finally {
      if (ownRevision === revision) {
        loading.value = false;
      }
    }
  }

  // 새로고침 시 쿠키로 인증을 복원한다. 여러 화면이 호출해도 한 번만 실행한다.
  async function bootstrap() {
    if (authReady.value) {
      return isAuthenticated.value;
    }

    if (!bootstrapPromise) {
      bootstrapPromise = restoreSession().finally(() => {
        bootstrapPromise = null;
      });
    }

    return bootstrapPromise;
  }

  async function restoreSession() {
    const ownRevision = revision;
    const restored = await refreshAccessToken();

    if (restored && ownRevision === revision) {
      try {
        const response = await api.get('/api/auth/me');
        const data = unwrapResponse(response);

        if (ownRevision === revision) {
          user.value = data?.user || data || null;
        }
      } catch {
        if (ownRevision === revision) {
          clearLocal();
        }
      }
    }

    authReady.value = true;
    return isAuthenticated.value;
  }

  function clearLocal() {
    revision++;
    user.value = null;
    loading.value = false;
    authReady.value = true;
    setAccessToken(null);
  }

  async function logout() {
    clearLocal();

    try {
      await api.post('/api/auth/logout');
    } catch {
      // 통신 실패와 관계없이 이 화면의 로그인 상태는 이미 해제했다.
    }
  }

  return {
    user,
    authReady,
    loading,
    isAuthenticated,

    login,
    bootstrap,
    logout,
    clearLocal,
  };
});
`}}function no(s){const{key:i,endpointPath:t,method:a="GET",resultKey:p=null,realtime:r=!1,streamPath:l=null}=s,g=Qe(i),x=String(a).toLowerCase(),f=r&&!!l,c=["post","put","patch"].includes(x)?`api.${x}(url, values, { signal })`:["get","head","delete","options"].includes(x)?`api.${x}(url, {
      params: values,
      signal,
    })`:`api.request({
      url,
      method: ${JSON.stringify(x)},
      params: values,
      signal,
    })`,n=`import { ref, computed, onScopeDispose } from 'vue';
import { defineStore } from 'pinia';
import api, {
  unwrapResponse,
  errorMessage,
  isCanceled,
  requestPath,
  resultValue,${f?`
  apiUrl,`:""}
} from '@/api/axios';

// 서버 주소와 인증 처리는 공통 Axios 클라이언트에서 담당한다.
const ENDPOINT = ${JSON.stringify(t)};

export const use${oe(i)}Store = defineStore('${g}', () => {
  // 화면에서 함께 사용하는 데이터와 요청 상태
  const rows = ref([]);
  const currentItem = ref(null);
  const error = ref('');
  const reading = ref(false);
  const saving = ref(false);
  const loading = computed(() => reading.value || saving.value);

  // 페이지를 이동하거나 새로고침해도 검색조건을 유지한다.
  const query = ref({});
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(10);
  const totalPages = ref(1);

  let readController = null;
  let readVersion = 0;
  let lastRead = 'list';
  let detailParams = {};

  // 먼저 보낸 요청이 늦게 도착해 최신 데이터를 덮어쓰지 않도록 취소한다.
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

    return {
      version: readVersion,
      signal: readController.signal,
    };
  }

  // 경로 값(:id 등)과 나머지 입력값을 나누어 서버에 전달한다.
  async function requestData(params, signal) {
    const { url, params: values } = requestPath(ENDPOINT, params);
    const response = await ${c};

    return unwrapResponse(response);
  }

  // 목록 조회: 검색조건이 바뀌면 첫 페이지부터 조회한다.
  async function fetchList(options = {}) {
    const changesFilter = Object.keys(options).some(
      key => !['page', 'perPage'].includes(key),
    );

    query.value = {
      ...query.value,
      ...options,
      page: options.page ?? (changesFilter ? 1 : page.value),
      perPage: options.perPage ?? perPage.value,
    };
    lastRead = 'list';

    const { version, signal } = beginRead();

    try {
      const body = await requestData(query.value, signal);

      if (version !== readVersion) {
        return;
      }

      // API가 배열 또는 페이지 정보가 포함된 객체를 반환하는 경우를 처리한다.
      const data = resultValue(body, ${JSON.stringify(p)});
      const list = Array.isArray(data)
        ? data
        : (data?.rows ?? data?.items ?? data?.records ?? data?.data ?? []);

      if (!Array.isArray(list)) {
        throw new Error('목록 응답이 배열이 아닙니다. resultKey를 확인하세요.');
      }

      const meta = Array.isArray(data) ? body : data;

      rows.value = list;
      currentItem.value = list[0] ?? null;
      total.value = Math.max(0, Number(meta?.total ?? list.length) || 0);
      page.value = Math.max(1, Number(meta?.page ?? query.value.page) || 1);
      perPage.value = Math.max(1, Number(meta?.perPage ?? query.value.perPage) || 10);
      totalPages.value = Math.max(
        1,
        Number(meta?.totalPages) || Math.ceil(total.value / perPage.value),
      );

      return list;
    } catch (cause) {
      // 취소된 조회는 오류로 표시하지 않는다. 실제 실패는 화면의 error에 표시한다.
      if (version === readVersion && !isCanceled(cause)) {
        error.value = errorMessage(cause);
      }
    } finally {
      if (version === readVersion) {
        reading.value = false;
        readController = null;
      }
    }
  }

  // 상세 조회: URL에 필요한 id 등을 params로 받는다.
  async function fetchOne(params = {}) {
    lastRead = 'detail';
    detailParams = { ...params };
    currentItem.value = null;

    const { version, signal } = beginRead();

    try {
      const body = await requestData(detailParams, signal);

      if (version !== readVersion) {
        return;
      }

      const data = resultValue(body, ${JSON.stringify(p)});
      currentItem.value = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

      return currentItem.value;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) {
        error.value = errorMessage(cause);
      }
    } finally {
      if (version === readVersion) {
        reading.value = false;
        readController = null;
      }
    }
  }

  // 마지막으로 조회한 목록 또는 상세를 같은 조건으로 다시 읽는다.
  function refresh() {
    if (lastRead === 'detail') {
      return fetchOne(detailParams);
    }

    return fetchList();
  }

  // 폼 저장: 실패를 호출자에게 전달해야 대화상자가 입력값을 유지할 수 있다.
  async function submitForm(httpMethod, params = {}) {
    if (saving.value) {
      throw new Error('저장 중입니다. 잠시 기다려 주세요.');
    }

    saving.value = true;
    error.value = '';

    try {
      const { url, params: values } = requestPath(ENDPOINT, params);
      const method = String(httpMethod || ${JSON.stringify(a)}).toUpperCase();
      const config = { url, method };

      // POST/PUT/PATCH는 본문으로, GET/DELETE 등은 쿼리로 전달한다.
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = values;
      } else {
        config.params = values;
      }

      const response = await api.request(config);

      return unwrapResponse(response);
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause;
    } finally {
      saving.value = false;
    }
  }
${f?`
  // 실시간 알림을 받으면 마지막 조회를 갱신한다. 연결은 여러 화면이 함께 사용한다.
  const realtimeConnected = ref(false);
  let eventSource = null;
  let refreshTimer = null;
  let subscribers = 0;

  function subscribeRealtime() {
    subscribers++;

    if (eventSource) {
      return;
    }

    try {
      eventSource = new EventSource(apiUrl(${JSON.stringify(l)}), {
        withCredentials: true,
      });

      eventSource.addEventListener('change', () => {
        if (refreshTimer) {
          return;
        }

        // 짧은 시간에 여러 알림이 도착하면 한 번만 조회한다.
        refreshTimer = setTimeout(() => {
          refreshTimer = null;
          refresh();
        }, 250);
      });

      eventSource.onopen = () => {
        realtimeConnected.value = true;
      };

      eventSource.onerror = () => {
        realtimeConnected.value = false;
      };
    } catch (cause) {
      error.value = errorMessage(cause);
    }
  }

  function unsubscribeRealtime() {
    subscribers = Math.max(0, subscribers - 1);

    if (subscribers > 0) {
      return;
    }

    eventSource?.close();
    eventSource = null;
    clearTimeout(refreshTimer);
    refreshTimer = null;
    realtimeConnected.value = false;
  }

  onScopeDispose(() => {
    subscribers = 0;
    unsubscribeRealtime();
  });
`:""}
  // Store가 해제될 때 진행 중인 조회도 정리한다.
  onScopeDispose(cancelReads);

  return {
    rows,
    currentItem,
    loading,
    saving,
    error,
    total,
    page,
    perPage,
    totalPages,
    query,

    fetchList,
    fetchOne,
    submitForm,
    refresh,
    cancelReads,${f?`

    realtimeConnected,
    subscribeRealtime,
    unsubscribeRealtime,`:""}
  };
});
`;return{path:`src/stores/${g}Store.js`,content:n,source:"store",resourceKey:g}}function oo(s){return s.map(no)}function lo(s,i){var x;if(!s)throw new Error("project 가 필요합니다");const t=[],a=new Map;t.push(...jn(s,i)),t.push(...In(s.layout||{},(x=s.config)==null?void 0:x.cssFramework)),t.push(...Gn(i)),t.push(io()),t.push(ro());const p=new Set(["WelcomeView"]),r=(s.screens||[]).filter(f=>f.kind==="composite").map(f=>{const c=Ce(f);let n=c,v=2;for(;p.has(n);)n=c.replace(/View$/,"")+v+++"View";return p.add(n),{...f,generatedViewName:n}});wn(r,a);for(const f of r)t.push(kn(f,{resourceCollector:a,screens:r}));if(t.push(Vn(r)),a.size>0){const f=[...a.values()];t.push(...oo(f))}const l=new Map;for(const f of t)l.set(f.path,f);const g=[...l.values()];return g.sort((f,c)=>f.path.localeCompare(c.path)),g}const tt="aidot.screen-designer.fileEdits";function co(){try{const s=sessionStorage.getItem(tt);if(!s)return{};const i=JSON.parse(s);return i&&typeof i=="object"?i:{}}catch{return{}}}function Le(s){try{sessionStorage.setItem(tt,JSON.stringify(s))}catch(i){console.warn("[fileEdits] storage save failed:",i)}}const uo=dt("fileEdits",{state:()=>({edits:co()}),getters:{forProject:s=>i=>s.edits[String(i)]||{}},actions:{get(s,i){const t=this.edits[String(s)];return t?t[i]??null:null},set(s,i,t){const a=String(s);this.edits[a]||(this.edits[a]={}),this.edits[a][i]=t,Le(this.edits)},clear(s,i){const t=String(s),a=this.edits[t];a&&(delete a[i],Object.keys(a).length===0&&delete this.edits[t],Le(this.edits))},clearAll(s){delete this.edits[String(s)],Le(this.edits)},applyTo(s,i){const t=String(s),a=this.edits[t];return a?i.map(p=>a[p.path]!=null?{...p,content:a[p.path],edited:!0}:p):i},listEditedPaths(s){const i=this.edits[String(s)];return new Set(i?Object.keys(i):[])}}}),po={class:"code-export-panel"},fo={key:0,class:"alert alert-warning small"},mo={class:"export-header d-flex justify-content-between align-items-start mb-3"},vo={class:"mb-1"},bo={class:"small text-secondary"},ho={key:0,class:"text-warning ms-1"},go={class:"d-flex gap-2"},yo=["title"],xo=["title"],ko=["disabled"],wo={key:0,class:"spinner-border spinner-border-sm me-1"},$o={key:1,class:"bi bi-file-earmark-zip me-1"},_o={key:1,class:"alert alert-danger small"},Co={key:2,class:"alert alert-danger small"},So={class:"mt-1 text-secondary"},Ao={key:3,class:"export-split"},Po={class:"file-tree"},To={class:"tree-title d-flex justify-content-between"},Eo={class:"code-viewer"},Ro={key:0,class:"viewer-empty"},No={class:"viewer-header"},Lo={class:"small flex-grow-1 text-truncate"},jo={class:"badge bg-light text-dark border ms-2"},Vo={key:0,class:"badge bg-warning text-dark ms-1"},Do=["title"],Io={class:"viewer-editor-wrap"};function zo(s){return s.endsWith(".vue")?"bi bi-filetype-js text-success":s.endsWith(".js")?"bi bi-filetype-js text-warning":s.endsWith(".json")?"bi bi-filetype-json":s.endsWith(".html")?"bi bi-filetype-html text-danger":s.endsWith(".md")?"bi bi-filetype-md":s.endsWith(".css")?"bi bi-filetype-css text-primary":"bi bi-file-earmark"}const st=ct({name:"TreeNode",props:{node:Object,parentPath:String,selected:String,isExpanded:Function,isEdited:Function},emits:["toggle","select"],setup(s,{emit:i}){const{t}=me();return()=>{const{node:a,parentPath:p,selected:r,isExpanded:l,isEdited:g}=s;if(a.type==="dir"){const f=p?p+"/"+a.name:a.name,c=l(f),n=fe("button",{class:"tree-dir",onClick:()=>i("toggle",f)},[fe("i",{class:`bi ${c?"bi-folder2-open":"bi-folder"} me-1`}),fe("span",{class:"tree-name"},a.name)]),v=c?fe("div",{class:"tree-children"},a.children.map(k=>fe(st,{key:k.type==="file"?k.path:k.name,node:k,parentPath:f,selected:r,isExpanded:l,isEdited:g,onToggle:w=>i("toggle",w),onSelect:w=>i("select",w)}))):null;return fe("div",{class:"tree-dir-wrap"},[n,v])}const x=g(a.path);return fe("button",{class:["tree-file",{selected:r===a.path,edited:x}],onClick:()=>i("select",a.path)},[fe("i",{class:zo(a.name)+" me-1"}),fe("span",{class:"tree-name"},a.name),x?fe("span",{class:"edit-dot ms-auto",title:t("designer.editedMark")},"●"):null])}}}),Mo={__name:"CodeExportPanel",props:{project:{type:Object,required:!0}},setup(s){const{t:i}=me(),t=s,a=uo(),p=U([]),r=U(null);function l(){r.value=null;try{p.value=lo(t.project,Ne.value)}catch(R){r.value=String(R.message||R),p.value=[]}}be(()=>t.project,l,{deep:!0,immediate:!0});const g=F(()=>{var R;return a.applyTo((R=t.project)==null?void 0:R.id,p.value)}),x=F(()=>{var R;return a.listEditedPaths((R=t.project)==null?void 0:R.id)}),f=F(()=>{const R=new Set(p.value.map(_=>_.path));return[...x.value].filter(_=>!R.has(_))});function c(){var ie,re;const R={projectId:(ie=t.project)==null?void 0:ie.id,edits:a.forProject((re=t.project)==null?void 0:re.id)},_=URL.createObjectURL(new Blob([JSON.stringify(R,null,2)],{type:"application/json"})),W=document.createElement("a");W.href=_,W.download="screen-designer-edited-files.json",W.click(),setTimeout(()=>URL.revokeObjectURL(_),1e3)}const n=F(()=>v(g.value));function v(R){const _={type:"dir",name:"",children:[]};for(const W of R){const ie=W.path.split("/");let re=_;for(let le=0;le<ie.length-1;le++){const L=ie[le];let se=re.children.find(ce=>ce.type==="dir"&&ce.name===L);se||(se={type:"dir",name:L,children:[]},re.children.push(se)),re=se}re.children.push({type:"file",name:ie[ie.length-1],path:W.path,source:W.source})}return k(_),_}function k(R){if(R.type==="dir"){R.children.sort((_,W)=>_.type!==W.type?_.type==="dir"?-1:1:_.name.localeCompare(W.name));for(const _ of R.children)k(_)}}const w=U(null),$=U(new Set(["","src","src/assets","src/views","src/stores","src/components","src/api","src/router"]));function P(R){$.value.has(R)?$.value.delete(R):$.value.add(R),$.value=new Set($.value)}function y(R){return $.value.has(R)}function V(R){return x.value.has(R)}async function T(R){var _;A.value&&E.value!==O(A.value)&&E.value!==a.get((_=t.project)==null?void 0:_.id,A.value)&&!await Ee({title:i("designer.unsavedEdits"),message:`편집 중인 변경사항이 있습니다.
저장 없이 이동할까요?`,detail:`편집 중: ${A.value}`,confirmText:"이동",cancelText:"계속 편집",variant:"danger"})||(w.value=R,A.value=null,E.value="")}const S=F(()=>g.value.find(R=>R.path===w.value)||null);function j(R){return R&&R.toLowerCase().endsWith(".sql")?"sql":"javascript"}const N=F(()=>{var R;return j((R=S.value)==null?void 0:R.path)});function O(R){const _=p.value.find(W=>W.path===R);return(_==null?void 0:_.content)||""}const A=U(null),E=U("");function I(){S.value&&(A.value=S.value.path,E.value=S.value.content)}function G(){var R;A.value&&(a.set((R=t.project)==null?void 0:R.id,A.value,E.value),A.value=null,E.value="")}function Z(){A.value=null,E.value=""}async function ue(){var R;S.value&&await Ee({title:i("codeExportPanel.k15"),message:i("codeExportPanel.k16"),detail:S.value.path,confirmText:i("codeExportPanel.k17"),variant:"danger"})&&a.clear((R=t.project)==null?void 0:R.id,S.value.path)}async function de(){var R;x.value.size&&await Ee({title:i("designer.resetEdits"),message:`이 프로젝트의 편집 ${x.value.size}개를 모두 초기화할까요?`,detail:"되돌릴 수 없습니다.",confirmText:"초기화",variant:"danger"})&&(a.clearAll((R=t.project)==null?void 0:R.id),A.value=null,E.value="")}const B=U(!1),h=U(null);async function b(){var R;if(!B.value){B.value=!0,h.value=null;try{const _=await M(),W=new _;for(const L of g.value)W.file(L.path,L.content);const ie=await W.generateAsync({type:"blob",compression:"DEFLATE"}),re=URL.createObjectURL(ie),le=document.createElement("a");le.href=re,le.download=Y((R=t.project)==null?void 0:R.name),document.body.appendChild(le),le.click(),document.body.removeChild(le),URL.revokeObjectURL(re)}catch(_){h.value=String(_.message||_)}finally{B.value=!1}}}async function M(){const R=await ut(()=>import("./jszip.min-DvbXqdIg.js").then(_=>_.j),[]);return R.default||R}function Y(R){const _=String(R||"project").replace(/[^a-zA-Z0-9가-힣_\-]/g,"_").slice(0,40)||"project",W=new Date,ie=[W.getFullYear(),String(W.getMonth()+1).padStart(2,"0"),String(W.getDate()).padStart(2,"0"),"-",String(W.getHours()).padStart(2,"0"),String(W.getMinutes()).padStart(2,"0"),String(W.getSeconds()).padStart(2,"0")].join("");return`${_}-${ie}.zip`}const q=F(()=>g.value.reduce((R,_)=>{var W;return R+(((W=_.content)==null?void 0:W.length)||0)},0));return(R,_)=>(d(),u("div",po,[f.value.length?(d(),u("div",fo,[C(o(m(Ne).startsWith("en")?"Some edited file paths changed. Back up your edits and move them to the new files.":"구조 변경으로 경로가 달라진 편집 파일이 있습니다. 편집본을 백업한 뒤 새 파일에 옮겨 주세요.")+" ",1),(d(!0),u(z,null,te(f.value,W=>(d(),u("div",{key:W},[e("code",null,o(W),1)]))),128))])):D("",!0),e("div",mo,[e("div",null,[e("h6",vo,[_[1]||(_[1]=e("i",{class:"bi bi-download me-1"},null,-1)),C(o(m(i)("codeExportPanel.k1")),1)]),e("div",bo,[C(o(m(i)("codeExportPanel.k2")),1),e("strong",null,o(g.value.length),1),C(" "+o(m(i)("designer.fileCount").replace("{n}",""))+" · "+o((q.value/1024).toFixed(1))+" KB) ",1),x.value.size>0?(d(),u("span",ho,[_[2]||(_[2]=C(" · ",-1)),_[3]||(_[3]=e("i",{class:"bi bi-pencil-fill"},null,-1)),C(" "+o(m(i)("designer.editedCount").replace("{n}",x.value.size)),1)])):D("",!0)])]),e("div",go,[x.value.size?(d(),u("button",{key:0,class:"btn btn-sm btn-outline-secondary",onClick:c},o(m(Ne).startsWith("en")?"Back up edits":"편집본 백업"),1)):D("",!0),x.value.size>0?(d(),u("button",{key:1,class:"btn btn-sm btn-outline-danger",onClick:de,title:m(i)("codeExportPanel.k12")},[_[4]||(_[4]=e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)),C(" "+o(m(i)("codeExportPanel.k3")),1)],8,yo)):D("",!0),e("button",{class:"btn btn-sm btn-outline-secondary",onClick:l,title:m(i)("codeExportPanel.k13")},[_[5]||(_[5]=e("i",{class:"bi bi-arrow-clockwise"},null,-1)),C(" "+o(m(i)("codeExportPanel.k4")),1)],8,xo),e("button",{class:"btn btn-sm btn-primary",onClick:b,disabled:B.value||g.value.length===0},[B.value?(d(),u("span",wo)):(d(),u("i",$o)),C(" "+o(m(i)("codeExportPanel.k5")),1)],8,ko)])]),r.value?(d(),u("div",_o,[_[6]||(_[6]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(m(i)("designer.genFailed"))+": "+o(r.value),1)])):D("",!0),h.value?(d(),u("div",Co,[_[7]||(_[7]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(m(i)("designer.downloadFailed"))+": "+o(h.value)+" ",1),e("div",So,o(m(i)("codeExportPanel.k6")),1)])):D("",!0),r.value?D("",!0):(d(),u("div",Ao,[e("div",Po,[e("div",To,[e("span",null,o(m(i)("designer.files"))+" ("+o(g.value.length)+")",1)]),(d(!0),u(z,null,te(n.value.children,W=>(d(),xe(m(st),{key:W.type==="file"?W.path:W.name,node:W,"parent-path":"",selected:w.value,"is-expanded":y,"is-edited":V,onToggle:P,onSelect:T},null,8,["node","selected"]))),128))]),e("div",Eo,[S.value?(d(),u(z,{key:1},[e("div",No,[e("code",Lo,o(S.value.path),1),e("span",jo,o(S.value.source),1),V(S.value.path)?(d(),u("span",Vo,[_[9]||(_[9]=e("i",{class:"bi bi-pencil-fill"},null,-1)),C(" "+o(m(i)("codeExportPanel.k8")),1)])):D("",!0),A.value?(d(),u(z,{key:2},[e("button",{class:"btn btn-sm btn-success ms-2",onClick:G},[_[12]||(_[12]=e("i",{class:"bi bi-check-lg"},null,-1)),C(" "+o(m(i)("codeExportPanel.k10")),1)]),e("button",{class:"btn btn-sm btn-outline-secondary ms-1",onClick:Z},[_[13]||(_[13]=e("i",{class:"bi bi-x-lg"},null,-1)),C(" "+o(m(i)("codeExportPanel.k11")),1)])],64)):(d(),u(z,{key:1},[e("button",{class:"btn btn-sm btn-outline-primary ms-2",onClick:I},[_[10]||(_[10]=e("i",{class:"bi bi-pencil"},null,-1)),C(" "+o(m(i)("codeExportPanel.k9")),1)]),V(S.value.path)?(d(),u("button",{key:0,class:"btn btn-sm btn-outline-secondary ms-1",onClick:ue,title:m(i)("codeExportPanel.k14")},[..._[11]||(_[11]=[e("i",{class:"bi bi-arrow-counterclockwise"},null,-1)])],8,Do)):D("",!0)],64))]),e("div",Io,[A.value?(d(),xe(Ue,{key:1,modelValue:E.value,"onUpdate:modelValue":_[0]||(_[0]=W=>E.value=W),language:N.value,readonly:!1},null,8,["modelValue","language"])):(d(),xe(Ue,{key:0,"model-value":S.value.content,language:N.value,readonly:!0},null,8,["model-value","language"]))])],64)):(d(),u("div",Ro,[_[8]||(_[8]=e("i",{class:"bi bi-file-earmark-code fs-1 d-block mb-2 opacity-50"},null,-1)),C(" "+o(m(i)("codeExportPanel.k7")),1)]))])]))]))}},Wo=he(Mo,[["__scopeId","data-v-839284b9"]]),Oo="/public/vendor/vue.esm-browser.prod.js",Uo="/public/vendor/bootstrap.min.css",Bo=new Set(["top-nav","top-and-side","hero-landing"]),qo=new Set(["sidebar-left","sidebar-dark","sidebar-both","top-and-side"]),Fo=new Set(["split-panel","card-grid"]);function Je(s){return Bo.has(s)}function Ko(s){return qo.has(s)}function Ho(s){return!Fo.has(s==null?void 0:s.kind)}function Jo({project:s,authToken:i=""}={}){var k,w,$,P,y,V,T,S,j;if(!s)return Qo("프로젝트 정보가 없습니다");const t=i?`<script>window.__previewToken=${JSON.stringify(String(i))};<\/script>`:"",a=Yo(s.layout),p=(s.screens||[]).filter(N=>N&&N.kind==="composite"),r=[];for(const N of p){const O=[],A=[];for(const E of N.rows||[]){const I=[];for(let G=0;G<(E.widgets||[]).length;G++){const Z=E.widgets[G],ue=((k=E.widths)==null?void 0:k[G])||12;let de=null;((w=Z.source)==null?void 0:w.type)==="endpoint"&&Z.source.path&&(de=`ep_${String(Z.id).replace(/[^a-zA-Z0-9_]/g,"_")}`,O.push({name:de,method:Z.source.method||"GET",path:Z.source.path,resultKey:Z.source.resultKey||null})),I.push({widget:Z,width:ue,endpointVar:de})}A.push({row:E,widgets:I})}r.push({screen:N,rowDescriptors:A,endpointVars:O})}let l=Array.isArray(($=a.sidebar)==null?void 0:$.items)?a.sidebar.items:[];l.length?l=l.map(N=>{const O=p.find(A=>A.path===N.path);return{...N,screenId:(O==null?void 0:O.id)||null}}):l=p.map(N=>({label:N.title||"무제",path:N.path||`/screen-${N.id}`,icon:"bi-file-earmark",screenId:N.id}));const g=[],x=new Set;for(const{endpointVars:N}of r)for(const O of N){if(x.has(O.name))continue;x.add(O.name);const A={method:O.method,path:O.path};O.resultKey&&(A.resultKey=O.resultKey),g.push(`const ${O.name} = ${JSON.stringify(A)};`)}const f=JSON.stringify(l.map(N=>({label:N.label,path:N.path,icon:N.icon||"",screenId:N.screenId}))),c=r.map(N=>Go(N)).join(`
`),n=((P=p[0])==null?void 0:P.id)||null,v=((y=l[0])==null?void 0:y.path)||"/";return`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${ye(s.name||"Preview")}</title>
<link rel="stylesheet" href="${Uo}" />
<style>
${el}
${gt}
${Xo(a)}
</style>
</head>
<body>
<div id="app"></div>
${t}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${Oo}';

// ---- Widget components ----
${yt}

// ---- Endpoint definitions (전역 공유) ----
${g.join(`
`)}

// ---- 메뉴 / 화면 라우팅 (간이 SPA) ----
const MENU = ${f};
/* ★ v1.9.2 — 화면 id → 정보. 메뉴에는 없는 화면(수정 화면 등)으로도 이동해야 하므로
   MENU 가 아니라 전체 화면 목록으로 만든다. */
const SCREEN_INDEX = ${JSON.stringify(Object.fromEntries(p.map(N=>[N.id,{id:N.id,title:N.title||N.id,path:N.path||""}])))};
const currentScreenId = ref(${JSON.stringify(n)});
const currentPath = ref(${JSON.stringify(v)});

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
      ${g.map(N=>{var O;return(O=N.match(/const (\w+)/))==null?void 0:O[1]}).filter(Boolean).join(`,
      `)}
    };
  },
  template: \`
    <div class="app-shell layout-kind-${a.kind}">
      <!-- 상단 네비 (kind: top-nav / top-and-side / hero-landing) -->
      <header v-if="${Je(a.kind)}" class="app-topbar">
        <div class="header-title">${ye(((V=a.title)==null?void 0:V.text)||"")}</div>
        <nav class="topnav">
          <button v-for="m in menu" :key="m.path"
                  class="topnav-item"
                  :class="{ active: currentPath === m.path }"
                  @click="navigate(m)">{{ m.label }}</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- 좌 사이드바 (kind: sidebar-left / sidebar-dark / sidebar-both / top-and-side) -->
        <aside v-if="${Ko(a.kind)}" class="app-sidebar app-sidebar-left">
          ${a.kind!=="top-and-side"?`<div class="sidebar-brand">${ye(((T=a.title)==null?void 0:T.text)||s.name||"App")}</div>`:""}
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
          <header v-if="${!Je(a.kind)}" class="app-header">
            <div class="header-title">${ye(((S=a.title)==null?void 0:S.text)||"")}</div>
          </header>
          <main class="app-content ${a.kind==="split-panel"?"is-split":""} ${a.kind==="card-grid"?"is-grid":""}">
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
${c}
            <div v-if="!currentScreenId" class="text-center text-muted py-5">
              ${Ho(a)?"사이드바에서":""}화면을 선택하세요.
            </div>
          </main>
        </div>

        <!-- 우 사이드바 (kind: sidebar-right) -->
        <aside v-if="${a.kind==="sidebar-right"}" class="app-sidebar app-sidebar-right">
          <div class="sidebar-brand">${ye(((j=a.title)==null?void 0:j.text)||s.name||"App")}</div>
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
        <aside v-if="${a.kind==="sidebar-both"}" class="app-aux-panel">
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
</html>`}function Go({screen:s,rowDescriptors:i,endpointVars:t}){const a=[],p="'"+String(s.id).replace(/'/g,"\\'")+"'";if(a.push(`          <div v-if="currentScreenId === ${p}" class="composite-view">`),s.header&&s.header.kind!=="none"){const r=ye(s.header.title||s.title||""),l=ye(s.header.subtitle||"");a.push('            <div class="composite-header">'),a.push(`              <h2 class="composite-title">${r}</h2>`),l&&a.push(`              <div class="composite-subtitle">${l}</div>`),a.push("            </div>")}for(const{row:r,widgets:l}of i){const x=`gap:${(r.style||{}).gap??16}px`;a.push(`            <div class="row" style="${x}">`);for(const{widget:f,width:c,endpointVar:n}of l)a.push(`              <div class="col-md-${c}">`),a.push(`                ${Zo(f,n)}`),a.push("              </div>");a.push("            </div>")}return a.push("          </div>"),a.join(`
`)}function Ge(s){const i=s==null?void 0:s.onRowClick;if(!i||i.action!=="navigate"||!i.target)return"";const t=Object.entries(i.params||{}).filter(([,p])=>p).map(([p,r])=>`${p}: '${String(r).replace(/'/g,"")}'`).join(", ");return` :row-clickable="true" @row-click="(row) => __previewNavigate('${String(i.target).replace(/'/g,"")}', { ${t} }, row)"`}function Zo(s,i){const t=s.title||"",a=s.config||{},p=s.source,r=f=>`"${String(f).replace(/"/g,"&quot;")}"`,l=i&&(p==null?void 0:p.type)==="endpoint",g=p&&p.resultKey?`result-key=${r(p.resultKey)}`:"",x=s.id?`widget-id=${r(s.id)}`:"";switch(s.kind){case"stat":return l?`<StatWidget label=${r(t)} :endpoint="${i}" ${g} format=${r(a.format||"number")} color=${r(a.color||"primary")} ${x} />`:`<StatWidget label=${r(t)} :value="null" format=${r(a.format||"number")} color=${r(a.color||"primary")} />`;case"list":return l?`<ListWidget title=${r(t)} :endpoint="${i}" ${g} :max-rows="${Number(a.maxRows)||20}" ${x}${Ge(s)} />`:`<ListWidget title=${r(t)} :rows="[]" :max-rows="${Number(a.maxRows)||5}"${Ge(s)} />`;case"listPaged":return l?`<ListPagedWidget title=${r(t)} :endpoint="${i}" ${g} :per-page="${Number(a.perPage)||10}" ${x} />`:`<ListPagedWidget title=${r(t)} :endpoint="null" :per-page="${Number(a.perPage)||10}" />`;case"detail":return l?`<DetailWidget title=${r(t)} :endpoint="${i}" ${g} ${x} />`:`<DetailWidget title=${r(t)} :record="null" />`;case"text":return l?`<TextWidget label=${r(t)} :endpoint="${i}" ${g} format=${r(a.format||"auto")} ${x} />`:`<TextWidget label=${r(t)} :value="null" format=${r(a.format||"auto")} />`;case"markdown":{const f=String(a.body||"");return f?`<MarkdownWidget :body='${JSON.stringify(f).replace(/'/g,"\\'")}' />`:'<MarkdownWidget body="" />'}case"queryForm":{const f=JSON.stringify(a.fields||[]).replace(/'/g,"\\'"),c=a.submitLabel||"조회",n=a.targetWidgetId||"",v=a.endpointHint?`endpoint-hint=${r(a.endpointHint)}`:"";return`<QueryFormWidget title=${r(t)} :fields='${f}' submit-label=${r(c)} target-widget-id=${r(n)} ${v} />`}case"formDialog":{const f=JSON.stringify(a.fields||[]).replace(/'/g,"\\'"),c=a.buttonLabel||"실행",n=a.buttonVariant||"primary",v=a.dialogTitle||t||c,k=!!a.confirmBeforeSubmit,w=a.refreshTargetWidgetId||"",$=l?`:endpoint="${i}"`:"";return`<FormDialogWidget title=${r(t)} ${$} button-label=${r(c)} button-variant=${r(n)} dialog-title=${r(v)} :fields='${f}' :confirm-before-submit="${k}" refresh-target-widget-id=${r(w)} />`}case"button":{const f=String(t||a.label||"버튼"),c=String(a.variant||"primary"),n=s.onRowClick,v=n&&n.action==="navigate"&&n.target?` @click="__previewNavigate('${String(n.target).replace(/'/g,"")}', {}, null)"`:"";return`<div class="card h-100"><div class="card-body d-flex align-items-center"><button type="button" class="btn btn-${c}"${v}>${f.replace(/</g,"&lt;")}</button></div></div>`}default:return`<!-- unknown widget kind: ${s.kind} -->`}}function Yo(s){var t,a,p,r,l,g,x,f,c,n,v;const i=s||{};return{kind:i.kind||"sidebar-left",title:{text:((t=i.title)==null?void 0:t.text)||"",bgColor:((a=i.title)==null?void 0:a.bgColor)||"#ffffff",fgColor:((p=i.title)==null?void 0:p.fgColor)||"#0f172a",height:Number((r=i.title)==null?void 0:r.height)||60,...i.title},sidebar:{items:Array.isArray((l=i.sidebar)==null?void 0:l.items)?i.sidebar.items:[],bgColor:((g=i.sidebar)==null?void 0:g.bgColor)||"#1e2a3a",fgColor:((x=i.sidebar)==null?void 0:x.fgColor)||"#cfd6de",width:Number((f=i.sidebar)==null?void 0:f.width)||220,activeBg:((c=i.sidebar)==null?void 0:c.activeBg)||"#0d6efd",...i.sidebar},mainArea:{bgColor:((n=i.mainArea)==null?void 0:n.bgColor)||"#f5f7fa",padding:Number((v=i.mainArea)==null?void 0:v.padding)||16,...i.mainArea}}}function Xo(s){const i=s.title,t=s.sidebar,a=s.mainArea;return`
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
  height: ${i.height}px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: ${i.bgColor};
  color: ${i.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
}
.header-title { font-weight: 600; font-size: 16px; }

/* ────────── 상단 네비 막대 (top-kind 전용) ────────── */
.app-topbar {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: ${i.height}px;
  background: ${i.bgColor};
  color: ${i.fgColor};
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
  background: ${a.bgColor};
  padding: ${a.padding}px;
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
.layout-kind-hero-landing .composite-view { max-width: 1200px; margin: 0 auto; padding: ${a.padding}px; }

/* split-panel: 메인 영역 2분할 (composite-view 내부 구성은 화면이 담당) */
.layout-kind-split-panel .app-content { padding: ${a.padding}px; }

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
`}function ye(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Qo(s){return`<!DOCTYPE html><html><body style="padding:32px;font-family:sans-serif;color:#b91c1c">${ye(s)}</body></html>`}const el=`
* { box-sizing: border-box; }
body { margin: 0; }
`,tl={class:"whole-app-preview"},sl={class:"preview-toolbar"},al={class:"d-flex align-items-center gap-2 flex-grow-1"},il={class:"fw-semibold"},rl={class:"text-secondary small"},nl={class:"btn-group btn-group-sm",role:"group"},ol={key:0,class:"empty-state"},ll={class:"mb-2"},dl={class:"small text-secondary"},cl=["srcdoc"],ul=400,pl={__name:"WholeAppPreview",props:{project:{type:Object,required:!0}},setup(s){const{t:i}=me(),t=pt(),a=s,p=U(a.project);let r=null;be(()=>a.project,c=>{r&&clearTimeout(r),r=setTimeout(()=>{p.value=c,r=null},ul)},{deep:!0}),Ve(()=>{r&&clearTimeout(r)});const l=F(()=>{try{return Jo({project:p.value,authToken:t.accessToken||""})}catch(c){return`<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(c.message||c).replace(/</g,"&lt;")}</body></html>`}}),g=U("desktop"),x={desktop:"100%",tablet:"1024px",mobile:"375px"},f=F(()=>{var c;return(((c=a.project)==null?void 0:c.screens)||[]).filter(n=>n.kind==="composite").length});return(c,n)=>(d(),u("div",tl,[e("div",sl,[e("div",al,[n[3]||(n[3]=e("i",{class:"bi bi-app-indicator"},null,-1)),e("span",il,o(s.project.name||"전체 앱 미리보기"),1),e("span",rl,"· "+o(m(i)("designer.screenCount").replace("{n}",f.value)),1)]),e("div",nl,[e("button",{class:J(["btn",g.value==="desktop"?"btn-primary":"btn-outline-secondary"]),onClick:n[0]||(n[0]=v=>g.value="desktop")},[...n[4]||(n[4]=[e("i",{class:"bi bi-laptop"},null,-1),C(" Desktop ",-1)])],2),e("button",{class:J(["btn",g.value==="tablet"?"btn-primary":"btn-outline-secondary"]),onClick:n[1]||(n[1]=v=>g.value="tablet")},[...n[5]||(n[5]=[e("i",{class:"bi bi-tablet"},null,-1),C(" Tablet ",-1)])],2),e("button",{class:J(["btn",g.value==="mobile"?"btn-primary":"btn-outline-secondary"]),onClick:n[2]||(n[2]=v=>g.value="mobile")},[...n[6]||(n[6]=[e("i",{class:"bi bi-phone"},null,-1),C(" Mobile ",-1)])],2)])]),f.value?(d(),u("div",{key:1,class:J(["preview-frame-wrap","viewport-"+g.value])},[e("iframe",{class:"preview-iframe",style:K({width:x[g.value]}),srcdoc:l.value,sandbox:"allow-scripts allow-same-origin",referrerpolicy:"no-referrer"},null,12,cl)],2)):(d(),u("div",ol,[n[7]||(n[7]=e("i",{class:"bi bi-easel2 fs-1 d-block mb-2 opacity-50"},null,-1)),e("div",ll,o(m(i)("designer.noScreensYet")),1),e("div",dl,o(m(i)("designer.addScreenHint")),1)]))]))}},fl=he(pl,[["__scopeId","data-v-a52ae946"]]),ml={class:"container-fluid py-3"},vl={class:"d-flex justify-content-between align-items-center mb-3"},bl={class:"d-flex align-items-center gap-2"},hl=["title"],gl={class:"mb-0"},yl={key:0,class:"text-secondary"},xl={key:1},kl={key:2,class:"text-secondary"},wl={key:0,class:"small text-secondary"},$l={key:0},_l={class:"ms-2"},Cl={key:0,class:"opacity-75"},Sl={key:1,class:"small text-secondary"},Al={key:0,class:"d-flex align-items-center gap-2"},Pl={key:0},Tl={key:1},El={class:"text-secondary"},Rl={key:2,class:"text-secondary"},Nl=["disabled","title"],Ll={key:0,class:"alert alert-danger small"},jl={class:"nav nav-tabs mb-3"},Vl={class:"nav-item"},Dl={class:"nav-item"},Il={class:"nav-item"},zl={class:"nav-item"},Ml={key:1},Wl={key:0,class:"card"},Ol={class:"card-body text-center py-5 text-secondary"},Ul={key:2},Bl={key:0,class:"card"},ql={class:"card-body text-center py-5 text-secondary"},Fl={key:3},Kl={key:0,class:"card"},Hl={class:"card-body text-center py-5 text-secondary"},Jl={key:4},Gl={key:0,class:"card"},Zl={class:"card-body text-center py-5 text-secondary"},Yl={__name:"ProjectEditorView",setup(s){const i=rt(),{t}=me(),a=Ye(),p=Xe(),r=Ie(),{activeProject:l,loading:g,error:x,saving:f}=je(r),c=["layout","screens","preview","export"];function n(){const V=a.query.tab;return typeof V=="string"&&c.includes(V)?V:"layout"}const v=U(n());be(v,V=>{a.query.tab!==V&&p.replace({query:V==="layout"?{}:{...a.query,tab:V}})}),be(()=>a.query.tab,()=>{const V=n();V!==v.value&&(v.value=V)});const k=U(null);be(f,(V,T)=>{T===!0&&V===!1&&(k.value=new Date)});const w=F(()=>f.value?"저장 중…":k.value?t("designer.allAutoSaved"):t("designer.autoSavedHint"));async function $(){var T;const V=a.params.id;if(V)try{await r.loadById(V)}catch(S){((T=S.response)==null?void 0:T.status)===404&&(ge("존재하지 않는 프로젝트입니다","목록으로 돌아갑니다."),p.replace({name:"screen-projects"}))}}Ze($),be(()=>a.params.id,$),Ve(()=>r.clearActive());function P(){p.push({name:"screen-projects"})}async function y(){var T,S,j;if(!l.value){at("저장할 수 없습니다","프로젝트가 아직 로드되지 않았습니다.");return}const V=l.value;console.log("[ProjectEditor] saveNow → PUT /api/admin/screen-projects/"+V.id,{name:V.name,screensCount:(V.screens||[]).length});try{const N=await r.savePatch(V.id,{name:V.name,description:V.description,config:V.config,layout:V.layout,screens:V.screens,vars:V.vars});k.value=new Date,console.log("[ProjectEditor] saveNow ✓ updated id="+((N==null?void 0:N.id)??V.id)),it("저장되었습니다",`${V.name} · ID ${V.id} · ${i.time(k.value)}`)}catch(N){const O=(T=N.response)==null?void 0:T.status,A=((j=(S=N.response)==null?void 0:S.data)==null?void 0:j.message)||N.message;console.error("[ProjectEditor] saveNow ✗",O,A),ge(`저장 실패 (HTTP ${O||"?"})`,A)}}return(V,T)=>(d(),u("div",ml,[e("div",vl,[e("div",bl,[e("button",{class:"btn btn-sm btn-outline-secondary",onClick:P,title:m(t)("projectEditor.k12")},[...T[4]||(T[4]=[e("i",{class:"bi bi-arrow-left"},null,-1)])],8,hl),e("div",null,[e("h5",gl,[T[6]||(T[6]=e("i",{class:"bi bi-easel2 me-2"},null,-1)),m(g)&&!m(l)?(d(),u("span",yl,[T[5]||(T[5]=e("span",{class:"spinner-border spinner-border-sm me-2"},null,-1)),C(o(m(t)("projectEditor.k1")),1)])):m(l)?(d(),u("span",xl,o(m(l).name),1)):(d(),u("span",kl,o(m(t)("projectEditor.k2")),1))]),m(l)?(d(),u("div",wl,[m(l).description?(d(),u("span",$l,o(m(l).description)+" · ",1)):D("",!0),T[7]||(T[7]=C(" Project ID: ",-1)),e("code",null,o(m(l).id),1),e("span",_l,[e("i",{class:J(["bi",m(f)?"bi-arrow-repeat":"bi-check-circle"])},null,2),C(" "+o(w.value)+" ",1),k.value?(d(),u("span",Cl," ("+o(m(i).time(k.value))+") ",1)):D("",!0)])])):(d(),u("div",Sl,[T[8]||(T[8]=C(" Project ID: ",-1)),e("code",null,o(m(a).params.id),1)]))])]),m(l)?(d(),u("div",Al,[e("span",{class:J(["small save-indicator",{saving:m(f),"just-saved":k.value&&!m(f)}])},[m(f)?(d(),u("span",Pl,[T[9]||(T[9]=e("span",{class:"spinner-border spinner-border-sm me-1"},null,-1)),C(o(m(t)("projectEditor.k3")),1)])):k.value?(d(),u("span",Tl,[T[10]||(T[10]=e("i",{class:"bi bi-check-circle-fill me-1 text-success"},null,-1)),C(" "+o(m(t)("projectEditor.k4"))+" ",1),e("span",El,"("+o(m(i).time(k.value))+")",1)])):(d(),u("span",Rl,[T[11]||(T[11]=e("i",{class:"bi bi-cloud me-1"},null,-1)),C(o(m(t)("projectEditor.k5")),1)]))],2),e("button",{class:"btn btn-sm btn-outline-primary",onClick:y,disabled:m(f),title:m(t)("projectEditor.k6")},[T[12]||(T[12]=e("i",{class:"bi bi-save me-1"},null,-1)),C(o(m(t)("projectEditor.k6")),1)],8,Nl)])):D("",!0)]),m(x)?(d(),u("div",Ll,[T[13]||(T[13]=e("i",{class:"bi bi-exclamation-triangle me-1"},null,-1)),C(o(m(x)),1)])):D("",!0),e("ul",jl,[e("li",Vl,[e("button",{class:J(["nav-link",{active:v.value==="layout"}]),onClick:T[0]||(T[0]=S=>v.value="layout")},[T[14]||(T[14]=e("i",{class:"bi bi-layout-sidebar me-1"},null,-1)),C(o(m(t)("projectEditor.k7")),1)],2)]),e("li",Dl,[e("button",{class:J(["nav-link",{active:v.value==="screens"}]),onClick:T[1]||(T[1]=S=>v.value="screens")},[T[15]||(T[15]=e("i",{class:"bi bi-collection me-1"},null,-1)),C(o(m(t)("projectEditor.k8")),1)],2)]),e("li",Il,[e("button",{class:J(["nav-link",{active:v.value==="preview"}]),onClick:T[2]||(T[2]=S=>v.value="preview")},[T[16]||(T[16]=e("i",{class:"bi bi-eye me-1"},null,-1)),C(o(m(t)("projectEditor.k9")),1)],2)]),e("li",zl,[e("button",{class:J(["nav-link",{active:v.value==="export"}]),onClick:T[3]||(T[3]=S=>v.value="export")},[T[17]||(T[17]=e("i",{class:"bi bi-download me-1"},null,-1)),C(o(m(t)("projectEditor.k10")),1)],2)])]),v.value==="layout"?(d(),u("div",Ml,[m(l)?(d(),xe(La,{key:1})):(d(),u("div",Wl,[e("div",Ol,[T[18]||(T[18]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),C(o(m(t)("projectEditor.k11")),1)])]))])):D("",!0),v.value==="screens"?(d(),u("div",Ul,[m(l)?(d(),xe(bn,{key:1})):(d(),u("div",Bl,[e("div",ql,[T[19]||(T[19]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),C(o(m(t)("projectEditor.k11")),1)])]))])):D("",!0),v.value==="preview"?(d(),u("div",Fl,[m(l)?(d(),xe(fl,{key:1,project:m(l)},null,8,["project"])):(d(),u("div",Kl,[e("div",Hl,[T[20]||(T[20]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),C(o(m(t)("projectEditor.k11")),1)])]))])):D("",!0),v.value==="export"?(d(),u("div",Jl,[m(l)?(d(),xe(Wo,{key:1,project:m(l)},null,8,["project"])):(d(),u("div",Gl,[e("div",Zl,[T[21]||(T[21]=e("div",{class:"spinner-border spinner-border-sm me-2"},null,-1)),C(o(m(t)("projectEditor.k11")),1)])]))])):D("",!0)]))}},ld=he(Yl,[["__scopeId","data-v-2cb4d6d1"]]);export{ld as default};
