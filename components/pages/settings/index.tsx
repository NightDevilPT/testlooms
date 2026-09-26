"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client/api-client.service";
import { UserProfileResponse } from "@/lib/auth-service/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Palette, AlertCircle } from "lucide-react";
import { SettingsSkeleton } from "./_components/settings-skeleton";
import { PersonalProfileTab } from "./_components/personal-profile-tab";
import { AppearanceSettingsTab } from "./_components/appearance-settings-tab";

type ActiveTab = "profile" | "appearance";

export function SettingsPageComponent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<UserProfileResponse>("/api/auth/me");
      if (response.success && response.data && !Array.isArray(response.data)) {
        setUserProfile(response.data);
      } else {
        setError(response.success === false ? response.error.message : "Failed to load user profile");
      }
    } catch {
      setError("An unexpected error occurred while loading settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (error || !userProfile) {
    return (
      <div className="w-full space-y-4 p-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Unable to Load Settings</h2>
            <p className="text-sm text-muted-foreground">{error || "User profile data unavailable."}</p>
            <Button variant="outline" onClick={fetchUserProfile} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Account & Preferences Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal identity credentials, account details, and visual appearance preferences.
        </p>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <User className="h-4 w-4" />
          Personal Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "appearance"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Palette className="h-4 w-4" />
          Appearance & Theme
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="w-full">
        {activeTab === "profile" && (
          <PersonalProfileTab
            user={userProfile}
            onUpdateUser={(updated) => setUserProfile(updated)}
          />
        )}

        {activeTab === "appearance" && <AppearanceSettingsTab />}
      </div>
    </div>
  );
}
