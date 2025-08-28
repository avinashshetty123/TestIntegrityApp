import { SetMetadata } from "@nestjs/common";
export const Roles_key='roles';
import { UserRole } from '../../user/entities/user.entity';
export const Roles=(...roles:UserRole[])=>SetMetadata(Roles_key,roles);