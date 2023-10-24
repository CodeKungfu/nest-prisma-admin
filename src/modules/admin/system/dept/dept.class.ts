import { ApiProperty } from '@nestjs/swagger';
import { sys_department } from '@prisma/client';

export class DeptDetailInfo {
  @ApiProperty({ description: '当前查询的部门' })
  department?: sys_department;

  @ApiProperty({ description: '所属父级部门' })
  parentDepartment?: sys_department;
}
