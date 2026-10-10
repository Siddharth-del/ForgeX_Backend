import type { ComponentType } from "react";
import { createBrowserRouter, type LoaderFunction } from "react-router";
import RootLayout, { AppFallback, loader as rootLoader } from "@/layouts/RootLayout";
import HomePage, { loader as homeLoader } from "@/pages/HomePage";
import ErrorPage from "@/pages/ErrorPage";
import NotFoundPage from "@/pages/NotFoundPage";

type PageModule = { default: ComponentType; loader?: LoaderFunction };

/** Code-split route: the page's component and loader download the first time it is visited. */
const page = (load: () => Promise<PageModule>) => async () => {
  const m = await load();
  return m.loader ? { Component: m.default, loader: m.loader } : { Component: m.default };
};

export const router = createBrowserRouter([
  {
    // Admin: separate layout, outside the storefront shell. Access is checked in AdminLayout and enforced by the API.
    path: "/admin",
    HydrateFallback: AppFallback,
    lazy: async () => {
      const m = await import("@/layouts/AdminLayout");
      return { Component: m.default, ErrorBoundary: m.AdminError };
    },
    children: [
      { index: true, lazy: page(() => import("@/pages/admin/AdminDashboard")) },
      { path: "orders", lazy: page(() => import("@/pages/admin/AdminOrders")) },
      { path: "orders/:id", lazy: page(() => import("@/pages/admin/AdminOrderDetail")) },
      { path: "products", lazy: page(() => import("@/pages/admin/AdminProducts")) },
      { path: "products/new", lazy: page(() => import("@/pages/admin/AdminProductEdit")) },
      { path: "products/:id", lazy: page(() => import("@/pages/admin/AdminProductEdit")) },
      { path: "coupons", lazy: page(() => import("@/pages/admin/AdminCoupons")) },
      { path: "customers", lazy: page(() => import("@/pages/admin/AdminCustomers")) },
      { path: "*", lazy: page(() => import("@/pages/admin/AdminNotFound")) },
    ],
  },
  {
    path: "/",
    id: "root",
    Component: RootLayout,
    loader: rootLoader,
    HydrateFallback: AppFallback,
    ErrorBoundary: ErrorPage,
    children: [
      {
        // Errors and 404s from any page render inside the site layout.
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: HomePage, loader: homeLoader },
          { path: "collections/:slug", lazy: page(() => import("@/pages/CollectionPage")) },
          { path: "products/:slug", lazy: page(() => import("@/pages/ProductPage")) },
          { path: "build-your-box", lazy: page(() => import("@/pages/BuildYourBoxPage")) },
          { path: "journal", lazy: page(() => import("@/pages/JournalPage")) },
          { path: "journal/:slug", lazy: page(() => import("@/pages/ArticlePage")) },
          { path: "help/:slug", lazy: page(() => import("@/pages/HelpPage")) },
          { path: "about", lazy: page(() => import("@/pages/AboutPage")) },
          { path: "account", lazy: page(() => import("@/pages/AccountPage")) },
          { path: "account/orders/:orderId", lazy: page(() => import("@/pages/OrderPage")) },
          { path: "wishlist", lazy: page(() => import("@/pages/WishlistPage")) },
          { path: "checkout", lazy: page(() => import("@/pages/CheckoutPage")) },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]);
