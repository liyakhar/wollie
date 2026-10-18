import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "#/components/money/ChatScreen";

export const Route = createFileRoute("/app/chat")({
  head: () => ({ meta: [{ title: "Ask Wollie · Wollie" }] }),
  component: ChatScreen,
});
