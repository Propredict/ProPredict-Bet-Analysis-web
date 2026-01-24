import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">404</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90 text-xs sm:text-sm">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
