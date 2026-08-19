import SkinServiceCenter, { type SkinServiceSection } from "../components/SkinServiceCenter";

function configuredServiceUrl() {
  const value = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const localDevelopment = process.env.NODE_ENV === "development"
      && url.protocol === "http:"
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if ((!localDevelopment && url.protocol !== "https:") || url.username || url.password || url.search || url.hash) return null;
    return new URL(url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`, url.origin).href;
  } catch {
    return null;
  }
}

export default function SkinServiceRoute({ section }: { section?: SkinServiceSection }) {
  return <SkinServiceCenter serviceUrl={configuredServiceUrl()} activeSection={section} />;
}
