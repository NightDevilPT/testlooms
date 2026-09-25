import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import ResponseService from "@/lib/response-service/response.service";
import {
  AuthSessionResult,
  UserProfileResponse,
  JwtPayload,
} from "./types";
import { SignupInput, LoginInput, SetupWorkspaceInput } from "./validation";

const JWT_SECRET = process.env.JWT_SECRET || "testloom_jwt_secret_dev_key_2026";
const ACCESS_TOKEN_EXPIRATION = "12m"; // 12 minutes
const REFRESH_TOKEN_EXPIRATION = "15d"; // 15 days
const ACCESS_TOKEN_COOKIE_NAME = "access_token";

export class AuthService {
  // ==========================================
  // Token Generation & Cookie Helpers
  // ==========================================

  private static generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { userId, email };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRATION,
    });

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
    });

    const accessTokenExpiresAt = new Date(Date.now() + 12 * 60 * 1000); // 12 mins
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      expiresAt,
    };
  }

  public static async setAuthCookie(accessToken: string) {
    const cookieStore = await cookies();
    cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 24 * 60 * 60, // 15 days cookie lifetime
    });
  }

  public static async clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  public static async getAuthCookie(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  }

  // ==========================================
  // Core Business Service Methods using ResponseService
  // ==========================================

  /**
   * Register a new user profile without issuing active session
   */
  public static async signup(input: SignupInput, request?: Request): Promise<NextResponse> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        return ResponseService.conflict(
          "An account with this email address already exists.",
          request
        );
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);

      const user = await prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashedPassword,
          status: "ACTIVE",
          isVerified: false,
          accountType: "PENDING",
          hasCompletedOnboarding: false,
        },
      });

      const userProfile: UserProfileResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        status: user.status,
        accountType: user.accountType,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        organizations: [],
        createdAt: user.createdAt.toISOString(),
      };

      return ResponseService.created(userProfile, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Authenticate email/password credentials and issue active session
   */
  public static async login(input: LoginInput, request?: Request): Promise<NextResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: input.email,
          deletedAt: null,
        },
      });

      if (!user || !user.password) {
        return ResponseService.unauthorized("Invalid email or password.", request);
      }

      const isMatch = await bcrypt.compare(input.password, user.password);
      if (!isMatch) {
        return ResponseService.unauthorized("Invalid email or password.", request);
      }

      if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
        return ResponseService.forbidden(
          "Account is deactivated or suspended.",
          request
        );
      }

      const tokens = this.generateTokens(user.id, user.email);

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          expiresAt: tokens.expiresAt,
        },
      });

      await this.setAuthCookie(tokens.accessToken);

      const userMemberships = await prisma.organizationMember.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { organization: true },
      });

      const userProfile: UserProfileResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        status: user.status,
        accountType: user.accountType,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        organizations: userMemberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
        createdAt: user.createdAt.toISOString(),
      };

      const result: AuthSessionResult = {
        user: userProfile,
        accessToken: tokens.accessToken,
      };

      return ResponseService.ok(result, undefined, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Logout current session by revoking token in DB and clearing cookie
   */
  public static async logout(accessToken: string | undefined, request?: Request): Promise<NextResponse> {
    try {
      if (accessToken) {
        await prisma.refreshToken.updateMany({
          where: { accessToken },
          data: { revokedAt: new Date() },
        });
      }
      await this.clearAuthCookie();

      return ResponseService.ok(
        { message: "Successfully logged out." },
        undefined,
        request
      );
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Logout user across all devices by revoking all active sessions
   */
  public static async logoutAll(userId: string, request?: Request): Promise<NextResponse> {
    try {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.clearAuthCookie();

      return ResponseService.ok(
        { message: "Successfully logged out of all active sessions." },
        undefined,
        request
      );
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Fetch current authenticated user profile
   */
  public static async getCurrentUser(userId: string, request?: Request): Promise<NextResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
      });

      if (!user) {
        return ResponseService.notFound("User profile not found.", request);
      }

      const userMemberships = await prisma.organizationMember.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { organization: true },
      });

      const userProfile: UserProfileResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        status: user.status,
        accountType: user.accountType,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        organizations: userMemberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
        createdAt: user.createdAt.toISOString(),
      };

      return ResponseService.ok(userProfile, undefined, request);
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Complete workspace setup during onboarding (Personal or Organization choice)
   */
  public static async setupWorkspace(
    userId: string,
    input: SetupWorkspaceInput,
    request?: Request
  ): Promise<NextResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
      });

      if (!user) {
        return ResponseService.notFound("User not found.", request);
      }

      if (input.accountType === "PERSONAL") {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            accountType: "PERSONAL",
            hasCompletedOnboarding: true,
          },
        });

        const userProfile: UserProfileResponse = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl,
          isVerified: updatedUser.isVerified,
          status: updatedUser.status,
          accountType: updatedUser.accountType,
          hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
          organizations: [],
          createdAt: updatedUser.createdAt.toISOString(),
        };

        return ResponseService.ok(userProfile, undefined, request);
      } else {
        const existingOrg = await prisma.organization.findUnique({
          where: { slug: input.organization.slug },
        });

        if (existingOrg) {
          return ResponseService.conflict(
            "An organization with this URL slug already exists. Please choose a different slug.",
            request
          );
        }

        const org = await prisma.organization.create({
          data: {
            name: input.organization.name,
            slug: input.organization.slug,
            createdBy: userId,
          },
        });

        await prisma.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: userId,
            role: "ADMIN",
            createdBy: userId,
          },
        });

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            accountType: "ORGANIZATION",
            hasCompletedOnboarding: true,
          },
        });

        const userProfile: UserProfileResponse = {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl,
          isVerified: updatedUser.isVerified,
          status: updatedUser.status,
          accountType: updatedUser.accountType,
          hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
          organizations: [
            {
              id: org.id,
              name: org.name,
              slug: org.slug,
              role: "ADMIN",
            },
          ],
          createdAt: updatedUser.createdAt.toISOString(),
        };

        return ResponseService.ok(userProfile, undefined, request);
      }
    } catch (error: unknown) {
      return ResponseService.handleError(error, request);
    }
  }

  /**
   * Verify access token string and check active session status in DB.
   * Returns { payload, errorResponse } tuple.
   */
  public static async verifySession(
    accessToken: string | undefined,
    request?: Request
  ): Promise<{ payload: JwtPayload | null; errorResponse: NextResponse | null }> {
    if (!accessToken) {
      return {
        payload: null,
        errorResponse: ResponseService.unauthorized("Authentication required.", request),
      };
    }

    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;

      const session = await prisma.refreshToken.findFirst({
        where: {
          accessToken,
          revokedAt: null,
          deletedAt: null,
        },
      });

      if (!session) {
        return {
          payload: null,
          errorResponse: ResponseService.unauthorized("Session has been revoked.", request),
        };
      }

      return { payload: decoded, errorResponse: null };
    } catch {
      return {
        payload: null,
        errorResponse: ResponseService.unauthorized("Invalid or expired access token.", request),
      };
    }
  }
}

export default AuthService;
