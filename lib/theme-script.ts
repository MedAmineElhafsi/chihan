/**
 * The theme, decided before the first paint.
 *
 * Inlined into <head> by the root layout and run synchronously, so the page is
 * never drawn in the wrong theme and then flipped. It reads the member's
 * choice from localStorage (`light`, `dark`, or `system`, the default), sets
 * `data-theme` on <html> to the theme that choice resolves to, and creates the
 * page's one theme-color tag with the matching chrome colour.
 *
 * `lib/theme.ts` does the same at runtime when the member changes the setting
 * or, on "system", when the device changes. Keep the two in step.
 */

export const THEME_STORAGE_KEY = "cihan-theme";

/** Browser chrome colours: `--depth-0` of each theme. */
export const THEME_CHROME = { light: "#e1d7c6", dark: "#100e15" } as const;

export const THEME_SCRIPT = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);
var t=d?"dark":"light";
document.documentElement.dataset.theme=t;
var m=document.querySelector('meta[name="theme-color"]');
if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m);}
m.content=${JSON.stringify(THEME_CHROME)}[t];
}catch(e){}})();`;
