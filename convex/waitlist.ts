import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const joinWaitlist = mutation({
  args: { email: v.string() },
  returns: v.object({
    success: v.optional(v.boolean()),
    alreadyJoined: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new ConvexError("Please enter a valid email address.");
    }

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { alreadyJoined: true };
    }

    await ctx.db.insert("waitlist", {
      email,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
