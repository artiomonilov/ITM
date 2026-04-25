'use client';

import { SessionProvider } from "next-auth/react";
import SessionEnforcer from "./components/SessionEnforcer";

export default function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={5} refetchOnWindowFocus>
      <SessionEnforcer />
      {children}
    </SessionProvider>
  );
}
