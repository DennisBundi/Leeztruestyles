"use server";

import { signInAction } from "@/lib/actions/auth";

export async function signInFormAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  // Call sign-in action and return result
  // Client will handle redirect to ensure cookies are sent
  return await signInAction(email, password, redirectTo);
}
