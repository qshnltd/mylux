'use client';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1E1E1E] text-white font-sans">
      <h1 className="text-4xl font-bold mb-4 font-minecraft">404 - Page Not Found</h1>
      <p className="text-gray-400">The page you were looking for could not be found.</p>
    </div>
  );
}
