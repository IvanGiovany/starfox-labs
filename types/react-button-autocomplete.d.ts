import "react";

// `autoComplete="off"` on a <button>. React renders it as the `autocomplete`
// attribute, but its types only list it for inputs and forms. We need it on
// buttons outside a form: otherwise Firefox, after a reload or Back, gives a
// button that was disabled and enabled again during the visit's "enabled"
// state to whatever button is in that position in the new HTML, which removes
// a `disabled` the server rendered (and React reports a hydration mismatch).
// Inside our forms, `autoComplete="off"` on the <form> covers every control.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match React's own declaration
  interface ButtonHTMLAttributes<T> {
    autoComplete?: "off" | undefined;
  }
}
