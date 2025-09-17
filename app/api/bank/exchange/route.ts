export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { calcExchange } from "@/lib/rates";

const BodySchema = z.object({
  from: z.enum(["WALLET","BANK","DIAMOND","TICKET","GACHA_TICKET"]),
  to:   z.enum(["WALLET","BANK","DIAMOND","TICKET","GACHA_TICKET"]),
  amount: z.number().int().positive(),
}).strict();

export async function POST(req: NextRequest) {
  const auth = await getUserFromRequest(req).catch(()=>null);
  if (!auth?.userId) return NextResponse.json({ error:"UNAUTHORIZED" }, { status:401 });
  const body = await req.json().catch(()=>null);
  const p = BodySchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error:"BAD_REQUEST" }, { status:400 });

  const { from, to, amount } = p.data;
  const gained = calcExchange(from, to, amount);
  if (gained == null) return NextResponse.json({ error:"UNSUPPORTED_PAIR" }, { status:400 });

  try {
    const result = await prisma.$transaction(async (tx)=>{
      const u = await tx.user.findUnique({ where:{ id: auth.userId }, select: { id:true, balance:true, bankBalance:true, diamondBalance:true, ticketBalance:true, gachaTicketBalance:true }});
      if (!u) throw new Error("USER_NOT_FOUND");
      const enough =
        (from==="WALLET" ? u.balance >= amount :
        from==="BANK" ? u.bankBalance >= amount :
        from==="DIAMOND" ? u.diamondBalance >= amount :
        from==="TICKET" ? u.ticketBalance >= amount :
        from==="GACHA_TICKET" ? u.gachaTicketBalance >= amount : false);
      if (!enough) throw new Error("INSUFFICIENT_FUNDS");

      const data:any = {};
      if (from==="WALLET") data.balance = { decrement: amount };
      if (from==="BANK") data.bankBalance = { decrement: amount };
      if (from==="DIAMOND") data.diamondBalance = { decrement: amount };
      if (from==="TICKET") data.ticketBalance = { decrement: amount };
      if (from==="GACHA_TICKET") data.gachaTicketBalance = { decrement: amount };

      if (to==="WALLET") data.balance = { ...(data.balance||{}), increment: gained };
      if (to==="BANK") data.bankBalance = { ...(data.bankBalance||{}), increment: gained };
      if (to==="DIAMOND") data.diamondBalance = { ...(data.diamondBalance||{}), increment: gained };
      if (to==="TICKET") data.ticketBalance = { ...(data.ticketBalance||{}), increment: gained };
      if (to==="GACHA_TICKET") data.gachaTicketBalance = { ...(data.gachaTicketBalance||{}), increment: gained };

      const updated = await tx.user.update({ where:{ id:u.id }, data });

      const meta = { source:"EXCHANGE", from, to, amount, gained };
      await tx.ledger.create({ data:{ userId:u.id, type:"EXCHANGE", target: from as any, amount:-amount, meta } });
      await tx.ledger.create({ data:{ userId:u.id, type:"EXCHANGE", target: to as any, amount: gained, meta } });

      return updated;
    });

    return NextResponse.json({ ok:true, user:{
      balance: result.balance, bankBalance: result.bankBalance, diamondBalance: result.diamondBalance, ticketBalance: result.ticketBalance, gachaTicketBalance: result.gachaTicketBalance,
    }});
  } catch (e:any) {
    const msg = String(e?.message || e);
    const code = msg === "INSUFFICIENT_FUNDS" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
