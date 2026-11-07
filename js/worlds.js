/* EyeQuest game worlds: full-screen animated scenes for Firefly Meadow, Crystal Caves,
   Whispering Library and Star Observatory. Watches the lesson intro and results screens and
   dresses them by game name. It never touches app.js or the game canvas. */
(function(){
'use strict';
var WORLDS={},W=1280,H=720,NS='http://www.w3.org/2000/svg';
function rng(s){return function(){s=(s*16807)%2147483647;return s/2147483647}}
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function grp(p,a){return el('g',a||{},p)}
function vars(e,o){for(var k in o)e.style.setProperty('--'+k,o[k])}
function tw(e,r,lo,hi){e.setAttribute('class','tw');vars(e,{f:(lo+r()*(hi-lo))+'s',d:(-r()*8)+'s'})}
function blade(g,x,base,h,w,fill,lean){
  var tipx=x+lean,tipy=base-h,mx=x+lean*.35;
  el('path',{d:'M'+(x-w)+' '+base+' Q'+mx+' '+(base-h*.55)+' '+tipx+' '+tipy+' Q'+(mx+w*1.6)+' '+(base-h*.5)+' '+(x+w)+' '+base+'Z',fill:fill},g)
}
function spark(p,x,y,s,cls){
  return el('polygon',{points:x+','+(y-s)+' '+(x+s*.22)+','+(y-s*.22)+' '+(x+s)+','+y+' '+(x+s*.22)+','+(y+s*.22)+' '+x+','+(y+s)+' '+(x-s*.22)+','+(y+s*.22)+' '+(x-s)+','+y+' '+(x-s*.22)+','+(y-s*.22),fill:'#fff','class':cls||'glint'},p)
}
function bez(p,t){var u=1-t;return [u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0],u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1]]}

/* ================= 1 MEADOW ================= */
WORLDS.meadow={seed:7,
bg:function(s,r){
  el('rect',{width:W,height:H,fill:'url(#m-sky)'},s);
  el('circle',{cx:700,cy:120,r:130,fill:'#f4e9c8',opacity:.22,filter:'url(#blur40)'},s);
  el('circle',{cx:700,cy:120,r:44,fill:'#f6ecc8'},s);
  el('circle',{cx:686,cy:108,r:8,fill:'#e9dcae'},s);el('circle',{cx:714,cy:136,r:5,fill:'#e9dcae'},s);
  var back=grp(s,{filter:'url(#paint)'});
  for(var i=0;i<150;i++)el('circle',{cx:r()*1300-10,cy:480+r()*70,r:18+r()*34,fill:'#0b0d22'},back);
  [[110,34],[300,26],[930,28],[1110,38],[1230,24]].forEach(function(t){
    var x=t[0],w=t[1];
    el('path',{d:'M'+(x-w/2)+' 740 L'+(x-w/3)+' -10 H'+(x+w/3)+' L'+(x+w/2)+' 740Z',fill:'#0a0b1c'},back);
    for(var i=0;i<130;i++){var a=r()*6.28,d=Math.sqrt(r());el('circle',{cx:x+Math.cos(a)*d*160,cy:150+Math.sin(a)*d*170,r:5+r()*13,fill:r()<.5?'#0a0c1e':'#0f1126'},back)}
  });
  el('ellipse',{cx:640,cy:570,rx:720,ry:90,fill:'#8a6aa8',opacity:.35,filter:'url(#blur40)'},s);
},
fx:function(s,r){
  var i,e;
  for(i=0;i<60;i++){e=el('circle',{cx:r()*W,cy:r()*380,r:.5+r()*.9,fill:'#e6e0ff'},s);tw(e,r,3,7)}
  var g1=grp(s,{'class':'sway'});vars(g1,{t:'7s',d:'0s'});
  var c1=['#2b5a4e','#1f4a48','#3c6a52','#2a5040'];
  for(i=0;i<260;i++)blade(g1,r()*1300-10,740,170+r()*140,2+r()*3,c1[Math.floor(r()*4)],(r()-.5)*45);
  for(i=0;i<44;i++){
    var x=r()*W,top=380+r()*260,lean=(r()-.5)*30;
    el('path',{d:'M'+x+' 740 Q'+(x+lean*.3)+' '+(top+120)+' '+(x+lean)+' '+top,stroke:'#4f7a58',fill:'none','stroke-width':.9,opacity:.7},s);
    var b=grp(s,{});el('circle',{cx:x+lean,cy:top,r:11,fill:'url(#halo)'},b);el('circle',{cx:x+lean,cy:top,r:2.4,fill:'#fffbd0'},b);tw(b,r,2,5);
  }
  var g2=grp(s,{'class':'sway'});vars(g2,{t:'5.5s',d:'-2s'});
  var c2=['#3f7a46','#4c8a4a','#2f6a40','#5a9a50'];
  for(i=0;i<220;i++)blade(g2,r()*1300-10,740,90+r()*110,2.5+r()*3.5,c2[Math.floor(r()*4)],(r()-.5)*40);
  for(i=0;i<34;i++)el('circle',{cx:r()*W,cy:560+r()*130,r:1.5+r()*2.2,fill:r()<.6?'#e8642c':'#ff9a4a'},s);
  for(i=0;i<200;i++){
    e=el('circle',{cx:r()*W,cy:120+Math.pow(r(),.6)*560,r:.8+r()*1.9,fill:'#ffe36a','class':'ff'},s);
    vars(e,{dx:((r()-.5)*180)+'px',dy:((r()-.5)*130)+'px',t:(6+r()*8)+'s',f:(2+r()*4)+'s',d:(-r()*10)+'s'});
  }
  var g3=grp(s,{'class':'sway'});vars(g3,{t:'4s',d:'-1s'});
  var c3=['#12301f','#0e2618','#173a24'];
  for(i=0;i<110;i++)blade(g3,r()*1300-10,750,50+r()*90,4+r()*6,c3[Math.floor(r()*3)],(r()-.5)*40);
}};

/* ================= 2 CAVES ================= */
var caveCache=null;
function caveList(){
  if(caveCache)return caveCache;
  var r=rng(13),L=[];
  function cl(cx,by,n,spread,hmin,hmax,sc,front){
    var gs=['cg1','cg2','cg3','cg1','cg2'];
    for(var i=0;i<n;i++){var t=(i/(n-1))-.5,h=(hmin+r()*(hmax-hmin))*(1-Math.abs(t)*.5)*sc,w=(14+r()*20)*sc;
      L.push({x:cx+t*spread+(r()-.5)*14,y:by+Math.abs(t)*20*sc+(r()-.5)*10,w:w,h:h,a:t*42+(r()-.5)*12,g:gs[Math.floor(r()*5)],front:!!front})}
  }
  cl(210,540,8,300,110,230,1);
  cl(470,566,5,150,60,120,.9);
  cl(1080,545,8,300,110,220,1);
  cl(820,522,5,120,50,100,.85);
  cl(90,700,6,150,150,260,1.3,true);
  cl(1210,710,6,150,150,250,1.3,true);
  caveCache=L;return L;
}
function crystal(p,e){
  var w=e.w,h=e.h,c=grp(p,{transform:'translate('+e.x+' '+e.y+') rotate('+e.a+')'});
  var pts=[[-w/2,0],[-w/2,-h*.78],[0,-h],[w/2,-h*.78],[w/2,0]].map(function(q){return q.join(',')}).join(' ');
  el('polygon',{points:pts,fill:'url(#'+e.g+')',opacity:.92},c);
  el('polygon',{points:(-w/2)+',0 '+(-w/2)+','+(-h*.78)+' 0,'+(-h)+' 0,0',fill:'#fff',opacity:.2},c);
  el('polygon',{points:'0,0 0,'+(-h)+' '+(w/2)+','+(-h*.78)+' '+(w/2)+',0',fill:'#200848',opacity:.28},c);
  el('line',{x1:0,y1:0,x2:0,y2:-h,stroke:'#ffe6ff','stroke-opacity':.45,'stroke-width':.8},c);
  el('polygon',{points:pts,fill:'none',stroke:'#ffd6f8','stroke-opacity':.55,'stroke-width':.9},c);
}
WORLDS.caves={seed:13,
bg:function(s,r){
  var i;
  el('rect',{width:W,height:H,fill:'url(#c-bg)'},s);
  var bk=grp(s,{filter:'url(#paint)'});
  for(i=0;i<110;i++)el('circle',{cx:r()*W,cy:40+r()*480,r:20+r()*46,fill:r()<.5?'#4b2a8a':'#6a3aa8',opacity:.4},bk);
  el('ellipse',{cx:900,cy:300,rx:200,ry:300,fill:'#c8a8ff',opacity:.16,filter:'url(#blur40)'},s);
  el('rect',{x:872,y:90,width:56,height:390,fill:'url(#c-fall)'},s);
  el('rect',{x:850,y:78,width:100,height:24,fill:'#2a1668'},s);
  el('path',{d:'M0 520 C200 480 420 500 640 490 C860 478 1060 500 1280 515 V720 H0Z',fill:'url(#c-pool)'},s);
  caveList().forEach(function(e){if(!e.front)crystal(s,e)});
  var wl=grp(s,{filter:'url(#paint)'});
  el('path',{d:'M0 0 H170 C140 110 190 220 140 330 C110 420 150 520 90 620 C60 680 20 700 0 720Z',fill:'#170a3c'},wl);
  el('path',{d:'M1280 0 H1110 C1140 110 1090 220 1140 330 C1170 420 1130 520 1190 620 C1220 680 1260 700 1280 720Z',fill:'#170a3c'},wl);
  var st=grp(s,{filter:'url(#paint)'});
  for(i=0;i<26;i++){var x=60+i*47+(r()-.5)*20,w=14+r()*20,h=30+r()*110;el('polygon',{points:(x-w)+',-6 '+(x+w)+',-6 '+x+','+h,fill:'#120830'},st)}
},
fx:function(s,r){
  var i,e;
  [[260,300,420,160],[900,420,520,200],[620,560,600,160],[1100,260,380,140]].forEach(function(m,k){
    e=el('ellipse',{cx:m[0],cy:m[1],rx:m[2],ry:m[3],fill:'url(#mist)','class':'mist'},s);vars(e,{t:(22+k*6)+'s',d:(-k*5)+'s'});
  });
  for(i=0;i<14;i++){var x=876+i*4;e=el('line',{x1:x,y1:96,x2:x+(r()-.5)*2,y2:482,stroke:'#fff','stroke-opacity':.4,'stroke-width':1.3,'class':'flow'},s);vars(e,{d:(-r()*2)+'s'})}
  el('ellipse',{cx:900,cy:488,rx:150,ry:52,fill:'url(#haloPink)','class':'pulse'},s);
  for(i=0;i<4;i++){e=el('ellipse',{cx:900,cy:496,rx:80,ry:16,fill:'none',stroke:'#fff','stroke-opacity':.6,'stroke-width':1.2,'class':'ripple'},s);vars(e,{d:(-i*1.4)+'s'})}
  for(i=0;i<46;i++){var y=530+r()*170,xx=60+r()*1160;e=el('line',{x1:xx,y1:y,x2:xx+14+r()*34,y2:y,stroke:'#d0fff4','stroke-opacity':.5,'stroke-width':1.1},s);tw(e,r,2,5)}
  caveList().forEach(function(c){
    var rad=c.a*Math.PI/180,tx=c.x+c.h*Math.sin(rad),ty=c.y-c.h*Math.cos(rad);
    e=spark(s,tx,ty,10+c.w*.3);vars(e,{d:(-r()*6)+'s',t:(3+r()*3)+'s'});
  });
  for(i=0;i<90;i++){e=el('circle',{cx:r()*W,cy:300+r()*420,r:.8+r()*1.7,fill:r()<.5?'#e6d0ff':'#ffd0f4','class':'rise'},s);vars(e,{t:(7+r()*8)+'s',d:(-r()*12)+'s'})}
  for(i=0;i<70;i++){e=el('circle',{cx:r()*W,cy:40+r()*500,r:.7+r()*1.4,fill:'#fff'},s);tw(e,r,2,6)}
},
fg:function(s,r){
  var i;
  caveList().forEach(function(e){if(e.front)crystal(s,e)});
  var rk=grp(s,{filter:'url(#paint)'});
  for(i=0;i<46;i++)el('circle',{cx:i<23?r()*280:1000+r()*300,cy:690+r()*60,r:22+r()*34,fill:'#120830'},rk);
}};

/* ================= 3 LIBRARY ================= */
var BC=['#a8442f','#d49a48','#3d6a7c','#7a4a8a','#e0b04a','#2f6d5a','#c0583a','#8a3a48'];
function shelfSide(s,r,left){
  var g=grp(s,{}),X=function(x){return left?x:W-x};
  el('polygon',{points:X(0)+',110 '+X(300)+',250 '+X(300)+',570 '+X(0)+',720',fill:'#4a2412'},g);
  [140,250,360,470,580,690].forEach(function(y0){
    for(var x=0;x<300;){
      var sc=1-x/640,w=(10+r()*9)*sc*1.5,h=(40+r()*28)*sc*1.7,base=y0+(400-y0)*(x/640);
      el('rect',{x:left?x:X(x)-w,y:base-h,width:w,height:h,fill:BC[Math.floor(r()*BC.length)],opacity:.95},g);
      x+=w+1.5;
    }
    var yb=y0+(400-y0)*(300/640);
    el('polygon',{points:X(0)+','+y0+' '+X(300)+','+yb+' '+X(300)+','+(yb+6)+' '+X(0)+','+(y0+7),fill:'#5a3320'},g);
  });
}
var BR=[[[0,190],[240,40],[520,30],[760,140]],[[1280,110],[1030,230],[860,150],[700,260]],[[120,0],[170,150],[380,200],[560,170]],[[1170,0],[1090,120],[930,110],[800,90]]];
var BW=[36,28,22,20];
WORLDS.library={seed:21,
bg:function(s,r){
  var i;
  el('rect',{width:W,height:H,fill:'url(#l-bg)'},s);
  el('ellipse',{cx:640,cy:70,rx:520,ry:190,fill:'#0a1030'},s);
  var bs=grp(s,{});
  el('rect',{x:440,y:330,width:400,height:200,fill:'#3a1c10'},bs);
  for(var row=0;row<4;row++)for(var x=444;x<836;){var w=5+r()*6,h=22+r()*20;el('rect',{x:x,y:330+row*50+46-h,width:w,height:h,fill:BC[Math.floor(r()*8)]},bs);x+=w+1}
  el('polygon',{points:'420,540 860,540 1280,720 0,720',fill:'url(#l-floor)'},s);
  for(i=-9;i<=9;i++)el('line',{x1:640+i*24,y1:540,x2:640+i*130,y2:720,stroke:'#5a301a','stroke-opacity':.5,'stroke-width':1},s);
  shelfSide(s,r,true);shelfSide(s,r,false);
  var tr=grp(s,{filter:'url(#paint)'});
  el('path',{d:'M0 0 H150 C110 220 170 440 90 720 H0Z',fill:'#5a3018'},tr);
  el('path',{d:'M1280 0 H1130 C1170 220 1110 440 1190 720 H1280Z',fill:'#5a3018'},tr);
  BR.forEach(function(b,k){
    var d='M'+b[0]+' C'+b[1]+' '+b[2]+' '+b[3];
    el('path',{d:d,stroke:'#3a1c0c',fill:'none','stroke-width':BW[k]+5,'stroke-linecap':'round',filter:'url(#paint)'},s);
    el('path',{d:d,stroke:'#8a5426',fill:'none','stroke-width':BW[k],'stroke-linecap':'round',filter:'url(#paint)'},s);
  });
  [[170,340,40],[1110,390,30]].forEach(function(l){
    el('polygon',{points:(l[0]-l[2]*.5)+','+(l[1]-l[2]*.7)+' '+(l[0]+l[2]*.5)+','+(l[1]-l[2]*.7)+' '+(l[0]+l[2]*.8)+','+(l[1]+l[2]*.5)+' '+(l[0]-l[2]*.8)+','+(l[1]+l[2]*.5),fill:'#ffe2a0'},s)});
  el('path',{d:'M40 640 C30 560 110 520 190 530 C270 540 310 590 300 650 L310 720 L30 720Z',fill:'#b8502e',filter:'url(#paint)'},s);
  el('path',{d:'M70 620 C80 580 150 565 230 580',stroke:'#e2784a','stroke-width':6,fill:'none','stroke-linecap':'round'},s);
},
fx:function(s,r){
  var i,e;
  for(i=0;i<70;i++){e=el('circle',{cx:140+r()*1000,cy:r()*220,r:.6+r()*1.1,fill:'#e6ebff'},s);tw(e,r,3,7)}
  e=el('polygon',{points:'540,200 740,200 980,720 300,720',fill:'url(#l-shaft)','class':'shaft'},s);
  BR.forEach(function(b){
    for(var k=0;k<=38;k++){var p=bez(b,k/38),g=grp(s,{});
      el('circle',{cx:p[0],cy:p[1]-14,r:7,fill:'url(#haloWarm)',opacity:.7},g);
      el('circle',{cx:p[0],cy:p[1]-14,r:1.7,fill:'#ffd77a'},g);tw(g,r,2,5)}
  });
  for(i=0;i<110;i++){e=el('circle',{cx:150+r()*980,cy:r()*230,r:.8+r()*1.2,fill:'#ffd77a'},s);tw(e,r,2,6)}
  [[170,340,40],[1110,390,30]].forEach(function(l,k){
    e=el('circle',{cx:l[0],cy:l[1],r:l[2]*3,fill:'url(#haloWarm)','class':'flick'},s);vars(e,{d:(-k*1.3)+'s'})});
  for(i=0;i<70;i++){e=el('circle',{cx:380+r()*520,cy:230+r()*470,r:.8+r()*1.7,fill:'#ffe9c7','class':'drift'},s);vars(e,{dx:((r()-.5)*40)+'px',dy:(-20-r()*60)+'px',t:(7+r()*7)+'s',d:(-r()*10)+'s'})}
  for(i=0;i<3;i++){e=el('circle',{cx:640,cy:430,r:120,fill:'none',stroke:'#ffd9a0','stroke-opacity':.5,'stroke-width':1.5,'class':'ring'},s);vars(e,{d:(-i*1.7)+'s'})}
  for(i=0;i<9;i++){
    var x=300+r()*680,y=200+r()*420;
    e=el('polygon',{points:x+','+y+' '+(x+34)+','+(y-6)+' '+(x+29)+','+(y+34)+' '+(x-5)+','+(y+40),fill:i%2?'#fff0d6':'#ffd9a0',opacity:.92,'class':'pg'},s);
    vars(e,{dx:((r()-.5)*260)+'px',dy:((r()-.5)*160)+'px',t:(8+r()*7)+'s',d:(-r()*10)+'s'});
  }
}};

/* ================= 4 OBSERVATORY ================= */
var CS=[[420,150],[520,110],[640,170],[740,100],[860,180],[780,250]];
WORLDS.obs={seed:31,
bg:function(s,r){
  var i;
  el('rect',{width:W,height:H,fill:'#080b18'},s);
  var sky=grp(s,{'clip-path':'url(#o-clip)'});
  el('rect',{x:60,y:20,width:1160,height:600,fill:'url(#o-sky)'},sky);
  var mw=grp(sky,{transform:'rotate(-20 640 315)'});
  el('ellipse',{cx:640,cy:315,rx:760,ry:90,fill:'#b890ff',opacity:.38,filter:'url(#blur40)'},mw);
  el('ellipse',{cx:660,cy:315,rx:620,ry:52,fill:'#ff9ad0',opacity:.32,filter:'url(#blur18)'},mw);
  el('ellipse',{cx:640,cy:315,rx:520,ry:34,fill:'#ffd9a0',opacity:.5,filter:'url(#blur18)'},mw);
  el('ellipse',{cx:630,cy:314,rx:380,ry:16,fill:'#fff6dc',opacity:.7,filter:'url(#blur8)'},mw);
  el('ellipse',{cx:540,cy:334,rx:300,ry:12,fill:'#0a0820',opacity:.5,filter:'url(#blur8)'},mw);
  el('ellipse',{cx:770,cy:296,rx:260,ry:10,fill:'#0a0820',opacity:.45,filter:'url(#blur8)'},mw);
  for(i=0;i<300;i++){
    var inB=r()<.55,x,y;
    if(inB){var t=(r()-.5)*2*700,off=(r()-.5)*150*r(),a=-20*Math.PI/180;x=640+t*Math.cos(a)-off*Math.sin(a);y=315+t*Math.sin(a)+off*Math.cos(a)}
    else{x=60+r()*1160;y=20+r()*600}
    el('circle',{cx:x,cy:y,r:.4+r()*(inB?1:1.5),fill:r()<.15?'#ffe2b0':'#eef2ff'},sky);
  }
  var mt=grp(sky,{filter:'url(#paint)'});
  el('path',{d:'M60 520 L200 470 L320 510 L480 450 L620 505 L780 460 L940 510 L1080 470 L1220 520 V620 H60Z',fill:'#0e1446'},mt);
  el('path',{d:'M60 560 L240 520 L420 552 L600 515 L800 550 L980 520 L1220 556 V620 H60Z',fill:'#0a0f36'},mt);
  el('path',{d:'M60 592 L300 570 L520 588 L760 568 L1000 586 L1220 574 V620 H60Z',fill:'#060a26'},mt);
  el('ellipse',{cx:640,cy:315,rx:560,ry:300,fill:'none',stroke:'#05060f','stroke-width':28},s);
  el('ellipse',{cx:640,cy:315,rx:548,ry:288,fill:'none',stroke:'url(#o-rim)','stroke-width':5},s);
  el('ellipse',{cx:640,cy:315,rx:582,ry:322,fill:'none',stroke:'#ffd9a0','stroke-opacity':.22,'stroke-width':1.5},s);
  el('rect',{x:0,y:612,width:W,height:108,fill:'#0a0d1c'},s);
  el('ellipse',{cx:640,cy:650,rx:520,ry:34,fill:'#2a3a8a',opacity:.25,filter:'url(#blur18)'},s);
  [80,220,370,520,700,860,1010,1160].forEach(function(x,k){el('rect',{x:x,y:620,width:8+(k%3)*4,height:100,fill:'url(#o-streak)',opacity:.55},s)});
  [[180,590,120,700],[180,590,240,700],[180,590,180,712]].forEach(function(l){el('line',{x1:l[0],y1:l[1],x2:l[2],y2:l[3],stroke:'#0c0e18','stroke-width':7,'stroke-linecap':'round'},s)});
  el('rect',{x:1020,y:626,width:230,height:90,rx:22,fill:'#161a2a'},s);
  el('rect',{x:1040,y:586,width:200,height:56,rx:18,fill:'#1c2134'},s);
  el('rect',{x:934,y:644,width:12,height:16,rx:3,fill:'#ffe2a0'},s);
},
fx:function(s,r){
  var i,e;
  var sky=grp(s,{'clip-path':'url(#o-clip)'});
  var sd=grp(sky,{'class':'sdrift'});
  for(i=0;i<140;i++){e=el('circle',{cx:40+r()*1200,cy:r()*620,r:.5+r()*1.4,fill:r()<.2?'#ffe2b0':'#fff'},sd);tw(e,r,3,8)}
  e=el('polyline',{points:CS.map(function(q){return q.join(',')}).join(' '),fill:'none',stroke:'#ffd9a0','stroke-width':1.3,opacity:.9,pathLength:1,'class':'draw'},sky);
  CS.forEach(function(q,k){var b=grp(sky,{});el('circle',{cx:q[0],cy:q[1],r:16,fill:'url(#haloWarm)'},b);spark(b,q[0],q[1],7,'');el('circle',{cx:q[0],cy:q[1],r:2.4,fill:'#fff6dc'},b);tw(b,r,3,5)});
  [[300,60,0],[700,30,-3.5],[960,110,-6]].forEach(function(p){
    var l=el('line',{x1:p[0],y1:p[1],x2:p[0]+90,y2:p[1]+50,stroke:'url(#shoot)','stroke-width':2.4,'stroke-linecap':'round','class':'shoot'},sky);vars(l,{d:p[2]+'s'})});
  for(i=0;i<26;i++){e=el('circle',{cx:140+r()*1000,cy:570+r()*40,r:1.2,fill:'#ffc878'},sky);tw(e,r,2,5)}
  var tb=grp(s,{'class':'pan'});
  el('rect',{x:70,y:560,width:190,height:28,rx:7,fill:'#10131f',transform:'rotate(-22 180 590)'},tb);
  el('rect',{x:70,y:560,width:190,height:5,fill:'#3a4260',transform:'rotate(-22 180 590)'},tb);
  el('circle',{cx:248,cy:522,r:5,fill:'#ffd9a0'},tb);
  el('circle',{cx:940,cy:652,r:60,fill:'url(#haloWarm)','class':'flick'},s);
}};

/* ================= hooks ================= */
var DEFS=`
<filter id="paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="8"/></filter>
<filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur18" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
<radialGradient id="halo"><stop offset="0" stop-color="#fff6a8"/><stop offset=".3" stop-color="#ffe36a" stop-opacity=".55"/><stop offset="1" stop-color="#ffe36a" stop-opacity="0"/></radialGradient>
<radialGradient id="haloPink"><stop offset="0" stop-color="#ffd0f4"/><stop offset=".35" stop-color="#ff8ad0" stop-opacity=".5"/><stop offset="1" stop-color="#ff8ad0" stop-opacity="0"/></radialGradient>
<radialGradient id="haloWarm"><stop offset="0" stop-color="#fff0c0"/><stop offset=".35" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<radialGradient id="mist"><stop offset="0" stop-color="#d9c8ff" stop-opacity=".4"/><stop offset="1" stop-color="#d9c8ff" stop-opacity="0"/></radialGradient>
<linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb0e4"/><stop offset=".5" stop-color="#ff6fc4"/><stop offset="1" stop-color="#8a3ac8"/></linearGradient>
<linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2a0ff"/><stop offset=".5" stop-color="#c452e0"/><stop offset="1" stop-color="#5a2ab0"/></linearGradient>
<linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b0ff"/><stop offset=".5" stop-color="#8a62ff"/><stop offset="1" stop-color="#3a1f90"/></linearGradient>
<linearGradient id="m-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15123f"/><stop offset=".45" stop-color="#2e2668"/><stop offset=".8" stop-color="#6a4f90"/><stop offset="1" stop-color="#a07aa0"/></linearGradient>
<linearGradient id="c-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120a3a"/><stop offset=".6" stop-color="#2d1a6e"/><stop offset="1" stop-color="#22125a"/></linearGradient>
<linearGradient id="c-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d8ff" stop-opacity=".8"/><stop offset="1" stop-color="#cdb4ff" stop-opacity=".25"/></linearGradient>
<linearGradient id="c-pool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a62d8"/><stop offset=".45" stop-color="#2fc8c0"/><stop offset="1" stop-color="#3a2a90"/></linearGradient>
<linearGradient id="l-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0f26"/><stop offset=".25" stop-color="#231522"/><stop offset=".55" stop-color="#4a2814"/><stop offset="1" stop-color="#8a5222"/></linearGradient>
<linearGradient id="l-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5226"/><stop offset="1" stop-color="#d49a48"/></linearGradient>
<linearGradient id="l-shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></linearGradient>
<linearGradient id="o-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03061c"/><stop offset=".6" stop-color="#101658"/><stop offset="1" stop-color="#3a2a72"/></linearGradient>
<linearGradient id="o-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".5" stop-color="#b8772c"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
<linearGradient id="o-streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc878" stop-opacity=".5"/><stop offset="1" stop-color="#ffc878" stop-opacity="0"/></linearGradient>
<linearGradient id="shoot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
<clipPath id="o-clip"><ellipse cx="640" cy="315" rx="540" ry="280"/></clipPath>`;
function injectDefs(){
  if(document.getElementById('worlds-defs'))return;
  var d=document.createElement('div');d.id='worlds-defs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML='<svg width="0" height="0" style="position:absolute"><defs>'+DEFS+'</defs></svg>';
  document.body.appendChild(d);
}
var ORDER=['meadow','caves','library','obs'];
var TITLES={meadow:'Firefly Meadow',caves:'Crystal Caves',library:'Whispering Library',obs:'Star Observatory'};
var NAMES=[['firefly','meadow'],['crystal','caves'],['whisper','library'],['observatory','obs'],['star','obs'],['shape','caves']];
function unitShift(){
  var m=/#\/lesson\/u(\d+)l/.exec(location.hash);
  return m?(parseInt(m[1],10)-1)%4:0;
}
function detect(t){
  t=(t||'').trim().toLowerCase();
  if(!t)return null;
  var base=2;
  for(var i=0;i<NAMES.length;i++)if(t.indexOf(NAMES[i][0])>-1){base=ORDER.indexOf(NAMES[i][1]);break}
  return ORDER[(base+unitShift())%4];
}
var last=null;
function art(box,world){
  var olds=box.querySelectorAll(':scope > svg.world-art'),i;
  if(!world){for(i=0;i<olds.length;i++)olds[i].remove();delete box.dataset.world;return}
  if(box.dataset.world===world&&olds.length)return;
  for(i=0;i<olds.length;i++)olds[i].remove();
  var Wd=WORLDS[world],svgs=[];
  ['bg','fx','fg'].forEach(function(part,k){
    if(!Wd[part])return;
    var svg=document.createElementNS(NS,'svg');
    svg.setAttribute('class','world-art layer-'+part);svg.setAttribute('viewBox','0 0 '+W+' '+H);
    svg.setAttribute('preserveAspectRatio','xMidYMid slice');svg.setAttribute('aria-hidden','true');
    Wd[part](svg,rng(Wd.seed+k));
    svgs.push(svg);
  });
  for(i=svgs.length-1;i>=0;i--)box.insertBefore(svgs[i],box.firstChild);
  box.dataset.world=world;
}
function split(h){
  if(!h)return;
  var text=h.textContent;
  if(h.dataset.split===text&&h.querySelector('.ch'))return;
  h.dataset.split=text;h.setAttribute('aria-label',text);h.textContent='';
  var words=text.split(' '),n=0;
  words.forEach(function(word,wi){
    var w=document.createElement('span');w.className='w';w.setAttribute('aria-hidden','true');
    for(var k=0;k<word.length;k++){var c=document.createElement('span');c.className='ch';c.style.setProperty('--i',n++);c.textContent=word.charAt(k);w.appendChild(c)}
    h.appendChild(w);
    if(wi<words.length-1)h.appendChild(document.createTextNode(' '));
  });
}
function gameLine(panel,title,name){
  var p=panel.querySelector('.game-name');
  if(!p){p=document.createElement('p');p.className='game-name';panel.insertBefore(p,title)}
  p.textContent=name;
}
function sync(){
  var intro=document.getElementById('intro'),title=document.getElementById('intro-title');
  if(intro&&title){
    var raw=title.textContent,isWT=false,k;
    for(k in TITLES)if(TITLES[k]===raw)isWT=true;
    if(isWT&&intro.dataset.game)raw=intro.dataset.game;else intro.dataset.game=raw;
    var bad=!raw||/something went wrong/i.test(raw);
    var w=bad?null:detect(raw);
    if(!intro.hidden)last=w;
    art(intro,w);
    if(w){
      var wt=TITLES[w],panel=intro.querySelector('.panel');
      if(title.textContent!==wt){gameLine(panel,title,raw);title.textContent=wt}
      split(title);
    }
  }
  var fin=document.getElementById('finish');
  if(fin&&!fin.hidden){art(fin,last);if(last)split(document.getElementById('finish-title'))}
}
var queued=false;
function queue(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;sync()})}
function start(){
  injectDefs();
  var app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(queue).observe(app,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

