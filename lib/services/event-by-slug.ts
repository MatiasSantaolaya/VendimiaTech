import { prisma } from '../../lib/prisma';
import { getCurrentUser } from '../../lib/auth';
import { getEventAccess, canManage } from './event-access';

export async function getManagerEvent(slug:string){
 const user=await getCurrentUser(); if(!user)return {redirect:true as const};
 const event=await prisma.event.findUnique({where:{slug},select:{id:true,name:true,slug:true,organizationId:true,status:true,startAt:true,endAt:true,capacity:true,objectiveAttendees:true,budgetCents:true,healthScore:true,city:true,country:true,timezone:true}}); if(!event)return null;
 const access=await getEventAccess(event.id,user.id);if(!access||!canManage(access.role))return {forbidden:true as const};
 return {event,user,role:access.role};
}
