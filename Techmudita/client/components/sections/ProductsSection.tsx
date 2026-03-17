import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Users, Home, BarChart3, Lock } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, forAdmin }: { icon: any; title: string; description: string; forAdmin?: boolean }) => {
  return (
    <div className="bg-background rounded-lg p-6 border border-border hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 group">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${forAdmin ? 'bg-accent/20' : 'bg-primary/20'}`}>
        <Icon className={`w-6 h-6 ${forAdmin ? 'text-accent' : 'text-primary'}`} />
      </div>
      <h4 className="font-semibold text-foreground mb-2">{title}</h4>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
};

export const ProductsSection = () => {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.2,
  });

  return (
    <section
      ref={ref}
      id="mystayInn"
      className="py-20 md:py-32 bg-card transition-colors duration-300"
    >
      <div className="container mx-auto px-4">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our <span className="text-accent">Products</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              TechMudita is a parent platform building focused solutions for
              everyday challenges
            </p>
          </div>

          {/* MyStayInnProduct Showcase */}
          <div className="mb-12">
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Left - Description */}
                <div>
                  <h3 className="text-4xl font-bold mb-4">
                    MyStayInn —Smart hospitality &{' '}
                    <span className="text-accent">Stay Management Platform </span> 
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                   MyStayInn is a digital hospitality solution  powered by technology and driven by service excellence, we enable effortless stay discovery, smooth bookings, and hassle-free management for property partners.
                  </p>
                  <button className="tech-button-primary group">
                    <span className="flex items-center gap-2">
                      Learn More
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                </div>

                {/* Right - Dashboard Visualization */}
                <div className="relative h-80 flex items-center justify-center">
                  <svg
                    viewBox="0 0 400 300"
                    className="w-full h-full max-w-sm"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Dashboard frame */}
                    <rect
                      x="20"
                      y="20"
                      width="360"
                      height="260"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-accent"
                      rx="8"
                    />

                    {/* Header */}
                    <rect
                      x="20"
                      y="20"
                      width="360"
                      height="40"
                      fill="currentColor"
                      className="text-accent/20"
                      rx="8"
                    />
                    <text x="40" y="45" className="text-accent text-sm font-semibold" fill="currentColor">
                      MyStayInn Dashboard
                    </text>

                    {/* Grid of cards */}
                    {[
                      { x: 40, y: 80 },
                      { x: 200, y: 80 },
                      { x: 40, y: 160 },
                      { x: 200, y: 160 },
                    ].map((pos, idx) => (
                      <g key={idx}>
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width="140"
                          height="60"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted opacity-40"
                          rx="4"
                        />
                        <line
                          x1={pos.x + 10}
                          y1={pos.y + 20}
                          x2={pos.x + 130}
                          y2={pos.y + 20}
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted opacity-30"
                        />
                        <line
                          x1={pos.x + 10}
                          y1={pos.y + 35}
                          x2={pos.x + 130}
                          y2={pos.y + 35}
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted opacity-20"
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* MyStayInnFeatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* For Admins */}
            <div>
              <h4 className="text-2xl font-bold mb-6 text-accent"> Property Owners</h4>
              <div className="space-y-4">
                <FeatureCard
                  icon={Home}
                  title="Manage Properties"
                  description=" Centralized platform to manage your property digitally."
                  forAdmin
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Track Availability"
                  description="Real-time room availability and booking management"
                  forAdmin
                />
                <FeatureCard
                  icon={Users}
                  title="Handle Tenants"
                  description="Streamlined tenant management and communication tools"
                  forAdmin
                />
              </div>
            </div>

            {/* For Customers */}
            <div>
              <h4 className="text-2xl font-bold mb-6 text-primary">For Customers</h4>
              <div className="space-y-4">
                <FeatureCard
                  icon={Lock}
                  title="Transparent Information"
                  description="Complete details about properties, pricing, and amenities"
                />
                <FeatureCard
                  icon={Users}
                  title="Discover & Compare"
                  description="Easy to browse and compare accommodations in the area of your choice."
                />
                <FeatureCard
                  icon={Home}
                  title="Direct Connection"
                  description="Connect directly with property administrators"
                />
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground mb-6">
              MyStayInn is the first step in the TechMudita ecosystem
            </p>
            <button className="tech-button-primary">Explore MyStayInn</button>
          </div>
        </div>
      </div>
    </section>
  );
};
