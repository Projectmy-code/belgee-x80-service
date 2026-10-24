"use strict";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "belgeeX80ServiceLog_v1";
const intervals = Array.from({length:10},(_,i)=>({km:(i+1)*15000,months:(i+1)*12}));
const priceData = [{km:15000,price:568},{km:30000,price:1060},{km:45000,price:568},{km:60000,price:1529},{km:75000,price:568},{km:90000,price:1825},{km:105000,price:568},{km:120000,price:1529},{km:135000,price:568},{km:150000,price:1180}];

// Базовый список перенесён с предоставленной таблицы регламента.
// R — замена, I — проверка/осмотр, L — смазка/обслуживание.
const tasks = [
  {name:"Моторное масло и масляный фильтр",code:"R",every:1},
  {name:"Система охлаждения",code:"I",every:1},
  {name:"Топливная система (бак, трубки, шланги, соединения)",code:"I",every:1},
  {name:"Проверка системы двигателя диагностическим сканером",code:"I",every:1},
  {name:"Воздушный фильтр двигателя",code:"I/R",pattern:[1,2]},
  {name:"Фильтр угольного адсорбера",code:"R",note:"Замена каждые 3 года или 60 000 км"},
  {name:"Свечи зажигания",code:"R",note:"Замена каждые 30 000 км"},
  {name:"Охлаждающая жидкость",code:"R",note:"Замена каждые 4 года или 90 000 км"},
  {name:"Тяговая батарея: внешний осмотр",code:"I",group:"Тяговая батарея"},
  {name:"Тяговая батарея: проверка изоляции",code:"I",group:"Тяговая батарея"},
  {name:"Тяговая батарея: диагностика прибором",code:"I",group:"Тяговая батарея"},
  {name:"Тяговая батарея: проверка герметичности",code:"I",note:"Каждые 150 000 км",group:"Тяговая батарея",special:10},
  {name:"Система электропривода: внешний осмотр",code:"I",group:"Система электропривода"},
  {name:"Система электропривода: диагностика прибором",code:"I",group:"Система электропривода"},
  {name:"Трансмиссионная жидкость",code:"R",note:"Замена каждые 4 года или 90 000 км",group:"Система электропривода",special:6},
  {name:"Тормозная система и стояночный тормоз (работа)",code:"I",group:"Тормозная система"},
  {name:"Тормозные диски и колодки",code:"I",group:"Тормозная система"},
  {name:"Уровень жидкости гидропривода тормозов",code:"I",group:"Тормозная система"},
  {name:"Жидкость гидропривода тормозов",code:"I/R",pattern:[1,2],group:"Тормозная система"},
  {name:"Работа системы кондиционирования",code:"I",group:"Система кондиционирования"},
  {name:"Фильтр салона / кондиционера",code:"I",note:"Проверка и очистка при каждом ТО; замена при необходимости",group:"Система кондиционирования"},
  {name:"Аккумуляторная батарея",code:"I",group:"Электрооборудование"},
  {name:"Приборы освещения и сигнализации",code:"I",group:"Электрооборудование"},
  {name:"Стеклоподъёмники",code:"I",group:"Электрооборудование"},
  {name:"Звуковой сигнал",code:"I",group:"Электрооборудование"},
  {name:"Стеклоочистители и омыватели",code:"I",group:"Электрооборудование"},
  {name:"Бортовые электронные системы: диагностика",code:"I",group:"Электрооборудование"},
  {name:"Замки, петли, фиксаторы дверей, капота и багажника",code:"L",group:"Шасси и кузов"},
  {name:"Приводы колёс. Пыльники",code:"I",group:"Шасси и кузов"},
  {name:"Детали системы рулевого управления",code:"I",group:"Шасси и кузов"},
  {name:"Детали подвески. Шарниры, пыльники, люфты, крепление",code:"I",group:"Шасси и кузов"},
  {name:"Амортизаторы",code:"I",group:"Шасси и кузов"},
  {name:"Герметичность системы выпуска",code:"I",group:"Шасси и кузов"},
  {name:"Колёса и шины. Давление, износ, затяжка креплений",code:"I",group:"Шасси и кузов"}
];

const dealerTo3Preset = {id:"dealer-to-3-3000",title:"ТО-3 по рекомендации дилера",mileage:3000,date:"",note:"Дилер рекомендовал приехать на пробеге 3 000 км",done:false,createdAt:"",completedAt:""};
const defaultState = {version:1,vehicle:{mileage:0,startDate:"",lastServiceDate:"",lastServiceMileage:"",note:""},services:[],checkmarks:{},customTasks:[{...dealerTo3Preset}],dealerPresetInitialized:true};
let state = loadState();
let toastTimer;
function loadState(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(v&&v.vehicle&&Array.isArray(v.services)){const tasks=Array.isArray(v.customTasks)?[...v.customTasks]:[];if(!v.dealerPresetInitialized&&!tasks.some(t=>t.id===dealerTo3Preset.id))tasks.unshift({...dealerTo3Preset});return {...defaultState,...v,vehicle:{...defaultState.vehicle,...v.vehicle},checkmarks:v.checkmarks||{},customTasks:tasks,dealerPresetInitialized:true};}}catch(e){}return structuredClone(defaultState);}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmt(n){return Number(n||0).toLocaleString("ru-RU");}
function fmtMoney(n){return n===""||n===null||n===undefined?"—":Number(n).toLocaleString("ru-RU",{maximumFractionDigits:2}) ;}
function dateNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function dateFmt(s){if(!s)return "Дата не указана";const d=new Date(s+"T12:00:00");return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"short",year:"numeric"});}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600);}
function nextInterval(){const m=Number(state.vehicle.mileage)||0;return intervals.find(x=>x.km>m)||null;}
function lastService(){return [...state.services].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||Number(b.mileage)-Number(a.mileage))[0]||null;}
function serviceDueDate(){const base=state.vehicle.lastServiceDate||state.vehicle.startDate;if(!base)return null;const d=new Date(base+"T12:00:00");d.setMonth(d.getMonth()+12);return d;}
function render(){
  $("currentMileage").textContent=fmt(state.vehicle.mileage);
  const next=nextInterval();$("nextMileage").textContent=next?fmt(next.km):"150 000+";
  $("nextDueText").textContent=next?`По регламенту: ${fmt(next.km)} км / ${next.months} мес.`:"Все этапы до 150 000 км пройдены";
  $("recordCount").textContent=state.services.length;
  const last=lastService();$("lastServiceLabel").textContent=last?`Последняя запись: ${dateFmt(last.date)}`:"Первое обслуживание не добавлено";
  $("statusText").textContent=state.services.length?"Журнал обслуживания ведётся":"Журнал готов к заполнению";
  renderDue();renderMilestones();renderPrices();renderSchedule();renderCustomTasks();renderHistory();fillSettings();
}
function renderDue(){
 const m=Number(state.vehicle.mileage)||0, next=nextInterval(), items=[];
 if(!next) items.push({icon:"✓",title:"Плановые интервалы",desc:"Этапы до 150 000 км отмечены по пробегу. Продолжайте сверяться с сервисной книжкой.",state:"Проверить дальше",cls:"ok"});
 else {const left=next.km-m;items.push({icon:"↗",title:`ТО на ${fmt(next.km)} км`,desc:left<=0?"Плановый пробег уже достигнут. Запланируйте визит в сервис.":`До планового ТО осталось ${fmt(left)} км.`,state:left<=0?"Пора на ТО":left<3000?"Скоро":"По плану",cls:left<=3000?"warn":"ok"});}
 const dueDate=serviceDueDate();if(dueDate){const days=Math.ceil((new Date(dueDate.toDateString())-new Date(new Date().toDateString()))/86400000);items.push({icon:"◷",title:"Календарный интервал",desc:days<0?`Годовой интервал наступил ${Math.abs(days)} дн. назад.`:`Ориентировочная дата следующего годового ТО: ${dueDate.toLocaleDateString("ru-RU")}.`,state:days<0?"Проверьте срок":days<45?"Скоро":"По дате",cls:days<45?"warn":"ok"});}else items.push({icon:"◷",title:"Напоминание по дате",desc:"Добавьте дату начала эксплуатации или последнего ТО в разделе «Данные», чтобы видеть годовой интервал.",state:"Нужна дата",cls:""});
 const customPending=(state.customTasks||[]).filter(t=>!t.done).sort((a,b)=>{
   const am=a.mileage!==""&&a.mileage!=null?Number(a.mileage):Infinity;
   const bm=b.mileage!==""&&b.mileage!=null?Number(b.mileage):Infinity;
   return am-bm||(a.date||"9999-12-31").localeCompare(b.date||"9999-12-31");
 });
 if(customPending.length){
   customPending.forEach(t=>{
     const hasMileage=t.mileage!==""&&t.mileage!=null&&Number.isFinite(Number(t.mileage));
     const mileageLeft=hasMileage?Number(t.mileage)-m:null;
     const hasDate=!!t.date;
     const dateDays=hasDate?Math.ceil((new Date(t.date+"T12:00:00")-new Date(dateNow()+"T12:00:00"))/86400000):null;
     const overdue=(hasMileage&&mileageLeft<=0)||(hasDate&&dateDays<0);
     const soon=(hasMileage&&mileageLeft>0&&mileageLeft<=3000)||(hasDate&&dateDays>=0&&dateDays<=30);
     const details=[];
     if(hasMileage)details.push(mileageLeft<=0?`Пробег ${fmt(t.mileage)} км достигнут`:`осталось ${fmt(mileageLeft)} км`);
     if(hasDate)details.push(dateDays<0?`срок прошёл ${Math.abs(dateDays)} дн. назад`:dateDays===0?"срок сегодня":`дата ${dateFmt(t.date)}`);
     items.push({icon:overdue?"!":"＋",title:t.title,desc:details.length?details.join(" · "):(t.note||"Дополнительная работа от дилера"),state:overdue?"Просрочено":soon?"Скоро":"Запланировано",cls:overdue||soon?"warn":"ok"});
   });
 }
 const recent=lastService();items.push({icon:"▤",title:"История обслуживания",desc:recent?`${recent.title} · ${fmt(recent.mileage)} км.`:"Добавьте первую запись, чтобы хранить работы, стоимость и рекомендации.",state:recent?"Есть запись":"Пока пусто",cls:recent?"ok":""});
 $("dueCards").innerHTML=items.map(x=>`<article class="due-card ${x.cls}"><div class="due-icon">${x.icon}</div><h3>${x.title}</h3><p>${x.desc}</p><span class="due-state">${x.state}</span></article>`).join("");
}
function renderMilestones(){
 const m=Number(state.vehicle.mileage)||0;
 $("milestoneList").innerHTML=intervals.slice(0,6).map(x=>{const done=m>=x.km;return `<div class="milestone"><div class="mile-number">${fmt(x.km)}</div><div class="mile-info"><strong>Плановое обслуживание</strong><small>${x.months} мес. эксплуатации</small></div><div class="mile-state ${done?"done":""}">${done?"Пробег пройден":"Предстоит"}</div></div>`;}).join("");
}
function renderPrices(){$("priceGrid").innerHTML=priceData.map(x=>`<div class="price-item"><small>ТО-${fmt(x.km/1000)}</small><strong>${fmtMoney(x.price)}</strong><span>из исходной таблицы</span></div>`).join("");}
function taskAt(task,index){if(task.note)return index+1===task.special||!task.special?task.note:null;if(task.pattern)return (index+1)%task.pattern[1]===0?"Замена": "Проверка";if(task.every)return task.code==="R"?"Замена":task.code==="L"?"Смазка":"Проверка";return task.code==="R"?"Замена":task.code==="L"?"Смазка":"Проверка";}
function taskApplies(task,index){if(task.note){if(task.special)return index+1===task.special;return true;}if(task.pattern)return (index+1)%task.pattern[1]===0||task.pattern[0]===1;if(task.every)return true;return true;}
function renderSchedule(){
 const groups=[{name:"Двигатель и жидкости",match:t=>!t.group},{name:"Тяговая батарея",match:t=>t.group==="Тяговая батарея"},{name:"Система электропривода",match:t=>t.group==="Система электропривода"},{name:"Тормозная система",match:t=>t.group==="Тормозная система"},{name:"Кондиционирование",match:t=>t.group==="Система кондиционирования"},{name:"Электрооборудование",match:t=>t.group==="Электрооборудование"},{name:"Шасси и кузов",match:t=>t.group==="Шасси и кузов"}];
 $("scheduleList").innerHTML=intervals.map((it,idx)=>{const rows=groups.map(g=>({name:g.name,tasks:tasks.filter(g.match).filter(t=>taskApplies(t,idx))})).filter(g=>g.tasks.length);const allKey=`${it.km}`;const checked=!!state.checkmarks[allKey];return `<article class="schedule-card panel"><div class="schedule-top"><h3>ТО-${idx+1}</h3><span class="km">${fmt(it.km)} км · ${it.months} мес.</span></div><ul>${rows.map(g=>g.tasks.map(t=>{let code=t.code==="I/R"?(idx%2===1?"R":"I"):t.code;let label=t.note?(t.name+" — "+t.note):t.name;if(t.pattern)label=t.name+(idx%2===1?" — замена по периодичности":" — проверка");return `<li><span class="code">${esc(code)}</span><span>${esc(label)}</span></li>`;}).join("")).join("")}</ul><button class="mark-btn" data-mark="${it.km}">${checked?"✓ ТО отмечено в чек-листе":"Отметить ТО выполненным"}</button></article>`;}).join("");
 document.querySelectorAll("[data-mark]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.mark;state.checkmarks[k]=!state.checkmarks[k];saveState();renderSchedule();showToast(state.checkmarks[k]?"Отметка сохранена":"Отметка снята");}));
}
function renderCustomTasks(){
 const list=[...(state.customTasks||[])].sort((a,b)=>Number(a.mileage||Infinity)-Number(b.mileage||Infinity)||(a.date||"").localeCompare(b.date||""));
 if(!list.length){$("customTaskList").innerHTML='<div class="empty-state">Пока нет дополнительных работ. Добавьте рекомендацию дилера — например, на 12 000 или 18 000 км.</div>';return;}
 const current=Number(state.vehicle.mileage)||0;
 $("customTaskList").innerHTML=list.map(t=>{
   const dueMileage=t.mileage!==""&&t.mileage!=null?Number(t.mileage):null;
   const overdue=!t.done&&dueMileage!==null&&current>=dueMileage;
   const meta=[dueMileage!==null?`Пробег: ${fmt(dueMileage)} км${overdue?" · срок наступил":""}`:"Пробег не задан",t.date?`Дата: ${dateFmt(t.date)}`:"",t.note||""].filter(Boolean).join(" · ");
   return `<article class="custom-task-item ${t.done?"done":""}"><input type="checkbox" data-custom-done="${esc(t.id)}" ${t.done?"checked":""} aria-label="Отметить работу выполненной"><div><h4>${esc(t.title)}</h4><p>${esc(meta)}</p>${t.done?'<p style="color:var(--green);margin-top:5px">✓ Выполнено</p>':overdue?'<p style="color:var(--amber);margin-top:5px">Пора выполнить</p>':""}</div><div class="task-actions"><button class="small-btn" data-custom-edit="${esc(t.id)}">Изменить</button><button class="small-btn" data-custom-delete="${esc(t.id)}">Удалить</button></div></article>`;
 }).join("");
 document.querySelectorAll("[data-custom-done]").forEach(el=>el.addEventListener("change",()=>{const t=state.customTasks.find(x=>x.id===el.dataset.customDone);if(!t)return;t.done=el.checked;t.completedAt=t.done?dateNow():"";saveState();renderCustomTasks();showToast(t.done?"Работа отмечена выполненной":"Отметка о выполнении снята");}));
 document.querySelectorAll("[data-custom-edit]").forEach(b=>b.addEventListener("click",()=>{const t=state.customTasks.find(x=>x.id===b.dataset.customEdit);if(!t)return;const title=prompt("Название работы:",t.title);if(title===null)return;if(!title.trim()){showToast("Название не может быть пустым");return;}const mileage=prompt("Пробег, км (оставьте пустым, если не задан):",t.mileage??"");if(mileage===null)return;if(mileage.trim()!==""&&(!Number.isFinite(Number(mileage))||Number(mileage)<0)){showToast("Проверьте пробег");return;}const date=prompt("Дата в формате ГГГГ-ММ-ДД (необязательно):",t.date||"");if(date===null)return;t.title=title.trim();t.mileage=mileage.trim()===""?"":Number(mileage);t.date=date.trim();saveState();renderCustomTasks();showToast("Дополнительная работа обновлена");}));
 document.querySelectorAll("[data-custom-delete]").forEach(b=>b.addEventListener("click",()=>{const t=state.customTasks.find(x=>x.id===b.dataset.customDelete);if(!t)return;if(!confirm(`Удалить дополнительную работу «${t.title}»?`))return;state.customTasks=state.customTasks.filter(x=>x.id!==t.id);saveState();renderCustomTasks();showToast("Работа удалена");}));
}
$("customTaskForm").addEventListener("submit",e=>{
 e.preventDefault();
 const title=$("customTaskTitle").value.trim(),mileage=$("customTaskMileage").value,date=$("customTaskDate").value,note=$("customTaskNote").value.trim();
 if(!title){showToast("Укажите название работы");return;}
 state.customTasks=state.customTasks||[];
 state.customTasks.push({id:`task-${Date.now()}-${Math.random().toString(16).slice(2)}`,title,mileage:mileage===""?"":Number(mileage),date,note,done:false,createdAt:dateNow(),completedAt:""});
 saveState();$("customTaskForm").reset();renderCustomTasks();renderDue();showToast("Дополнительная работа добавлена");
});
function renderHistory(){
 const q=($("historySearch").value||"").toLowerCase(),f=$("historyFilter").value;
 const list=[...state.services].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||Number(b.mileage)-Number(a.mileage)).filter(s=>(f==="all"||(f==="scheduled"?s.type==="scheduled":s.type!=="scheduled"))&&[s.title,s.shop,s.notes,s.type].join(" ").toLowerCase().includes(q));
 if(!list.length){$("historyList").innerHTML=`<div class="empty-state">${state.services.length?"По вашему запросу ничего не найдено.":"Журнал пока пуст. Нажмите «Добавить», чтобы сохранить первое обслуживание."}</div>`;return;}
 $("historyList").innerHTML=list.map(s=>`<article class="history-item panel"><div class="history-date">${dateFmt(s.date)}<strong>${fmt(s.mileage)} км</strong></div><div class="history-main"><h3>${esc(s.title)}</h3><p>${esc(s.notes||s.shop||"Без дополнительных заметок")}</p><div class="history-meta"><span>${esc(typeLabel(s.type))}</span>${s.shop?`<span>${esc(s.shop)}</span>`:""}</div><div class="history-actions"><button class="small-btn" data-edit="${s.id}">Изменить</button><button class="small-btn" data-delete="${s.id}">Удалить</button></div></div><div class="history-cost">${s.cost!==""&&s.cost!=null?esc(fmtMoney(s.cost)):"—"}</div></article>`).join("");
 document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openService(b.dataset.edit)));
 document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteService(b.dataset.delete)));
}
function typeLabel(t){return ({scheduled:"Плановое ТО",repair:"Ремонт",consumables:"Расходники",inspection:"Осмотр / диагностика",other:"Другое"})[t]||"Другое";}
function fillSettings(){$("settingMileage").value=state.vehicle.mileage??0;$("startDate").value=state.vehicle.startDate||"";$("lastServiceDate").value=state.vehicle.lastServiceDate||"";$("lastServiceMileage").value=state.vehicle.lastServiceMileage??"";$("vehicleNote").value=state.vehicle.note||"";}
function openService(id=null,defaults={}){
 const s=id?state.services.find(x=>x.id===id):null;
 $("serviceForm").reset();$("serviceId").value=s?s.id:"";$("dialogTitle").textContent=s?"Изменить запись":"Новая запись";
 $("serviceType").value=s?.type||defaults.type||"scheduled";$("serviceDate").value=s?.date||dateNow();$("serviceMileage").value=s?.mileage??defaults.mileage??state.vehicle.mileage??0;$("serviceTitle").value=s?.title||defaults.title||"";$("serviceCost").value=s?.cost??"";$("serviceShop").value=s?.shop||"";$("serviceNotes").value=s?.notes||"";
 $("serviceDialog").showModal();
}
function deleteService(id){const s=state.services.find(x=>x.id===id);if(!s)return;if(!confirm(`Удалить запись «${s.title}»?`))return;state.services=state.services.filter(x=>x.id!==id);saveState();render();showToast("Запись удалена");}
function switchTab(name){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$("view-"+name).classList.remove("hidden");if(name==="history")renderHistory();window.scrollTo({top:0,behavior:"smooth"});}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
["addServiceTop","quickAdd","addServiceHistory"].forEach(id=>$(id).addEventListener("click",()=>openService()));
$("editMileage").addEventListener("click",()=>{const v=prompt("Введите текущий пробег автомобиля, км:",String(state.vehicle.mileage||""));if(v===null)return;const n=Number(v);if(!Number.isFinite(n)||n<0){showToast("Введите корректный пробег");return;}state.vehicle.mileage=Math.round(n);saveState();render();showToast("Пробег обновлён");});
$("closeDialog").addEventListener("click",()=>$("serviceDialog").close());$("cancelDialog").addEventListener("click",()=>$("serviceDialog").close());
$("serviceForm").addEventListener("submit",e=>{e.preventDefault();const id=$("serviceId").value;const item={id:id||`${Date.now()}-${Math.random().toString(16).slice(2)}`,type:$("serviceType").value,date:$("serviceDate").value,mileage:Number($("serviceMileage").value),title:$("serviceTitle").value.trim(),cost:$("serviceCost").value===""?"":Number($("serviceCost").value),shop:$("serviceShop").value.trim(),notes:$("serviceNotes").value.trim()};if(!item.title){showToast("Укажите выполненные работы");return;}if(id)state.services=state.services.map(s=>s.id===id?item:s);else state.services.push(item);state.vehicle.mileage=Math.max(Number(state.vehicle.mileage)||0,item.mileage);if(item.type==="scheduled"){state.vehicle.lastServiceDate=item.date;state.vehicle.lastServiceMileage=item.mileage;}saveState();$("serviceDialog").close();render();showToast(id?"Запись обновлена":"Запись сохранена");});
$("vehicleForm").addEventListener("submit",e=>{e.preventDefault();const n=Number($("settingMileage").value);if(!Number.isFinite(n)||n<0){showToast("Проверьте пробег");return;}state.vehicle={mileage:Math.round(n),startDate:$("startDate").value,lastServiceDate:$("lastServiceDate").value,lastServiceMileage:$("lastServiceMileage").value===""?"":Number($("lastServiceMileage").value),note:$("vehicleNote").value.trim()};saveState();render();showToast("Параметры автомобиля сохранены");});
$("historySearch").addEventListener("input",renderHistory);$("historyFilter").addEventListener("change",renderHistory);
$("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString(),app:"Belgee X80 Service Log"},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`belgee-x80-backup-${dateNow()}.json`;a.click();URL.revokeObjectURL(url);showToast("Резервная копия подготовлена");});
$("importFile").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!obj.vehicle||!Array.isArray(obj.services))throw new Error("invalid");if(!confirm("Импорт заменит текущие данные приложения. Продолжить?"))return;const importedTasks=Array.isArray(obj.customTasks)?[...obj.customTasks]:[];if(!importedTasks.some(t=>t.id===dealerTo3Preset.id))importedTasks.unshift({...dealerTo3Preset});state={...defaultState,...obj,vehicle:{...defaultState.vehicle,...obj.vehicle},services:obj.services,checkmarks:obj.checkmarks||{},customTasks:importedTasks,dealerPresetInitialized:true};saveState();render();showToast("Данные импортированы");}catch(err){showToast("Не удалось прочитать резервную копию");}finally{e.target.value="";}});
$("resetData").addEventListener("click",()=>{if(!confirm("Точно удалить все записи и настройки? Перед сбросом рекомендуется экспортировать резервную копию."))return;localStorage.removeItem(STORAGE_KEY);state=structuredClone(defaultState);render();showToast("Данные сброшены");});
$("installHint").addEventListener("click",()=>alert("Чтобы установить на iPhone: откройте сайт в Safari по HTTPS → «Поделиться» → «На экран Домой» → «Добавить». Для публикации используйте GitHub Pages, Netlify или другой HTTPS-хостинг."));
if("serviceWorker" in navigator && (location.protocol==="https:"||location.hostname==="localhost"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
