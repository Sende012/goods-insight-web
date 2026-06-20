import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import NewAnalysis from '../pages/NewAnalysis'
import ProductDetail from '../pages/ProductDetail'
import Compare from '../pages/Compare'
import CategoryScan from '../pages/CategoryScan'
import Jobs from '../pages/Jobs'

export const router = createBrowserRouter([
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
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])