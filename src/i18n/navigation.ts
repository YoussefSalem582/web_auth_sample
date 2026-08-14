import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware replacements for next/link + next/navigation. Always use these. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
