// ui/buttons.js - simple on-screen buttons for touch/small screens (and desktop)
const containerId = 'ui-buttons-overlay';
function ensureContainer(){
  let el = document.getElementById(containerId);
  if(el) return el;
  el = document.createElement('div');
  el.id = containerId;
  const isTouch = (navigator.maxTouchPoints&&navigator.maxTouchPoints>0) || ('ontouchstart' in window);
  el.style.position = 'fixed';
  el.style.left = '12px';
  el.style.bottom = '12px';
  el.style.display = 'flex';
  el.style.flexDirection = 'row';
  el.style.gap = '10px';
  el.style.zIndex = '1000';
  el.style.pointerEvents = 'auto';
  el.style.touchAction = 'manipulation';
  document.body.appendChild(el);
  // responsive: collapse or enlarge based on viewport
  const applySize = ()=>{
    const vw = Math.min(window.innerWidth, window.innerHeight);
    const base = vw<=480? 50 : vw<=768? 46 : 42;
    el.querySelectorAll('button').forEach(btn=>{
      const v = btn.dataset.variant;
      if(v === 'wide') return; // keep custom-sized buttons intact
      if(v === 'pill'){
        btn.style.height = base+'px';
        btn.style.minWidth = Math.round(base*1.6)+'px';
        btn.style.padding = '0 12px';
        btn.style.fontSize = (base*0.40)+'px';
        btn.style.borderRadius = (base*0.28)+'px';
        return;
      }
      btn.style.width = btn.style.height = base+'px';
      btn.style.fontSize = (base*0.42)+'px';
      btn.style.borderRadius = (base*0.24)+'px';
    });
  };
  const ro = new ResizeObserver(applySize); ro.observe(document.documentElement);
  el._applySize = applySize;
  return el;
}

function makeButton({label, title, onClick, onDown, onUp, variant}){
  const b = document.createElement('button');
  b.textContent = label;
  b.title = title||label;
  if(variant) b.dataset.variant = variant;
  b.style.width='44px'; b.style.height='44px'; b.style.border='1px solid #26384f'; b.style.background='rgba(20,28,40,0.8)'; b.style.color='#b7f3ff';
  b.style.borderRadius='10px'; b.style.fontFamily='system-ui, sans-serif'; b.style.fontWeight='600'; b.style.cursor='pointer'; b.style.userSelect='none';
  b.style.boxShadow='0 2px 8px rgba(0,0,0,0.3)';
  if(variant==='wide'){ b.style.width='220px'; b.style.height='70px'; b.style.fontSize='24px'; b.style.borderRadius='14px'; }
  if(variant==='pill'){ b.style.width='auto'; b.style.height='44px'; b.style.padding='0 14px'; b.style.borderRadius='14px'; }
  b.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); onClick?.(); });
  // hold semantics
  if(onDown||onUp){
    b.addEventListener('pointerdown', (e)=>{ e.preventDefault(); e.stopPropagation(); onDown?.(); });
    const end = (e)=>{ if(onUp){ onUp(); } };
    b.addEventListener('pointerup', (e)=>{ e.preventDefault(); e.stopPropagation(); end(e); });
    b.addEventListener('pointerleave', (e)=>{ e.preventDefault(); e.stopPropagation(); end(e); });
    b.addEventListener('touchend', (e)=>{ e.preventDefault(); e.stopPropagation(); end(e); }, {passive:false});
  } else {
    b.addEventListener('touchend', (e)=>{ e.preventDefault(); e.stopPropagation(); onClick?.(); }, {passive:false});
  }
  return b;
}

function clear(el){ while(el.firstChild) el.removeChild(el.firstChild); }

export const uiButtons = {
  show(buttons, opts={}){
    const el = ensureContainer();
    clear(el);
    // position
    const pos = opts.position || 'bottom-left';
    el.style.top = el.style.right = el.style.bottom = el.style.left = '';
    el.style.transform = '';
    if(pos==='bottom-left'){ el.style.left='12px'; el.style.bottom='12px'; }
    else if(pos==='bottom-right'){ el.style.right='12px'; el.style.bottom='12px'; }
    else if(pos==='top-left'){ el.style.left='12px'; el.style.top='12px'; }
    else if(pos==='top-right'){ el.style.right='12px'; el.style.top='12px'; }
    else if(pos==='center'){ el.style.left='50%'; el.style.top='50%'; el.style.transform='translate(-50%, -50%)'; }
    // optional caption
    if(opts.caption){
      const cap = document.createElement('div');
      cap.textContent = opts.caption;
      cap.style.font = '12px system-ui, sans-serif';
      cap.style.color = '#7e9cb0';
      cap.style.marginBottom = '6px';
      cap.style.padding = '2px 6px';
      cap.style.border = '1px solid #1e2f45';
      cap.style.background = 'rgba(14,19,27,0.75)';
      cap.style.borderRadius = '6px';
      el.appendChild(cap);
    }
    for(const btn of buttons){ el.appendChild(makeButton(btn)); }
    el._applySize?.();
    el.style.display = buttons?.length? 'flex':'none';
  },
  clear(){ const el = document.getElementById(containerId); if(el) { clear(el); el.style.display='none'; } }
};
