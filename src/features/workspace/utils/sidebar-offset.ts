export function sidebarOffset(isMobile: boolean | undefined, state: "collapsed" | "expanded") {
  if (isMobile) return "0px";
  if (state === "collapsed") return "var(--sidebar-width-icon)";
  return "var(--sidebar-width)";
}
