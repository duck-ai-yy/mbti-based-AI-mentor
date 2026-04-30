import { Hero } from '@/components/landing/Hero';
import { ContrastDemo } from '@/components/landing/ContrastDemo';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-50">
      <div className="bg-gradient-to-b from-white to-neutral-50">
        <Hero />
      </div>
      <ContrastDemo />
      <Footer />
    </main>
  );
}
