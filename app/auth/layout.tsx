import AuthProvider from "@/components/context/auth-context";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Authentication - TestLoom",
	description:
		"Sign in or create an account for TestLoom automation platform.",
};

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-10">
			<div className="w-full max-w-4xl">{children}</div>
		</div>
	);
}
