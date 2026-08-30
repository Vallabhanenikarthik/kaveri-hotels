import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Admin from './pages/Admin'
import Bookings from './pages/Bookings'
import BookRoom from './pages/BookRoom'
import Home from './pages/Home'
import Login from './pages/Login'
import Payments from './pages/Payments'
import PropertyDetail from './pages/PropertyDetail'
import Register from './pages/Register'
import Reviews from './pages/Reviews'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-frame">
          <Navbar />
          <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/properties/:propertyId" element={<PropertyDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/book/:roomId"
                element={
                  <ProtectedRoute>
                    <BookRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <Reviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['manager', 'owner']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </PageTransition>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
