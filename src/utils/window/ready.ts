// Hidden WebView2 windows can suspend animation frames. Never wait on RAF alone.
export function waitForWindowPaint() {
  return new Promise<void>(resolve => {
    const timeout = window.setTimeout(resolve, 80);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.clearTimeout(timeout); resolve();
    }));
  });
}
