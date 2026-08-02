import { redirect } from "next/navigation";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Merged into the single Content page. Kept as a redirect rather than
 * deleted: bookmarks, the command palette and any link I have sent myself
 * still resolve instead of 404ing.
 */
export default function Redirect() {
  redirect(`${ADMIN_PATH}/content`);
}
