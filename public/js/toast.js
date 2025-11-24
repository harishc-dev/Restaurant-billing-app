window.showToast = function(msg, ms=1500){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(()=>{
    el.classList.add('hidden');
  }, ms);
}
