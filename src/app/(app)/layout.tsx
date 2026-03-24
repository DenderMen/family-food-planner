import { AppHeader } from "@/components/layout/header";
import { AppNav } from "@/components/layout/nav";
import { Providers } from "@/components/providers";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", backgroundColor: "#FAF6F1" }}>
        <AppHeader />
        <main
          style={{
            flex: 1,
            maxWidth: "640px",
            width: "100%",
            margin: "0 auto",
            padding: "20px 16px 100px",
          }}
        >
          {children}
        </main>
        <AppNav />
      </div>
    </Providers>
  );
}
