import { Suspense } from "react";
import { StartScreen } from "@/components/StartScreen";
import { LoginQueryHandler } from "@/components/auth/LoginQueryHandler";

export default function Home() {
  return (
    <>
      <StartScreen />
      <Suspense fallback={null}>
        <LoginQueryHandler />
      </Suspense>
    </>
  );
}
