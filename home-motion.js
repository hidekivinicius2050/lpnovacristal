/* Progressive visual feedback. No changes to catalogue selection or financial rules. */
(() => {
  "use strict";
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set();
  const play = (element, frames, options) => {
    if (motion.matches || !element || typeof element.animate !== "function") return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    return animation;
  };
  const grid = document.querySelector("#cards-grid");
  if (grid && "MutationObserver" in window) {
    let current;
    new MutationObserver(() => {
      current?.cancel();
      current = play(grid, [{ opacity: .45, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 240, easing: "ease-out" });
      play(document.querySelector("#catalogue-result-count"), [{ opacity: .35 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
    }).observe(grid, { childList: true });
  }
  const list = document.querySelector(".process-list");
  const steps = list ? [...list.children] : [];
  if (steps.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const index = steps.indexOf(visible[0].target);
      steps.forEach((step, i) => step.classList.toggle("is-current", i === index));
      list.style.setProperty("--process-progress", String((index + 1) / steps.length));
    }, { rootMargin: "-15% 0px -35% 0px", threshold: .1 });
    steps.forEach(step => observer.observe(step));
  }
  motion.addEventListener("change", () => {
    if (motion.matches) animations.forEach(animation => animation.cancel());
  });
})();
