"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type Slot = "KALAM" | "ANCHOR";

const PLACEHOLDER_IDEOLOGY =
  "Tone: ... . Lens: what this host emphasizes. Job: what they do with the article. End with how they push back or land an insight.";

export default function HostsPage() {
  const hosts = useQuery(api.hosts.listVisible);
  const createHost = useMutation(api.hosts.create);

  const [slot, setSlot] = useState<Slot>("KALAM");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [ideologyPrompt, setIdeologyPrompt] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [voiceModel, setVoiceModel] = useState("eleven_turbo_v2_5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedName(null);
    if (!name.trim() || !persona.trim() || !ideologyPrompt.trim() || !voiceId.trim()) {
      setError("name, persona, ideology and voice id are all required");
      return;
    }
    setSubmitting(true);
    try {
      await createHost({
        slot,
        name: name.trim(),
        voiceId: voiceId.trim(),
        voiceModel: voiceModel.trim() || undefined,
        ideologyPrompt: ideologyPrompt.trim(),
        persona: persona.trim(),
      });
      setCreatedName(name.trim());
      setName("");
      setPersona("");
      setIdeologyPrompt("");
      setVoiceId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setSubmitting(false);
    }
  }

  const globals = hosts?.filter((h) => !h.ownerTokenId) ?? [];
  const owned = hosts?.filter((h) => h.ownerTokenId) ?? [];

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          HOSTS · IDEOLOGY ROSTER
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2rem,6vw,5rem)] text-[#F2F0E4]">
        WHO DEBATES
        <br />
        <span className="text-[#D4AF37]">YOUR FEED.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-base md:text-lg text-[#F2F0E4]/70">
        Each host fills one of two slots. The KALAM slot synthesizes; the ANCHOR
        slot pushes back. Pick from the global roster or define your own.
      </p>

      <div className="mt-12 grid gap-12 md:gap-16 md:grid-cols-2">
        <div>
          <h2 className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
            ROSTER
          </h2>

          {hosts === undefined && (
            <p className="mt-6 font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
              LOADING…
            </p>
          )}

          {hosts && (
            <>
              {globals.length > 0 && (
                <div className="mt-6">
                  <p className="font-display uppercase tracking-[0.3em] text-[9px] text-[#F2F0E4]/40 mb-3">
                    GLOBAL
                  </p>
                  <ul className="space-y-3">
                    {globals.map((h) => (
                      <HostCard key={h._id} host={h} />
                    ))}
                  </ul>
                </div>
              )}
              {owned.length > 0 && (
                <div className="mt-8">
                  <p className="font-display uppercase tracking-[0.3em] text-[9px] text-[#F2F0E4]/40 mb-3">
                    YOURS
                  </p>
                  <ul className="space-y-3">
                    {owned.map((h) => (
                      <HostCard key={h._id} host={h} />
                    ))}
                  </ul>
                </div>
              )}
              {globals.length === 0 && owned.length === 0 && (
                <p className="mt-6 text-sm text-[#F2F0E4]/60">No hosts yet.</p>
              )}
            </>
          )}
        </div>

        <div>
          <h2 className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
            ADD A HOST
          </h2>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <Field label="Slot">
              <div className="flex gap-2">
                {(["KALAM", "ANCHOR"] as Slot[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`flex-1 border px-4 py-3 font-display uppercase tracking-[0.3em] text-xs transition-colors ${
                      slot === s
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                        : "border-[#D4AF37]/30 text-[#F2F0E4]/70 hover:border-[#D4AF37]/60"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kalam-inspired, Skeptical Anchor, Ambedkar-inspired"
                className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 focus:border-[#D4AF37] focus:outline-none"
              />
            </Field>

            <Field label="Persona (1 line)">
              <input
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Calm, wise, optimistic. Inspired by ..."
                className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 focus:border-[#D4AF37] focus:outline-none"
              />
            </Field>

            <Field label="Ideology prompt">
              <textarea
                value={ideologyPrompt}
                onChange={(e) => setIdeologyPrompt(e.target.value)}
                placeholder={PLACEHOLDER_IDEOLOGY}
                rows={6}
                className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ElevenLabs voice id">
                <input
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="oBcjxOGl..."
                  className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 focus:border-[#D4AF37] focus:outline-none font-mono text-xs"
                />
              </Field>
              <Field label="Voice model">
                <input
                  value={voiceModel}
                  onChange={(e) => setVoiceModel(e.target.value)}
                  className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 focus:border-[#D4AF37] focus:outline-none font-mono text-xs"
                />
              </Field>
            </div>

            {error && (
              <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
                {error}
              </p>
            )}
            {createdName && (
              <p className="text-sm text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/5 px-3 py-2">
                added &quot;{createdName}&quot;.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
            >
              {submitting ? "ADDING…" : "ADD HOST"}
            </button>
          </form>

          <details className="mt-6 border border-[#D4AF37]/20 bg-[#141414] p-3">
            <summary className="cursor-pointer font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80">
              WHERE DO I GET A VOICE ID? ▾
            </summary>
            <ol className="mt-3 list-decimal pl-5 space-y-2 text-xs text-[#F2F0E4]/75">
              <li>
                Open{" "}
                <a
                  href="https://elevenlabs.io/app/voice-library"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#D4AF37]"
                >
                  ElevenLabs voice library
                </a>{" "}
                and pick a voice.
              </li>
              <li>Click the voice → &quot;Add to Library&quot; → copy its voice id.</li>
              <li>
                Or use{" "}
                <a
                  href="https://elevenlabs.io/app/voices?action=ivc"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#D4AF37]"
                >
                  Instant Voice Clone
                </a>{" "}
                — upload 1–5 min of audio, get a voice id in seconds.
              </li>
            </ol>
          </details>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80 mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function HostCard({
  host,
}: {
  host: {
    _id: string;
    slot: "KALAM" | "ANCHOR";
    name: string;
    persona: string;
    voiceId: string;
    voiceModel?: string;
    ownerTokenId?: string;
  };
}) {
  return (
    <li className="border border-[#D4AF37]/30 bg-[#141414] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display uppercase tracking-[0.08em] text-base text-[#F2F0E4]">
          {host.name}
        </h3>
        <span className="font-display uppercase tracking-[0.3em] text-[9px] text-[#D4AF37] border border-[#D4AF37]/40 px-2 py-0.5">
          {host.slot}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#F2F0E4]/75">{host.persona}</p>
      <p className="mt-3 font-mono text-[10px] text-[#F2F0E4]/40 truncate">
        voice {host.voiceId}{host.voiceModel ? ` · ${host.voiceModel}` : ""}
      </p>
    </li>
  );
}
