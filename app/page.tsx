import { redirect } from "next/navigation";

export default function Home() {
  redirect("/process");
  return <main className="container mx-auto p-4"></main>;
}
