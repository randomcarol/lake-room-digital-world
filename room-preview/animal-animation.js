/* Crossfades are native AnimationActions; movement speed follows action cycle duration. */
window.AnimalAnimation={create(model,clips,definition){
 const mixer=new THREE.AnimationMixer(model),actions={},mapped={};let current=null;
 for(const [state,name] of Object.entries(definition.clipMap)){const clip=THREE.AnimationClip.findByName(clips,name);if(!clip)throw new Error(definition.id+' missing native clip '+name);actions[state]=mixer.clipAction(clip);mapped[state]=clip;}
 if(!actions.idle||!actions[definition.moveState])throw new Error('Missing idle/locomotion clips');
 function play(state,fade=.22){const action=actions[state]||actions.idle;if(action===current)return;action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(current){current.fadeOut(fade);action.fadeIn(fade);}current=action;}
 play('idle',0);
 return {mixer,actions,mapped,play,update(dt){mixer.update(dt);},get action(){return current;},speed(state){const clip=mapped[state]||mapped[definition.moveState];return definition.strideMetres/clip.duration;},dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}};
}};
