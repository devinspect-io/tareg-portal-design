export default function CtaBanner() {
  return (
    <section id="contact" className="bg-[#06152B] py-20 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:flex-row sm:items-center md:px-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
            Ready to move your next shipment?
          </h2>
          <p className="mt-3 max-w-md text-white/60">
            Tell us what you&apos;re shipping and where — we&apos;ll quote it
            the same day.
          </p>
        </div>
        <a
          href="mailto:sales@tareg.com"
          className="shrink-0 rounded-md bg-accent-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
        >
          Get a shipping quote
        </a>
      </div>
    </section>
  );
}
