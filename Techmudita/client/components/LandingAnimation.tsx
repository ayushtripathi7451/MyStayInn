import { useEffect, useState } from 'react';

interface LandingAnimationProps {
  onComplete: () => void;
}

export const LandingAnimation = ({ onComplete }: LandingAnimationProps) => {
  const [stage, setStage] = useState<
    'noise' | 'logo' | 'headline' | 'complete'
  >('noise');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('logo'), 600);
    const timer2 = setTimeout(() => setStage('headline'), 1600);
    const timer3 = setTimeout(() => setStage('complete'), 2800);
    const timer4 = setTimeout(() => onComplete(), 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden">
      
      {/* Grain effect */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          stage === 'noise' ? 'opacity-10' : 'opacity-0'
        } mix-blend-multiply`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <img
          src="/logo1.png"
          alt="TechMudita Logo"
          className={`w-[120px] h-[120px] object-contain transition-all duration-1000 ease-out ${
            stage === 'logo' || stage === 'headline' || stage === 'complete'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90'
          }`}
        />
      </div>

      {/* Headline */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 text-center transition-all duration-1000 ${
          stage === 'headline' || stage === 'complete'
            ? 'opacity-100 translate-y-32'
            : 'opacity-0 translate-y-20'
        }`}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          TechMudita
        </h1>
        <p className="text-lg text-muted-foreground">
          Building Thoughtful Technology
        </p>
      </div>
    </div>
  );
};
