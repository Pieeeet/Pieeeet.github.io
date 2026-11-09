// CoolProp 8.x Emscripten ES-module: coolprop.js exporteert `async function Module(...)` als default.
import CoolPropFactory from './coolprop.js';

const $ = s => document.querySelector(s);
const ids = ['Te','Ph','T3','SH','eta','Q'];
const names = [
  'Verdamper uit / compressor in',
  'Compressor uit',
  'Gaskoeler uit',
  'Expansieventiel uit'
];
let CP = null;
let diagram = null;

function val(){ return Object.fromEntries(ids.map(k => [k, +$('#'+k).value])); }
function labels(){
  const v=val();
  $('#vTe').textContent=v.Te+' °C'; $('#vPh').textContent=v.Ph+' bar';
  $('#vT3').textContent=v.T3+' °C'; $('#vSH').textContent=v.SH+' K';
  $('#veta').textContent=v.eta+' %'; $('#vQ').textContent=v.Q+' kW';
}
function P(out,a,av,b,bv){
  const x=CP(out,a,av,b,bv,'CO2');
  if (!Number.isFinite(x) || Math.abs(x)>1e250) throw Error('CoolProp kon deze toestand niet berekenen.');
  return x;
}

async function initCoolProp(){
  $('#engine').textContent='CoolProp WASM laden...';
  const module = await CoolPropFactory({
    locateFile: path => path.endsWith('.wasm') ? new URL('./coolprop.wasm', import.meta.url).href : path
  });
  if (typeof module.PropsSI !== 'function') {
    console.log('CoolProp module exports:', Object.keys(module).sort());
    throw new Error('PropsSI ontbreekt in deze CoolProp-build. Beschikbare publieke exports staan in de browserconsole.');
  }
  CP = module.PropsSI.bind(module);
  diagram = buildDiagram();
  $('#engine').textContent='CoolProp WASM · gereed';
  ids.forEach(k => $('#'+k).addEventListener('input', update));
  update();
}

function buildDiagram(){
  const li=[], va=[], iso=[];
  for(let tc=-56.4; tc<30.95; tc+=0.65){
    const T=tc+273.15;
    try{
      const p=P('P','T',T,'Q',0)/1e5;
      li.push([P('H','T',T,'Q',0)/1000,p]);
      va.push([P('H','T',T,'Q',1)/1000,p]);
    } catch(_){ }
  }
  [-40,-30,-20,-10,0,10,20,30,40,60,80,100,120].forEach(tc=>{
    const q=[];
    for(let p=6; p<=160; p*=1.05){
      try{
        const h=P('H','T',tc+273.15,'P',p*1e5)/1000;
        if(h>=70 && h<=680) q.push([h,p]);
      } catch(_){ }
    }
    iso.push({T:tc,points:q});
  });
  const pc=P('pcrit','',0,'',0), Tc=P('Tcrit','',0,'',0);
  let hc;
  try { hc=P('H','T',Tc,'P',pc)/1000; }
  catch(_) { hc=(li.at(-1)?.[0]+va.at(-1)?.[0])/2; }
  return {liquid:li,vapour:va,isotherms:iso,critical:{p:pc/1e5,T:Tc-273.15,h:hc}};
}

function update(){
  labels(); if(!CP) return;
  try{
    const v=val(), Te=v.Te+273.15;
    const p0=P('P','T',Te,'Q',1), ph=v.Ph*1e5, pc=P('pcrit','',0,'',0);
    if(ph<=pc) throw Error(`Hogedruk moet boven de kritische druk liggen (${(pc/1e5).toFixed(2)} bar).`);
    const T1=Te+v.SH, s1=P('S','T',T1,'P',p0), h1=P('H','T',T1,'P',p0);
    const h2s=P('H','P',ph,'S',s1), h2=h1+(h2s-h1)/(v.eta/100), T2=P('T','P',ph,'H',h2);
    const T3=v.T3+273.15, h3=P('H','T',T3,'P',ph), h4=h3;
    const T4=P('T','P',p0,'H',h4);
    const st=[
      [T1,p0,h1,s1],
      [T2,ph,h2,P('S','P',ph,'H',h2)],
      [T3,ph,h3,P('S','T',T3,'P',ph)],
      [T4,p0,h4,P('S','P',p0,'H',h4)]
    ].map(a=>({T:a[0]-273.15,p:a[1]/1e5,h:a[2]/1000,s:a[3]/1000}));
    const qe=(h1-h4)/1000, w=(h2-h1)/1000;
    if(qe<=0 || w<=0) throw Error('Met deze instellingen ontstaat geen geldig koelproces.');
    const cop=qe/w, md=v.Q/qe, pow=md*w;
    $('#cop').textContent=cop.toFixed(2); $('#power').textContent=pow.toFixed(1)+' kW';
    $('#mdot').textContent=(md*1000).toFixed(1)+' g/s'; $('#qout').textContent=(v.Q+pow).toFixed(1)+' kW';
    $('#states').innerHTML=st.map((s,i)=>`<tr><td><b>${i+1}</b></td><td>${names[i]}</td><td>${s.p.toFixed(2)}</td><td>${s.T.toFixed(2)}</td><td>${s.h.toFixed(2)}</td><td>${s.s.toFixed(4)}</td></tr>`).join('');
    $('#error').style.display='none'; draw(st);
  } catch(e){ $('#error').textContent=e.message; $('#error').style.display='block'; console.error(e); }
}

function draw(st){
  const svg=$('#chart'),W=980,H=590,L=75,R=25,T=25,B=60,x0=70,x1=680,p0=5,p1=170;
  const X=h=>L+(h-x0)/(x1-x0)*(W-L-R), Y=p=>T+(Math.log(p1)-Math.log(p))/(Math.log(p1)-Math.log(p0))*(H-T-B);
  let z='';
  [5,10,20,30,40,60,80,100,120,160].forEach(p=>z+=`<line class="grid" x1="${L}" y1="${Y(p)}" x2="${W-R}" y2="${Y(p)}"/><text class="lab" x="${L-9}" y="${Y(p)+4}" text-anchor="end">${p}</text>`);
  [100,200,300,400,500,600].forEach(h=>z+=`<line class="grid" x1="${X(h)}" y1="${T}" x2="${X(h)}" y2="${H-B}"/><text class="lab" x="${X(h)}" y="${H-B+22}" text-anchor="middle">${h}</text>`);
  z+=`<text class="lab" x="${W/2}" y="${H-15}" text-anchor="middle">specifieke enthalpie h (kJ/kg)</text><text class="lab" x="18" y="${H/2}" transform="rotate(-90 18 ${H/2})" text-anchor="middle">absolute druk p (bar, log)</text>`;
  z+=`<polygon class="sat" points="${[...diagram.liquid,...diagram.vapour.slice().reverse()].map(a=>X(a[0])+','+Y(a[1])).join(' ')}"/>`;
  diagram.isotherms.forEach(o=>{ const q=o.points.filter(a=>a[0]>=x0&&a[0]<=x1&&a[1]>=p0&&a[1]<=p1); if(q.length>2) z+=`<polyline class="iso" points="${q.map(a=>X(a[0])+','+Y(a[1])).join(' ')}"/>`; });
  const c=diagram.critical;
  z+=`<circle class="crit" cx="${X(c.h)}" cy="${Y(c.p)}" r="6"/><text class="lab" x="${X(c.h)+9}" y="${Y(c.p)-8}">kritisch punt</text>`;
  z+=`<polygon class="cycle" points="${st.map(s=>X(s.h)+','+Y(s.p)).join(' ')}"/>`;
  st.forEach((s,i)=>z+=`<circle class="pt" cx="${X(s.h)}" cy="${Y(s.p)}" r="10"/><text class="pttext" x="${X(s.h)}" y="${Y(s.p)+4}" text-anchor="middle">${i+1}</text>`);
  svg.innerHTML=z;
}

labels();
initCoolProp().catch(e=>{
  $('#engine').textContent='CoolProp WASM · fout'; $('#error').style.display='block';
  $('#error').textContent='CoolProp kon niet worden geladen: '+e.message; console.error(e);
});
