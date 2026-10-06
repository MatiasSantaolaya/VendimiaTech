import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '../../lib/prisma';

const COOKIE='plane_attendee_session';
const DAYS=14;
const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');

export async function createAttendeeSession(attendeeId:string) {
  const raw=crypto.randomBytes(32).toString('hex');
  const tokenHash=hash(raw); const expiresAt=new Date(Date.now()+DAYS*864e5);
  await prisma.attendeeSession.create({data:{attendeeId,tokenHash,expiresAt}});
  const jar=await cookies(); jar.set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires:expiresAt});
  return raw;
}

export async function getCurrentAttendee() {
  const raw=(await cookies()).get(COOKIE)?.value; if(!raw)return null;
  const session=await prisma.attendeeSession.findUnique({where:{tokenHash:hash(raw)},include:{attendee:true}});
  if(!session || session.revokedAt || session.expiresAt<=new Date())return null;
  return session.attendee;
}

export async function signInWithMagicToken(token:string, eventId:string) {
  const session=await prisma.attendeeSession.findUnique({where:{tokenHash:hash(token)},include:{attendee:true}});
  if(!session || session.revokedAt || session.expiresAt<=new Date() || session.attendee.eventId!==eventId) return null;
  await prisma.attendeeSession.update({where:{id:session.id},data:{revokedAt:new Date()}});
  return createAttendeeSession(session.attendeeId);
}
