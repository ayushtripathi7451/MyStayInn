import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export const VisionSection = () => {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.2,
  });

  return (
    <section
      ref={ref}
      className="py-20 md:py-32 relative overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="container mx-auto px-4">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Building an <span className="text-accent">Ecosystem</span>, Not
              Just Apps
            </h2>

            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                MyStayInn is the first step in the TechMudita ecosystem. We are
                building focused platforms that address everyday challenges with
                thoughtful technology and human-centered design.
              </p>

              <p>
                Each product we create is designed to integrate seamlessly into a
                larger ecosystem of interconnected, scalable solutions. Our vision
                is to create a suite of digital products that people and businesses
                can rely on, trust, and grow with.
              </p>

              <p>
                We believe in the power of simplicity, sustainability, and
                thoughtful design to transform how people live and work. The future
                of TechMudita is one where calm, reliable technology is the
                foundation for meaningful human experiences.
              </p>
            </div>

            {/* Vision Timeline/Path */}
            <div className="mt-16 pt-12 border-t border-border">
              <h3 className="text-2xl font-bold mb-8">Our Path Forward</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stagger-item">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 text-accent font-bold mb-4">
                    1
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Today: MyStayInn</h4>
                  <p className="text-sm text-muted-foreground">
                    Revolutionizing hospitality management with simplicity and transparency
                  </p>
                </div>
                <div className="stagger-item">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 text-accent font-bold mb-4">
                    2
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Tomorrow: More Products</h4>
                  <p className="text-sm text-muted-foreground">
                    Expanding into adjacent markets with the same philosophy
                  </p>
                </div>
                <div className="stagger-item">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 text-accent font-bold mb-4">
                    3
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">Future: Ecosystem</h4>
                  <p className="text-sm text-muted-foreground">
                    A connected platform where all our products work together seamlessly
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
