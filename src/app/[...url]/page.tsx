import { ragChat } from "@/lib/rag-chat";
import { Redis } from "@upstash/redis";
import { ChatWrapper } from "@/components/ChatWrapper";
import {cookies} from "next/headers"


// Initialize Redis client (replace with your actual Redis connection details)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface PageProps {
  params: {
    url: string | string[] | undefined;
  };
}

function reconstructUrl({ url }: { url: string[] }) {
  const decodedComponents = url.map((component) =>
    decodeURIComponent(component)
  );
  return decodedComponents.join("/");
}

const Page = async ({ params }: PageProps) => {
  // Ensure `params.url` is an array before calling `reconstructUrl`
  if (!params.url || !Array.isArray(params.url)) {
    throw new Error("Invalid URL format");
  }
  const sessionCookie = cookies().get("sessionId")?.value
  const reconstructedUrl = reconstructUrl({ url: params.url });
  const sessionId = (reconstructedUrl+"--"+sessionCookie).replace(/\//g,"")
  const isAlreadyIndexed = await redis.sismember("indexed-urls", reconstructedUrl);
const initialMessages = await ragChat.history.getMessages({amount:10,sessionId})
  if (!isAlreadyIndexed) {
    await ragChat.context.add({
      type: "html",
      source: reconstructedUrl,
      config: { chunkOverlap: 50, chunkSize: 200 },
    });
    await redis.sadd("indexed-urls", reconstructedUrl);
  }

  return <ChatWrapper sessionId={sessionId} initialMessages={initialMessages}/>
};

export default Page;
