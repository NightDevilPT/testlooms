import type { Metadata } from "next";
import { SignupForm } from "@/components/pages/signup";

export const metadata: Metadata = {
  title: "Sign Up - TestLoom",
  description: "Create a new TestLoom account to start recording and running automated browser tests.",
};

export default function SignupPage() {
  return <SignupForm />;
}
