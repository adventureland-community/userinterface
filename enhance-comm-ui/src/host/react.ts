import "./globals";

export function getReact(): any {
  const React = window.React;
  if (!React) {
    throw new Error("window.React is not available");
  }
  return React;
}

export function getReactDOM(): any {
  const ReactDOM = window.ReactDOM;
  if (!ReactDOM) {
    throw new Error("window.ReactDOM is not available");
  }
  return ReactDOM;
}

/** React.createElement shorthand — no JSX. */
export function e(
  type: any,
  props?: any,
  ...children: any[]
): any {
  const React = getReact();
  return React.createElement(type, props, ...children);
}
