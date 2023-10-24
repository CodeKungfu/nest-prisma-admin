import { ApiProperty } from '@nestjs/swagger';
import { sys_role_department, sys_role_menu, sys_role } from '@prisma/client';

export class RoleInfo {
  @ApiProperty()
  roleInfo: sys_role;

  @ApiProperty()
  menus: sys_role_menu[];

  @ApiProperty()
  depts: sys_role_department[];
}

export class CreatedRoleId {
  roleId: number;
}
