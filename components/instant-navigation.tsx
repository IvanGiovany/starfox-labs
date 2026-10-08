// Marks a page that switches instantly instead of cross-fading (the admin,
// settings and sign-in: forms, and the admin's URL tricks, shouldn't be
// animated). The page-transition CSS in globals.css looks for it with :has().
export function InstantNavigation() {
  return <span data-instant-navigation hidden />;
}
