import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

const IdeaBlock = ({ title, description, index }: { title: string; description: string; index: number }) => {
  return (
    <div
      className="stagger-item bg-background rounded-lg p-6 border border-border hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 cursor-pointer group"
      style={{
        animationDelay: `${index * 0.15}s`,
      }}
    >
      <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
        <div className="w-6 h-6 border-2 border-accent rounded-sm" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export const IdeaGraphicsSection = () => {
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.2,
  });

  return (
    <section ref={ref} className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How We Build at <span className="text-accent">TechMudita</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A systematic approach to creating meaningful digital solutions
            </p>
          </div>

          {/* Abstract Graphics Visualization */}
          <div className="mb-16 flex justify-center">
            <svg
              viewBox="0 0 600 300"
              className="w-full max-w-3xl h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Connection lines - animated */}
              <defs>
                <style>
                  {`
                    @keyframes drawLine {
                      0% { stroke-dashoffset: 100; }
                      100% { stroke-dashoffset: 0; }
                    }
                    .line-animate {
                      stroke-dasharray: 100;
                      animation: drawLine 2s ease-in-out forwards;
                    }
                  `}
                </style>
              </defs>

              {/* Block 1 - Problem */}
              <g>
                <rect
                  x="50"
                  y="100"
                  width="120"
                  height="100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent"
                  rx="8"
                />
                <text x="110" y="155" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Real-World
                </text>
                <text x="110" y="175" textAnchor="middle" className="pb-4 text-sm font-semibold" fill="currentColor">
                  Problem
                </text>
              </g>

              {/* Connection Line 1 */}
              <line
                x1="170"
                y1="150"
                x2="260"
                y2="150"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent line-animate"
              />
              <circle
                cx="215"
                cy="150"
                r="4"
                fill="currentColor"
                className="text-accent"
              />

              {/* Block 2 - Solution */}
              <g>
                <rect
                  x="260"
                  y="100"
                  width="120"
                  height="100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent"
                  rx="8"
                />
                <text x="320" y="145" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Simple Digital
                </text>
                <text x="320" y="165" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Solution
                </text>
              </g>

              {/* Connection Line 2 */}
              <line
                x1="380"
                y1="150"
                x2="470"
                y2="150"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent line-animate"
                style={{
                  animationDelay: '0.3s',
                }}
              />
              <circle
                cx="425"
                cy="150"
                r="4"
                fill="currentColor"
                className="text-accent"
              />

              {/* Block 3 - Ecosystem */}
              <g>
                <rect
                  x="470"
                  y="100"
                  width="120"
                  height="100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent"
                  rx="8"
                />
                <text x="530" y="140" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Scalable
                </text>
                <text x="530" y="160" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Product
                </text>
                <text x="530" y="180" textAnchor="middle" className=" text-sm font-semibold" fill="currentColor">
                  Ecosystem
                </text>
              </g>
            </svg>
          </div>

          {/* Three Ideas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IdeaBlock
              index={0}
              title="Real Problems"
              description="We start by deeply understanding the challenges people face in their daily lives and businesses."
            />
            <IdeaBlock
              index={1}
              title="Clear Solutions"
              description="We design intuitive, simple solutions that prioritize user clarity and long-term usability."
            />
            <IdeaBlock
              index={2}
              title="Scalable Impact"
              description="We build platforms that grow with our users and adapt to future needs seamlessly."
            />
          </div>
        </div>
      </div>
    </section>
  );
};
