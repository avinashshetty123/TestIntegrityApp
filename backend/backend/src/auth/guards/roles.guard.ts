import { CanActivate,ExecutionContext,ForbiddenException,Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../user/entities/user.entity";
import { Roles_key } from "../decorator/roles.decorator";
import { Observable } from "rxjs";
@Injectable()
export class RolesGuard implements CanActivate{
    constructor(private reflector:Reflector){}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const requiredRoles=this.reflector.getAllAndOverride<UserRole[]>(
            Roles_key,[
                context.getHandler(),
                context.getClass(),
            ]
        )
        if(!requiredRoles)
            return true;
        const {user}=context.switchToHttp().getRequest();
        if(!user){
            throw new ForbiddenException("user not authenticated");
        }
        const hasRequiredRole=requiredRoles.some((role)=>user.role==role)
        if(!hasRequiredRole){
            throw new ForbiddenException("Insufficient permission")
        }
        return true;
    }
}