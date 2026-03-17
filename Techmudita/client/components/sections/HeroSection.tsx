import { ArrowRight } from 'lucide-react';
import { MobileAppMockup } from '@/components/MobileAppMockup';

export const HeroSection = () => {
  return (
    <section className="relative pt-10 pb-20 md:pt-10 md:pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="fade-in-up">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              TechMudita — Building{' '}
              <span className="text-accent">Thoughtful Technology</span> for
              Everyday Living
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              We design and develop focused digital products that solve real-world
              problems with clarity, simplicity, and long-term vision.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <button className="tech-button-primary group">
                <span className="flex items-center gap-2">
                  Explore Products
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="tech-button-secondary">
                View MyStayInn
              </button>
            </div>
          </div>

          {/* Right Side - Mobile Mockup */}
          <div className="hidden lg:flex justify-center items-center fade-in-up" style={{ animationDelay: '0.2s' }}>
            <MobileAppMockup />
          </div>
        </div>

        {/* Floating accent element - visible on small screens */}
        <div className="lg:hidden mt-12 relative h-40 flex items-center justify-center">
          <div className="absolute w-20 h-20 border-2 border-accent/30 rounded-lg rotate-45 animate-pulse" />
          <div className="absolute w-32 h-32 border border-accent/10 rounded-full" />
        </div>
      </div>
    </section>
  );
};
