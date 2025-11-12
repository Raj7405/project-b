import Navbar from '@/components/Navbar'
import Login from '@/components/Login'

export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <section className="hero-mask-image w-full h-auto">
        <div className="container mx-auto px-4 py-18">
          <Login />
        </div>
      </section>
    </div>
  )
}

