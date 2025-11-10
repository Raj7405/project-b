import Navbar from '@/components/Navbar'
import RegistrationPage from '@/components/RegistrationPage'

export default function Registration() {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <section className="hero-mask-image w-full h-auto">
        <div className="container mx-auto px-4 py-18">
          <RegistrationPage />
        </div>
      </section>
    </div>
  )
}

