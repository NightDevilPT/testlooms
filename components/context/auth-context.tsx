"use client";

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/api-client/api-client.service";
import {
	UserProfileResponse,
	AuthSessionResult,
} from "@/lib/auth-service/types";
import { LoginInput, SignupInput, SetupWorkspaceInput } from "@/lib/auth-service/validation";

export interface AuthContextType {
	user: UserProfileResponse | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (
		credentials: LoginInput,
	) => Promise<{ success: boolean; error?: string }>;
	signup: (
		data: SignupInput,
	) => Promise<{ success: boolean; error?: string }>;
	setupWorkspace: (
		data: SetupWorkspaceInput,
	) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
	refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/login", "/signup", "/", "/auth/login", "/auth/signup"];

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserProfileResponse | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const router = useRouter();
	const pathname = usePathname();

	/**
	 * Fetch current authenticated user profile from /api/auth/me
	 */
	const refetchUser = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await apiClient.get<UserProfileResponse>(
				"/api/auth/me",
			);

			if (
				response.success &&
				response.data &&
				!Array.isArray(response.data)
			) {
				setUser(response.data);
				setIsAuthenticated(true);
			} else {
				setUser(null);
				setIsAuthenticated(false);
			}
		} catch {
			setUser(null);
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initialize auth status on mount
	useEffect(() => {
		refetchUser();
	}, [refetchUser]);

	// Route protection redirect effect
	useEffect(() => {
		if (isLoading) return;

		const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

		if (!isAuthenticated && !isPublicRoute) {
			router.push("/auth/login");
		} else if (
			isAuthenticated &&
			(pathname === "/login" ||
				pathname === "/signup" ||
				pathname === "/auth/login" ||
				pathname === "/auth/signup")
		) {
			router.push("/dashboard");
		}
	}, [isAuthenticated, isLoading, pathname, router]);

	/**
	 * Login action handler
	 */
	const login = async (
		credentials: LoginInput,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			const response = await apiClient.post<AuthSessionResult>(
				"/api/auth/login",
				credentials,
			);

			if (response.success && response.data) {
				setUser(response.data.user);
				setIsAuthenticated(true);
				router.push("/dashboard");
				return { success: true };
			}

			const errorMessage =
				response.success === false
					? response.error.message
					: "Login failed";
			return { success: false, error: errorMessage };
		} catch {
			return {
				success: false,
				error: "An unexpected error occurred during login.",
			};
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Signup action handler
	 */
	const signup = async (
		data: SignupInput,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			const idempotencyKey =
				typeof crypto !== "undefined" && crypto.randomUUID
					? crypto.randomUUID()
					: undefined;
			const response = await apiClient.post<UserProfileResponse>(
				"/api/auth/signup",
				data,
				{
					idempotencyKey,
				},
			);

			if (response.success && response.data) {
				router.push("/auth/login");
				return { success: true };
			}

			const errorMessage =
				response.success === false
					? response.error.message
					: "Signup failed";
			return { success: false, error: errorMessage };
		} catch {
			return {
				success: false,
				error: "An unexpected error occurred during registration.",
			};
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Workspace Setup action handler (Personal or Organization setup)
	 */
	const setupWorkspace = async (
		data: SetupWorkspaceInput,
	): Promise<{ success: boolean; error?: string }> => {
		setIsLoading(true);
		try {
			const response = await apiClient.post<UserProfileResponse>(
				"/api/auth/setup-workspace",
				data,
			);

			if (response.success && response.data && !Array.isArray(response.data)) {
				setUser(response.data);
				setIsAuthenticated(true);
				router.push("/dashboard");
				return { success: true };
			}

			const errorMessage =
				response.success === false
					? response.error.message
					: "Workspace setup failed";
			return { success: false, error: errorMessage };
		} catch {
			return {
				success: false,
				error: "An unexpected error occurred during workspace setup.",
			};
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Logout action handler
	 */
	const logout = async (): Promise<void> => {
		setIsLoading(true);
		try {
			await apiClient.post("/api/auth/logout");
		} finally {
			setUser(null);
			setIsAuthenticated(false);
			setIsLoading(false);
			router.push("/auth/login");
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isAuthenticated,
				isLoading,
				login,
				signup,
				setupWorkspace,
				logout,
				refetchUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * Custom Hook to consume AuthContext cleanly in any React Component
 */
export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}

export default AuthProvider;
