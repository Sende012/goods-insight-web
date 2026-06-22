import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../api/client'
import MainLayout from '../layouts/MainLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import NewAnalysis from '../pages/NewAnalysis'
import ProductDetail from '../pages/ProductDetail'
import Compare from '../pages/Compare'
import CategoryScan from '../pages/CategoryScan'
import Jobs from '../pages/Jobs'
import CrawlTasks from '../pages/CrawlTasks'
import Reviews from '../pages/Reviews'

/** 需要登录才能访问 */
function RequireAuth() {
  if (!getToken()) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'analysis/new', element: <NewAnalysis /> },
          { path: 'product/:id', element: <ProductDetail /> },
          { path: 'compare', element: <Compare /> },
          { path: 'category', element: <CategoryScan /> },
          { path: 'jobs', element: <Jobs /> },
          { path: 'crawl-tasks', element: <CrawlTasks /> },
          { path: 'reviews', element: <Reviews /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])