import { useEffect, useState } from 'react';

interface Props {
  collapsedOffset?: number;
  bottomNavOffset?: number;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  sheetContentRef?: React.RefObject<HTMLDivElement | null>;
}

export default function DebugSpacing({ collapsedOffset = 0, bottomNavOffset = 0, sheetRef, sheetContentRef }: Props) {
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('debugBottomNavHeight');
      if (stored) setOverride(Number(stored));
      else {
        const css = getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-height').trim();
        if (css) setOverride(Number(css.replace('px', '')));
      }
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (override === null) return;
    document.documentElement.style.setProperty('--bottom-nav-height', `${override}px`);
    try { localStorage.setItem('debugBottomNavHeight', String(override)); } catch (e) {}
  }, [override]);

  const increase = () => setOverride((v) => (v ?? bottomNavOffset) + 4);
  const decrease = () => setOverride((v) => Math.max(0, (v ?? bottomNavOffset) - 4));
  const reset = () => {
    setOverride(null);
    document.documentElement.style.removeProperty('--bottom-nav-height');
    try { localStorage.removeItem('debugBottomNavHeight'); } catch (e) {}
  };

  const computedNav = (() => {
    try {
      const nav = document.querySelector('[data-bottom-nav="true"]') as HTMLElement | null;
      return nav?.getBoundingClientRect().height ?? bottomNavOffset;
    } catch { return bottomNavOffset; }
  })();

  const computedVar = (() => {
    const css = getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-height').trim();
    if (!css) return null;
    return Number(css.replace('px', ''));
  })();

  const sheetPadding = Math.max(8, (computedVar ?? computedNav) - 24);

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
      <div className="bg-white border rounded-lg p-3 shadow-lg text-xs w-52">
        <div className="flex items-center justify-between mb-2">
          <strong className="text-sm">Debug Spacing</strong>
          <button className="text-xs text-gray-500" onClick={reset}>Reset</button>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-gray-500">Measured nav height</div>
          <div className="font-mono text-sm">{computedNav.toFixed(0)}px</div>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-gray-500">CSS var (--bottom-nav-height)</div>
          <div className="font-mono text-sm">{computedVar === null ? 'unset' : `${computedVar}px`}</div>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-gray-500">Effective sheet padding</div>
          <div className="font-mono text-sm">{sheetPadding.toFixed(0)}px</div>
        </div>

        <div className="flex gap-2">
          <button className="px-2 py-1 bg-gray-100 rounded text-sm" onClick={decrease}>–4</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-sm" onClick={() => setOverride((v) => (v ?? bottomNavOffset) + 1)}>+1</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-sm" onClick={increase}>+4</button>
          <button className="px-2 py-1 bg-blue-500 text-white rounded text-sm" onClick={() => {
            // Apply directly to sheet to preview padding if sheetRef present
            if (sheetRef?.current) {
              sheetRef.current.style.paddingBottom = `max(8px, calc(var(--bottom-nav-height, ${(override ?? bottomNavOffset)}px) - 24px))`;
            }
            if (sheetContentRef?.current) {
              // trigger a resize observer by toggling a class
              sheetContentRef.current.style.outline = '1px solid rgba(0,0,0,0.01)';
              setTimeout(() => { sheetContentRef.current!.style.outline = ''; }, 120);
            }
          }}>Apply</button>
        </div>

        <div className="mt-2 text-[10px] text-gray-500">Note: enable by adding <span className="font-mono">?debugSpacing=1</span> to the URL</div>
      </div>
    </div>
  );
}
