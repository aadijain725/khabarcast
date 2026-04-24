// Decorative preview of the two hosts — no state, no API. Mirrors the locked
// voice config personas from poc/04-voice-config.md.

type Host = {
  name: string;
  role: string;
  voiceNote: string;
  accent: string;
};

const HOSTS: Host[] = [
  {
    name: "KALAM",
    role: "SYSTEMS HOST",
    voiceNote: "Calm. Measured. Synthesizes.",
    accent: "INDIAN",
  },
  {
    name: "ANCHOR",
    role: "INTERVIEWER",
    voiceNote: "Sharp. Urgent. Pushes back.",
    accent: "INDIAN",
  },
];

export function HostCard({ host }: { host: Host }) {
  return (
    <div className="relative bg-[#141414] border border-[#D4AF37]/40 p-8 md:p-10 transition-colors duration-500 hover:border-[#D4AF37]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t border-l border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t border-r border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#D4AF37]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#D4AF37]"
      />

      <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37]">
        {host.role}
      </p>
      <h3 className="mt-4 font-display uppercase tracking-[0.1em] text-4xl md:text-5xl text-[#F2F0E4]">
        {host.name}
      </h3>
      <span aria-hidden="true" className="block h-px w-12 bg-[#D4AF37]/60 mt-6" />
      <p className="mt-6 text-sm md:text-base text-[#F2F0E4]/80 leading-relaxed">
        {host.voiceNote}
      </p>
      <p className="mt-3 font-display uppercase tracking-[0.25em] text-[10px] text-[#F2F0E4]/40">
        VOICE · {host.accent}
      </p>
    </div>
  );
}

export function HostCardStack() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {HOSTS.map((h) => (
        <HostCard key={h.name} host={h} />
      ))}
    </div>
  );
}
