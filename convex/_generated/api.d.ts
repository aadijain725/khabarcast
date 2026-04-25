/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_composer from "../agents/composer.js";
import type * as agents_curator from "../agents/curator.js";
import type * as agents_ideologyAgent from "../agents/ideologyAgent.js";
import type * as agents_lib_runLog from "../agents/lib/runLog.js";
import type * as agents_manager from "../agents/manager.js";
import type * as agents_researcher from "../agents/researcher.js";
import type * as agents_speakerResearcher from "../agents/speakerResearcher.js";
import type * as auth from "../auth.js";
import type * as connectors_genericRss from "../connectors/genericRss.js";
import type * as connectors_index from "../connectors/index.js";
import type * as connectors_substack from "../connectors/substack.js";
import type * as connectors_topicCatalog from "../connectors/topicCatalog.js";
import type * as connectors_types from "../connectors/types.js";
import type * as episodes from "../episodes.js";
import type * as evals from "../evals.js";
import type * as generationRuns from "../generationRuns.js";
import type * as hosts from "../hosts.js";
import type * as http from "../http.js";
import type * as pipeline_fetchSource from "../pipeline/fetchSource.js";
import type * as pipeline_generateScript from "../pipeline/generateScript.js";
import type * as pipeline_orchestrate from "../pipeline/orchestrate.js";
import type * as pipeline_renderAudio from "../pipeline/renderAudio.js";
import type * as pipeline_voices from "../pipeline/voices.js";
import type * as sources from "../sources.js";
import type * as topicFlags from "../topicFlags.js";
import type * as userFeeds from "../userFeeds.js";
import type * as userTopics from "../userTopics.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/composer": typeof agents_composer;
  "agents/curator": typeof agents_curator;
  "agents/ideologyAgent": typeof agents_ideologyAgent;
  "agents/lib/runLog": typeof agents_lib_runLog;
  "agents/manager": typeof agents_manager;
  "agents/researcher": typeof agents_researcher;
  "agents/speakerResearcher": typeof agents_speakerResearcher;
  auth: typeof auth;
  "connectors/genericRss": typeof connectors_genericRss;
  "connectors/index": typeof connectors_index;
  "connectors/substack": typeof connectors_substack;
  "connectors/topicCatalog": typeof connectors_topicCatalog;
  "connectors/types": typeof connectors_types;
  episodes: typeof episodes;
  evals: typeof evals;
  generationRuns: typeof generationRuns;
  hosts: typeof hosts;
  http: typeof http;
  "pipeline/fetchSource": typeof pipeline_fetchSource;
  "pipeline/generateScript": typeof pipeline_generateScript;
  "pipeline/orchestrate": typeof pipeline_orchestrate;
  "pipeline/renderAudio": typeof pipeline_renderAudio;
  "pipeline/voices": typeof pipeline_voices;
  sources: typeof sources;
  topicFlags: typeof topicFlags;
  userFeeds: typeof userFeeds;
  userTopics: typeof userTopics;
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
