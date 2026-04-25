'use client';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full transition-colors"
    >
      Ieși din cont (Logout)
    </button>
  );
}
