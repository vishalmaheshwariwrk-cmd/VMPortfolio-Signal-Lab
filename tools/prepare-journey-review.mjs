// Generates a temporary, local-only audit page for the built-in browser.
// This page is not part of the portfolio and must be removed after review.
import { readFile, writeFile } from "node:fs/promises";
const source = await readFile("index.html", "utf8");
const axe = await readFile("node_modules/axe-core/axe.min.js", "utf8");
const setup = `<script>
const reviewMode = new URLSearchParams(location.search).get('mode');
if(reviewMode === 'no-webgl') {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type,...args) {
    return type === 'webgl' ? null : original.call(this,type,...args);
  };
}
const reviewErrors=[];
addEventListener('error',event=>reviewErrors.push(event.message));
const reviewFrames={frames:0};
const originalRAF=requestAnimationFrame;
window.requestAnimationFrame=callback=>originalRAF.call(window,time=>{reviewFrames.frames++;callback(time);});
</script>`;
const audit = `<script>${axe.replaceAll("</script", "<\\/script")}</script><script>
addEventListener('load',async()=>{
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
  await document.fonts.ready; await wait(300);
  const results={mode:reviewMode||'normal',width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,errors:reviewErrors};
  const violations=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}});
  results.accessibility=violations.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
  const canvas=document.querySelector('#signal-canvas');
  results.renderer=canvas.dataset.renderer||'static';
  if(reviewMode === 'no-webgl') results.fallbackVisible=getComputedStyle(document.querySelector('.terminal-fallback')).visibility==='visible';
  else {
    const button=document.querySelector('.motion-toggle'); button.click(); await wait(150);
    const before=reviewFrames.frames;await wait(350);
    results.pausedNoFrames=before===reviewFrames.frames;button.click();await wait(150);
    results.resumed=reviewFrames.frames>before;
    if(reviewMode === 'context-loss') {
      const extension=canvas.getContext('webgl').getExtension('WEBGL_lose_context');
      if(extension){extension.loseContext();await wait(150);results.contextLossFallback=!document.body.classList.contains('journey-ready');extension.restoreContext();await wait(500);results.restored=canvas.dataset.renderer==='webgl';}
    }
  }
  const report=document.createElement('pre');report.id='review-results';report.style='position:fixed;inset:85px 12px auto;max-height:70vh;overflow:auto;z-index:100;background:#071015;color:white;padding:20px;font:12px monospace;white-space:pre-wrap';report.textContent=JSON.stringify(results,null,2);document.body.append(report);
});
</script>`;
await writeFile(
  "journey-review.html",
  source
    .replace("<head>", "<head>" + setup)
    .replace("</body>", audit + "</body>"),
);
console.log("Temporary audit ready: http://127.0.0.1:4173/journey-review.html");
