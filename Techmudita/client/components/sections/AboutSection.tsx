import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

export const AboutSection = () => {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.2,
  });

  return (
    <section
      ref={ref}
      id="about"
      className="py-20 md:py-32 bg-card transition-colors duration-300"
    >
      <div className="container mx-auto px-4">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Left Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="text-accent">TechMudita</span>
            </h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>
                TechMudita is a technology company dedicated to creating
                meaningful digital platforms that prioritize usability, trust,
                and scalability.
              </p>
              <p>
                We believe technology should feel calm, intuitive, and reliable
                — not overwhelming.
              </p>
              <p>
                Our products are designed to solve real problems faced by people
                and businesses, with a strong focus on simplicity and long-term
                value.
              </p>
            </div>
          </div>

          {/* Right - Abstract Graphics */}
          <div className="relative h-96 flex items-center justify-center">
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full max-w-md"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background circle */}
              <circle
                cx="200"
                cy="200"
                r="180"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted opacity-20"
              />

              {/* Concentric circles */}
              <circle
                cx="200"
                cy="200"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted opacity-10"
              />
              <circle
                cx="200"
                cy="200"
                r="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted opacity-10"
              />

              {/* Radial lines */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const x2 = 200 + 180 * Math.cos(rad);
                const y2 = 200 + 180 * Math.sin(rad);
                return (
                  <line
                    key={angle}
                    x1="200"
                    y1="200"
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-muted opacity-20"
                  />
                );
              })}

              {/* Center accent node */}
              <circle
                cx="200"
                cy="200"
                r="8"
                fill="currentColor"
                className="text-accent animate-pulse"
              />

              {/* Peripheral nodes */}
              {[0, 90, 180, 270].map((angle) => {
                const rad = (angle * Math.PI) / 180;
                const x = 200 + 120 * Math.cos(rad);
                const y = 200 + 120 * Math.sin(rad);
                return (
                  <g key={`node-${angle}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-accent opacity-60"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="2"
                      fill="currentColor"
                      className="text-accent"
                    />
                  </g>
                );
              })}

              {/* Grid lines */}
              <g className="text-muted opacity-10">
                <line x1="80" y1="200" x2="320" y2="200" stroke="currentColor" strokeWidth="1" />
                <line x1="200" y1="80" x2="200" y2="320" stroke="currentColor" strokeWidth="1" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
