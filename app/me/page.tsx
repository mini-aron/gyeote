import { requireMember } from "@/lib/auth/requireMember";
import { getMyInfo } from "@/lib/me/getMyInfo";
import { MeView } from "@/components/me/MeView";

export default async function Page() {
  const user = await requireMember("me");
  const info = await getMyInfo(user);
  return <MeView info={info} />;
}
