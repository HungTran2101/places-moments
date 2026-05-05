import HomePageView from "@/components/HomePage";

interface HomePageProps {
  searchParams: Promise<{
    testError?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  // Cho phep test `app/error.tsx` bang query param trong moi truong dev.
  if (process.env.NODE_ENV === "development" && params.testError === "route") {
    throw new Error("Dev route error test");
  }

  return <HomePageView />;
}
