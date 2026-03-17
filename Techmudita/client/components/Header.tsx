import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export const Header = () => {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm border-b border-border z-50 transition-colors duration-300">
      <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center mt-4 gap-2">
          <div className="w-16 mb-2 text-accent">
            <img src="/logo1.png" alt="" />
          </div>
          
        </div>

        {/* Theme Toggle Button */}
        
      </nav>
    </header>
  );
};
