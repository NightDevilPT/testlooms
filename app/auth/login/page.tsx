import type { Metadata } from "next";
import { LoginForm } from "@/components/pages/login";

export const metadata: Metadata = {
  title: "Login - TestLoom",
  description: "Login to your TestLoom account to access automated Playwright test studio.",
};

export default function LoginPage() {
  return <LoginForm />;
}
