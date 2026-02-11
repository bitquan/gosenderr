type OverflowEntry = {
  element: Element;
  rect: DOMRect;
};

const getOverflowingElements = (padding = 1) => {
  const viewportWidth = document.documentElement.clientWidth;
  const allElements = Array.from(document.body.querySelectorAll("*"));
  const offenders: OverflowEntry[] = [];

  allElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.right > viewportWidth + padding || rect.left < -padding) {
      offenders.push({ element, rect });
    }
  });

  return offenders;
};

export const startOverflowCheck = () => {
  if (typeof window === "undefined") return;

  const check = () => {
    const offenders = getOverflowingElements();
    if (offenders.length === 0) return;

    console.group("[overflow-check] Elements exceed viewport");
    offenders.forEach(({ element, rect }) => {
      console.log(element, { left: rect.left, right: rect.right });
    });
    console.groupEnd();
  };

  check();
  window.addEventListener("resize", check);
};
