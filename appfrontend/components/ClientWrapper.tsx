"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // 1.5s loader
    return () => clearTimeout(timer);
  }, []);

  return <>{loading ? <Loader /> : children}</>;
}
