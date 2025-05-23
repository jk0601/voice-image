import { AppSidebar } from '@/components/app-sidebar';
import { auth } from '../(auth)/auth';
import Script from 'next/script';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <div className="flex flex-col min-h-screen w-full">
        <AppSidebar user={session?.user} />
        <main className="flex-1 w-full mt-10">
          {children}
        </main>
      </div>
    </>
  );
}
