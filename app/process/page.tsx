import ProcessTemplate from "@/components/templates/processTemplate";
import { getServerSession } from "next-auth";
import { authOptions } from "../authOptions";
import { redirect } from "next/navigation";

const ProcessPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/signin");
  }

  return <ProcessTemplate />;
};

export default ProcessPage;
