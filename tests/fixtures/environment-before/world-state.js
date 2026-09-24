/* Independent season and clock state. All environment parameters live here. */
window.WorldState=(()=>{
 const seasons={
  spring:{label:'春',foliage:'#4f8b55',foliageAccent:'#79aa60',foliageGold:'#d6b66b',ground:'#86a96c',mountain:'#718d8e',snowLine:20,snow:.06,light:1.05,sky:'#78c2e7',water:'#1380a5',reflection:'#8ed6eb',warmth:.62,particles:28,particleKind:'petals'},
  summer:{label:'夏',foliage:'#256c45',foliageAccent:'#4e9450',foliageGold:'#86a84f',ground:'#75a45b',mountain:'#667f82',snowLine:26,snow:0,light:1.12,sky:'#55afe0',water:'#087ba9',reflection:'#73ccea',warmth:.78,particles:0,particleKind:'none'},
  autumn:{label:'秋',foliage:'#a6492f',foliageAccent:'#d8752f',foliageGold:'#e2ad3f',ground:'#a98b4f',mountain:'#9a7149',snowLine:22,snow:.02,light:1.05,sky:'#69b6df',water:'#0b79a9',reflection:'#79c7e4',warmth:.92,particles:62,particleKind:'leaves'},
  winter:{label:'冬',foliage:'#315b52',foliageAccent:'#4e7569',foliageGold:'#769487',ground:'#d8e3e2',mountain:'#839bae',snowLine:7,snow:.78,light:.96,sky:'#89c1df',water:'#247d9b',reflection:'#a0d4e2',warmth:.42,particles:90,particleKind:'snow'}
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
