import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex items-center justify-center py-32 px-4">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 text-accent">404</h1>
          <p className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Page Not Found
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's
            get you back on track.
          </p>
          <Link to="/" className="tech-button-primary inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
