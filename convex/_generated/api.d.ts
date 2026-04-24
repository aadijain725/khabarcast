/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as episodes from "../episodes.js";
import type * as generationRuns from "../generationRuns.js";
import type * as http from "../http.js";
import type * as pipeline_fetchSource from "../pipeline/fetchSource.js";
import type * as pipeline_generateScript from "../pipeline/generateScript.js";
import type * as pipeline_orchestrate from "../pipeline/orchestrate.js";
import type * as pipeline_renderAudio from "../pipeline/renderAudio.js";
import type * as pipeline_voices from "../pipeline/voices.js";
import type * as sources from "../sources.js";
import type * as topicFlags from "../topicFlags.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  episodes: typeof episodes;
  generationRuns: typeof generationRuns;
  http: typeof http;
  "pipeline/fetchSource": typeof pipeline_fetchSource;
  "pipeline/generateScript": typeof pipeline_generateScript;
  "pipeline/orchestrate": typeof pipeline_orchestrate;
  "pipeline/renderAudio": typeof pipeline_renderAudio;
  "pipeline/voices": typeof pipeline_voices;
  sources: typeof sources;
  topicFlags: typeof topicFlags;
  users: typeof users;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
