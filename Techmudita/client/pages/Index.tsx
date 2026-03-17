import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { LandingAnimation } from '@/components/LandingAnimation';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { IdeaGraphicsSection } from '@/components/sections/IdeaGraphicsSection';
import { ProductsSection } from '@/components/sections/ProductsSection';
import { VisionSection } from '@/components/sections/VisionSection';

export default function Index() {
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    // Check if landing animation has been shown before
    const hasSeenLanding = localStorage.getItem('techmudita-landing-shown');
    if (hasSeenLanding) {
      setShowLanding(false);
    }
  }, []);

  const handleLandingComplete = () => {
    setShowLanding(false);
    localStorage.setItem('techmudita-landing-shown', 'true');
  };

  if (showLanding) {
    return <LandingAnimation onComplete={handleLandingComplete} />;
  }

  return (
    <Layout>
      <HeroSection />
      <AboutSection />
      <IdeaGraphicsSection />
      <ProductsSection />
      <VisionSection />
    </Layout>
  );
}
