/* Category-based season presets. All appearance changes settle immediately on selection. */
window.WorldState=(()=>{
 const seasons={
  summer:{label:'夏',conifer:'#244d3c',deciduous:['#427839','#649342','#83a348'],grass:'#65874a',shrub:'#587f3c',mountain:'#777e73',water:'#08688e',sky:'#5ba6d1',sun:{color:'#ffdfa3',intensity:1},particles:{count:0,kind:'none'},villageRoof:'#4c5552',windowLight:'#ffbc64',snow:0,snowLine:34},
  autumn:{label:'秋',conifer:'#264b3e',deciduous:['#a83f27','#cf702c','#dba740'],grass:'#a18c4c',shrub:'#a57432',mountain:'#9b875e',water:'#08688f',sky:'#70b0d3',sun:{color:'#ffd096',intensity:.96},particles:{count:42,kind:'leaves'},villageRoof:'#655b48',windowLight:'#ffb258',snow:0,snowLine:32},
  winter:{label:'冬',conifer:'#3a5d55',deciduous:['#8b9385','#a1aaa0','#b7bdb2'],grass:'#c9d5d4',shrub:'#a9b8ad',mountain:'#86969c',water:'#296b88',sky:'#94bdd3',sun:{color:'#ffddbb',intensity:.90},particles:{count:64,kind:'snow'},villageRoof:'#e3e8e5',windowLight:'#ffa94b',snow:.83,snowLine:10},
  spring:{label:'春',conifer:'#29533f',deciduous:['#68a34b','#8ab65b','#a5bd6b'],grass:'#7d9b56',shrub:'#8cab58',mountain:'#7d8b72',water:'#13748f',sky:'#78b9d9',sun:{color:'#ffe3b4',intensity:.96},particles:{count:12,kind:'petals'},villageRoof:'#55645a',windowLight:'#ffbd70',snow:.08,snowLine:31}
 };
 const dormant={enabled:false,count:0,palette:[],speciesMix:[],minScale:.75,maxScale:1,clusterCount:0,clusterRadius:0,windStrength:0,bloomAmount:0,stem:'#405b32'};
 seasons.spring.flower={enabled:true,count:288,palette:['#fff5df','#f6dfa0','#efd1dc','#cdc2ee','#b6d6ee'],speciesMix:['daisy','buttercup','campanula','lavender'],minScale:.78,maxScale:1.13,clusterCount:12,clusterRadius:1.48,windStrength:.016,bloomAmount:.86,stem:'#629048'};
 seasons.summer.flower={enabled:true,count:198,palette:['#f9f1db','#efc154','#ea9e82','#9d9bd3'],speciesMix:['daisy','buttercup','campanula','lavender'],minScale:.88,maxScale:1.25,clusterCount:9,clusterRadius:1.38,windStrength:.013,bloomAmount:1.06,stem:'#3c6638'};
 seasons.autumn.flower={...dormant};seasons.winter.flower={...dormant};
 function create(){
  let mode='auto',season='summer';
  function sample(date=new Date()){
   const hours=mode==='auto'?date.getHours()+date.getMinutes()/60:mode==='day'?12:mode==='dusk'?18.0:0;
   const elevation=Math.sin((hours-6)/24*Math.PI*2),night=mode==='dusk'?.25:1-Math.max(0,Math.min(1,(elevation+.12)/.38));
   return {hours,night,elevation,dusk:mode==='dusk'?1:Math.exp(-Math.pow(elevation/.20,2))*(1-night),season:seasons[season]};
  }
  return {sample,setMode(value){if(['auto','day','dusk','night'].includes(value))mode=value;},setSeason(value){if(seasons[value])season=value;},get mode(){return mode;},get season(){return season;},seasons};
 }
 return {create,seasons};
})();
