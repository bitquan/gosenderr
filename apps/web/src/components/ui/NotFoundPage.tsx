import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  actionHref: string;
  actionLabel: string;
  emoji?: string;
}

export function NotFoundPage({
  title = "Page not found",
  description = "The page you’re looking for doesn’t exist or was moved.",
  actionHref,
  actionLabel,
  emoji = "🧭",
}: NotFoundPageProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-[32px] p-8 text-white shadow-lg mb-6">
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-3xl font-bold">404</h1>
          <p className="text-purple-100 mt-2">{title}</p>
        </div>

        <Card variant="elevated">
          <CardContent>
            <p className="text-gray-600 text-sm mb-6">{description}</p>
            <Link
              href={actionHref}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
            >
              {actionLabel}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
