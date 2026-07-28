import { internalMutation } from "./_generated/server";

/**
 * Housekeeping.
 *
 * chatLimits rows are written on every request, including rejected ones, and
 * are meaningless once their window has passed. Left alone the table grows
 * without bound for no benefit.
 */
export const sweepChatLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    const rows = await ctx.db.query("chatLimits").take(2000);

    let deleted = 0;
    for (const row of rows) {
      if (row.windowStart < cutoff) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
