import { redirect } from "next/navigation";
import { ADMIN_PATH } from "@/lib/constants";

/**
 * Merged into Clients.
 *
 * A lead and a client were the same person on two screens, which meant the
 * decision that turns one into the other had nowhere to live — it happened by
 * dragging a status dropdown, and created nothing. Clients is now the whole
 * arc: undecided requests at the top, active clients below, and the full
 * searchable archive underneath that.
 *
 * A redirect rather than a deletion: bookmarks, the command palette and links
 * I have sent myself still resolve instead of 404ing.
 */
export default function Redirect() {
  redirect(`${ADMIN_PATH}/clients`);
}
