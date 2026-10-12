import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusFind | Find your way back",
  description: "A shared home for lost and found on campus. Help belongings find their way back to the people who need them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
