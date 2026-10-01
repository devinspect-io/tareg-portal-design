import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo-dark-bg.png";

const QUICK_LINKS = [
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how" },
  { label: "Coverage", href: "#coverage" },
  { label: "Why us", href: "#why" },
  { label: "FAQ", href: "#faq" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#06152B] pt-16 pb-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:px-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <Image src={logo} alt="" width={30} height={25} className="h-[25px] w-auto" />
            <span className="font-[family-name:var(--font-display)] text-base font-bold">
              Tareg
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/60">
            Freight, warehousing, and fleet management across the UAE and
            Saudi Arabia — speed and precision, delivered.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/90">Quick links</h3>
          <ul className="mt-4 space-y-2.5">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-sm text-white/60 hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/90">Company</h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/login" className="text-sm text-white/60 hover:text-white">
                Client login
              </Link>
            </li>
            <li>
              <a
                href="mailto:sales@tareg.com"
                className="text-sm text-white/60 hover:text-white"
              >
                Get a quote
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/90">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/60">
            <li>
              <a href="mailto:sales@tareg.com" className="hover:text-white">
                sales@tareg.com
              </a>
            </li>
            <li>
              <a href="tel:+97141234567" className="hover:text-white">
                +971 4 123 4567
              </a>
            </li>
            <li>Business Bay, Dubai</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-2 border-t border-white/10 px-5 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>© {year} Tareg Logistics. All rights reserved.</p>
        <p>Speed. Precision. Delivered.</p>
      </div>
    </footer>
  );
}
