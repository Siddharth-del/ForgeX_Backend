import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AdminLayout from '../components/layout/AdminLayout';
import { GuestOnly, RequireAdmin, RequireAuth } from './guards';

const HomePage = lazy(() => import('../pages/Home/HomePage'));
const ProductsPage = lazy(() => import('../pages/Products/ProductsPage'));
const ProductDetailsPage = lazy(() => import('../pages/ProductDetails/ProductDetailsPage'));
const CartPage = lazy(() => import('../pages/Cart/CartPage'));
const CheckoutPage = lazy(() => import('../pages/Checkout/CheckoutPage'));
const OrdersPage = lazy(() => import('../pages/Orders/OrdersPage'));
const OrderDetailsPage = lazy(() => import('../pages/Orders/OrderDetailsPage'));
const ProfilePage = lazy(() => import('../pages/Profile/ProfilePage'));
const LoginPage = lazy(() => import('../pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('../pages/Register/RegisterPage'));
const NotFoundPage = lazy(() => import('../pages/NotFound/NotFoundPage'));

const DashboardPage = lazy(() => import('../pages/Admin/DashboardPage'));
const ProductsAdminPage = lazy(() => import('../pages/Admin/ProductsAdminPage'));
const ProductEditPage = lazy(() => import('../pages/Admin/ProductEditPage'));
const OrdersAdminPage = lazy(() => import('../pages/Admin/OrdersAdminPage'));
const CouponsAdminPage = lazy(() => import('../pages/Admin/CouponsAdminPage'));
const UsersAdminPage = lazy(() => import('../pages/Admin/UsersAdminPage'));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        <Route path="cart" element={<CartPage />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="admin" element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsAdminPage />} />
          <Route path="products/new" element={<ProductEditPage />} />
          <Route path="products/:id/edit" element={<ProductEditPage />} />
          <Route path="orders" element={<OrdersAdminPage />} />
          <Route path="coupons" element={<CouponsAdminPage />} />
          <Route path="users" element={<UsersAdminPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
