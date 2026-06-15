'use client';

export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1E1E1E] text-white font-sans">
      <h1 className="text-4xl font-bold mb-4 font-minecraft">Something went wrong</h1>
      <p className="text-gray-400">An unexpected error occurred.</p>
    </div>
  );
}
