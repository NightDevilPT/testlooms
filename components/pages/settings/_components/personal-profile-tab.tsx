"use client";

import React, { useState } from "react";
import Image from "next/image";
import { UserProfileResponse } from "@/lib/auth-service/types";
import apiClient from "@/lib/api-client/api-client.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { User, Mail, Loader2, Lock, CheckCircle2, Check, Image as ImageIcon, Camera } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/components/context/auth-context";

const PREDEFINED_AVATARS = [
  { id: "none", name: "Initials Badge", url: "" },
  { id: "3d-1", name: "3D Avatar 1", url: "/avatars/3d-1.jpg" },
  { id: "3d-2", name: "3D Avatar 2", url: "/avatars/3d-2.jpg" },
];

interface PersonalProfileTabProps {
  user: UserProfileResponse;
  onUpdateUser: (updated: UserProfileResponse) => void;
}

export function PersonalProfileTab({ user, onUpdateUser }: PersonalProfileTabProps) {
  const { refetchUser } = useAuth();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user.avatarUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitials = (first: string, last: string) => {
    const f = first ? first.charAt(0).toUpperCase() : "";
    const l = last ? last.charAt(0).toUpperCase() : "";
    return f + l || "TL";
  };

  const hasChanges =
    firstName !== (user.firstName || "") ||
    lastName !== (user.lastName || "") ||
    selectedAvatar !== (user.avatarUrl || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.add({
        title: "Validation Error",
        description: "First name and last name cannot be empty.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.patch<UserProfileResponse>("/api/auth/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl: selectedAvatar || null,
      });

      if (response.success && response.data && !Array.isArray(response.data)) {
        onUpdateUser(response.data);
        await refetchUser();
        toast.add({
          title: "Profile Updated",
          description: "Your personal details and avatar have been saved successfully.",
          type: "success",
        });
      } else {
        toast.add({
          title: "Update Failed",
          description: response.success === false ? response.error.message : "Failed to update profile",
          type: "error",
        });
      }
    } catch {
      toast.add({
        title: "Error",
        description: "An unexpected error occurred while updating profile.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setSelectedAvatar(user.avatarUrl || "");
  };

  return (
    <div className="w-full space-y-6">
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Profile
          </CardTitle>
          <CardDescription>
            Manage your personal identity credentials, profile avatar, and public account attributes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Header Strip with Popover Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="relative group cursor-pointer focus:outline-none rounded-full shrink-0"
                    title="Click to change profile avatar"
                  >
                    {selectedAvatar ? (
                      <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-primary shadow-xs bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedAvatar}
                          alt="Profile Avatar"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-xs">
                        {getInitials(firstName, lastName)}
                      </div>
                    )}

                    {/* Camera Overlay Badges */}
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-xs">
                      <Camera className="h-3 w-3" />
                    </div>
                  </button>
                }
              />
              <PopoverContent align="start" className="w-80 p-4 space-y-3">
                <PopoverHeader>
                  <PopoverTitle className="text-sm font-bold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Select Profile Avatar
                  </PopoverTitle>
                  <PopoverDescription className="text-xs text-muted-foreground">
                    Choose a predefined avatar to represent your account.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {PREDEFINED_AVATARS.map((av) => {
                    const isSelected = selectedAvatar === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.url)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                            : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        {av.url ? (
                          <div className="relative h-10 w-10 rounded-full overflow-hidden mb-1 border border-border bg-background">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={av.url}
                              alt={av.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs mb-1 border border-primary/30">
                            {getInitials(firstName, lastName)}
                          </div>
                        )}
                        <span className="text-[10px] font-medium text-foreground text-center truncate max-w-full">
                          {av.name}
                        </span>
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {firstName} {lastName}
                </h3>
                {user.isVerified && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                  {user.accountType || "User Account"}
                </Badge>
                <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Click avatar to change profile image
                </span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-semibold">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-semibold">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Contact admin to change
                </span>
              </div>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Account created on {new Date(user.createdAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              form="profile-form"
              variant="default"
              size="sm"
              disabled={isSubmitting || !hasChanges}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
