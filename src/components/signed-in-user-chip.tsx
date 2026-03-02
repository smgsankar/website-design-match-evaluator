"use client";

import { UserButton } from "@clerk/nextjs";

export function SignedInUserChip() {
  return (
    <UserButton
      showName
      appearance={{
        elements: {
          avatarBox: "user-avatar-box",
          userButtonTrigger: "user-chip",
        },
      }}
    />
  );
}
