import {prisma} from '../../lib/prisma';
export async function calculateEventHealth(eventId:string){
 const now=new Date();
 const [tasks,overdue,blocked,incidents,criticalRos,deliverables]=await Promise.all([
  prisma.task.count({where:{eventId}}),
  prisma.task.count({where:{eventId,status:{notIn:['DONE','CANCELLED']},dueAt:{lt:now}}}),
  prisma.task.count({where:{eventId,status:'BLOCKED'}}),
  prisma.incident.count({where:{eventId,status:'open'}}),
  prisma.runOfShowItem.count({where:{eventId,critical:true,status:{not:'done'}}}),
  prisma.sponsorDeliverable.count({where:{deal:{eventId},dueAt:{lt:now},status:{not:'done'}}}),
 ]);
 let score=100;if(tasks){const done=await prisma.task.count({where:{eventId,status:'DONE'}});score-=Math.round((1-done/tasks)*15);}score-=Math.min(25,overdue*4);score-=Math.min(25,blocked*7);score-=Math.min(20,incidents*8);score-=Math.min(10,criticalRos*3);score-=Math.min(10,deliverables*3);return Math.max(0,Math.min(100,score));
}
export async function refreshEventHealth(eventId:string){const score=await calculateEventHealth(eventId);return prisma.event.update({where:{id:eventId},data:{healthScore:score}});}
