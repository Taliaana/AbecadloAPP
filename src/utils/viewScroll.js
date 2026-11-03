export function resetViewScroll(root) {
  // Some school layouts scroll a host panel rather than the browser window.
  for(let node=root;node;node=node.parentElement) {
    if(/auto|scroll/.test(getComputedStyle(node).overflowY)) node.scrollTo({top:0,left:0,behavior:'instant'})
  }
  root.querySelectorAll('.lesson-content, [data-step-scroll]').forEach(node=>node.scrollTo({top:0,left:0,behavior:'instant'}))
  window.scrollTo({top:0,left:0,behavior:'instant'})
}
