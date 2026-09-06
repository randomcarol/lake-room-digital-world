/* Independent season and clock state. All environment parameters live here. */
window.WorldState=(()=>{
 const seasons={
  spring:{label:'春',foliage:'#52704c',ground:'#788465',mountain:'#74878b',snowLine:18,snow:.10,light:1,sky:'#8fb8d0',particles:0,particleKind:'none'},
  summer:{label:'夏',foliage:'#385b47',ground:'#7a8266',mountain:'#71838a',snowLine:24,snow:0,light:1,sky:'#89b4cf',particles:0,particleKind:'none'},
  autumn:{label:'秋',foliage:'#65704a',ground:'#8c8061',mountain:'#7d8589',snowLine:20,snow:.05,light:.93,sky:'#9fb8c7',particles:14,particleKind:'leaves'},
  winter:{label:'冬',foliage:'#36544c',ground:'#bec9cb',mountain:'#92a4b4',snowLine:6,snow:.72,light:.88,sky:'#a4bdcc',particles:90,particleKind:'snow'}
 };
 function create(){
  let mode='auto',season='summer',hours=12,night=0;
  function sample(date=new Date()){
   hours=mode==='auto'?date.getHours()+date.getMinutes()/60+date.getSeconds()/3600:mode==='day'?12:mode==='dusk'?18.4:0;
   const elevation=Math.sin((hours-6)/24*Math.PI*2);
   night=1-Math.max(0,Math.min(1,(elevation+.12)/.38));
   return {hours,night,elevation,dusk:Math.exp(-Math.pow(elevation/.20,2))*(1-night*.5),season:seasons[season]};
  }
  return {sample,setMode(value){if(['auto','day','dusk','night'].includes(value))mode=value;},setSeason(value){if(seasons[value])season=value;},get mode(){return mode;},get season(){return season;},seasons};
 }
 return {create,seasons};
})();
