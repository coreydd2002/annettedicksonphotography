export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Galleries", to: "/galleries" },
  { label: "Book Now", to: "/book-now" },
];

// Appended to NAV_LINKS in Header.jsx, only while an admin session is
// active — see src/adminSession.js.
export const ADMIN_NAV_LINK = { label: "Manager", to: "/admin" };

export const SITE = {
  brandName: "Annette Dickson",
  brandSuffix: "Photography",
  email: "hello@annettedickson.photography",
  phone: "(555) 012-3456",
  instagram: "https://www.instagram.com/annettedickson.photo",
};
