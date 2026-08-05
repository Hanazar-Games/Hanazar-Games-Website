import PeerTransferApp from "../components/PeerTransferApp";

function configuredServiceUrl() {
  const value = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  return <PeerTransferApp mode="chat" memberChatUrl={configuredServiceUrl()} />;
}
