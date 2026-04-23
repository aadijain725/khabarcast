import { query } from "./_generated/server";
import { v } from "convex/values";

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return {
      email: identity.email ?? null,
      name: identity.name ?? null,
    };
  },
});
