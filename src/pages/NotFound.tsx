import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, Sparkles } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen items-center justify-center px-4"
    >
      <GlassCard strong className="w-full max-w-md p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
          <Sparkles className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">الصفحة غير موجودة</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          الرابط الذي تبحث عنه غير متاح. عُد إلى الصفحة الرئيسية لتكمل يومك مع سكينة.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">
            <Home className="size-4" />
            الصفحة الرئيسية
          </Link>
        </Button>
      </GlassCard>
    </motion.main>
  );
}
